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
import { AgentRegistry } from './agent-registry.entity';

export enum AuthorizationStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
}

@Entity('authorizations')
export class Authorization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => AgentRegistry, { nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent: AgentRegistry;

  @Column({ name: 'agent_id', nullable: true })
  agentId: string;

  @Column({ type: 'simple-array', nullable: true })
  merchantScope: string[]; // 允许的商户ID列表，null表示全部

  @Column({ type: 'simple-array', nullable: true })
  categoryScope: string[]; // 允许的商品类目列表

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  singleTxLimit: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  dailyLimit: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  monthlyLimit: number;

  @Column({
    type: 'enum',
    enum: AuthorizationStatus,
    default: AuthorizationStatus.ACTIVE,
  })
  status: AuthorizationStatus;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
