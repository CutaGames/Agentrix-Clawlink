/**
 * Agent Communication Service
 * 
 * Agent 间通信系统 - 支持消息传递、任务委托、协作
 * Phase 1.1: 使用数据库持久化，替代内存 Map
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { HqAgent } from '../../entities/hq-agent.entity';
import { AgentTask, TaskStatus, TaskPriority } from '../../entities/agent-task.entity';
import {
  AgentMessageEntity,
  MessageType,
  MessagePriority,
  MessageStatus,
} from '../../entities/agent-message.entity';
import { UnifiedChatService } from '../../modules/core/unified-chat.service';

// Keep the interface for backward compat with controller DTOs
export interface AgentMessage {
  id: string;
  fromAgentCode: string;
  toAgentCode: string;
  messageType: 'request' | 'response' | 'notification' | 'delegation';
  content: string;
  context?: Record<string, any>;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'delivered' | 'read' | 'responded';
  responseToId?: string;
}

export interface DelegationRequest {
  taskTitle: string;
  taskDescription: string;
  priority: TaskPriority;
  estimatedCost?: number;
  requiredSkills?: string[];
  deadline?: Date;
}

@Injectable()
export class AgentCommunicationService {
  private readonly logger = new Logger(AgentCommunicationService.name);

  constructor(
    @InjectRepository(HqAgent)
    private agentRepo: Repository<HqAgent>,
    @InjectRepository(AgentTask)
    private taskRepo: Repository<AgentTask>,
    @InjectRepository(AgentMessageEntity)
    private messageRepo: Repository<AgentMessageEntity>,
    private unifiedChatService: UnifiedChatService,
  ) {}

  /** Convert DB entity to legacy AgentMessage interface */
  private toAgentMessage(entity: AgentMessageEntity): AgentMessage {
    return {
      id: entity.id,
      fromAgentCode: entity.fromAgentCode,
      toAgentCode: entity.toAgentCode,
      messageType: entity.messageType as AgentMessage['messageType'],
      content: entity.content,
      context: entity.context,
      timestamp: entity.createdAt,
      priority: entity.priority as AgentMessage['priority'],
      status: entity.status as AgentMessage['status'],
      responseToId: entity.responseToId,
    };
  }

  /**
   * 发送消息给另一个 Agent (持久化到数据库)
   */
  async sendMessage(
    fromAgentCode: string,
    toAgentCode: string,
    content: string,
    options?: {
      messageType?: AgentMessage['messageType'];
      priority?: AgentMessage['priority'];
      context?: Record<string, any>;
    }
  ): Promise<AgentMessage> {
    const entity = this.messageRepo.create({
      fromAgentCode,
      toAgentCode,
      content,
      messageType: (options?.messageType || 'notification') as MessageType,
      priority: (options?.priority || 'medium') as MessagePriority,
      status: MessageStatus.PENDING,
      context: options?.context,
      responseToId: options?.context?.responseToId,
    });

    const saved = await this.messageRepo.save(entity);
    this.logger.log(`📨 Message sent: ${fromAgentCode} → ${toAgentCode} [${saved.messageType}] (${saved.id})`);
    return this.toAgentMessage(saved);
  }

  /**
   * 获取 Agent 的待处理消息
   */
  async getPendingMessages(agentCode: string): Promise<AgentMessage[]> {
    const entities = await this.messageRepo.find({
      where: {
        toAgentCode: agentCode,
        status: In([MessageStatus.PENDING, MessageStatus.DELIVERED]),
      },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return entities.map(e => this.toAgentMessage(e));
  }

  /**
   * 标记消息为已读
   */
  async markMessageAsRead(messageId: string, agentCode: string): Promise<void> {
    await this.messageRepo.update(
      { id: messageId, toAgentCode: agentCode },
      { status: MessageStatus.READ },
    );
    this.logger.log(`✓ Message ${messageId} marked as read by ${agentCode}`);
  }

  /**
   * 回复指定消息
   */
  async respondToMessage(
    messageId: string,
    agentCode: string,
    response: string,
  ): Promise<AgentMessage> {
    const original = await this.messageRepo.findOne({
      where: { id: messageId, toAgentCode: agentCode },
    });

    if (!original) {
      throw new Error(`Message ${messageId} not found for agent ${agentCode}`);
    }

    await this.messageRepo.update(original.id, { status: MessageStatus.RESPONDED });

    return this.sendMessage(
      agentCode,
      original.fromAgentCode,
      response,
      {
        messageType: 'response',
        priority: original.priority as AgentMessage['priority'],
        context: {
          responseToId: messageId,
          originalType: original.messageType,
        },
      }
    );
  }

  /**
   * Agent 委托任务给另一个 Agent
   */
  async delegateTask(
    fromAgentCode: string,
    toAgentCode: string,
    request: DelegationRequest
  ): Promise<{ taskId: string; message: AgentMessage }> {
    const targetAgent = await this.agentRepo.findOne({
      where: { code: toAgentCode, isActive: true },
    });

    if (!targetAgent) {
      throw new Error(`Target agent ${toAgentCode} not found or inactive`);
    }

    const task = new AgentTask();
    task.title = request.taskTitle;
    task.description = request.taskDescription;
    task.type = 'communication' as any;
    task.status = TaskStatus.PENDING;
    // Convert string priority to TaskPriority enum (numeric)
    const priorityMap: Record<string, TaskPriority> = {
      low: TaskPriority.LOW,
      medium: TaskPriority.NORMAL,
      normal: TaskPriority.NORMAL,
      high: TaskPriority.HIGH,
      urgent: TaskPriority.URGENT,
      critical: TaskPriority.CRITICAL,
    };
    task.priority = typeof request.priority === 'string'
      ? (priorityMap[request.priority] ?? TaskPriority.NORMAL)
      : (request.priority ?? TaskPriority.NORMAL);
    task.assignedToId = targetAgent.id;
    task.metadata = { collaborators: [fromAgentCode] };
    task.context = {
      customData: {
        delegatedBy: fromAgentCode,
        requiredSkills: request.requiredSkills,
        deadline: request.deadline?.toISOString(),
      },
    };

    await this.taskRepo.save(task);

    const message = await this.sendMessage(
      fromAgentCode,
      toAgentCode,
      `I'm delegating a task to you: ${request.taskTitle}`,
      {
        messageType: 'delegation',
        priority: request.priority === TaskPriority.CRITICAL ? 'urgent' : 'high',
        context: {
          taskId: task.id,
          taskTitle: request.taskTitle,
          taskDescription: request.taskDescription,
        },
      }
    );

    this.logger.log(`📋 Task delegated: ${fromAgentCode} → ${toAgentCode} (${task.id})`);
    return { taskId: task.id, message };
  }

  /**
   * Agent 请求另一个 Agent 的帮助/建议
   */
  async requestHelp(
    fromAgentCode: string,
    toAgentCode: string,
    question: string,
    context?: Record<string, any>
  ): Promise<string> {
    const requestMessage = await this.sendMessage(
      fromAgentCode,
      toAgentCode,
      question,
      { messageType: 'request', priority: 'medium', context },
    );

    const chatResponse = await this.unifiedChatService.chat({
      agentCode: toAgentCode,
      message: `${fromAgentCode} is asking for your help:\n\n${question}${context ? `\n\nContext: ${JSON.stringify(context, null, 2)}` : ''}\n\nMessage ID: ${requestMessage.id}`,
      mode: 'staff',
    });

    await this.sendMessage(
      toAgentCode,
      fromAgentCode,
      chatResponse.response,
      {
        messageType: 'response',
        priority: 'medium',
        context: { responseToId: requestMessage.id },
      }
    );

    this.logger.log(`💬 Help request: ${fromAgentCode} ← ${toAgentCode}`);
    return chatResponse.response;
  }

  /**
   * 广播消息给所有 active Agents
   */
  async broadcastMessage(
    fromAgentCode: string,
    content: string,
    options?: {
      priority?: AgentMessage['priority'];
      context?: Record<string, any>;
      excludeAgents?: string[];
    }
  ): Promise<number> {
    const activeAgents = await this.agentRepo.find({ where: { isActive: true } });

    let sentCount = 0;
    for (const agent of activeAgents) {
      if (agent.code === fromAgentCode) continue;
      if (options?.excludeAgents?.includes(agent.code)) continue;

      await this.sendMessage(fromAgentCode, agent.code, content, {
        messageType: 'notification',
        priority: options?.priority,
        context: options?.context,
      });
      sentCount++;
    }

    this.logger.log(`📢 Broadcast from ${fromAgentCode}: ${sentCount} agents notified`);
    return sentCount;
  }

  /**
   * 获取 Agent 间的通信历史 (from DB)
   */
  async getCommunicationHistory(
    agentCode1: string,
    agentCode2: string,
    limit: number = 50
  ): Promise<AgentMessage[]> {
    const entities = await this.messageRepo
      .createQueryBuilder('msg')
      .where(
        '(msg.from_agent_code = :a1 AND msg.to_agent_code = :a2) OR (msg.from_agent_code = :a2 AND msg.to_agent_code = :a1)',
        { a1: agentCode1, a2: agentCode2 },
      )
      .orderBy('msg.created_at', 'DESC')
      .take(limit)
      .getMany();

    return entities.map(e => this.toAgentMessage(e));
  }

  /**
   * 获取单个 Agent 的通信历史
   */
  async getAgentHistory(agentCode: string, limit: number = 50, peerCode?: string): Promise<AgentMessage[]> {
    const qb = this.messageRepo
      .createQueryBuilder('msg')
      .where('msg.from_agent_code = :code OR msg.to_agent_code = :code', { code: agentCode });

    if (peerCode) {
      qb.andWhere('(msg.from_agent_code = :peer OR msg.to_agent_code = :peer)', { peer: peerCode });
    }

    const entities = await qb
      .orderBy('msg.created_at', 'DESC')
      .take(limit)
      .getMany();

    return entities.map(e => this.toAgentMessage(e));
  }

  /**
   * 清理旧消息 (保留最近30天)
   */
  async cleanupOldMessages(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.messageRepo.delete({
      createdAt: LessThan(thirtyDaysAgo),
    });
    const deletedCount = result.affected || 0;
    this.logger.log(`🗑️ Cleaned up ${deletedCount} old messages`);
    return deletedCount;
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    totalMessages: number;
    messagesByAgent: Record<string, number>;
    messagesByType: Record<string, number>;
  }> {
    const totalMessages = await this.messageRepo.count();

    const byAgentRaw = await this.messageRepo
      .createQueryBuilder('msg')
      .select('msg.to_agent_code', 'agent')
      .addSelect('COUNT(*)', 'count')
      .groupBy('msg.to_agent_code')
      .getRawMany();

    const messagesByAgent: Record<string, number> = {};
    for (const row of byAgentRaw) {
      messagesByAgent[row.agent] = parseInt(row.count, 10);
    }

    const byTypeRaw = await this.messageRepo
      .createQueryBuilder('msg')
      .select('msg.message_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('msg.message_type')
      .getRawMany();

    const messagesByType: Record<string, number> = {};
    for (const row of byTypeRaw) {
      messagesByType[row.type] = parseInt(row.count, 10);
    }

    return { totalMessages, messagesByAgent, messagesByType };
  }
}
