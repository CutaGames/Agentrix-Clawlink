/**
 * Error handling tests
 */

import {
  PayMindSDKError,
  PayMindAPIError,
  PayMindValidationError,
  handleError,
} from '../../src/utils/errors';
import { PayMindError } from '../../src/types/common';

describe('Error Handling', () => {
  describe('PayMindSDKError', () => {
    it('should create error with code and message', () => {
      const error = new PayMindSDKError({
        code: 'TEST_ERROR',
        message: 'Test error message',
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PayMindSDKError);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('PayMindSDKError');
    });

    it('should include details if provided', () => {
      const error = new PayMindSDKError({
        code: 'TEST_ERROR',
        message: 'Test error',
        details: { field: 'value' },
      });

      expect(error.details).toEqual({ field: 'value' });
    });
  });

  describe('PayMindAPIError', () => {
    it('should create API error with status code', () => {
      const error = new PayMindAPIError(
        {
          code: 'API_ERROR',
          message: 'API error message',
        },
        404
      );

      expect(error).toBeInstanceOf(PayMindAPIError);
      expect(error).toBeInstanceOf(PayMindSDKError);
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('PayMindAPIError');
    });
  });

  describe('PayMindValidationError', () => {
    it('should create validation error', () => {
      const error = new PayMindValidationError('Validation failed', { field: 'amount' });

      expect(error).toBeInstanceOf(PayMindValidationError);
      expect(error).toBeInstanceOf(PayMindSDKError);
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
      expect(error).toBeInstanceOf(PayMindAPIError);
      expect((error as PayMindAPIError).statusCode).toBe(400);
    });

    it('should handle SDK error', () => {
      const sdkError = new PayMindSDKError({
        code: 'SDK_ERROR',
        message: 'SDK error',
      });

      const error = handleError(sdkError);
      expect(error).toBe(sdkError);
    });

    it('should handle unknown error', () => {
      const unknownError = new Error('Unknown error');
      const error = handleError(unknownError);

      expect(error).toBeInstanceOf(PayMindSDKError);
      expect(error.code).toBe('UNKNOWN_ERROR');
    });
  });
});

