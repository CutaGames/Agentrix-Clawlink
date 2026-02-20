import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  SocialPost,
  SocialPostType,
  SocialPostStatus,
  SocialComment,
  SocialLike,
  SocialFollow,
} from '../../entities/social.entity';

export interface CreatePostDto {
  content: string;
  type?: SocialPostType;
  referenceId?: string;
  referenceName?: string;
  media?: { url: string; type: 'image' | 'video' }[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface CreateCommentDto {
  content: string;
  parentCommentId?: string;
}

export interface GetFeedQuery {
  sort?: 'hot' | 'latest' | 'following';
  type?: SocialPostType;
  page?: number;
  limit?: number;
}

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    @InjectRepository(SocialPost) private postRepo: Repository<SocialPost>,
    @InjectRepository(SocialComment) private commentRepo: Repository<SocialComment>,
    @InjectRepository(SocialLike) private likeRepo: Repository<SocialLike>,
    @InjectRepository(SocialFollow) private followRepo: Repository<SocialFollow>,
  ) {}

  // ===== Feed =====

  async getFeed(userId: string, query: GetFeedQuery = {}) {
    const { sort = 'latest', type, page = 1, limit = 20 } = query;
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;

    const qb = this.postRepo
      .createQueryBuilder('post')
      .where('post.status = :status', { status: SocialPostStatus.ACTIVE })
      .take(take)
      .skip(skip);

    if (type) qb.andWhere('post.type = :type', { type });

    if (sort === 'hot') {
      qb.orderBy('post.likeCount + post.commentCount * 2 + post.shareCount * 3', 'DESC')
        .addOrderBy('post.createdAt', 'DESC');
    } else if (sort === 'following') {
      const followingIds = await this.getFollowingIds(userId);
      if (followingIds.length === 0) {
        return { posts: [], total: 0, page, limit: take };
      }
      qb.andWhere('post.authorId IN (:...ids)', { ids: followingIds })
        .orderBy('post.createdAt', 'DESC');
    } else {
      qb.orderBy('post.createdAt', 'DESC');
    }

    const [posts, total] = await qb.getManyAndCount();

    // Attach current user like status
    const postIds = posts.map((p) => p.id);
    const likedIds = postIds.length
      ? await this.likeRepo
          .find({ where: { userId, targetType: 'post' } })
          .then((likes) => new Set(likes.map((l) => l.targetId)))
      : new Set<string>();

    return {
      posts: posts.map((p) => ({ ...p, likedByMe: likedIds.has(p.id) })),
      total,
      page,
      limit: take,
    };
  }

  // ===== Posts =====

  async createPost(userId: string, authorName: string, authorAvatar: string | undefined, dto: CreatePostDto) {
    const post = this.postRepo.create({
      authorId: userId,
      authorName,
      authorAvatar,
      ...dto,
    });
    return this.postRepo.save(post);
  }

  async getPostById(postId: string) {
    const post = await this.postRepo.findOneBy({ id: postId });
    if (!post || post.status === SocialPostStatus.REMOVED) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async deletePost(userId: string, postId: string) {
    const post = await this.postRepo.findOneBy({ id: postId });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException();
    await this.postRepo.update(postId, { status: SocialPostStatus.REMOVED });
  }

  async getUserPosts(profileUserId: string, page = 1, limit = 20) {
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;
    return this.postRepo.find({
      where: { authorId: profileUserId, status: SocialPostStatus.ACTIVE },
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
  }

  // ===== Comments =====

  async getComments(postId: string, page = 1, limit = 30) {
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;
    return this.commentRepo.find({
      where: { postId, parentCommentId: IsNull() },
      order: { createdAt: 'ASC' },
      take,
      skip,
    });
  }

  async addComment(userId: string, authorName: string, postId: string, dto: CreateCommentDto) {
    const post = await this.getPostById(postId);
    const comment = this.commentRepo.create({
      postId,
      authorId: userId,
      authorName,
      content: dto.content,
      parentCommentId: dto.parentCommentId,
    });
    const saved = await this.commentRepo.save(comment);
    await this.postRepo.increment({ id: postId }, 'commentCount', 1);
    return saved;
  }

  // ===== Likes =====

  async toggleLike(userId: string, targetId: string, targetType: 'post' | 'comment') {
    const existing = await this.likeRepo.findOneBy({ userId, targetId, targetType });
    if (existing) {
      await this.likeRepo.delete(existing.id);
      if (targetType === 'post') await this.postRepo.decrement({ id: targetId }, 'likeCount', 1);
      else await this.commentRepo.decrement({ id: targetId }, 'likeCount', 1);
      return { liked: false };
    } else {
      await this.likeRepo.save(this.likeRepo.create({ userId, targetId, targetType }));
      if (targetType === 'post') await this.postRepo.increment({ id: targetId }, 'likeCount', 1);
      else await this.commentRepo.increment({ id: targetId }, 'likeCount', 1);
      return { liked: true };
    }
  }

  // ===== Follows =====

  private async getFollowingIds(userId: string): Promise<string[]> {
    const follows = await this.followRepo.find({ where: { followerId: userId } });
    return follows.map((f) => f.followeeId);
  }

  async toggleFollow(followerId: string, followeeId: string) {
    if (followerId === followeeId) return { following: false };
    const existing = await this.followRepo.findOneBy({ followerId, followeeId });
    if (existing) {
      await this.followRepo.delete(existing.id);
      return { following: false };
    } else {
      await this.followRepo.save(this.followRepo.create({ followerId, followeeId }));
      return { following: true };
    }
  }

  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const record = await this.followRepo.findOneBy({ followerId, followeeId });
    return !!record;
  }

  async getFollowers(userId: string) {
    return this.followRepo.find({ where: { followeeId: userId }, order: { createdAt: 'DESC' } });
  }

  async getFollowing(userId: string) {
    return this.followRepo.find({ where: { followerId: userId }, order: { createdAt: 'DESC' } });
  }
}
