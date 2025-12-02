/**
 * Risk Control resource for PayMind SDK
 * 
 * Provides risk assessment and fraud detection capabilities
 */

import { PayMindClient } from '../client';

export interface RiskCheckRequest {
  userId?: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  walletAddress?: string;
  metadata?: Record<string, any>;
}

export interface RiskAssessment {
  riskScore: number; // 0.0 to 1.0 (higher = more risky)
  level: 'low' | 'medium' | 'high' | 'critical';
  passed: boolean;
  reasons: string[];
  recommendations?: string[];
  checks: {
    ipCheck?: {
      passed: boolean;
      reason?: string;
    };
    deviceCheck?: {
      passed: boolean;
      reason?: string;
    };
    blacklistCheck?: {
      passed: boolean;
      reason?: string;
    };
    amountCheck?: {
      passed: boolean;
      reason?: string;
    };
    frequencyCheck?: {
      passed: boolean;
      reason?: string;
    };
    addressRiskCheck?: {
      passed: boolean;
      riskScore?: number;
      reason?: string;
    };
  };
}

export interface BlacklistCheckRequest {
  userId?: string;
  walletAddress?: string;
  ipAddress?: string;
  email?: string;
}

export interface BlacklistStatus {
  isBlacklisted: boolean;
  reason?: string;
  category?: 'fraud' | 'chargeback' | 'compliance' | 'manual';
}

export class RiskControlResource {
  constructor(private client: PayMindClient) {}

  /**
   * Perform comprehensive risk assessment
   */
  async assessRisk(request: RiskCheckRequest): Promise<RiskAssessment> {
    if (!request.amount || request.amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    if (!request.currency) {
      throw new Error('Currency is required');
    }
    if (!request.paymentMethod) {
      throw new Error('Payment method is required');
    }

    return this.client.post<RiskAssessment>('/risk-control/assess', request);
  }

  /**
   * Check if user/wallet/IP is blacklisted
   */
  async checkBlacklist(request: BlacklistCheckRequest): Promise<BlacklistStatus> {
    return this.client.post<BlacklistStatus>('/risk-control/blacklist/check', request);
  }

  /**
   * Get wallet address risk score (using TRM/Chainalysis)
   */
  async getAddressRiskScore(
    address: string,
    chain?: string
  ): Promise<{
    riskScore: number; // 0.0 to 1.0
    level: 'low' | 'medium' | 'high' | 'critical';
    categories?: string[]; // e.g., ['sanctions', 'fraud']
    source?: string; // 'TRM' | 'Chainalysis' | 'internal'
  }> {
    if (!address) {
      throw new Error('Address is required');
    }
    return this.client.get('/risk-control/address-risk', {
      params: {
        address,
        chain,
      },
    });
  }

  /**
   * Check payment frequency limits
   */
  async checkFrequencyLimit(
    userId: string,
    timeWindow: 'hour' | 'day' | 'week' = 'day'
  ): Promise<{
    allowed: boolean;
    currentCount: number;
    limit: number;
    resetAt: string;
  }> {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return this.client.get('/risk-control/frequency-limit', {
      params: {
        userId,
        timeWindow,
      },
    });
  }
}

