/**
 * Managed Signing resource for PayMind SDK
 * 
 * Provides managed signing capabilities for:
 * - AI Agent automatic payments
 * - Subscription recurring charges
 * - Machine-to-machine payments
 */

import { PayMindClient } from '../client';

export interface CreateManagedWalletRequest {
  userId: string;
  agentId?: string;
  dailyLimit: number;
  singleLimit: number;
  currency: string;
  chain?: string;
  metadata?: Record<string, any>;
}

export interface ManagedWallet {
  id: string;
  userId: string;
  agentId?: string;
  walletAddress: string;
  dailyLimit: number;
  singleLimit: number;
  usedToday: number;
  currency: string;
  chain?: string;
  status: 'active' | 'suspended' | 'revoked';
  riskScore?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface IntentSignatureRequest {
  managedWalletId: string;
  intent: {
    type: 'payment' | 'subscription' | 'api_call';
    amount: number;
    currency: string;
    recipient: string;
    description: string;
    metadata?: Record<string, any>;
  };
}

export interface IntentSignature {
  id: string;
  managedWalletId: string;
  intent: IntentSignatureRequest['intent'];
  signature: string;
  status: 'pending' | 'approved' | 'rejected';
  riskCheck: {
    passed: boolean;
    riskScore: number;
    reasons?: string[];
  };
  createdAt: string;
}

export class ManagedSigningResource {
  constructor(private client: PayMindClient) {}

  /**
   * Create a managed wallet (Signer Wallet)
   */
  async createManagedWallet(request: CreateManagedWalletRequest): Promise<ManagedWallet> {
    if (!request.userId) {
      throw new Error('User ID is required');
    }
    if (!request.dailyLimit || request.dailyLimit <= 0) {
      throw new Error('Daily limit must be a positive number');
    }
    if (!request.singleLimit || request.singleLimit <= 0) {
      throw new Error('Single limit must be a positive number');
    }

    return this.client.post<ManagedWallet>('/managed-signing/wallets', request);
  }

  /**
   * Get managed wallet by ID
   */
  async getManagedWallet(walletId: string): Promise<ManagedWallet> {
    if (!walletId) {
      throw new Error('Wallet ID is required');
    }
    return this.client.get<ManagedWallet>(`/managed-signing/wallets/${walletId}`);
  }

  /**
   * List managed wallets for a user
   */
  async listManagedWallets(userId: string): Promise<{ data: ManagedWallet[] }> {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return this.client.get(`/managed-signing/wallets`, {
      params: { userId },
    });
  }

  /**
   * Update managed wallet limits
   */
  async updateLimits(
    walletId: string,
    limits: {
      dailyLimit?: number;
      singleLimit?: number;
    }
  ): Promise<ManagedWallet> {
    if (!walletId) {
      throw new Error('Wallet ID is required');
    }
    return this.client.put<ManagedWallet>(`/managed-signing/wallets/${walletId}/limits`, limits);
  }

  /**
   * Suspend a managed wallet (for risk control)
   */
  async suspend(walletId: string, reason?: string): Promise<ManagedWallet> {
    if (!walletId) {
      throw new Error('Wallet ID is required');
    }
    return this.client.post<ManagedWallet>(`/managed-signing/wallets/${walletId}/suspend`, {
      reason,
    });
  }

  /**
   * Revoke a managed wallet
   */
  async revoke(walletId: string, reason?: string): Promise<void> {
    if (!walletId) {
      throw new Error('Wallet ID is required');
    }
    return this.client.post(`/managed-signing/wallets/${walletId}/revoke`, {
      reason,
    });
  }

  /**
   * Create an intent-based signature
   * This allows pre-authorization of payments without immediate execution
   */
  async createIntentSignature(request: IntentSignatureRequest): Promise<IntentSignature> {
    if (!request.managedWalletId) {
      throw new Error('Managed wallet ID is required');
    }
    if (!request.intent) {
      throw new Error('Intent is required');
    }

    return this.client.post<IntentSignature>('/managed-signing/intents', request);
  }

  /**
   * Execute an intent signature (convert to actual payment)
   */
  async executeIntent(intentId: string): Promise<any> {
    if (!intentId) {
      throw new Error('Intent ID is required');
    }
    return this.client.post(`/managed-signing/intents/${intentId}/execute`);
  }

  /**
   * Get intent signature status
   */
  async getIntentStatus(intentId: string): Promise<IntentSignature> {
    if (!intentId) {
      throw new Error('Intent ID is required');
    }
    return this.client.get<IntentSignature>(`/managed-signing/intents/${intentId}`);
  }
}

