/**
 * Payment resource tests
 */

import { PaymentResource } from '../../src/resources/payments';
import { AgentrixClient } from '../../src/client';
import { CreatePaymentRequest, Payment } from '../../src/types/payment';

describe('PaymentResource', () => {
  let paymentResource: PaymentResource;
  let mockClient: jest.Mocked<AgentrixClient>;

  beforeEach(() => {
    mockClient = {
      post: jest.fn(),
      get: jest.fn(),
    } as any;

    paymentResource = new PaymentResource(mockClient);
  });

  describe('create', () => {
    it('should create payment with valid request', async () => {
      const request: CreatePaymentRequest = {
        amount: 100,
        currency: 'USD',
        description: 'Test payment',
      };

      const mockPayment: Payment = {
        id: 'pay_123',
        userId: 'user_123',
        amount: 100,
        currency: 'USD',
        description: 'Test payment',
        paymentMethod: 'stripe',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (mockClient.post as jest.Mock).mockResolvedValue(mockPayment);

      const result = await paymentResource.create(request);

      expect(mockClient.post).toHaveBeenCalledWith('/payments', request);
      expect(result).toEqual(mockPayment);
    });

    it('should throw error for invalid request', async () => {
      const invalidRequest = {
        amount: 100,
        // missing currency and description
      } as any;

      await expect(paymentResource.create(invalidRequest)).rejects.toThrow();
    });
  });

  describe('get', () => {
    it('should get payment by ID', async () => {
      const paymentId = 'pay_123';
      const mockPayment: Payment = {
        id: paymentId,
        userId: 'user_123',
        amount: 100,
        currency: 'USD',
        description: 'Test payment',
        paymentMethod: 'stripe',
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (mockClient.get as jest.Mock).mockResolvedValue(mockPayment);

      const result = await paymentResource.get(paymentId);

      expect(mockClient.get).toHaveBeenCalledWith(`/payments/${paymentId}`);
      expect(result).toEqual(mockPayment);
    });

    it('should throw error for empty ID', async () => {
      await expect(paymentResource.get('')).rejects.toThrow();
    });
  });

  describe('cancel', () => {
    it('should cancel payment', async () => {
      const paymentId = 'pay_123';
      const mockPayment: Payment = {
        id: paymentId,
        status: 'cancelled',
      } as Payment;

      (mockClient.post as jest.Mock).mockResolvedValue(mockPayment);

      const result = await paymentResource.cancel(paymentId);

      expect(mockClient.post).toHaveBeenCalledWith(`/payments/${paymentId}/cancel`);
      expect(result).toEqual(mockPayment);
    });
  });

  describe('getRouting', () => {
    it('should get payment routing', async () => {
      const params = {
        amount: 100,
        currency: 'USD',
        userCountry: 'US',
        merchantCountry: 'CN',
      };

      const mockRouting = {
        recommendedMethod: 'stripe',
        reason: 'Best option for cross-border payment',
        channels: [],
      };

      (mockClient.get as jest.Mock).mockResolvedValue(mockRouting);

      const result = await paymentResource.getRouting(params);

      expect(mockClient.get).toHaveBeenCalledWith('/payments/routing', {
        params,
      });
      expect(result).toEqual(mockRouting);
    });
  });
});

