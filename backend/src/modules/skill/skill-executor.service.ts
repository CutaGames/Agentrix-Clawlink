/**
 * Skill Executor Service
 * 
 * 执行 Skill 的统一入口
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Skill } from '../../entities/skill.entity';
import { SkillService } from './skill.service';
import axios from 'axios';

export interface ExecutionContext {
  userId?: string;
  sessionId?: string;
  apiKey?: string;
  platform?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
  skillId?: string;
  skillName?: string;
}

@Injectable()
export class SkillExecutorService {
  private readonly logger = new Logger(SkillExecutorService.name);

  // 内部处理器注册表
  private readonly internalHandlers: Map<string, (params: any, context: ExecutionContext) => Promise<any>> = new Map();

  constructor(private readonly skillService: SkillService) {
    this.registerDefaultHandlers();
  }

  /**
   * 执行 Skill
   */
  async execute(skillId: string, params: any, context: ExecutionContext = {}): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      const skill = await this.skillService.findById(skillId);

      // 验证参数
      this.validateParams(skill, params);

      // 执行
      let result: any;
      if (skill.executor.type === 'http') {
        result = await this.executeHttpSkill(skill, params, context);
      } else if (skill.executor.type === 'internal') {
        result = await this.executeInternalSkill(skill, params, context);
      } else {
        throw new BadRequestException(`Unknown executor type: ${skill.executor.type}`);
      }

      // 更新调用计数
      await this.skillService.incrementCallCount(skillId);

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
        skillId: skill.id,
        skillName: skill.name,
      };
    } catch (error: any) {
      this.logger.error(`Skill execution failed: ${skillId}`, error.stack);
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
        skillId,
      };
    }
  }

  /**
   * 执行 HTTP Skill
   */
  private async executeHttpSkill(skill: Skill, params: any, context: ExecutionContext): Promise<any> {
    const { endpoint, method = 'POST', headers = {} } = skill.executor;

    if (!endpoint) {
      throw new BadRequestException('HTTP executor requires endpoint');
    }

    const response = await axios({
      method: method.toLowerCase(),
      url: endpoint,
      data: params,
      headers: {
        'Content-Type': 'application/json',
        'X-Agentrix-Context': JSON.stringify(context),
        ...headers,
      },
      timeout: 30000, // 30 秒超时
    });

    return response.data;
  }

  /**
   * 执行内部 Skill
   */
  private async executeInternalSkill(skill: Skill, params: any, context: ExecutionContext): Promise<any> {
    const handlerName = skill.executor.internalHandler;

    if (!handlerName) {
      throw new BadRequestException('Internal executor requires handler name');
    }

    const handler = this.internalHandlers.get(handlerName);
    if (!handler) {
      throw new BadRequestException(`Internal handler not found: ${handlerName}`);
    }

    return handler(params, context);
  }

  /**
   * 注册内部处理器
   */
  registerHandler(name: string, handler: (params: any, context: ExecutionContext) => Promise<any>): void {
    this.internalHandlers.set(name, handler);
    this.logger.log(`Registered internal handler: ${name}`);
  }

  /**
   * 验证参数
   */
  private validateParams(skill: Skill, params: any): void {
    const { required = [] } = skill.inputSchema;

    for (const field of required) {
      if (params[field] === undefined || params[field] === null) {
        throw new BadRequestException(`Missing required parameter: ${field}`);
      }
    }
  }

  /**
   * 注册默认处理器
   */
  private registerDefaultHandlers(): void {
    // 搜索商品
    this.registerHandler('search_products', async (params, context) => {
      // 这里会调用实际的商品搜索服务
      return {
        products: [],
        total: 0,
        message: 'Search handler - integrate with ProductService',
      };
    });

    // 创建订单
    this.registerHandler('create_order', async (params, context) => {
      return {
        orderId: 'mock_order_id',
        status: 'created',
        message: 'Order handler - integrate with OrderService',
      };
    });

    // 查询余额
    this.registerHandler('get_balance', async (params, context) => {
      return {
        balance: 0,
        currency: 'USDT',
        message: 'Balance handler - integrate with WalletService',
      };
    });

    // Echo 测试处理器
    this.registerHandler('echo', async (params, context) => {
      return {
        echo: params,
        context: {
          userId: context.userId,
          platform: context.platform,
        },
        timestamp: new Date().toISOString(),
      };
    });
  }
}
