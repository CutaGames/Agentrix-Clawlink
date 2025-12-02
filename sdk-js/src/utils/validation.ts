/**
 * Validation utilities
 */

import { PayMindValidationError } from './errors';

export function validateApiKey(apiKey: string): void {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new PayMindValidationError('API key is required');
  }
}

export function validateAmount(amount: number): void {
  if (typeof amount !== 'number' || amount <= 0) {
    throw new PayMindValidationError('Amount must be a positive number');
  }
}

export function validateCurrency(currency: string): void {
  if (!currency || typeof currency !== 'string' || currency.length !== 3) {
    throw new PayMindValidationError('Currency must be a 3-letter code (e.g., USD, CNY)');
  }
}

export function validatePaymentRequest(request: any): void {
  if (!request.amount) {
    throw new PayMindValidationError('Amount is required');
  }
  validateAmount(request.amount);

  if (!request.currency) {
    throw new PayMindValidationError('Currency is required');
  }
  validateCurrency(request.currency);

  if (!request.description) {
    throw new PayMindValidationError('Description is required');
  }
}

