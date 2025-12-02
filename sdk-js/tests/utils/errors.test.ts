/**
 * Error handling tests
 */

import {
  AgentrixSDKError,
  AgentrixAPIError,
  AgentrixValidationError,
  handleError,
} from '../../src/utils/errors';
import { AgentrixError } from '../../src/types/common';

describe('Error Handling', () => {
  describe('AgentrixSDKError', () => {
    it('should create error with code and message', () => {
      const error = new AgentrixSDKError({
        code: 'TEST_ERROR',
        message: 'Test error message',
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AgentrixSDKError);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('AgentrixSDKError');
    });

    it('should include details if provided', () => {
      const error = new AgentrixSDKError({
        code: 'TEST_ERROR',
        message: 'Test error',
        details: { field: 'value' },
      });

      expect(error.details).toEqual({ field: 'value' });
    });
  });

  describe('AgentrixAPIError', () => {
    it('should create API error with status code', () => {
      const error = new AgentrixAPIError(
        {
          code: 'API_ERROR',
          message: 'API error message',
        },
        404
      );

      expect(error).toBeInstanceOf(AgentrixAPIError);
      expect(error).toBeInstanceOf(AgentrixSDKError);
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('AgentrixAPIError');
    });
  });

  describe('AgentrixValidationError', () => {
    it('should create validation error', () => {
      const error = new AgentrixValidationError('Validation failed', { field: 'amount' });

      expect(error).toBeInstanceOf(AgentrixValidationError);
      expect(error).toBeInstanceOf(AgentrixSDKError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Validation failed');
      expect(error.details).toEqual({ field: 'amount' });
    });
  });

  describe('handleError', () => {
    it('should handle API error response', () => {
      const axiosError = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'INVALID_REQUEST',
              message: 'Invalid request',
            },
          },
        },
      };

      const error = handleError(axiosError);
      expect(error).toBeInstanceOf(AgentrixAPIError);
      expect((error as AgentrixAPIError).statusCode).toBe(400);
    });

    it('should handle SDK error', () => {
      const sdkError = new AgentrixSDKError({
        code: 'SDK_ERROR',
        message: 'SDK error',
      });

      const error = handleError(sdkError);
      expect(error).toBe(sdkError);
    });

    it('should handle unknown error', () => {
      const unknownError = new Error('Unknown error');
      const error = handleError(unknownError);

      expect(error).toBeInstanceOf(AgentrixSDKError);
      expect(error.code).toBe('UNKNOWN_ERROR');
    });
  });
});

