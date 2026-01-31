/**
 * HQ Alert Entity
 * 
 * 多项目统一告警管理
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AlertType {
  RISK = 'risk',
  BUSINESS = 'business',
  SYSTEM = 'system',
  OPERATIONS = 'operations',
  SECURITY = 'security',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  PENDING = 'pending',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  IGNORED = 'ignored',
}

@Entity('hq_alerts')
@Index(['projectId', 'status'])
@Index(['severity', 'status'])
@Index(['createdAt'])
export class HqAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', nullable: true })
  @Index()
  projectId: string;

  @Column({ name: 'project_name', nullable: true })
  projectName: string;

  @Column({
    type: 'enum',
    enum: AlertType,
    default: AlertType.SYSTEM,
  })
  type: AlertType;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
    default: AlertSeverity.INFO,
  })
  severity: AlertSeverity;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    default: AlertStatus.PENDING,
  })
  status: AlertStatus;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    source?: string;
    affectedEntities?: string[];
    suggestedActions?: string[];
    relatedAlertIds?: string[];
    context?: Record<string, any>;
  };

  @Column({ name: 'acknowledged_by', nullable: true })
  acknowledgedBy: string;

  @Column({ name: 'acknowledged_at', nullable: true })
  acknowledgedAt: Date;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: string;

  @Column({ name: 'resolved_at', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'text', nullable: true, name: 'resolution_notes' })
  resolutionNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
