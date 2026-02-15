/**
 * Agent Message Entity
 * 
 * Persistent agent-to-agent communication
 * Replaces the in-memory Map in AgentCommunicationService
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MessageType {
  REQUEST = 'request',
  RESPONSE = 'response',
  NOTIFICATION = 'notification',
  DELEGATION = 'delegation',
}

export enum MessagePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum MessageStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  READ = 'read',
  RESPONDED = 'responded',
  EXPIRED = 'expired',
}

@Entity('hq_agent_messages')
@Index(['toAgentCode', 'status'])
@Index(['fromAgentCode'])
@Index(['createdAt'])
@Index(['responseToId'])
export class AgentMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'from_agent_code', length: 50 })
  fromAgentCode: string;

  @Column({ name: 'to_agent_code', length: 50 })
  toAgentCode: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.NOTIFICATION,
    name: 'message_type',
  })
  messageType: MessageType;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: MessagePriority,
    default: MessagePriority.MEDIUM,
  })
  priority: MessagePriority;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.PENDING,
  })
  status: MessageStatus;

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, any>;

  @Column({ name: 'response_to_id', nullable: true })
  responseToId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
