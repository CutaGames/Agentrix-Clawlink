import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AgentSpace,
  AgentSpaceMessage,
  SpaceStatus,
  SpaceType,
  SpaceMessageType,
} from '../../entities/agent-space.entity';

@Injectable()
export class AgentSpaceService {
  constructor(
    @InjectRepository(AgentSpace)
    private readonly spaceRepo: Repository<AgentSpace>,
    @InjectRepository(AgentSpaceMessage)
    private readonly msgRepo: Repository<AgentSpaceMessage>,
  ) {}

  // ── Space CRUD ──────────────────────────────────────────────────────────────

  async createSpace(params: {
    name: string;
    description?: string;
    ownerId: string;
    type?: SpaceType;
    taskId?: string;
    agentInstanceId?: string;
    memberIds?: string[];
  }): Promise<AgentSpace> {
    const space = this.spaceRepo.create({
      name: params.name,
      description: params.description,
      ownerId: params.ownerId,
      type: params.type ?? SpaceType.GENERAL,
      taskId: params.taskId,
      agentInstanceId: params.agentInstanceId,
      memberIds: params.memberIds ?? [params.ownerId],
    });
    return this.spaceRepo.save(space);
  }

  async getSpacesForUser(userId: string): Promise<AgentSpace[]> {
    // Return spaces where user is owner or member
    const all = await this.spaceRepo.find({
      where: { status: SpaceStatus.ACTIVE },
      order: { updatedAt: 'DESC' },
    });
    return all.filter(
      (s) => s.ownerId === userId || (s.memberIds ?? []).includes(userId),
    );
  }

  async getSpaceById(spaceId: string): Promise<AgentSpace> {
    const space = await this.spaceRepo.findOne({ where: { id: spaceId } });
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }

  async archiveSpace(spaceId: string): Promise<void> {
    await this.spaceRepo.update(spaceId, { status: SpaceStatus.ARCHIVED });
  }

  async addMember(spaceId: string, userId: string): Promise<void> {
    const space = await this.getSpaceById(spaceId);
    const members = space.memberIds ?? [];
    if (!members.includes(userId)) {
      members.push(userId);
      await this.spaceRepo.update(spaceId, { memberIds: members });
    }
  }

  async removeMember(spaceId: string, userId: string): Promise<void> {
    const space = await this.getSpaceById(spaceId);
    const members = (space.memberIds ?? []).filter((id) => id !== userId);
    await this.spaceRepo.update(spaceId, { memberIds: members });
  }

  // ── Messages ────────────────────────────────────────────────────────────────

  async getMessages(
    spaceId: string,
    page = 1,
    limit = 50,
  ): Promise<{ messages: AgentSpaceMessage[]; total: number }> {
    const [messages, total] = await this.msgRepo.findAndCount({
      where: { spaceId },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { messages, total };
  }

  async sendMessage(params: {
    spaceId: string;
    senderId: string;
    senderName?: string;
    senderAvatar?: string;
    content: string;
    type?: SpaceMessageType;
    metadata?: Record<string, any>;
  }): Promise<AgentSpaceMessage> {
    const msg = this.msgRepo.create({
      spaceId: params.spaceId,
      senderId: params.senderId,
      senderName: params.senderName,
      senderAvatar: params.senderAvatar,
      content: params.content,
      type: params.type ?? SpaceMessageType.TEXT,
      metadata: params.metadata,
    });
    const saved = await this.msgRepo.save(msg);
    // Touch space updatedAt
    await this.spaceRepo.update(params.spaceId, { updatedAt: new Date() });
    return saved;
  }

  async sendAgentReply(params: {
    spaceId: string;
    agentName: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<AgentSpaceMessage> {
    return this.sendMessage({
      spaceId: params.spaceId,
      senderId: `agent_${params.agentName}`,
      senderName: `🤖 @${params.agentName}`,
      content: params.content,
      type: SpaceMessageType.AGENT_REPLY,
      metadata: params.metadata,
    });
  }

  async sendTaskUpdate(params: {
    spaceId: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<AgentSpaceMessage> {
    return this.sendMessage({
      spaceId: params.spaceId,
      senderId: 'system',
      senderName: 'System',
      content: params.content,
      type: SpaceMessageType.TASK_UPDATE,
      metadata: params.metadata,
    });
  }
}
