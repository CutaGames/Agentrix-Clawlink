/**
 * HQ Agent Entity
 * 
 * HQ 内部的 Agent 定义
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToMany,
  JoinTable,
  AfterLoad,
} from 'typeorm';
import { HqSkill } from './hq-skill.entity';

export enum AgentRole {
  COMMANDER = 'commander', // CEO + Strategy
  ARCHITECT = 'architect',
  CODER = 'coder',
  GROWTH = 'growth',
  BD = 'bd',
  ANALYST = 'analyst',
  SUPPORT = 'support',
  RISK = 'risk',
  REVENUE = 'revenue',
  FINANCE = 'finance',
  CUSTOM = 'custom',
}

export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  OFFLINE = 'offline',
}

@Entity('hq_agents')
@Index(['status'])
@Index(['role'])
export class HqAgent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string; // e.g., 'ARCHITECT-01', 'CODER-02'

  @Column({ nullable: true })
  type: string; // Agent type: 'coder', 'analyst', etc.
  @Column({ nullable: true })
  provider?: string; // AI provider: 'bedrock', 'gemini', 'openai', etc.

  @Column({ nullable: true })
  model?: string; // Model name: 'claude-opus-4-5', 'gemini-2.5-flash', etc.
  @Column({
    type: 'enum',
    enum: AgentRole,
    default: AgentRole.CUSTOM,
  })
  role: AgentRole;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true, name: 'system_prompt' })
  systemPrompt: string;

  @Column({
    type: 'enum',
    enum: AgentStatus,
    default: AgentStatus.IDLE,
  })
  status: AgentStatus;

  @Column({ name: 'current_task', nullable: true })
  currentTask: string;

  @Column({ type: 'int', nullable: true })
  progress: number;

  @Column({ type: 'simple-array', nullable: true, name: 'assigned_projects' })
  assignedProjects: string[]; // Project IDs

  @Column({ type: 'jsonb', nullable: true })
  capabilities: {
    tools?: string[];
    models?: string[];
    permissions?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  config: {
    modelPreference?: string;
    modelProvider?: string;
    modelId?: string;
    maxConcurrentTasks?: number;
    autoRetry?: boolean;
    notifyOnComplete?: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  stats: {
    tasksCompleted?: number;
    tasksFaild?: number;
    avgResponseTime?: number;
    lastActiveAt?: string;
  };

  @ManyToMany(() => HqSkill, skill => skill.agents)
  @JoinTable({
    name: 'hq_agent_skills',
    joinColumn: { name: 'agent_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'skill_id', referencedColumnName: 'id' },
  })
  skills: HqSkill[];

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Sync provider and model from config field after loading
   * This ensures backward compatibility with existing data structure
   */
  @AfterLoad()
  syncProviderModelFromConfig() {
    if (!this.provider && this.config?.modelProvider) {
      this.provider = this.config.modelProvider;
    }
    if (!this.model && this.config?.modelId) {
      this.model = this.config.modelId;
    }
  }
}
