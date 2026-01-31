/**
 * HQ Skill Entity
 * 
 * 管理 AI Agent 的技能
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { HqAgent } from './hq-agent.entity';

export enum SkillCategory {
  DEVELOPMENT = 'development',
  ANALYSIS = 'analysis',
  COMMUNICATION = 'communication',
  MANAGEMENT = 'management',
  CREATIVITY = 'creativity',
  RESEARCH = 'research',
  AUTOMATION = 'automation',
  INTEGRATION = 'integration',
}

export enum SkillStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
}

@Entity('hq_skill')
export class HqSkill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: SkillCategory,
    default: SkillCategory.DEVELOPMENT,
  })
  category: SkillCategory;

  @Column({
    type: 'enum',
    enum: SkillStatus,
    default: SkillStatus.ACTIVE,
  })
  status: SkillStatus;

  @Column({ type: 'text', nullable: true, name: 'system_prompt' })
  systemPrompt: string;

  @Column({ type: 'jsonb', nullable: true })
  parameters: {
    required?: string[];
    optional?: string[];
    defaults?: Record<string, any>;
  };

  @Column({ type: 'jsonb', nullable: true })
  capabilities: string[];

  @Column({ type: 'jsonb', nullable: true })
  tools: {
    name: string;
    description: string;
    schema: Record<string, any>;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  examples: {
    input: string;
    output: string;
    description?: string;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  config: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
    timeout?: number;
  };

  @Column({ default: 0 })
  priority: number;

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  @Column({ type: 'float', name: 'success_rate', default: 1.0 })
  successRate: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToMany(() => HqAgent, agent => agent.skills)
  agents: HqAgent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
