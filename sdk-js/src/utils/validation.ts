/**
 * Validation utilities
 */

import { AgentrixValidationError } from './errors';

export function validateApiKey(apiKey: string): void {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new AgentrixValidationError('API key is required');
  }
}

export function validateAmount(amount: number): void {
  if (typeof amount !== 'number' || amount <= 0) {
    throw new AgentrixValidationError('Amount must be a positive number');
  }
}

export function validateCurrency(currency: string): void {
  if (!currency || typeof currency !== 'string' || currency.length !== 3) {
    throw new AgentrixValidationError('Currency must be a 3-letter code (e.g., USD, CNY)');
  }
}

export function validatePaymentRequest(request: any): void {
  if (!request.amount) {
    throw new AgentrixValidationError('Amount is required');
  }
  validateAmount(request.amount);

  if (!request.currency) {
    throw new AgentrixValidationError('Currency is required');
  }
  validateCurrency(request.currency);

  if (!request.description) {
    throw new AgentrixValidationError('Description is required');
  }
}

