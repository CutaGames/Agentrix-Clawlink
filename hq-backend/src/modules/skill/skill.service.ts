/**
 * Skill Service
 * 
 * 管理 AI Agent 技能
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { HqSkill, SkillCategory, SkillStatus } from '../../entities/hq-skill.entity';
import { HqAgent } from '../../entities/hq-agent.entity';

export interface CreateSkillDto {
  name: string;
  code: string;
  description?: string;
  category?: SkillCategory;
  systemPrompt?: string;
  parameters?: {
    required?: string[];
    optional?: string[];
    defaults?: Record<string, any>;
  };
  capabilities?: string[];
  tools?: {
    name: string;
    description: string;
    schema: Record<string, any>;
  }[];
  examples?: {
    input: string;
    output: string;
    description?: string;
  }[];
  config?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
    timeout?: number;
  };
  priority?: number;
}

export interface UpdateSkillDto extends Partial<CreateSkillDto> {
  status?: SkillStatus;
}

@Injectable()
export class SkillService {
  private readonly logger = new Logger(SkillService.name);

  constructor(
    @InjectRepository(HqSkill)
    private skillRepo: Repository<HqSkill>,
    @InjectRepository(HqAgent)
    private agentRepo: Repository<HqAgent>,
  ) {
    this.initializeDefaultSkills();
  }

  /**
   * 初始化默认技能
   */
  private async initializeDefaultSkills(): Promise<void> {
    const defaultSkills: CreateSkillDto[] = [
      {
        name: 'Code Generation',
        code: 'CODE_GEN',
        category: SkillCategory.DEVELOPMENT,
        description: 'Generate code based on requirements',
        systemPrompt: 'You are an expert programmer. Generate clean, efficient, and well-documented code.',
        capabilities: ['typescript', 'python', 'javascript', 'sql'],
        config: { temperature: 0.3 },
      },
      {
        name: 'Code Review',
        code: 'CODE_REVIEW',
        category: SkillCategory.DEVELOPMENT,
        description: 'Review code for bugs, security issues, and best practices',
        systemPrompt: 'You are a senior code reviewer. Analyze code for bugs, security issues, performance, and adherence to best practices.',
        capabilities: ['bug-detection', 'security-audit', 'performance-analysis'],
        config: { temperature: 0.2 },
      },
      {
        name: 'Data Analysis',
        code: 'DATA_ANALYSIS',
        category: SkillCategory.ANALYSIS,
        description: 'Analyze data and provide insights',
        systemPrompt: 'You are a data analyst. Analyze data patterns, trends, and provide actionable insights.',
        capabilities: ['statistics', 'visualization', 'trend-analysis'],
        config: { temperature: 0.4 },
      },
      {
        name: 'Business Strategy',
        code: 'BIZ_STRATEGY',
        category: SkillCategory.MANAGEMENT,
        description: 'Provide business strategy recommendations',
        systemPrompt: 'You are a business strategist. Analyze market conditions and provide strategic recommendations.',
        capabilities: ['market-analysis', 'competitive-analysis', 'growth-strategy'],
        config: { temperature: 0.5 },
      },
      {
        name: 'Content Writing',
        code: 'CONTENT_WRITE',
        category: SkillCategory.CREATIVITY,
        description: 'Write content for various purposes',
        systemPrompt: 'You are a professional content writer. Create engaging, clear, and purposeful content.',
        capabilities: ['blog', 'documentation', 'marketing', 'technical'],
        config: { temperature: 0.7 },
      },
      {
        name: 'Task Automation',
        code: 'AUTOMATION',
        category: SkillCategory.AUTOMATION,
        description: 'Automate repetitive tasks',
        systemPrompt: 'You are an automation specialist. Design and implement automated workflows.',
        capabilities: ['workflow', 'scheduling', 'integration'],
        config: { temperature: 0.3 },
      },
      {
        name: 'API Integration',
        code: 'API_INTEGRATION',
        category: SkillCategory.INTEGRATION,
        description: 'Integrate with external APIs',
        systemPrompt: 'You are an API integration expert. Design and implement robust API integrations.',
        capabilities: ['rest', 'graphql', 'webhook', 'oauth'],
        config: { temperature: 0.3 },
      },
      {
        name: 'Research',
        code: 'RESEARCH',
        category: SkillCategory.RESEARCH,
        description: 'Conduct research and gather information',
        systemPrompt: 'You are a research analyst. Gather, analyze, and synthesize information from various sources.',
        capabilities: ['web-search', 'document-analysis', 'summarization'],
        config: { temperature: 0.4 },
      },
      // Social Media & Communication Skills
      {
        name: 'Twitter/X Management',
        code: 'TWITTER_MGMT',
        category: SkillCategory.COMMUNICATION,
        description: 'Manage Twitter/X account - post tweets, analyze engagement, schedule content',
        systemPrompt: `You are a Twitter/X social media manager. You can:
1. Compose engaging tweets (max 280 chars)
2. Analyze trending topics and hashtags
3. Draft thread content for complex topics
4. Suggest optimal posting times
5. Create engagement strategies
When composing tweets, be concise, engaging, and include relevant hashtags.`,
        capabilities: ['tweet-compose', 'thread-creation', 'hashtag-analysis', 'engagement-strategy'],
        config: { temperature: 0.7, maxTokens: 1000 },
      },
      {
        name: 'Discord Management',
        code: 'DISCORD_MGMT',
        category: SkillCategory.COMMUNICATION,
        description: 'Manage Discord server - send messages, moderate, create announcements',
        systemPrompt: `You are a Discord community manager. You can:
1. Compose server announcements
2. Draft channel messages with proper formatting (markdown, embeds)
3. Create welcome messages and onboarding content
4. Suggest moderation strategies
5. Design community engagement activities
Use Discord markdown formatting when appropriate.`,
        capabilities: ['announcement', 'message-compose', 'embed-creation', 'moderation'],
        config: { temperature: 0.6, maxTokens: 2000 },
      },
      {
        name: 'Telegram Management',
        code: 'TELEGRAM_MGMT',
        category: SkillCategory.COMMUNICATION,
        description: 'Manage Telegram - send messages, alerts, channel updates',
        systemPrompt: `You are a Telegram communications manager. You can:
1. Compose channel announcements
2. Create formatted messages with Telegram HTML/Markdown
3. Draft bot responses
4. Schedule message content
5. Design engagement campaigns
Support Telegram-specific formatting like bold, italic, links, and inline buttons.`,
        capabilities: ['message-compose', 'announcement', 'bot-response', 'notification'],
        config: { temperature: 0.5, maxTokens: 1500 },
      },
      {
        name: 'Email Composition',
        code: 'EMAIL_COMPOSE',
        category: SkillCategory.COMMUNICATION,
        description: 'Compose professional emails - newsletters, notifications, business communications',
        systemPrompt: `You are a professional email writer. You can:
1. Compose business emails with proper structure
2. Write marketing newsletters
3. Draft notification emails
4. Create email sequences
5. Personalize email content
Always maintain professional tone and include clear call-to-actions when appropriate.`,
        capabilities: ['business-email', 'newsletter', 'notification', 'marketing'],
        config: { temperature: 0.5, maxTokens: 2000 },
      },
    ];

    for (const skillData of defaultSkills) {
      const existing = await this.skillRepo.findOne({ where: { code: skillData.code } });
      if (!existing) {
        await this.skillRepo.save(this.skillRepo.create(skillData));
        this.logger.log(`Created default skill: ${skillData.name}`);
      }
    }
  }

  /**
   * 创建技能
   */
  async createSkill(dto: CreateSkillDto): Promise<HqSkill> {
    const existing = await this.skillRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new BadRequestException(`Skill with code "${dto.code}" already exists`);
    }

    const skill = this.skillRepo.create(dto);
    return this.skillRepo.save(skill);
  }

  /**
   * 获取所有技能
   */
  async getAllSkills(options: { category?: SkillCategory; status?: SkillStatus } = {}): Promise<HqSkill[]> {
    const where: any = { isActive: true };
    
    if (options.category) {
      where.category = options.category;
    }
    if (options.status) {
      where.status = options.status;
    }

    return this.skillRepo.find({ 
      where, 
      order: { priority: 'DESC', name: 'ASC' },
    });
  }

  /**
   * 获取单个技能
   */
  async getSkill(skillId: string): Promise<HqSkill> {
    const skill = await this.skillRepo.findOne({ 
      where: { id: skillId },
      relations: ['agents'],
    });
    if (!skill) {
      throw new NotFoundException(`Skill ${skillId} not found`);
    }
    return skill;
  }

  /**
   * 通过代码获取技能
   */
  async getSkillByCode(code: string): Promise<HqSkill | null> {
    return this.skillRepo.findOne({ where: { code } });
  }

  /**
   * 更新技能
   */
  async updateSkill(skillId: string, dto: UpdateSkillDto): Promise<HqSkill> {
    const skill = await this.getSkill(skillId);
    Object.assign(skill, dto);
    return this.skillRepo.save(skill);
  }

  /**
   * 删除技能
   */
  async deleteSkill(skillId: string): Promise<void> {
    await this.skillRepo.update(skillId, { isActive: false });
  }

  /**
   * 为 Agent 分配技能
   */
  async assignSkillsToAgent(agentId: string, skillIds: string[]): Promise<HqAgent> {
    const agent = await this.agentRepo.findOne({ 
      where: { id: agentId },
      relations: ['skills'],
    });
    if (!agent) {
      throw new NotFoundException(`Agent ${agentId} not found`);
    }

    const skills = await this.skillRepo.find({ 
      where: { id: In(skillIds), isActive: true },
    });

    agent.skills = skills;
    return this.agentRepo.save(agent);
  }

  /**
   * 获取 Agent 的技能
   */
  async getAgentSkills(agentId: string): Promise<HqSkill[]> {
    const agent = await this.agentRepo.findOne({ 
      where: { id: agentId },
      relations: ['skills'],
    });
    if (!agent) {
      throw new NotFoundException(`Agent ${agentId} not found`);
    }
    return agent.skills || [];
  }

  /**
   * 记录技能使用
   */
  async recordSkillUsage(skillId: string, success: boolean): Promise<void> {
    const skill = await this.skillRepo.findOne({ where: { id: skillId } });
    if (!skill) return;

    skill.usageCount += 1;
    
    // 更新成功率（简单移动平均）
    const weight = 0.1;
    skill.successRate = skill.successRate * (1 - weight) + (success ? 1 : 0) * weight;
    
    await this.skillRepo.save(skill);
  }

  /**
   * 获取技能统计
   */
  async getSkillStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    topUsed: HqSkill[];
  }> {
    const skills = await this.skillRepo.find({ where: { isActive: true } });
    
    const byCategory: Record<string, number> = {};
    for (const skill of skills) {
      byCategory[skill.category] = (byCategory[skill.category] || 0) + 1;
    }

    const topUsed = skills
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);

    return {
      total: skills.length,
      byCategory,
      topUsed,
    };
  }
}
