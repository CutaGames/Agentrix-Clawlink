/**
 * Error handling utilities
 */

import { PayMindError } from '../types/common';

export class PayMindSDKError extends Error {
  public code: string;
  public details?: any;

  constructor(error: PayMindError) {
    super(error.message);
    this.name = 'PayMindSDKError';
    this.code = error.code;
    this.details = error.details;
  }
}

export class PayMindAPIError extends PayMindSDKError {
  public statusCode: number;

  constructor(error: PayMindError, statusCode: number) {
    super(error);
    this.name = 'PayMindAPIError';
    this.statusCode = statusCode;
  }
}

export class PayMindValidationError extends PayMindSDKError {
  constructor(message: string, details?: any) {
    super({
      code: 'VALIDATION_ERROR',
      message,
      details,
    });
    this.name = 'PayMindValidationError';
  }
}

export function handleError(error: any): PayMindSDKError {
  if (error.response?.data?.error) {
    return new PayMindAPIError(
      error.response.data.error,
      error.response.status || 500
    );
  }

  if (error instanceof PayMindSDKError) {
    return error;
  }

  return new PayMindSDKError({
    code: 'UNKNOWN_ERROR',
    message: error.message || 'An unknown error occurred',
    details: error,
  });
}

