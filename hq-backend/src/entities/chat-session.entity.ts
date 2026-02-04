import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * 聊天消息
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  tool: string;
  params: Record<string, any>;
  status: 'pending' | 'success' | 'error';
  result?: any;
  error?: string;
}

/**
 * 统一的聊天会话实体
 * 解决问题2: 聊天记录存储混乱
 * 
 * 设计原则:
 * - 以 agentCode 为主键之一，同一个 Agent 的对话可以共享
 * - 支持 Workspace 和 Staff 两种模式
 * - 消息存储为 JSON，支持工具调用记录
 */
@Entity('chat_sessions')
@Index(['agentCode', 'userId'])
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  @Index()
  agentCode: string;  // ARCHITECT-01, CODER-01, etc.

  @Column({ length: 100, nullable: true })
  userId: string;  // 可选，用于多用户场景

  @Column({ length: 50, default: 'general' })
  mode: 'workspace' | 'staff' | 'general';  // 对话模式

  @Column({ length: 500, nullable: true })
  workingDir: string;  // 工作目录

  @Column({ length: 200, nullable: true })
  title: string;  // 会话标题（可选）

  @Column('simple-json', { default: '[]' })
  messages: ChatMessage[];  // 消息历史

  @Column('simple-json', { nullable: true })
  context: Record<string, any>;  // 上下文信息

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastMessageAt: Date;
}
