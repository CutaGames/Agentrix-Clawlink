/**
 * Batch Signing Utilities
 * 
 * Handles batch transaction signing for multiple operations
 */

export interface BatchTransaction {
  id: string;
  chain: 'ethereum' | 'solana' | 'base' | 'polygon';
  type: 'transfer' | 'approve' | 'swap' | 'custom';
  to: string;
  data?: string;
  value?: string;
  description: string;
}

export interface BatchSigningRequest {
  transactions: BatchTransaction[];
  walletType: 'metamask' | 'phantom' | 'okx' | 'coinbase';
}

export interface BatchSigningResult {
  success: boolean;
  transactionHashes?: string[];
  error?: string;
}

/**
 * Sign multiple transactions in batch
 * For EVM chains, this uses multicall or batch transactions
 */
export async function signBatchTransactions(
  request: BatchSigningRequest
): Promise<BatchSigningResult> {
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    throw new Error('Ethereum wallet not found');
  }

  try {
    // For EVM chains, we can use a multicall contract or batch transactions
    // For simplicity, we'll sign them sequentially
    // In production, you might use a multicall contract for better UX

    const transactionHashes: string[] = [];

    for (const tx of request.transactions) {
      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            to: tx.to,
            data: tx.data || '0x',
            value: tx.value || '0x0',
          },
        ],
      });

      transactionHashes.push(txHash);
    }

    return {
      success: true,
      transactionHashes,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Batch signing failed',
    };
  }
}

/**
 * Sign batch transactions for Solana
 */
export async function signBatchSolanaTransactions(
  transactions: BatchTransaction[]
): Promise<BatchSigningResult> {
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  const solana = (window as any).solana;
  if (!solana) {
    throw new Error('Solana wallet not found');
  }

  try {
    // Solana supports batch transactions natively
    // This would use @solana/web3.js to create a transaction with multiple instructions
    // For now, return a placeholder

    return {
      success: false,
      error: 'Solana batch signing not yet implemented',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Batch signing failed',
    };
  }
}

