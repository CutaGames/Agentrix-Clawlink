/**
 * Validation utilities tests
 */

import {
  validateApiKey,
  validateAmount,
  validateCurrency,
  validatePaymentRequest,
} from '../../src/utils/validation';
import { AgentrixValidationError } from '../../src/utils/errors';

describe('Validation Utilities', () => {
  describe('validateApiKey', () => {
    it('should pass with valid API key', () => {
      expect(() => validateApiKey('valid-api-key-123')).not.toThrow();
    });

    it('should throw error for empty API key', () => {
      expect(() => validateApiKey('')).toThrow(AgentrixValidationError);
      expect(() => validateApiKey('   ')).toThrow(AgentrixValidationError);
    });

    it('should throw error for null/undefined API key', () => {
      expect(() => validateApiKey(null as any)).toThrow(AgentrixValidationError);
      expect(() => validateApiKey(undefined as any)).toThrow(AgentrixValidationError);
    });
  });

  describe('validateAmount', () => {
    it('should pass with valid positive amount', () => {
      expect(() => validateAmount(100)).not.toThrow();
      expect(() => validateAmount(0.01)).not.toThrow();
      expect(() => validateAmount(999999)).not.toThrow();
    });

    it('should throw error for zero or negative amount', () => {
      expect(() => validateAmount(0)).toThrow(AgentrixValidationError);
      expect(() => validateAmount(-100)).toThrow(AgentrixValidationError);
    });

    it('should throw error for invalid types', () => {
      expect(() => validateAmount('100' as any)).toThrow(AgentrixValidationError);
      expect(() => validateAmount(null as any)).toThrow(AgentrixValidationError);
    });
  });

  describe('validateCurrency', () => {
    it('should pass with valid 3-letter currency code', () => {
      expect(() => validateCurrency('USD')).not.toThrow();
      expect(() => validateCurrency('CNY')).not.toThrow();
      expect(() => validateCurrency('EUR')).not.toThrow();
    });

    it('should throw error for invalid currency codes', () => {
      expect(() => validateCurrency('US')).toThrow(AgentrixValidationError);
      expect(() => validateCurrency('USDD')).toThrow(AgentrixValidationError);
      expect(() => validateCurrency('')).toThrow(AgentrixValidationError);
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
      expect(() => validatePaymentRequest(invalidRequest)).toThrow(AgentrixValidationError);
    });

    it('should throw error for missing currency', () => {
      const invalidRequest = {
        amount: 100,
        description: 'Test payment',
      };
      expect(() => validatePaymentRequest(invalidRequest)).toThrow(AgentrixValidationError);
    });

    it('should throw error for missing description', () => {
      const invalidRequest = {
        amount: 100,
        currency: 'USD',
      };
      expect(() => validatePaymentRequest(invalidRequest)).toThrow(AgentrixValidationError);
    });
  });
});

