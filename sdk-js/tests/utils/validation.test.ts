/**
 * Validation utilities tests
 */

import {
  validateApiKey,
  validateAmount,
  validateCurrency,
  validatePaymentRequest,
} from '../../src/utils/validation';
import { PayMindValidationError } from '../../src/utils/errors';

describe('Validation Utilities', () => {
  describe('validateApiKey', () => {
    it('should pass with valid API key', () => {
      expect(() => validateApiKey('valid-api-key-123')).not.toThrow();
    });

    it('should throw error for empty API key', () => {
      expect(() => validateApiKey('')).toThrow(PayMindValidationError);
      expect(() => validateApiKey('   ')).toThrow(PayMindValidationError);
    });

    it('should throw error for null/undefined API key', () => {
      expect(() => validateApiKey(null as any)).toThrow(PayMindValidationError);
      expect(() => validateApiKey(undefined as any)).toThrow(PayMindValidationError);
    });
  });

  describe('validateAmount', () => {
    it('should pass with valid positive amount', () => {
      expect(() => validateAmount(100)).not.toThrow();
      expect(() => validateAmount(0.01)).not.toThrow();
      expect(() => validateAmount(999999)).not.toThrow();
    });

    it('should throw error for zero or negative amount', () => {
      expect(() => validateAmount(0)).toThrow(PayMindValidationError);
      expect(() => validateAmount(-100)).toThrow(PayMindValidationError);
    });

    it('should throw error for invalid types', () => {
      expect(() => validateAmount('100' as any)).toThrow(PayMindValidationError);
      expect(() => validateAmount(null as any)).toThrow(PayMindValidationError);
    });
  });

  describe('validateCurrency', () => {
    it('should pass with valid 3-letter currency code', () => {
      expect(() => validateCurrency('USD')).not.toThrow();
      expect(() => validateCurrency('CNY')).not.toThrow();
      expect(() => validateCurrency('EUR')).not.toThrow();
    });

    it('should throw error for invalid currency codes', () => {
      expect(() => validateCurrency('US')).toThrow(PayMindValidationError);
      expect(() => validateCurrency('USDD')).toThrow(PayMindValidationError);
      expect(() => validateCurrency('')).toThrow(PayMindValidationError);
    });
  });

  describe('validatePaymentRequest', () => {
    it('should pass with valid payment request', () => {
      const validRequest = {
        amount: 100,
        currency: 'USD',
        description: 'Test payment',
      };
      expect(() => validatePaymentRequest(validRequest)).not.toThrow();
    });

    it('should throw error for missing amount', () => {
      const invalidRequest = {
        currency: 'USD',
        description: 'Test payment',
      };
      expect(() => validatePaymentRequest(invalidRequest)).toThrow(PayMindValidationError);
    });

    it('should throw error for missing currency', () => {
      const invalidRequest = {
        amount: 100,
        description: 'Test payment',
      };
      expect(() => validatePaymentRequest(invalidRequest)).toThrow(PayMindValidationError);
    });

    it('should throw error for missing description', () => {
      const invalidRequest = {
        amount: 100,
        currency: 'USD',
      };
      expect(() => validatePaymentRequest(invalidRequest)).toThrow(PayMindValidationError);
    });
  });
});

