/**
 * Chain Switching Utilities
 * 
 * Handles automatic chain switching for multi-chain wallets
 */

export type ChainId = 
  | '1' // Ethereum Mainnet
  | '5' // Ethereum Goerli
  | '137' // Polygon
  | '8453' // Base
  | '42161' // Arbitrum
  | '10' // Optimism
  | 'solana-mainnet' // Solana Mainnet
  | 'solana-devnet'; // Solana Devnet

export interface ChainInfo {
  chainId: ChainId;
  name: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl?: string;
}

export const CHAIN_CONFIGS: Record<string, ChainInfo> = {
  '1': {
    chainId: '1',
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth.llamarpc.com',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: 'https://etherscan.io',
  },
  '137': {
    chainId: '137',
    name: 'Polygon',
    rpcUrl: 'https://polygon.llamarpc.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    blockExplorerUrl: 'https://polygonscan.com',
  },
  '8453': {
    chainId: '8453',
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: 'https://basescan.org',
  },
  'solana-mainnet': {
    chainId: 'solana-mainnet',
    name: 'Solana Mainnet',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    nativeCurrency: {
      name: 'SOL',
      symbol: 'SOL',
      decimals: 9,
    },
    blockExplorerUrl: 'https://solscan.io',
  },
};

/**
 * Switch chain for EVM wallets (MetaMask, OKX, etc.)
 */
export async function switchEVMChain(
  chainId: ChainId,
  walletType: 'metamask' | 'okx' | 'coinbase' | 'walletconnect'
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    throw new Error('Ethereum wallet not found');
  }

  const chainConfig = CHAIN_CONFIGS[chainId];
  if (!chainConfig) {
    throw new Error(`Chain ${chainId} not supported`);
  }

  try {
    // Try to switch chain
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${parseInt(chainId).toString(16)}` }],
    });
  } catch (error: any) {
    // If chain doesn't exist, add it
    if (error.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${parseInt(chainId).toString(16)}`,
            chainName: chainConfig.name,
            nativeCurrency: chainConfig.nativeCurrency,
            rpcUrls: [chainConfig.rpcUrl],
            blockExplorerUrls: chainConfig.blockExplorerUrl ? [chainConfig.blockExplorerUrl] : [],
          },
        ],
      });
    } else {
      throw error;
    }
  }
}

/**
 * Get current chain ID
 */
export async function getCurrentChainId(): Promise<ChainId | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    return null;
  }

  try {
    const chainId = await ethereum.request({ method: 'eth_chainId' });
    return parseInt(chainId, 16).toString() as ChainId;
  } catch (error) {
    return null;
  }
}

/**
 * Check if current chain matches required chain
 */
export async function isChainCorrect(requiredChainId: ChainId): Promise<boolean> {
  const currentChainId = await getCurrentChainId();
  return currentChainId === requiredChainId;
}

