/**
 * Agent Template resource for Agentrix SDK
 */

import { AgentrixClient } from '../client';

export interface AgentTemplateSummary {
  id: string;
  name: string;
  description?: string;
  category: string;
  persona?: string;
  tags: string[];
  visibility: 'public' | 'private';
  isFeatured: boolean;
  usageCount: number;
  config?: Record<string, any>;
  prompts?: Record<string, any>;
  createdBy?: string;
  coverImage?: string;
  metadata?: Record<string, any>;
}

export interface TemplateQueryParams {
  search?: string;
  category?: string;
  tag?: string;
  visibility?: 'public' | 'private';
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category: string;
  persona?: string;
  tags?: string[];
  config?: Record<string, any>;
  prompts?: Record<string, any>;
  visibility?: 'public' | 'private';
  isFeatured?: boolean;
}

export interface InstantiateTemplateRequest {
  name: string;
  description?: string;
  settings?: Record<string, any>;
  publish?: boolean;
}

export interface UserAgentSummary {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused';
  isPublished: boolean;
  slug?: string;
  templateId?: string;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class AgentTemplateResource {
  constructor(private client: AgentrixClient) {}

  /**
   * List public agent templates
   */
  async listTemplates(params?: TemplateQueryParams): Promise<AgentTemplateSummary[]> {
    return this.client.get<AgentTemplateSummary[]>('/agent/templates', { params });
  }

  /**
   * List templates created by current user
   */
  async listMyTemplates(): Promise<AgentTemplateSummary[]> {
    return this.client.get<AgentTemplateSummary[]>('/agent/templates/mine');
  }

  /**
   * Create a new agent template
   */
  async createTemplate(payload: CreateTemplateRequest): Promise<AgentTemplateSummary> {
    if (!payload.name || !payload.category) {
      throw new Error('Template name and category are required');
    }
    return this.client.post<AgentTemplateSummary>('/agent/templates', payload);
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    payload: Partial<CreateTemplateRequest>,
  ): Promise<AgentTemplateSummary> {
    if (!templateId) {
      throw new Error('Template ID is required');
    }
    return this.client.put<AgentTemplateSummary>(`/agent/templates/${templateId}`, payload);
  }

  /**
   * Publish a template (make it public & featured)
   */
  async publishTemplate(templateId: string): Promise<AgentTemplateSummary> {
    if (!templateId) {
      throw new Error('Template ID is required');
    }
    return this.client.post<AgentTemplateSummary>(`/agent/templates/${templateId}/publish`);
  }

  /**
   * Instantiate an agent from template
   */
  async instantiateTemplate(
    templateId: string,
    payload: InstantiateTemplateRequest,
  ): Promise<UserAgentSummary> {
    if (!templateId) {
      throw new Error('Template ID is required');
    }
    if (!payload.name) {
      throw new Error('Agent name is required');
    }
    return this.client.post<UserAgentSummary>(
      `/agent/templates/${templateId}/instantiate`,
      payload,
    );
  }

  /**
   * List current user's generated agents
   */
  async listMyAgents(): Promise<UserAgentSummary[]> {
    return this.client.get<UserAgentSummary[]>('/agent/my-agents');
  }
}


