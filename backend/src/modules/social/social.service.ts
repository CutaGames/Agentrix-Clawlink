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
  SocialEvent,
  SocialEventPlatform,
  SocialEventType,
  SocialReplyStatus,
  SocialReplyConfig,
  ReplyStrategy,
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
    @InjectRepository(SocialEvent) private eventRepo: Repository<SocialEvent>,
    @InjectRepository(SocialReplyConfig) private replyConfigRepo: Repository<SocialReplyConfig>,
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

  // ===== Agent Showcase Feed =====

  async getShowcaseFeed(userId: string, query: GetFeedQuery = {}) {
    const { sort = 'hot', page = 1, limit = 20 } = query;
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;

    const qb = this.postRepo
      .createQueryBuilder('post')
      .where('post.status = :status', { status: SocialPostStatus.ACTIVE })
      .take(take)
      .skip(skip);

    if (sort === 'following') {
      const followingIds = await this.getFollowingIds(userId);
      if (followingIds.length === 0) return { posts: [], total: 0, page, limit: take };
      qb.andWhere('post.authorId IN (:...ids)', { ids: followingIds });
      qb.orderBy('post.createdAt', 'DESC');
    } else if (sort === 'hot') {
      qb.orderBy(
        `(post."likeCount" + post."commentCount" * 2 + post."shareCount" * 3)`,
        'DESC',
      ).addOrderBy('post.createdAt', 'DESC');
    } else {
      qb.orderBy('post.createdAt', 'DESC');
    }

    const [posts, total] = await qb.getManyAndCount();

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

  // ===== Auto-generated Showcase Posts =====

  async createAutoPost(params: {
    userId: string;
    authorName: string;
    authorAvatar?: string;
    type: SocialPostType;
    content: string;
    referenceId?: string;
    referenceName?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }) {
    const post = this.postRepo.create({
      authorId: params.userId,
      authorName: params.authorName,
      authorAvatar: params.authorAvatar,
      type: params.type,
      content: params.content,
      referenceId: params.referenceId,
      referenceName: params.referenceName,
      tags: params.tags,
      metadata: params.metadata,
    });
    this.logger.log(`Auto-post created: type=${params.type} ref=${params.referenceId}`);
    return this.postRepo.save(post);
  }

  // ===== Social Events (persisted) =====

  async createSocialEvent(params: {
    userId?: string;
    platform: SocialEventPlatform;
    eventType: SocialEventType;
    senderId: string;
    senderName?: string;
    text: string;
    rawPayload?: Record<string, any>;
  }) {
    const event = this.eventRepo.create(params);
    return this.eventRepo.save(event);
  }

  async getSocialEvents(userId?: string, limit = 50) {
    const where: any = {};
    if (userId) where.userId = userId;
    return this.eventRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 100),
    });
  }

  async updateEventReply(eventId: string, data: {
    replyStatus?: SocialReplyStatus;
    agentDraftReply?: string;
    finalReply?: string;
    repliedAt?: Date;
  }) {
    await this.eventRepo.update(eventId, data);
    return this.eventRepo.findOneBy({ id: eventId });
  }

  async getPendingApprovals(userId: string) {
    return this.eventRepo.find({
      where: { userId, replyStatus: SocialReplyStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  // ===== Reply Config =====

  async getReplyConfigs(userId: string) {
    return this.replyConfigRepo.find({ where: { userId } });
  }

  async saveReplyConfig(userId: string, platform: SocialEventPlatform, data: {
    strategy?: ReplyStrategy;
    replyPrompt?: string;
    replyLanguage?: string;
    enabled?: boolean;
  }) {
    let config = await this.replyConfigRepo.findOneBy({ userId, platform });
    if (config) {
      Object.assign(config, data);
    } else {
      config = this.replyConfigRepo.create({ userId, platform, ...data });
    }
    return this.replyConfigRepo.save(config);
  }

  // ===== Agent Reputation =====

  async getAgentReputation(userId: string) {
    // Aggregate stats from posts, followers, following
    const [postCount, followerCount, followingCount] = await Promise.all([
      this.postRepo.count({ where: { authorId: userId, status: SocialPostStatus.ACTIVE } }),
      this.followRepo.count({ where: { followeeId: userId } }),
      this.followRepo.count({ where: { followerId: userId } }),
    ]);

    // Count by post type for breakdown
    const showcasePosts = await this.postRepo.count({
      where: { authorId: userId, status: SocialPostStatus.ACTIVE },
    });

    // Skills published (skill_share type posts)
    const skillPosts = await this.postRepo.count({
      where: { authorId: userId, type: SocialPostType.SKILL_SHARE },
    });

    // Workflow results
    const workflowPosts = await this.postRepo.count({
      where: { authorId: userId, type: SocialPostType.WORKFLOW_RESULT },
    });

    // Tasks completed
    const taskPosts = await this.postRepo.count({
      where: { authorId: userId, type: SocialPostType.TASK_COMPLETE },
    });

    // Agent deployments
    const agentDeploys = await this.postRepo.count({
      where: { authorId: userId, type: SocialPostType.AGENT_DEPLOY },
    });

    // Total likes received on user's posts
    const userPosts = await this.postRepo.find({
      where: { authorId: userId, status: SocialPostStatus.ACTIVE },
      select: ['id', 'likeCount'],
    });
    const totalLikesReceived = userPosts.reduce((sum, p) => sum + (p.likeCount ?? 0), 0);

    // Compute a simple reputation score
    const reputationScore = Math.min(5.0, Math.round(
      (1.0
        + Math.min(skillPosts * 0.3, 1.5)
        + Math.min(taskPosts * 0.1, 1.0)
        + Math.min(agentDeploys * 0.2, 0.6)
        + Math.min(totalLikesReceived * 0.01, 0.5)
        + Math.min(followerCount * 0.005, 0.4)
      ) * 10
    ) / 10);

    return {
      userId,
      postCount,
      followerCount,
      followingCount,
      showcasePosts,
      skillsPublished: skillPosts,
      workflowResults: workflowPosts,
      tasksCompleted: taskPosts,
      agentDeploys,
      totalLikesReceived,
      reputationScore,
    };
  }
}
