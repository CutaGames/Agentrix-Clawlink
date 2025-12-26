/**
 * AX Skill Entity
 * 
 * 统一的 Skill 定义实体，支持自动转换为各 AI 平台格式
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum SkillCategory {
  PAYMENT = 'payment',
  COMMERCE = 'commerce',
  DATA = 'data',
  UTILITY = 'utility',
  INTEGRATION = 'integration',
  CUSTOM = 'custom',
}

export enum SkillStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  DEPRECATED = 'deprecated',
}

export enum SkillPricingType {
  FREE = 'free',
  PER_CALL = 'per_call',
  SUBSCRIPTION = 'subscription',
}

export interface SkillInputSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    enum?: string[];
    default?: any;
    minimum?: number;
    maximum?: number;
  }>;
  required: string[];
}

export interface SkillOutputSchema {
  type: 'object';
  properties: Record<string, any>;
}

export interface SkillExecutor {
  type: 'http' | 'internal';
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  internalHandler?: string; // 内部处理器名称
}

export interface SkillPlatformSchemas {
  openai?: any;
  claude?: any;
  gemini?: any;
  grok?: any;
  qwen?: any;
}

export interface SkillPricing {
  type: SkillPricingType;
  pricePerCall?: number;
  currency?: string;
  freeQuota?: number;
}

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 500 })
  description: string;

  @Column({ length: 20, default: '1.0.0' })
  version: string;

  @Column({
    type: 'enum',
    enum: SkillCategory,
    default: SkillCategory.CUSTOM,
  })
  category: SkillCategory;

  @Column({
    type: 'enum',
    enum: SkillStatus,
    default: SkillStatus.DRAFT,
  })
  status: SkillStatus;

  @Column({ type: 'jsonb' })
  inputSchema: SkillInputSchema;

  @Column({ type: 'jsonb', nullable: true })
  outputSchema: SkillOutputSchema;

  @Column({ type: 'jsonb' })
  executor: SkillExecutor;

  @Column({ type: 'jsonb', nullable: true })
  platformSchemas: SkillPlatformSchemas;

  @Column({ type: 'jsonb', nullable: true })
  pricing: SkillPricing;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ nullable: true })
  authorId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ default: 0 })
  callCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
