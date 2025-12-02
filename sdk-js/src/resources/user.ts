/**
 * User resource for Agentrix SDK
 * 
 * Provides user information and profile management
 */

import { AgentrixClient } from '../client';

export interface UserInfo {
  id: string;
  agentrixId: string;
  email?: string;
  walletAddresses?: string[];
  kycLevel?: 'NONE' | 'BASIC' | 'VERIFIED' | 'ENHANCED';
  kycStatus?: 'pending' | 'approved' | 'rejected';
  preferences?: {
    preferredPaymentMethods?: string[];
    preferredCurrency?: string;
    language?: string;
  };
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export class UserResource {
  constructor(private client: AgentrixClient) {}

  /**
   * Get user information
   * Agent can use this to get user context for personalized recommendations
   */
  async getUserInfo(userId?: string): Promise<UserInfo> {
    // If no userId provided, get current authenticated user
    const endpoint = userId ? `/users/${userId}` : '/users/me';
    return this.client.get<UserInfo>(endpoint);
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    preferences: {
      preferredPaymentMethods?: string[];
      preferredCurrency?: string;
      language?: string;
    }
  ): Promise<UserInfo> {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return this.client.put<UserInfo>(`/users/${userId}/preferences`, preferences);
  }
}

