/**
 * Skills Resource for Agentrix SDK
 * 
 * 开发者通过这个模块定义和管理 AX Skills
 * 系统自动将 Skill 转换为各 AI 平台可用的格式
 */

import { AgentrixClient } from '../client';

export interface AXSkillDefinition {
  name: string;
  description: string;
  version?: string;
  category?: 'payment' | 'commerce' | 'data' | 'utility' | 'integration' | 'custom';
  inputSchema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      required?: boolean;
      enum?: string[];
      default?: any;
      minimum?: number;
      maximum?: number;
    }>;
    required: string[];
  };
  outputSchema?: {
    type: 'object';
    properties: Record<string, any>;
  };
  executor: {
    type: 'http' | 'internal';
    endpoint?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    internalHandler?: string;
  };
  pricing?: {
    type: 'free' | 'per_call' | 'subscription';
    pricePerCall?: number;
    currency?: string;
    freeQuota?: number;
  };
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface AXSkill extends AXSkillDefinition {
  id: string;
  status: 'draft' | 'published' | 'deprecated';
  platformSchemas: {
    openai: any;
    claude: any;
    gemini: any;
  };
  authorId?: string;
  callCount: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface SkillExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
  skillId?: string;
  skillName?: string;
}

export interface SkillListResponse {
  success: boolean;
  items: AXSkill[];
  total: number;
  page: number;
  limit: number;
}

export class SkillResource {
  constructor(private client: AgentrixClient) {}

  /**
   * 创建 AX Skill
   * 
   * 开发者只需定义一次，系统自动生成各平台格式
   * 
   * @example
   * ```typescript
   * const skill = await agentrix.skills.create({
   *   name: 'search_products',
   *   description: '搜索商品',
   *   inputSchema: {
   *     type: 'object',
   *     properties: {
   *       query: { type: 'string', description: '搜索关键词' },
   *       maxPrice: { type: 'number', description: '最高价格' }
   *     },
   *     required: ['query']
   *   },
   *   executor: {
   *     type: 'http',
   *     endpoint: 'https://api.myshop.com/search',
   *     method: 'POST'
   *   }
   * });
   * 
   * // 自动生成的各平台 Schema
   * console.log(skill.platformSchemas.openai);  // OpenAI Function
   * console.log(skill.platformSchemas.claude);  // Claude Tool
   * console.log(skill.platformSchemas.gemini);  // Gemini Function
   * ```
   */
  async create(definition: AXSkillDefinition): Promise<AXSkill> {
    const response = await this.client.post<{ success: boolean; data: AXSkill }>(
      '/skills',
      definition
    );
    return response.data;
  }

  /**
   * 获取 Skill 详情
   */
  async get(skillId: string): Promise<AXSkill> {
    const response = await this.client.get<{ success: boolean; data: AXSkill }>(
      `/skills/${skillId}`
    );
    return response.data;
  }

  /**
   * 列出 Skills
   */
  async list(params?: {
    category?: string;
    status?: 'draft' | 'published' | 'deprecated';
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<SkillListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return this.client.get<SkillListResponse>(
      `/skills?${queryParams.toString()}`
    );
  }

  /**
   * 更新 Skill
   */
  async update(skillId: string, updates: Partial<AXSkillDefinition>): Promise<AXSkill> {
    const response = await this.client.put<{ success: boolean; data: AXSkill }>(
      `/skills/${skillId}`,
      updates
    );
    return response.data;
  }

  /**
   * 发布 Skill 到 Marketplace
   * 
   * 发布后，Skill 将对所有 Agent 可用
   */
  async publish(skillId: string): Promise<AXSkill> {
    const response = await this.client.post<{ success: boolean; data: AXSkill }>(
      `/skills/${skillId}/publish`,
      {}
    );
    return response.data;
  }

  /**
   * 删除 Skill
   */
  async delete(skillId: string): Promise<void> {
    await this.client.delete(`/skills/${skillId}`);
  }

  /**
   * 执行 Skill
   */
  async execute(skillId: string, params: any, context?: {
    userId?: string;
    sessionId?: string;
    platform?: string;
  }): Promise<SkillExecutionResult> {
    return this.client.post<SkillExecutionResult>(
      `/skills/${skillId}/execute`,
      { params, context }
    );
  }

  /**
   * 获取指定平台的 Schema
   */
  async getPlatformSchema(skillId: string, platform: 'openai' | 'claude' | 'gemini'): Promise<any> {
    const response = await this.client.get<{ success: boolean; platform: string; schema: any }>(
      `/skills/${skillId}/schema/${platform}`
    );
    return response.schema;
  }

  /**
   * 导出所有已发布 Skills 的 OpenAPI Schema (用于 GPTs)
   * 
   * @example
   * ```typescript
   * const schema = await agentrix.skills.exportOpenAPI();
   * // 可直接用于 GPTs Actions 配置
   * ```
   */
  async exportOpenAPI(baseUrl?: string): Promise<any> {
    const queryParams = baseUrl ? `?baseUrl=${encodeURIComponent(baseUrl)}` : '';
    return this.client.get(`/skills/export/openapi${queryParams}`);
  }

  /**
   * 导出所有已发布 Skills 的 MCP Tools (用于 Claude)
   */
  async exportMCP(): Promise<{ tools: any[]; count: number }> {
    return this.client.get('/skills/export/mcp');
  }

  /**
   * 导出所有已发布 Skills 的 OpenAI Functions
   */
  async exportOpenAI(): Promise<{ functions: any[]; count: number }> {
    return this.client.get('/skills/export/openai');
  }

  /**
   * 导出所有已发布 Skills 的 Gemini Functions
   */
  async exportGemini(): Promise<{ functions: any[]; count: number }> {
    return this.client.get('/skills/export/gemini');
  }
}
