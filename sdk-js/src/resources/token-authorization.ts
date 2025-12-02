/**
 * Token Authorization resource for Agentrix SDK
 * 
 * Handles on-chain token authorizations:
 * - ERC20 Permit
 * - SPL Token Delegate
 * - Pre-authorization for automatic payments
 */

import { AgentrixClient } from '../client';

export type AuthorizationType = 'ERC20_PERMIT' | 'SPL_DELEGATE' | 'ERC20_APPROVE';

export interface CreateAuthorizationRequest {
  chain: 'ethereum' | 'solana' | 'base' | 'polygon';
  tokenAddress: string;
  authorizationType: AuthorizationType;
  amount: string; // Amount to authorize (use "max" for unlimited)
  spender: string; // Address authorized to spend (Agentrix contract or Agent address)
  expiresIn?: number; // Expiration in seconds (optional)
  nonce?: string; // Nonce for Permit (optional, auto-generated if not provided)
}

export interface TokenAuthorization {
  id: string;
  chain: string;
  tokenAddress: string;
  authorizationType: AuthorizationType;
  amount: string;
  spender: string;
  owner: string; // User's wallet address
  status: 'pending' | 'approved' | 'expired' | 'revoked';
  expiresAt?: string;
  transactionHash?: string;
  signature?: string; // For Permit signatures
  createdAt: string;
  updatedAt: string;
}

export interface PermitSignature {
  owner: string;
  spender: string;
  value: string;
  nonce: string;
  deadline: number;
  v: number;
  r: string;
  s: string;
}

export class TokenAuthorizationResource {
  constructor(private client: AgentrixClient) {}

  /**
   * Create a token authorization request
   * Returns transaction data for user to sign
   */
  async createAuthorization(request: CreateAuthorizationRequest): Promise<{
    authorization: TokenAuthorization;
    transactionData: any; // Transaction data for wallet signing
    permitData?: PermitSignature; // For ERC20 Permit
  }> {
    if (!request.chain) {
      throw new Error('Chain is required');
    }
    if (!request.tokenAddress) {
      throw new Error('Token address is required');
    }
    if (!request.spender) {
      throw new Error('Spender address is required');
    }

    return this.client.post('/token-authorization/create', request);
  }

  /**
   * Submit a signed authorization transaction
   */
  async submitSignedAuthorization(
    authorizationId: string,
    signedTransaction: string,
    permitSignature?: PermitSignature
  ): Promise<TokenAuthorization> {
    if (!authorizationId) {
      throw new Error('Authorization ID is required');
    }
    if (!signedTransaction) {
      throw new Error('Signed transaction is required');
    }

    return this.client.post<TokenAuthorization>(
      `/token-authorization/${authorizationId}/submit`,
      {
        signedTransaction,
        permitSignature,
      }
    );
  }

  /**
   * Get authorization status
   */
  async getAuthorization(authorizationId: string): Promise<TokenAuthorization> {
    if (!authorizationId) {
      throw new Error('Authorization ID is required');
    }
    return this.client.get<TokenAuthorization>(`/token-authorization/${authorizationId}`);
  }

  /**
   * List authorizations for a user
   */
  async listAuthorizations(params?: {
    userId?: string;
    chain?: string;
    tokenAddress?: string;
    status?: string;
  }): Promise<{ data: TokenAuthorization[]; pagination: any }> {
    return this.client.get('/token-authorization', { params });
  }

  /**
   * Revoke an authorization
   */
  async revoke(authorizationId: string): Promise<TokenAuthorization> {
    if (!authorizationId) {
      throw new Error('Authorization ID is required');
    }
    return this.client.post<TokenAuthorization>(`/token-authorization/${authorizationId}/revoke`);
  }

  /**
   * Check if a token authorization is valid
   */
  async checkAuthorization(
    chain: string,
    tokenAddress: string,
    owner: string,
    spender: string
  ): Promise<{
    authorized: boolean;
    amount: string;
    expiresAt?: string;
  }> {
    return this.client.get('/token-authorization/check', {
      params: {
        chain,
        tokenAddress,
        owner,
        spender,
      },
    });
  }
}

