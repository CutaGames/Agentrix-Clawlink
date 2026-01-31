/**
 * Telegram Bot Service
 * 
 * 通过 Telegram 远程与 Agent 交互
 * - 查看任务进展
 * - 发送指令
 * - 接收通知推送
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HqAgent } from '../../entities/hq-agent.entity';
import { HqProject } from '../../entities/project.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Telegram Bot types
interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface UserSession {
  chatId: number;
  userId: number;
  username?: string;
  currentAgentId?: string;
  currentProjectId?: string;
  lastActivity: Date;
  authorized: boolean;
}

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private botToken: string;
  private apiUrl: string;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastUpdateId = 0;
  private sessions = new Map<number, UserSession>();
  private authorizedUsers: number[] = [];

  constructor(
    private configService: ConfigService,
    @InjectRepository(HqAgent)
    private agentRepo: Repository<HqAgent>,
    @InjectRepository(HqProject)
    private projectRepo: Repository<HqProject>,
    private eventEmitter: EventEmitter2,
  ) {
    this.botToken = this.configService.get('TELEGRAM_BOT_TOKEN', '');
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    
    // 授权用户列表（逗号分隔的 Telegram user IDs）
    const authUsers = this.configService.get('TELEGRAM_AUTHORIZED_USERS', '');
    this.authorizedUsers = authUsers.split(',').filter(Boolean).map(Number);
  }

  async onModuleInit() {
    if (!this.botToken) {
      this.logger.warn('Telegram bot token not configured, bot disabled');
      return;
    }

    try {
      const me = await this.callApi('getMe');
      this.logger.log(`Telegram bot started: @${me.username}`);
      this.startPolling();
      
      // 监听系统事件，推送到 Telegram
      this.setupEventListeners();
    } catch (error) {
      this.logger.error('Failed to start Telegram bot:', error.message);
    }
  }

  async onModuleDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  /**
   * 调用 Telegram API
   */
  private async callApi(method: string, params: Record<string, any> = {}): Promise<any> {
    const response = await fetch(`${this.apiUrl}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.description || 'Telegram API error');
    }
    return data.result;
  }

  /**
   * 发送消息
   */
  async sendMessage(
    chatId: number,
    text: string,
    options: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      replyMarkup?: any;
    } = {},
  ): Promise<void> {
    try {
      await this.callApi('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: options.parseMode || 'HTML',
        reply_markup: options.replyMarkup,
      });
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * 开始轮询更新
   */
  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        const updates = await this.callApi('getUpdates', {
          offset: this.lastUpdateId + 1,
          timeout: 30,
        });

        for (const update of updates) {
          this.lastUpdateId = update.update_id;
          await this.handleUpdate(update);
        }
      } catch (error) {
        this.logger.error(`Polling error: ${error.message}`);
      }
    }, 1000);
  }

  /**
   * 处理更新
   */
  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    if (update.message) {
      await this.handleMessage(update.message);
    } else if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
    }
  }

  /**
   * 处理消息
   */
  private async handleMessage(message: TelegramMessage): Promise<void> {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text || '';

    // 检查授权
    if (!this.isAuthorized(userId)) {
      await this.sendMessage(chatId, '⛔ 未授权访问。请联系管理员获取访问权限。');
      return;
    }

    // 获取或创建会话
    let session = this.sessions.get(chatId);
    if (!session) {
      session = {
        chatId,
        userId,
        username: message.from.username,
        lastActivity: new Date(),
        authorized: true,
      };
      this.sessions.set(chatId, session);
    }
    session.lastActivity = new Date();

    // 处理命令
    if (text.startsWith('/')) {
      await this.handleCommand(chatId, text, session);
    } else {
      await this.handleChatMessage(chatId, text, session);
    }
  }

  /**
   * 处理命令
   */
  private async handleCommand(
    chatId: number,
    text: string,
    session: UserSession,
  ): Promise<void> {
    const [command, ...args] = text.split(' ');

    switch (command) {
      case '/start':
        await this.cmdStart(chatId, session);
        break;

      case '/help':
        await this.cmdHelp(chatId);
        break;

      case '/agents':
        await this.cmdListAgents(chatId);
        break;

      case '/agent':
        await this.cmdSelectAgent(chatId, args[0], session);
        break;

      case '/projects':
        await this.cmdListProjects(chatId);
        break;

      case '/project':
        await this.cmdSelectProject(chatId, args[0], session);
        break;

      case '/status':
        await this.cmdStatus(chatId, session);
        break;

      case '/task':
        await this.cmdSendTask(chatId, args.join(' '), session);
        break;

      case '/skills':
        await this.cmdListSkills(chatId, session);
        break;

      default:
        await this.sendMessage(chatId, '❓ 未知命令。输入 /help 查看帮助。');
    }
  }

  /**
   * /start 命令
   */
  private async cmdStart(chatId: number, session: UserSession): Promise<void> {
    const welcome = `
🤖 <b>欢迎使用 Agentrix HQ Telegram Bot!</b>

您好 ${session.username ? '@' + session.username : '用户'}！

通过此 Bot，您可以：
• 📋 查看 Agent 和项目状态
• 💬 与 Agent 对话交流
• 📝 发送任务指令
• 🔔 接收实时通知

输入 /help 查看完整命令列表。
    `;
    await this.sendMessage(chatId, welcome);
  }

  /**
   * /help 命令
   */
  private async cmdHelp(chatId: number): Promise<void> {
    const help = `
📚 <b>命令列表</b>

<b>Agent 管理</b>
/agents - 列出所有 Agent
/agent [name] - 选择当前 Agent
/skills - 查看 Agent 技能

<b>项目管理</b>
/projects - 列出所有项目
/project [name] - 选择当前项目

<b>交互</b>
/status - 查看当前状态
/task [描述] - 发送任务给 Agent

<b>其他</b>
直接发送消息即可与当前 Agent 对话
    `;
    await this.sendMessage(chatId, help);
  }

  /**
   * /agents 命令
   */
  private async cmdListAgents(chatId: number): Promise<void> {
    const agents = await this.agentRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    if (agents.length === 0) {
      await this.sendMessage(chatId, '📭 暂无 Agent');
      return;
    }

    const statusEmoji: Record<string, string> = {
      idle: '🟢',
      working: '🟡',
      error: '🔴',
      offline: '⚫',
    };

    let text = '🤖 <b>Agent 列表</b>\n\n';
    for (const agent of agents) {
      const emoji = statusEmoji[agent.status] || '⚪';
      text += `${emoji} <b>${agent.name}</b>\n`;
      text += `   类型: ${agent.type || agent.role} | 状态: ${agent.status}\n`;
      if (agent.currentTask) {
        text += `   📝 ${agent.currentTask.substring(0, 50)}...\n`;
      }
      text += '\n';
    }

    text += '使用 /agent [名称] 选择 Agent';
    await this.sendMessage(chatId, text);
  }

  /**
   * /agent 命令
   */
  private async cmdSelectAgent(
    chatId: number,
    name: string,
    session: UserSession,
  ): Promise<void> {
    if (!name) {
      await this.sendMessage(chatId, '❓ 请指定 Agent 名称，例如: /agent Coder');
      return;
    }

    const agent = await this.agentRepo.findOne({
      where: { name, isActive: true },
    });

    if (!agent) {
      await this.sendMessage(chatId, `❌ 未找到 Agent: ${name}`);
      return;
    }

    session.currentAgentId = agent.id;
    await this.sendMessage(
      chatId,
      `✅ 已选择 Agent: <b>${agent.name}</b>\n\n现在您可以直接发送消息与 ${agent.name} 对话。`,
    );
  }

  /**
   * /projects 命令
   */
  private async cmdListProjects(chatId: number): Promise<void> {
    const projects = await this.projectRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    if (projects.length === 0) {
      await this.sendMessage(chatId, '📭 暂无项目');
      return;
    }

    let text = '📁 <b>项目列表</b>\n\n';
    for (const project of projects) {
      text += `• <b>${project.name}</b>\n`;
      text += `  状态: ${project.status} | 进度: ${project.progress || 0}%\n\n`;
    }

    text += '使用 /project [名称] 选择项目';
    await this.sendMessage(chatId, text);
  }

  /**
   * /project 命令
   */
  private async cmdSelectProject(
    chatId: number,
    name: string,
    session: UserSession,
  ): Promise<void> {
    if (!name) {
      await this.sendMessage(chatId, '❓ 请指定项目名称，例如: /project MyProject');
      return;
    }

    const project = await this.projectRepo.findOne({
      where: { name, isActive: true },
    });

    if (!project) {
      await this.sendMessage(chatId, `❌ 未找到项目: ${name}`);
      return;
    }

    session.currentProjectId = project.id;
    await this.sendMessage(
      chatId,
      `✅ 已选择项目: <b>${project.name}</b>\n\n${project.description || ''}`,
    );
  }

  /**
   * /status 命令
   */
  private async cmdStatus(chatId: number, session: UserSession): Promise<void> {
    let text = '📊 <b>当前状态</b>\n\n';

    if (session.currentAgentId) {
      const agent = await this.agentRepo.findOne({
        where: { id: session.currentAgentId },
      });
      if (agent) {
        text += `🤖 当前 Agent: <b>${agent.name}</b>\n`;
        text += `   状态: ${agent.status}\n`;
        if (agent.currentTask) {
          text += `   任务: ${agent.currentTask}\n`;
        }
        text += '\n';
      }
    } else {
      text += '🤖 未选择 Agent\n\n';
    }

    if (session.currentProjectId) {
      const project = await this.projectRepo.findOne({
        where: { id: session.currentProjectId },
      });
      if (project) {
        text += `📁 当前项目: <b>${project.name}</b>\n`;
        text += `   状态: ${project.status}\n`;
        text += `   进度: ${project.progress || 0}%\n`;
      }
    } else {
      text += '📁 未选择项目\n';
    }

    await this.sendMessage(chatId, text);
  }

  /**
   * /task 命令
   */
  private async cmdSendTask(
    chatId: number,
    taskDescription: string,
    session: UserSession,
  ): Promise<void> {
    if (!taskDescription) {
      await this.sendMessage(chatId, '❓ 请描述任务，例如: /task 分析用户数据并生成报告');
      return;
    }

    if (!session.currentAgentId) {
      await this.sendMessage(chatId, '❌ 请先选择 Agent (/agents)');
      return;
    }

    // 发送任务事件
    this.eventEmitter.emit('telegram.task', {
      agentId: session.currentAgentId,
      projectId: session.currentProjectId,
      task: taskDescription,
      chatId,
      userId: session.userId,
    });

    await this.sendMessage(
      chatId,
      `✅ 任务已发送\n\n📝 ${taskDescription}\n\n任务执行中，完成后将通知您。`,
    );
  }

  /**
   * /skills 命令
   */
  private async cmdListSkills(chatId: number, session: UserSession): Promise<void> {
    if (!session.currentAgentId) {
      await this.sendMessage(chatId, '❌ 请先选择 Agent (/agents)');
      return;
    }

    const agent = await this.agentRepo.findOne({
      where: { id: session.currentAgentId },
      relations: ['skills'],
    });

    if (!agent) {
      await this.sendMessage(chatId, '❌ Agent 不存在');
      return;
    }

    const skills = agent.skills || [];
    if (skills.length === 0) {
      await this.sendMessage(chatId, `📭 ${agent.name} 暂无技能`);
      return;
    }

    let text = `🛠️ <b>${agent.name} 的技能</b>\n\n`;
    for (const skill of skills) {
      text += `• <b>${skill.name}</b> (${skill.code})\n`;
      text += `  ${skill.description || ''}\n`;
      text += `  类别: ${skill.category}\n\n`;
    }

    await this.sendMessage(chatId, text);
  }

  /**
   * 处理普通消息（与 Agent 对话）
   */
  private async handleChatMessage(
    chatId: number,
    text: string,
    session: UserSession,
  ): Promise<void> {
    if (!session.currentAgentId) {
      await this.sendMessage(
        chatId,
        '❓ 请先选择 Agent。输入 /agents 查看列表。',
      );
      return;
    }

    // 发送正在处理提示
    await this.sendMessage(chatId, '⏳ 处理中...');

    // 发送聊天事件
    this.eventEmitter.emit('telegram.chat', {
      agentId: session.currentAgentId,
      projectId: session.currentProjectId,
      message: text,
      chatId,
      userId: session.userId,
    });
  }

  /**
   * 处理回调查询
   */
  private async handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
    await this.callApi('answerCallbackQuery', { callback_query_id: query.id });
    
    const data = query.data || '';
    const chatId = query.message?.chat.id;
    
    if (!chatId) return;

    // 处理回调数据
    const [action, ...params] = data.split(':');
    
    switch (action) {
      case 'agent':
        const session = this.sessions.get(chatId);
        if (session) {
          await this.cmdSelectAgent(chatId, params[0], session);
        }
        break;
    }
  }

  /**
   * 检查用户授权
   */
  private isAuthorized(userId: number): boolean {
    // 如果未配置授权列表，允许所有用户
    if (this.authorizedUsers.length === 0) {
      return true;
    }
    return this.authorizedUsers.includes(userId);
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    // 监听 Agent 状态变化
    this.eventEmitter.on('agent.status', async (data: any) => {
      await this.broadcastToSubscribers(
        `🔔 Agent 状态更新\n\n🤖 ${data.agentName}: ${data.status}`,
      );
    });

    // 监听任务完成
    this.eventEmitter.on('task.completed', async (data: any) => {
      const session = [...this.sessions.values()].find(
        s => s.currentAgentId === data.agentId,
      );
      
      if (session) {
        await this.sendMessage(
          session.chatId,
          `✅ 任务完成\n\n📝 ${data.task}\n\n结果:\n${data.result?.substring(0, 1000) || '完成'}`,
        );
      }
    });

    // 监听聊天响应
    this.eventEmitter.on('telegram.chat.response', async (data: any) => {
      await this.sendMessage(data.chatId, data.response);
    });
  }

  /**
   * 广播消息给所有订阅者
   */
  private async broadcastToSubscribers(message: string): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.authorized) {
        await this.sendMessage(session.chatId, message);
      }
    }
  }

  /**
   * 发送通知（供外部调用）
   */
  async sendNotification(
    userId: number,
    message: string,
    options?: { parseMode?: 'HTML' | 'Markdown' },
  ): Promise<void> {
    const session = [...this.sessions.values()].find(s => s.userId === userId);
    if (session) {
      await this.sendMessage(session.chatId, message, options);
    }
  }

  /**
   * 发送告警通知
   */
  async sendAlert(
    level: 'info' | 'warning' | 'error',
    title: string,
    message: string,
  ): Promise<void> {
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨',
    };

    const text = `${emoji[level]} <b>${title}</b>\n\n${message}`;
    await this.broadcastToSubscribers(text);
  }
}
