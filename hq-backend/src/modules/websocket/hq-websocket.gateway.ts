/**
 * HQ WebSocket Gateway
 * 
 * 实时通信网关
 * - Agent 状态推送
 * - 任务进度更新
 * - 告警通知
 * - 聊天消息
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

interface ClientInfo {
  id: string;
  userId?: string;
  subscribedAgents: Set<string>;
  subscribedProjects: Set<string>;
  connectedAt: Date;
}

@WebSocketGateway({
  namespace: '/hq',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class HqWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(HqWebSocketGateway.name);
  private clients = new Map<string, ClientInfo>();

  constructor(private eventEmitter: EventEmitter2) {}

  /**
   * 客户端连接
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    this.clients.set(client.id, {
      id: client.id,
      subscribedAgents: new Set(),
      subscribedProjects: new Set(),
      connectedAt: new Date(),
    });

    client.emit('connected', {
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 客户端断开
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clients.delete(client.id);
  }

  /**
   * 用户认证
   */
  @SubscribeMessage('auth')
  handleAuth(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; token?: string },
  ) {
    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      clientInfo.userId = data.userId;
      // TODO: 验证 token
    }

    client.emit('auth:success', { userId: data.userId });
    this.logger.log(`Client ${client.id} authenticated as ${data.userId}`);
  }

  /**
   * 订阅 Agent 状态
   */
  @SubscribeMessage('subscribe:agent')
  handleSubscribeAgent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { agentId: string },
  ) {
    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      clientInfo.subscribedAgents.add(data.agentId);
      client.join(`agent:${data.agentId}`);
    }

    client.emit('subscribed', { type: 'agent', id: data.agentId });
    this.logger.debug(`Client ${client.id} subscribed to agent ${data.agentId}`);
  }

  /**
   * 取消订阅 Agent
   */
  @SubscribeMessage('unsubscribe:agent')
  handleUnsubscribeAgent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { agentId: string },
  ) {
    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      clientInfo.subscribedAgents.delete(data.agentId);
      client.leave(`agent:${data.agentId}`);
    }

    client.emit('unsubscribed', { type: 'agent', id: data.agentId });
  }

  /**
   * 订阅项目
   */
  @SubscribeMessage('subscribe:project')
  handleSubscribeProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      clientInfo.subscribedProjects.add(data.projectId);
      client.join(`project:${data.projectId}`);
    }

    client.emit('subscribed', { type: 'project', id: data.projectId });
  }

  /**
   * 发送聊天消息
   */
  @SubscribeMessage('chat:message')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      agentId: string;
      message: string;
      sessionId?: string;
    },
  ) {
    const clientInfo = this.clients.get(client.id);
    
    // 广播给同一 Agent 的所有订阅者
    this.server.to(`agent:${data.agentId}`).emit('chat:message', {
      from: clientInfo?.userId || client.id,
      agentId: data.agentId,
      message: data.message,
      timestamp: new Date().toISOString(),
    });

    // 发送事件让 Agent 处理
    this.eventEmitter.emit('ws.chat', {
      clientId: client.id,
      userId: clientInfo?.userId,
      ...data,
    });
  }

  /**
   * 发送任务
   */
  @SubscribeMessage('task:send')
  async handleSendTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      agentId: string;
      task: string;
      projectId?: string;
      priority?: number;
    },
  ) {
    const clientInfo = this.clients.get(client.id);

    // 确认收到任务
    client.emit('task:received', {
      taskId: `task_${Date.now()}`,
      agentId: data.agentId,
      timestamp: new Date().toISOString(),
    });

    // 发送事件
    this.eventEmitter.emit('ws.task', {
      clientId: client.id,
      userId: clientInfo?.userId,
      ...data,
    });
  }

  /**
   * 调用技能
   */
  @SubscribeMessage('skill:invoke')
  async handleInvokeSkill(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      skillCode: string;
      input: string;
      agentId?: string;
      parameters?: Record<string, any>;
    },
  ) {
    const clientInfo = this.clients.get(client.id);

    // 确认收到
    client.emit('skill:invoking', {
      skillCode: data.skillCode,
      timestamp: new Date().toISOString(),
    });

    // 发送事件
    this.eventEmitter.emit('ws.skill', {
      clientId: client.id,
      userId: clientInfo?.userId,
      ...data,
    });
  }

  // ===== 事件监听 - 推送到客户端 =====

  /**
   * Agent 状态变化
   */
  @OnEvent('agent.status')
  handleAgentStatusChange(data: {
    agentId: string;
    agentName: string;
    status: string;
    currentTask?: string;
  }) {
    this.server.to(`agent:${data.agentId}`).emit('agent:status', data);
    this.server.emit('agent:status:global', data);
  }

  /**
   * 任务进度更新
   */
  @OnEvent('task.progress')
  handleTaskProgress(data: {
    taskId: string;
    agentId: string;
    progress: number;
    message?: string;
  }) {
    this.server.to(`agent:${data.agentId}`).emit('task:progress', data);
  }

  /**
   * 任务完成
   */
  @OnEvent('task.completed')
  handleTaskCompleted(data: {
    taskId: string;
    agentId: string;
    result: any;
  }) {
    this.server.to(`agent:${data.agentId}`).emit('task:completed', data);
  }

  /**
   * 技能执行结果
   */
  @OnEvent('skill.result')
  handleSkillResult(data: {
    clientId: string;
    skillCode: string;
    success: boolean;
    output: string;
    executionTime: number;
  }) {
    const client = this.server.sockets.sockets.get(data.clientId);
    if (client) {
      client.emit('skill:result', data);
    }
  }

  /**
   * 聊天响应
   */
  @OnEvent('chat.response')
  handleChatResponse(data: {
    clientId: string;
    agentId: string;
    response: string;
    model?: string;
  }) {
    const client = this.server.sockets.sockets.get(data.clientId);
    if (client) {
      client.emit('chat:response', data);
    }

    // 也广播给同一 Agent 的订阅者
    this.server.to(`agent:${data.agentId}`).emit('chat:response:broadcast', data);
  }

  /**
   * 告警通知
   */
  @OnEvent('alert')
  handleAlert(data: {
    level: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    agentId?: string;
    projectId?: string;
  }) {
    if (data.agentId) {
      this.server.to(`agent:${data.agentId}`).emit('alert', data);
    } else if (data.projectId) {
      this.server.to(`project:${data.projectId}`).emit('alert', data);
    } else {
      this.server.emit('alert', data);
    }
  }

  /**
   * 项目更新
   */
  @OnEvent('project.update')
  handleProjectUpdate(data: {
    projectId: string;
    status?: string;
    progress?: number;
    message?: string;
  }) {
    this.server.to(`project:${data.projectId}`).emit('project:update', data);
  }

  // ===== 工具方法 =====

  /**
   * 获取在线客户端数量
   */
  getOnlineCount(): number {
    return this.clients.size;
  }

  /**
   * 获取 Agent 订阅者数量
   */
  getAgentSubscriberCount(agentId: string): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.subscribedAgents.has(agentId)) {
        count++;
      }
    }
    return count;
  }

  /**
   * 广播消息给所有客户端
   */
  broadcast(event: string, data: any): void {
    this.server.emit(event, data);
  }

  /**
   * 发送消息给特定用户
   */
  sendToUser(userId: string, event: string, data: any): void {
    for (const [clientId, info] of this.clients) {
      if (info.userId === userId) {
        const client = this.server.sockets.sockets.get(clientId);
        if (client) {
          client.emit(event, data);
        }
      }
    }
  }
}
