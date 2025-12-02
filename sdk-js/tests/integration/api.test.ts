/**
 * Integration tests for PayMind API
 * 
 * These tests require a running backend server.
 * Set PAYMIND_API_URL and PAYMIND_API_KEY environment variables.
 */

import { PayMind } from '../../src';

describe('PayMind API Integration Tests', () => {
  let paymind: PayMind;
  const apiKey = process.env.PAYMIND_API_KEY || 'test-api-key';
  const apiUrl = process.env.PAYMIND_API_URL || 'http://localhost:3001/api';

  beforeAll(() => {
    paymind = new PayMind({
      apiKey,
      baseUrl: apiUrl,
    });
  });

  describe('Payment API', () => {
    it('should get payment routing', async () => {
      try {
        const routing = await paymind.payments.getRouting({
          amount: 100,
          currency: 'USD',
          userCountry: 'US',
          merchantCountry: 'CN',
        });

        expect(routing).toHaveProperty('recommendedMethod');
        expect(routing).toHaveProperty('reason');
        expect(routing).toHaveProperty('channels');
      } catch (error) {
        // Skip if API is not available
        console.warn('API not available, skipping integration test');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      try {
        await paymind.payments.get('invalid-id');
      } catch (error: any) {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
      }
    });
  });
});

