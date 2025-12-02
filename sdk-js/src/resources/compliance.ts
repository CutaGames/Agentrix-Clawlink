/**
 * Compliance resource for Agentrix SDK
 * 
 * Handles KYC, KYT, and regulatory compliance
 */

import { AgentrixClient } from '../client';

export type KYCLevel = 'NONE' | 'BASIC' | 'VERIFIED' | 'ENHANCED';
export type KYCStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface KYCInfo {
  userId: string;
  level: KYCLevel;
  status: KYCStatus;
  provider?: string; // Which provider did the KYC
  verifiedAt?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface CreateKYCRequest {
  userId: string;
  level: KYCLevel;
  documents?: {
    type: 'id' | 'passport' | 'driver_license' | 'proof_of_address';
    file: string; // Base64 encoded file
    mimeType: string;
  }[];
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    nationality?: string;
    address?: {
      street: string;
      city: string;
      state?: string;
      country: string;
      zipCode: string;
    };
  };
}

export interface KYTRequest {
  transactionId: string;
  fromAddress?: string;
  toAddress?: string;
  amount: number;
  currency: string;
  chain?: string;
}

export interface KYTResult {
  passed: boolean;
  riskScore: number;
  flags?: string[];
  recommendations?: string[];
}

export interface MerchantKYBRequest {
  merchantId: string;
  businessName: string;
  businessType: string;
  registrationNumber?: string;
  taxId?: string;
  documents?: {
    type: 'business_license' | 'tax_certificate' | 'bank_statement';
    file: string;
    mimeType: string;
  }[];
  address: {
    street: string;
    city: string;
    state?: string;
    country: string;
    zipCode: string;
  };
}

export interface MerchantKYB {
  merchantId: string;
  status: 'pending' | 'approved' | 'rejected';
  level: 'basic' | 'verified' | 'enhanced';
  verifiedAt?: string;
  metadata?: Record<string, any>;
}

export class ComplianceResource {
  constructor(private client: AgentrixClient) {}

  /**
   * Get user KYC status
   * Returns unified KYC status that works across all providers
   */
  async getKYCStatus(userId: string): Promise<KYCInfo> {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return this.client.get<KYCInfo>(`/compliance/kyc/${userId}`);
  }

  /**
   * Create or update KYC
   * Single KYC → works with all providers
   */
  async createKYC(request: CreateKYCRequest): Promise<KYCInfo> {
    if (!request.userId) {
      throw new Error('User ID is required');
    }
    return this.client.post<KYCInfo>('/compliance/kyc', request);
  }

  /**
   * Perform KYT (Know Your Transaction) check
   */
  async performKYT(request: KYTRequest): Promise<KYTResult> {
    if (!request.transactionId) {
      throw new Error('Transaction ID is required');
    }
    return this.client.post<KYTResult>('/compliance/kyt', request);
  }

  /**
   * Get transaction limits based on KYC level and regulations
   */
  async getTransactionLimits(
    userId: string,
    currency: string
  ): Promise<{
    dailyLimit: number;
    monthlyLimit: number;
    singleTransactionLimit: number;
    kycLevel: KYCLevel;
  }> {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return this.client.get('/compliance/limits', {
      params: {
        userId,
        currency,
      },
    });
  }

  /**
   * Create or update Merchant KYB (Know Your Business)
   */
  async createMerchantKYB(request: MerchantKYBRequest): Promise<MerchantKYB> {
    if (!request.merchantId) {
      throw new Error('Merchant ID is required');
    }
    if (!request.businessName) {
      throw new Error('Business name is required');
    }
    return this.client.post<MerchantKYB>('/compliance/merchant-kyb', request);
  }

  /**
   * Get merchant KYB status
   */
  async getMerchantKYB(merchantId: string): Promise<MerchantKYB> {
    if (!merchantId) {
      throw new Error('Merchant ID is required');
    }
    return this.client.get<MerchantKYB>(`/compliance/merchant-kyb/${merchantId}`);
  }
}

