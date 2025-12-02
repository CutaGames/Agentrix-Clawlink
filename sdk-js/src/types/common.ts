/**
 * Common types for Agentrix SDK
 */

export interface AgentrixConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  webhookSecret?: string;
}

export interface AgentrixResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AgentrixError;
  timestamp: string;
}

export interface AgentrixError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

