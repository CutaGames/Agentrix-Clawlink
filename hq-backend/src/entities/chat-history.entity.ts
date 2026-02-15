import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ChatMessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  TOOL = 'tool',
}

@Entity('hq_chat_history')
@Index(['sessionId', 'createdAt'])
@Index(['agentId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class ChatHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  @Index()
  sessionId: string;

  @Column({ nullable: true })
  @Index()
  userId: string;

  @Column()
  @Index()
  agentId: string;

  @Column({
    type: 'enum',
    enum: ChatMessageRole,
  })
  role: ChatMessageRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    model?: string;
    provider?: string;
    toolCalls?: any[];
    toolResults?: any[];
    thinkingTime?: number;
    attachments?: any[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
