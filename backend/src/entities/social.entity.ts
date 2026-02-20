import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum SocialPostType {
  TEXT = 'text',
  AGENT_RESULT = 'agent_result',
  SKILL_SHARE = 'skill_share',
  INSTALL_SUCCESS = 'install_success',
  SHOWCASE = 'showcase',
}

export enum SocialPostStatus {
  ACTIVE = 'active',
  HIDDEN = 'hidden',
  REMOVED = 'removed',
}

@Entity('social_posts')
export class SocialPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  authorId: string;

  @Column({ length: 150, nullable: true })
  authorName?: string;

  @Column({ length: 255, nullable: true })
  authorAvatar?: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: SocialPostType, default: SocialPostType.TEXT })
  type: SocialPostType;

  @Column({ type: 'enum', enum: SocialPostStatus, default: SocialPostStatus.ACTIVE })
  status: SocialPostStatus;

  /** Referenced skill/agent ID for SKILL_SHARE or AGENT_RESULT posts */
  @Column({ nullable: true })
  referenceId?: string;

  @Column({ length: 150, nullable: true })
  referenceName?: string;

  @Column({ type: 'jsonb', nullable: true })
  media?: { url: string; type: 'image' | 'video' }[];

  @Column({ default: 0 })
  likeCount: number;

  @Column({ default: 0 })
  commentCount: number;

  @Column({ default: 0 })
  shareCount: number;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('social_comments')
export class SocialComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  postId: string;

  @Index()
  @Column({ type: 'uuid' })
  authorId: string;

  @Column({ length: 150, nullable: true })
  authorName?: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  parentCommentId?: string;

  @Column({ default: 0 })
  likeCount: number;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('social_likes')
export class SocialLike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Index()
  @Column({ type: 'uuid' })
  targetId: string;

  @Column({ length: 20 })
  targetType: 'post' | 'comment';

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('social_follows')
export class SocialFollow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  followerId: string;

  @Index()
  @Column({ type: 'uuid' })
  followeeId: string;

  @CreateDateColumn()
  createdAt: Date;
}
