/**
 * Agent types for PayMind SDK
 */

export interface AutoPayGrant {
  id: string;
  userId: string;
  agentId: string;
  singleLimit: number;
  dailyLimit: number;
  currency: string;
  expiresAt: string;
  isActive: boolean;
  usedAmount: number;
  usedToday: number;
  createdAt: string;
}

export interface CreateAutoPayGrantRequest {
  agentId: string;
  singleLimit: number;
  dailyLimit: number;
  currency?: string;
  expiresInDays?: number;
}

export interface AgentEarnings {
  agentId: string;
  totalEarnings: number;
  currency: string;
  totalCommissions: number;
  pendingSettlements: number;
  settledAmount: number;
  period: {
    start: string;
    end: string;
  };
}

export interface Commission {
  id: string;
  agentId: string;
  paymentId: string;
  amount: number;
  rate: number;
  currency: string;
  status: 'pending' | 'settled';
  settledAt?: string;
  createdAt: string;
}

