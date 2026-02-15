/**
 * Chat History Service
 * 
 * 对话历史持久化服务
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ChatHistory, ChatMessageRole } from '../../entities/chat-history.entity';

export interface SaveChatDto {
  sessionId?: string;
  userId?: string;
  agentId: string;
  role: ChatMessageRole;
  content: string;
  metadata?: any;
}

export interface GetHistoryOptions {
  sessionId?: string;
  userId?: string;
  agentId?: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class ChatHistoryService {
  private readonly logger = new Logger(ChatHistoryService.name);

  constructor(
    @InjectRepository(ChatHistory)
    private chatHistoryRepo: Repository<ChatHistory>,
  ) {}

  /**
   * 保存单条对话记录
   */
  async saveMessage(dto: SaveChatDto): Promise<ChatHistory> {
    const message = this.chatHistoryRepo.create(dto);
    return this.chatHistoryRepo.save(message);
  }

  /**
   * 批量保存对话记录
   */
  async saveMessages(dtos: SaveChatDto[]): Promise<ChatHistory[]> {
    const messages = dtos.map(dto => this.chatHistoryRepo.create(dto));
    return this.chatHistoryRepo.save(messages);
  }

  /**
   * 获取对话历史
   */
  async getHistory(options: GetHistoryOptions): Promise<ChatHistory[]> {
    const {
      sessionId,
      userId,
      agentId,
      limit = 100,
      offset = 0,
      startDate,
      endDate,
    } = options;

    const query = this.chatHistoryRepo.createQueryBuilder('chat');

    if (sessionId) {
      query.andWhere('chat.sessionId = :sessionId', { sessionId });
    }

    if (userId) {
      query.andWhere('chat.userId = :userId', { userId });
    }

    if (agentId) {
      query.andWhere('chat.agentId = :agentId', { agentId });
    }

    if (startDate && endDate) {
      query.andWhere('chat.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    return query
      .orderBy('chat.createdAt', 'ASC')
      .skip(offset)
      .take(limit)
      .getMany();
  }

  /**
   * 获取用户的所有会话ID
   */
  async getUserSessions(userId: string, limit = 50): Promise<string[]> {
    const results = await this.chatHistoryRepo
      .createQueryBuilder('chat')
      .select('DISTINCT chat.sessionId', 'sessionId')
      .where('chat.userId = :userId', { userId })
      .andWhere('chat.sessionId IS NOT NULL')
      .orderBy('MAX(chat.createdAt)', 'DESC')
      .groupBy('chat.sessionId')
      .limit(limit)
      .getRawMany();

    return results.map(r => r.sessionId);
  }

  /**
   * 获取Agent的对话统计
   */
  async getAgentStats(agentId: string, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.chatHistoryRepo
      .createQueryBuilder('chat')
      .select('DATE(chat.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('chat.agentId = :agentId', { agentId })
      .andWhere('chat.createdAt >= :startDate', { startDate })
      .groupBy('DATE(chat.createdAt)')
      .orderBy('DATE(chat.createdAt)', 'ASC')
      .getRawMany();

    return stats;
  }

  /**
   * 删除旧的对话记录
   */
  async cleanupOldChats(daysToKeep = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.chatHistoryRepo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Cleaned up ${result.affected} old chat records`);
    return result.affected || 0;
  }
}
