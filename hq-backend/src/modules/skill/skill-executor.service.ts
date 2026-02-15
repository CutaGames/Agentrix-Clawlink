/**
 * Skill Executor Service
 * 
 * Agent 智能技能调用引擎
 * - 分析任务，自动选择合适的技能
 * - 执行技能并返回结果
 * - 支持技能链式调用
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { HqSkill, SkillCategory, SkillStatus } from '../../entities/hq-skill.entity';
import { HqAgent } from '../../entities/hq-agent.entity';
import { HqAIService } from '../ai/hq-ai.service';

export interface SkillExecutionContext {
  agentId: string;
  projectId?: string;
  sessionId?: string;
  input: string;
  parameters?: Record<string, any>;
  maxSkillCalls?: number;
}

export interface SkillExecutionResult {
  skillCode: string;
  skillName: string;
  success: boolean;
  output: string;
  tokensUsed?: number;
  executionTime: number;
  metadata?: Record<string, any>;
}

export interface SkillChainResult {
  success: boolean;
  steps: SkillExecutionResult[];
  finalOutput: string;
  totalTokens: number;
  totalTime: number;
}

@Injectable()
export class SkillExecutorService {
  private readonly logger = new Logger(SkillExecutorService.name);

  constructor(
    @InjectRepository(HqSkill)
    private skillRepo: Repository<HqSkill>,
    @InjectRepository(HqAgent)
    private agentRepo: Repository<HqAgent>,
    @Optional() private aiService?: HqAIService,
  ) {}

  /**
   * 分析任务并选择合适的技能
   */
  async analyzeAndSelectSkills(
    agentId: string,
    task: string,
  ): Promise<HqSkill[]> {
    // 获取 Agent 可用的技能
    const agent = await this.agentRepo.findOne({
      where: { id: agentId },
      relations: ['skills'],
    });

    const availableSkills = agent?.skills?.filter(s => s.status === SkillStatus.ACTIVE) || [];
    
    if (availableSkills.length === 0) {
      // 如果 Agent 没有分配技能，使用全局技能
      const globalSkills = await this.skillRepo.find({
        where: { status: SkillStatus.ACTIVE, isActive: true },
      });
      availableSkills.push(...globalSkills);
    }

    if (!this.aiService || availableSkills.length === 0) {
      return availableSkills.slice(0, 3);
    }

    // 使用 AI 分析任务，选择最合适的技能
    const skillDescriptions = availableSkills.map(s => ({
      code: s.code,
      name: s.name,
      description: s.description,
      category: s.category,
      capabilities: s.capabilities,
    }));

    try {
      const result = await this.aiService.chatCompletion(
        [
          {
            role: 'system',
            content: `You are a skill selector. Analyze the task and select the most appropriate skills from the available list.
Return a JSON array of skill codes in order of relevance. Select 1-3 skills maximum.
Only return the JSON array, no explanation.
Example: ["CODE_GEN", "CODE_REVIEW"]`,
          },
          {
            role: 'user',
            content: `Task: ${task}

Available Skills:
${JSON.stringify(skillDescriptions, null, 2)}

Select the most appropriate skills for this task.`,
          },
        ],
        { temperature: 0.2 },
      );

      const selectedCodes = JSON.parse(result.content) as string[];
      const selectedSkills = availableSkills.filter(s => selectedCodes.includes(s.code));
      
      this.logger.log(`Selected skills for task: ${selectedCodes.join(', ')}`);
      return selectedSkills;
    } catch (error) {
      this.logger.warn(`Skill selection failed, using default: ${error.message}`);
      return availableSkills.slice(0, 3);
    }
  }

  /**
   * 执行单个技能
   */
  async executeSkill(
    skill: HqSkill,
    context: SkillExecutionContext,
  ): Promise<SkillExecutionResult> {
    const startTime = Date.now();
    
    try {
      if (!this.aiService) {
        return {
          skillCode: skill.code,
          skillName: skill.name,
          success: false,
          output: 'AI service not available',
          executionTime: Date.now() - startTime,
        };
      }

      // 构建技能执行 prompt
      const systemPrompt = this.buildSkillPrompt(skill);
      
      const result = await this.aiService.chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context.input },
        ],
        {
          temperature: skill.config?.temperature || 0.5,
          maxTokens: skill.config?.maxTokens || 16384,
        },
      );

      // 记录使用统计
      await this.recordUsage(skill.id, true);

      return {
        skillCode: skill.code,
        skillName: skill.name,
        success: true,
        output: result.content,
        tokensUsed: result.usage?.totalTokens,
        executionTime: Date.now() - startTime,
        metadata: {
          model: result.model,
        },
      };
    } catch (error) {
      this.logger.error(`Skill execution failed: ${skill.code}`, error.stack);
      await this.recordUsage(skill.id, false);

      return {
        skillCode: skill.code,
        skillName: skill.name,
        success: false,
        output: `Error: ${error.message}`,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 链式执行多个技能
   */
  async executeSkillChain(
    skills: HqSkill[],
    context: SkillExecutionContext,
  ): Promise<SkillChainResult> {
    const steps: SkillExecutionResult[] = [];
    let currentInput = context.input;
    let totalTokens = 0;
    const startTime = Date.now();

    for (const skill of skills) {
      const result = await this.executeSkill(skill, {
        ...context,
        input: currentInput,
      });

      steps.push(result);
      totalTokens += result.tokensUsed || 0;

      if (!result.success) {
        return {
          success: false,
          steps,
          finalOutput: result.output,
          totalTokens,
          totalTime: Date.now() - startTime,
        };
      }

      // 下一个技能使用当前技能的输出
      currentInput = result.output;
    }

    return {
      success: true,
      steps,
      finalOutput: steps[steps.length - 1]?.output || '',
      totalTokens,
      totalTime: Date.now() - startTime,
    };
  }

  /**
   * 智能执行 - 分析任务并自动调用技能
   */
  async smartExecute(context: SkillExecutionContext): Promise<SkillChainResult> {
    this.logger.log(`Smart execute for agent ${context.agentId}: ${context.input.substring(0, 100)}...`);

    // 1. 分析任务，选择技能
    const skills = await this.analyzeAndSelectSkills(context.agentId, context.input);
    
    if (skills.length === 0) {
      return {
        success: false,
        steps: [],
        finalOutput: 'No suitable skills found for this task',
        totalTokens: 0,
        totalTime: 0,
      };
    }

    // 2. 执行技能链
    return this.executeSkillChain(skills, context);
  }

  /**
   * 直接调用指定技能（供 IDE/CLI 使用）
   */
  async invokeSkill(
    skillCode: string,
    input: string,
    options: {
      agentId?: string;
      parameters?: Record<string, any>;
    } = {},
  ): Promise<SkillExecutionResult> {
    const skill = await this.skillRepo.findOne({
      where: { code: skillCode, isActive: true },
    });

    if (!skill) {
      return {
        skillCode,
        skillName: 'Unknown',
        success: false,
        output: `Skill "${skillCode}" not found`,
        executionTime: 0,
      };
    }

    return this.executeSkill(skill, {
      agentId: options.agentId || 'cli',
      input,
      parameters: options.parameters,
    });
  }

  /**
   * 获取可用技能列表（供 IDE/CLI 使用）
   */
  async listAvailableSkills(): Promise<{
    code: string;
    name: string;
    description: string;
    category: SkillCategory;
    capabilities: string[];
  }[]> {
    const skills = await this.skillRepo.find({
      where: { isActive: true, status: SkillStatus.ACTIVE },
      order: { priority: 'DESC', name: 'ASC' },
    });

    return skills.map(s => ({
      code: s.code,
      name: s.name,
      description: s.description || '',
      category: s.category,
      capabilities: s.capabilities || [],
    }));
  }

  /**
   * 构建技能执行 prompt
   */
  private buildSkillPrompt(skill: HqSkill): string {
    let prompt = skill.systemPrompt || `You are an AI assistant with the ${skill.name} skill.`;

    if (skill.capabilities?.length) {
      prompt += `\n\nYour capabilities: ${skill.capabilities.join(', ')}`;
    }

    if (skill.tools?.length) {
      prompt += `\n\nAvailable tools:\n${skill.tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}`;
    }

    if (skill.examples?.length) {
      prompt += `\n\nExamples:\n${skill.examples.map(e => `Input: ${e.input}\nOutput: ${e.output}`).join('\n\n')}`;
    }

    return prompt;
  }

  /**
   * 记录技能使用统计
   */
  private async recordUsage(skillId: string, success: boolean): Promise<void> {
    try {
      const skill = await this.skillRepo.findOne({ where: { id: skillId } });
      if (skill) {
        skill.usageCount += 1;
        const weight = 0.1;
        skill.successRate = skill.successRate * (1 - weight) + (success ? 1 : 0) * weight;
        await this.skillRepo.save(skill);
      }
    } catch (error) {
      this.logger.warn(`Failed to record skill usage: ${error.message}`);
    }
  }
}
