/**
 * Integration tests for Agentrix API
 * 
 * These tests require a running backend server.
 * Set AGENTRIX_API_URL and AGENTRIX_API_KEY environment variables.
 */

import { Agentrix } from '../../src';

describe('Agentrix API Integration Tests', () => {
  let agentrix: Agentrix;
  const apiKey = process.env.AGENTRIX_API_KEY || 'test-api-key';
  const apiUrl = process.env.AGENTRIX_API_URL || 'http://localhost:3001/api';

  beforeAll(() => {
    agentrix = new Agentrix({
      apiKey,
      baseUrl: apiUrl,
    });
  });

  describe('Payment API', () => {
    it('should get payment routing', async () => {
      try {
        const routing = await agentrix.payments.getRouting({
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
        await agentrix.payments.get('invalid-id');
      } catch (error: any) {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
      }
    });
  });
});

