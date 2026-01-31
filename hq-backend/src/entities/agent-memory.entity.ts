/**
 * HQ Agent Memory Entity
 * 
 * 实现类似 Moltbot 的长期记忆能力
 * 支持：
 * - 对话历史记忆
 * - 项目上下文记忆
 * - 用户偏好记忆
 * - 决策历史记忆
 */

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

export enum MemoryType {
  CONVERSATION = 'conversation',      // 对话记忆
  PROJECT_CONTEXT = 'project_context', // 项目上下文
  USER_PREFERENCE = 'user_preference', // 用户偏好
  DECISION = 'decision',              // 决策历史
  KNOWLEDGE = 'knowledge',            // 知识记忆
  TASK = 'task',                      // 任务记忆
  INSIGHT = 'insight',                // 洞察记忆
}

export enum MemoryImportance {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('hq_agent_memories')
@Index(['agentId', 'type'])
@Index(['agentId', 'projectId'])
@Index(['createdAt'])
export class AgentMemory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agent_id' })
  @Index()
  agentId: string;

  @Column({ name: 'project_id', nullable: true })
  @Index()
  projectId: string;

  @Column({ name: 'session_id', nullable: true })
  sessionId: string;

  @Column({
    type: 'enum',
    enum: MemoryType,
    default: MemoryType.CONVERSATION,
  })
  type: MemoryType;

  @Column({
    type: 'enum',
    enum: MemoryImportance,
    default: MemoryImportance.MEDIUM,
  })
  importance: MemoryImportance;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    source?: string;
    tags?: string[];
    entities?: string[];
    relatedMemoryIds?: string[];
    context?: Record<string, any>;
  };

  // NOTE: 使用 jsonb 存储 embedding，后续如果需要向量搜索可以安装 pgvector 扩展
  // 然后改回 @Column({ type: 'vector', nullable: true, name: 'embedding' })
  @Column({ type: 'jsonb', nullable: true, name: 'embedding' })
  embedding: number[];

  @Column({ name: 'access_count', default: 0 })
  accessCount: number;

  @Column({ name: 'last_accessed_at', nullable: true })
  lastAccessedAt: Date;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt: Date;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('hq_memory_associations')
@Index(['sourceMemoryId', 'targetMemoryId'])
export class MemoryAssociation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'source_memory_id' })
  sourceMemoryId: string;

  @Column({ name: 'target_memory_id' })
  targetMemoryId: string;

  @Column({ name: 'association_type' })
  associationType: string; // 'follows', 'related_to', 'contradicts', 'supports'

  @Column({ type: 'float', default: 1.0 })
  strength: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('hq_memory_sessions')
@Index(['agentId', 'projectId'])
export class MemorySession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agent_id' })
  agentId: string;

  @Column({ name: 'project_id', nullable: true })
  projectId: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ type: 'text', nullable: true })
  title: string;

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, any>;

  @Column({ name: 'message_count', default: 0 })
  messageCount: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'ended_at', nullable: true })
  endedAt: Date;
}
