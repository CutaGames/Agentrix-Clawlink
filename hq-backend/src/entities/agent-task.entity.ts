/**
 * Agent Task Entity
 * 
 * Phase 4: Agent Autonomous Action System
 * DB-persisted task queue with dependencies and collaboration support
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { HqAgent } from './hq-agent.entity';

export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked',
  DELEGATED = 'delegated',
}

export enum TaskPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 7,
  URGENT = 9,
  CRITICAL = 10,
}

export enum TaskType {
  DEVELOPMENT = 'development',
  ANALYSIS = 'analysis',
  MARKETING = 'marketing',
  OPERATIONS = 'operations',
  RESEARCH = 'research',
  PLANNING = 'planning',
  REVIEW = 'review',
  COMMUNICATION = 'communication',
}

@Entity('agent_tasks')
@Index(['status', 'priority'])
@Index(['assignedToId'])
@Index(['parentTaskId'])
@Index(['createdAt'])
export class AgentTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: TaskType,
    default: TaskType.DEVELOPMENT,
  })
  type: TaskType;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.NORMAL,
  })
  priority: TaskPriority;

  // Task Assignment
  @Column({ name: 'assigned_to_id', nullable: true })
  assignedToId: string;

  @ManyToOne(() => HqAgent, { nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: HqAgent;

  @Column({ name: 'created_by_id', nullable: true })
  createdById: string;

  @ManyToOne(() => HqAgent, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: HqAgent;

  // Task Hierarchy (for delegation)
  @Column({ name: 'parent_task_id', nullable: true })
  parentTaskId: string;

  @ManyToOne(() => AgentTask, task => task.subtasks, { nullable: true })
  @JoinColumn({ name: 'parent_task_id' })
  parentTask: AgentTask;

  @OneToMany(() => AgentTask, task => task.parentTask)
  subtasks: AgentTask[];

  // Task Dependencies
  @Column({ type: 'simple-array', nullable: true, name: 'depends_on' })
  dependsOn: string[]; // Task IDs that must be completed first

  // Execution Details
  @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'due_date' })
  dueDate: Date;

  // Cost Tracking
  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0, name: 'estimated_cost' })
  estimatedCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, name: 'actual_cost' })
  actualCost: number;

  // Results
  @Column({ type: 'text', nullable: true })
  result: string;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    skillsUsed?: string[];
    toolsUsed?: string[];
    filesModified?: string[];
    executionTime?: number; // seconds
    retryCount?: number;
    escalatedFrom?: string;
    collaborators?: string[]; // Other agent IDs involved
    checkpoints?: Array<{
      timestamp: string;
      status: string;
      message: string;
    }>;
  };

  // Context for Execution
  @Column({ type: 'jsonb', nullable: true })
  context: {
    projectId?: string;
    workspaceId?: string;
    repositoryUrl?: string;
    branchName?: string;
    relatedIssues?: string[];
    tags?: string[];
    customData?: Record<string, any>;
  };

  // Collaboration
  @Column({ name: 'requires_review', default: false })
  requiresReview: boolean;

  @Column({ name: 'reviewed_by_id', nullable: true })
  reviewedById: string;

  @ManyToOne(() => HqAgent, { nullable: true })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: HqAgent;

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date;

  // Retry Logic
  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', default: 3 })
  maxRetries: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
