/**
 * Error handling utilities
 */

import { AgentrixError } from '../types/common';

export class AgentrixSDKError extends Error {
  public code: string;
  public details?: any;

  constructor(error: AgentrixError) {
    super(error.message);
    this.name = 'AgentrixSDKError';
    this.code = error.code;
    this.details = error.details;
  }
}

export class AgentrixAPIError extends AgentrixSDKError {
  public statusCode: number;

  constructor(error: AgentrixError, statusCode: number) {
    super(error);
    this.name = 'AgentrixAPIError';
    this.statusCode = statusCode;
  }
}

export class AgentrixValidationError extends AgentrixSDKError {
  constructor(message: string, details?: any) {
    super({
      code: 'VALIDATION_ERROR',
      message,
      details,
    });
    this.name = 'AgentrixValidationError';
  }
}

export function handleError(error: any): AgentrixSDKError {
  if (error.response?.data?.error) {
    return new AgentrixAPIError(
      error.response.data.error,
      error.response.status || 500
    );
  }

  if (error instanceof AgentrixSDKError) {
    return error;
  }

  return new AgentrixSDKError({
    code: 'UNKNOWN_ERROR',
    message: error.message || 'An unknown error occurred',
    details: error,
  });
}

