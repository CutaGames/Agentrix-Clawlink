/**
 * Token Authorization Utilities
 * 
 * Handles automatic token approval for ERC20/SPL tokens
 */

export interface TokenApprovalRequest {
  chain: 'ethereum' | 'solana' | 'base' | 'polygon';
  tokenAddress: string;
  spender: string;
  amount: string; // Use "max" for unlimited
  owner: string;
}

export interface ApprovalResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

/**
 * Approve ERC20 token spending
 */
export async function approveERC20Token(
  request: TokenApprovalRequest
): Promise<ApprovalResult> {
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    throw new Error('Ethereum wallet not found');
  }

  try {
    // ERC20 approve function signature
    const approveFunction = '0x095ea7b3'; // approve(address,uint256)
    
    // Encode parameters
    const spender = request.spender.slice(2).padStart(64, '0');
    const amount = request.amount === 'max' 
      ? 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      : BigInt(request.amount).toString(16).padStart(64, '0');

    const data = approveFunction + spender + amount;

    const transactionHash = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: request.owner,
          to: request.tokenAddress,
          data: '0x' + data,
        },
      ],
    });

    return {
      success: true,
      transactionHash,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Approval failed',
    };
  }
}

/**
 * Approve SPL token spending (Solana)
 */
export async function approveSPLToken(
  request: TokenApprovalRequest
): Promise<ApprovalResult> {
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  const solana = (window as any).solana;
  if (!solana) {
    throw new Error('Solana wallet not found');
  }

  try {
    // This would use @solana/web3.js to create an approve instruction
    // For now, return a placeholder
    // In production, you would:
    // 1. Create approve instruction using @solana/web3.js
    // 2. Sign and send transaction
    // 3. Return transaction signature

    return {
      success: false,
      error: 'SPL token approval not yet implemented',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Approval failed',
    };
  }
}

/**
 * Check if token is already approved
 */
export async function checkTokenApproval(
  chain: 'ethereum' | 'solana' | 'base' | 'polygon',
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<{
  approved: boolean;
  amount: string;
}> {
  if (chain === 'solana') {
    // SPL token approval check
    return {
      approved: false,
      amount: '0',
    };
  }

  // ERC20 allowance check
  if (typeof window === 'undefined') {
    return {
      approved: false,
      amount: '0',
    };
  }

  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    return {
      approved: false,
      amount: '0',
    };
  }

  try {
    // ERC20 allowance function signature
    const allowanceFunction = '0xdd62ed3e'; // allowance(address,address)
    
    // Encode parameters
    const ownerEncoded = owner.slice(2).padStart(64, '0');
    const spenderEncoded = spender.slice(2).padStart(64, '0');
    const data = allowanceFunction + ownerEncoded + spenderEncoded;

    const result = await ethereum.request({
      method: 'eth_call',
      params: [
        {
          to: tokenAddress,
          data: '0x' + data,
        },
        'latest',
      ],
    });

    const allowance = BigInt(result).toString();
    const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

    return {
      approved: BigInt(allowance) > 0n,
      amount: allowance,
    };
  } catch (error) {
    return {
      approved: false,
      amount: '0',
    };
  }
}

