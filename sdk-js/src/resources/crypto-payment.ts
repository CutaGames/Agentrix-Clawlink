/**
 * Crypto Payment resource for Agentrix SDK
 * 
 * Handles on-chain cryptocurrency payments with support for:
 * - Multiple chains (SOL, ETH, Base, Polygon, etc.)
 * - Multiple token standards (SPL, ERC20, ERC4337 AA)
 * - Dynamic gas estimation
 * - Transaction acceleration and retry
 */

import { AgentrixClient } from '../client';

export type Chain = 'solana' | 'ethereum' | 'base' | 'polygon' | 'arbitrum' | 'optimism';
export type TokenStandard = 'SPL' | 'ERC20' | 'ERC4337' | 'native';

export interface CryptoPaymentRequest {
  chain: Chain;
  tokenAddress?: string; // Token contract address (optional for native tokens)
  tokenStandard?: TokenStandard;
  amount: string; // Amount in token units (e.g., "1.5" for 1.5 tokens)
  recipient: string; // Recipient wallet address
  payer?: string; // Payer wallet address (optional, defaults to connected wallet)
  priorityFee?: string; // Priority fee (for Solana/EVM chains)
  metadata?: Record<string, any>;
}

export interface GasEstimate {
  gasLimit?: string; // EVM chains
  gasPrice?: string; // EVM chains
  priorityFee?: string; // Solana/EVM chains
  totalCost: string; // Total estimated cost in native token
  currency: string; // Native token symbol (SOL, ETH, etc.)
}

export interface CryptoPayment {
  id: string;
  chain: Chain;
  tokenAddress?: string;
  tokenStandard: TokenStandard;
  amount: string;
  recipient: string;
  payer: string;
  transactionHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
  gasEstimate?: GasEstimate;
  metadata?: Record<string, any>;
  createdAt: string;
  confirmedAt?: string;
}

export interface TransactionBuildRequest {
  chain: Chain;
  tokenAddress?: string;
  tokenStandard?: TokenStandard;
  amount: string;
  recipient: string;
  payer: string;
}

export interface BuiltTransaction {
  transaction: string; // Serialized transaction (base64 or hex)
  chain: Chain;
  requiredSignatures: string[]; // Wallet addresses that need to sign
  estimatedGas?: GasEstimate;
}

export class CryptoPaymentResource {
  constructor(private client: AgentrixClient) {}

  /**
   * Estimate gas/fees for a crypto payment
   */
  async estimateGas(request: CryptoPaymentRequest): Promise<GasEstimate> {
    return this.client.post<GasEstimate>('/payments/crypto/estimate-gas', {
      chain: request.chain,
      tokenAddress: request.tokenAddress,
      tokenStandard: request.tokenStandard,
      amount: request.amount,
      recipient: request.recipient,
      priorityFee: request.priorityFee,
    });
  }

  /**
   * Build a payment transaction
   * Returns serialized transaction ready for wallet signing
   */
  async buildTransaction(request: TransactionBuildRequest): Promise<BuiltTransaction> {
    if (!request.chain) {
      throw new Error('Chain is required');
    }
    if (!request.amount || parseFloat(request.amount) <= 0) {
      throw new Error('Amount must be a positive number');
    }
    if (!request.recipient) {
      throw new Error('Recipient address is required');
    }
    if (!request.payer) {
      throw new Error('Payer address is required');
    }

    return this.client.post<BuiltTransaction>('/payments/crypto/build-transaction', {
      chain: request.chain,
      tokenAddress: request.tokenAddress,
      tokenStandard: request.tokenStandard || (request.chain === 'solana' ? 'SPL' : 'ERC20'),
      amount: request.amount,
      recipient: request.recipient,
      payer: request.payer,
    });
  }

  /**
   * Create a crypto payment
   * This will build the transaction and return it for wallet signing
   */
  async create(request: CryptoPaymentRequest): Promise<CryptoPayment> {
    if (!request.chain) {
      throw new Error('Chain is required');
    }
    if (!request.amount || parseFloat(request.amount) <= 0) {
      throw new Error('Amount must be a positive number');
    }
    if (!request.recipient) {
      throw new Error('Recipient address is required');
    }

    return this.client.post<CryptoPayment>('/payments/crypto', request);
  }

  /**
   * Submit a signed transaction
   */
  async submitSignedTransaction(
    paymentId: string,
    signedTransaction: string,
    signature?: string
  ): Promise<CryptoPayment> {
    if (!paymentId) {
      throw new Error('Payment ID is required');
    }
    if (!signedTransaction) {
      throw new Error('Signed transaction is required');
    }

    return this.client.post<CryptoPayment>(`/payments/crypto/${paymentId}/submit`, {
      signedTransaction,
      signature,
    });
  }

  /**
   * Get payment status
   */
  async getStatus(paymentId: string): Promise<CryptoPayment> {
    if (!paymentId) {
      throw new Error('Payment ID is required');
    }
    return this.client.get<CryptoPayment>(`/payments/crypto/${paymentId}`);
  }

  /**
   * Accelerate a pending transaction (increase priority fee)
   */
  async accelerate(paymentId: string, newPriorityFee: string): Promise<CryptoPayment> {
    if (!paymentId) {
      throw new Error('Payment ID is required');
    }
    return this.client.post<CryptoPayment>(`/payments/crypto/${paymentId}/accelerate`, {
      priorityFee: newPriorityFee,
    });
  }

  /**
   * Retry a failed transaction
   */
  async retry(paymentId: string): Promise<CryptoPayment> {
    if (!paymentId) {
      throw new Error('Payment ID is required');
    }
    return this.client.post<CryptoPayment>(`/payments/crypto/${paymentId}/retry`);
  }

  /**
   * Create X402 payment session
   */
  async createX402Session(request: {
    paymentId: string;
    amount: number;
    currency: string;
    metadata?: Record<string, any>;
  }): Promise<{
    sessionId: string;
    compressedData: string;
    gasEstimate: string;
    gasSaved: string;
    expiresAt: string;
  }> {
    return this.client.post('/payments/x402/session', request);
  }

  /**
   * Execute X402 payment
   */
  async executeX402Payment(sessionId: string): Promise<any> {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    return this.client.post(`/payments/x402/session/${sessionId}/execute`);
  }
}

