/**
 * Common types for PayMind SDK
 */

export interface PayMindConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  webhookSecret?: string;
}

export interface PayMindResponse<T = any> {
  success: boolean;
  data?: T;
  error?: PayMindError;
  timestamp: string;
}

export interface PayMindError {
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

