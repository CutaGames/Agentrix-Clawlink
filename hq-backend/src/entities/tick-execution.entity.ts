import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type TickExecutionStatus = 'running' | 'completed' | 'failed';

@Entity('tick_executions')
@Index(['status', 'startTime'])
export class TickExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  tickId: string;

  @Column({ name: 'triggered_by', default: 'manual' })
  triggeredBy: string;

  @Column({ type: 'varchar', default: 'running' })
  status: TickExecutionStatus;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime?: Date;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs?: number;

  @Column({ name: 'tasks_processed', type: 'int', default: 0 })
  tasksProcessed: number;

  @Column({ name: 'tasks_completed', type: 'int', default: 0 })
  tasksCompleted: number;

  @Column({ name: 'tasks_failed', type: 'int', default: 0 })
  tasksFailed: number;

  @Column({ name: 'actions_planned', type: 'jsonb', nullable: true })
  actionsPlanned?: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
