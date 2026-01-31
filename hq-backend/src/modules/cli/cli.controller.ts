/**
 * CLI Controller
 * 
 * IDE/命令行接口 - 供开发者在终端中调用技能和 Agent
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
} from '@nestjs/common';
import { SkillExecutorService } from '../skill/skill-executor.service';
import { SkillService } from '../skill/skill.service';
import { HqCoreService } from '../core/hq-core.service';

interface CLIInvokeRequest {
  skillCode: string;
  input: string;
  agentId?: string;
  parameters?: Record<string, any>;
}

interface CLIChatRequest {
  agentId: string;
  message: string;
  projectId?: string;
  context?: string;
}

interface CLITaskRequest {
  agentId: string;
  task: string;
  projectId?: string;
  autoSelectSkills?: boolean;
}

@Controller('hq/cli')
export class CLIController {
  constructor(
    private readonly skillExecutor: SkillExecutorService,
    private readonly skillService: SkillService,
    private readonly coreService: HqCoreService,
  ) {}

  /**
   * 列出可用技能
   * GET /api/hq/cli/skills
   * 
   * 用法: curl http://localhost:3005/api/hq/cli/skills
   */
  @Get('skills')
  async listSkills(@Query('category') category?: string) {
    const skills = await this.skillExecutor.listAvailableSkills();
    
    const filtered = category
      ? skills.filter(s => s.category === category)
      : skills;

    return {
      success: true,
      data: filtered,
      usage: 'curl -X POST http://localhost:3005/api/hq/cli/invoke -H "Content-Type: application/json" -d \'{"skillCode": "CODE_GEN", "input": "your task"}\'',
    };
  }

  /**
   * 调用技能
   * POST /api/hq/cli/invoke
   * 
   * 用法: 
   * curl -X POST http://localhost:3005/api/hq/cli/invoke \
   *   -H "Content-Type: application/json" \
   *   -d '{"skillCode": "CODE_GEN", "input": "Create a React component for a login form"}'
   */
  @Post('invoke')
  async invokeSkill(@Body() body: CLIInvokeRequest) {
    const result = await this.skillExecutor.invokeSkill(
      body.skillCode,
      body.input,
      {
        agentId: body.agentId,
        parameters: body.parameters,
      },
    );

    return {
      success: result.success,
      skill: result.skillName,
      output: result.output,
      executionTime: `${result.executionTime}ms`,
      tokensUsed: result.tokensUsed,
    };
  }

  /**
   * 智能执行（自动选择技能）
   * POST /api/hq/cli/execute
   * 
   * 用法:
   * curl -X POST http://localhost:3005/api/hq/cli/execute \
   *   -H "Content-Type: application/json" \
   *   -d '{"agentId": "agent-id", "task": "Review this code and suggest improvements"}'
   */
  @Post('execute')
  async smartExecute(@Body() body: CLITaskRequest) {
    const result = await this.skillExecutor.smartExecute({
      agentId: body.agentId || 'cli-user',
      input: body.task,
      projectId: body.projectId,
    });

    return {
      success: result.success,
      steps: result.steps.map(s => ({
        skill: s.skillName,
        success: s.success,
        time: `${s.executionTime}ms`,
      })),
      output: result.finalOutput,
      totalTime: `${result.totalTime}ms`,
      totalTokens: result.totalTokens,
    };
  }

  /**
   * 与 Agent 对话
   * POST /api/hq/cli/chat
   * 
   * 用法:
   * curl -X POST http://localhost:3005/api/hq/cli/chat \
   *   -H "Content-Type: application/json" \
   *   -d '{"agentId": "agent-id", "message": "How can I optimize this function?"}'
   */
  @Post('chat')
  async chat(@Body() body: CLIChatRequest) {
    // 将单条消息转换为 messages 数组格式
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      { role: 'user', content: body.message },
    ];
    if (body.context) {
      messages.unshift({ role: 'system', content: body.context });
    }

    const result = await this.coreService.chat({
      agentId: body.agentId,
      projectId: body.projectId,
      messages,
    });

    return {
      success: true,
      agentId: body.agentId,
      response: result.content,
      model: result.model,
      tokensUsed: result.tokensUsed,
    };
  }

  /**
   * 列出 Agents
   * GET /api/hq/cli/agents
   */
  @Get('agents')
  async listAgents() {
    const agents = await this.coreService.getAgents();
    return {
      success: true,
      data: agents.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type || a.role,
        role: a.role,
        status: a.status,
        currentTask: a.currentTask,
      })),
    };
  }

  /**
   * 获取 Agent 技能
   * GET /api/hq/cli/agents/:agentId/skills
   */
  @Get('agents/skills')
  async getAgentSkills(@Query('agentId') agentId: string) {
    const skills = await this.skillService.getAgentSkills(agentId);
    return {
      success: true,
      agentId,
      skills: skills.map(s => ({
        code: s.code,
        name: s.name,
        category: s.category,
      })),
    };
  }

  /**
   * 快速代码生成
   * POST /api/hq/cli/codegen
   * 
   * 便捷接口，直接调用代码生成技能
   */
  @Post('codegen')
  async codeGen(
    @Body() body: { prompt: string; language?: string },
  ) {
    const input = body.language
      ? `Generate ${body.language} code: ${body.prompt}`
      : body.prompt;

    const result = await this.skillExecutor.invokeSkill('CODE_GEN', input);

    return {
      success: result.success,
      code: result.output,
      executionTime: `${result.executionTime}ms`,
    };
  }

  /**
   * 快速代码审查
   * POST /api/hq/cli/review
   */
  @Post('review')
  async codeReview(@Body() body: { code: string; focus?: string }) {
    const input = body.focus
      ? `Review this code, focusing on ${body.focus}:\n\n${body.code}`
      : `Review this code:\n\n${body.code}`;

    const result = await this.skillExecutor.invokeSkill('CODE_REVIEW', input);

    return {
      success: result.success,
      review: result.output,
      executionTime: `${result.executionTime}ms`,
    };
  }

  /**
   * 快速数据分析
   * POST /api/hq/cli/analyze
   */
  @Post('analyze')
  async analyze(@Body() body: { data: string; question?: string }) {
    const input = body.question
      ? `Analyze this data and answer: ${body.question}\n\nData:\n${body.data}`
      : `Analyze this data:\n\n${body.data}`;

    const result = await this.skillExecutor.invokeSkill('DATA_ANALYSIS', input);

    return {
      success: result.success,
      analysis: result.output,
      executionTime: `${result.executionTime}ms`,
    };
  }

  /**
   * 健康检查
   * GET /api/hq/cli/health
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'hq-cli',
      version: '1.0.0',
      endpoints: [
        'GET  /api/hq/cli/skills - List available skills',
        'GET  /api/hq/cli/agents - List agents',
        'POST /api/hq/cli/invoke - Invoke a specific skill',
        'POST /api/hq/cli/execute - Smart execute with auto skill selection',
        'POST /api/hq/cli/chat - Chat with an agent',
        'POST /api/hq/cli/codegen - Quick code generation',
        'POST /api/hq/cli/review - Quick code review',
        'POST /api/hq/cli/analyze - Quick data analysis',
      ],
    };
  }
}
