/**
 * Wallet Detection Utilities
 * 
 * Detects installed wallets and provides wallet adapter integration
 */

export type WalletType = 
  | 'phantom'
  | 'metamask'
  | 'okx'
  | 'coinbase'
  | 'binance'
  | 'unipass'
  | 'particle'
  | 'walletconnect'
  | 'unknown';

export interface WalletInfo {
  type: WalletType;
  name: string;
  installed: boolean;
  connected: boolean;
  address?: string;
  chainId?: number | string;
  icon?: string;
}

export interface WalletAdapter {
  type: WalletType;
  name: string;
  detect: () => Promise<boolean>;
  connect: () => Promise<{ address: string; chainId: number | string }>;
  disconnect: () => Promise<void>;
  switchChain?: (chainId: number | string) => Promise<void>;
  signMessage?: (message: string) => Promise<string>;
  signTransaction?: (transaction: any) => Promise<string>;
}

/**
 * Detect all installed wallets
 */
export async function detectInstalledWallets(): Promise<WalletInfo[]> {
  const wallets: WalletInfo[] = [];

  // Check Phantom (Solana)
  if (typeof window !== 'undefined' && (window as any).solana?.isPhantom) {
    wallets.push({
      type: 'phantom',
      name: 'Phantom',
      installed: true,
      connected: false,
      icon: 'https://phantom.app/img/phantom-icon.svg',
    });
  }

  // Check MetaMask (Ethereum)
  if (typeof window !== 'undefined' && (window as any).ethereum?.isMetaMask) {
    wallets.push({
      type: 'metamask',
      name: 'MetaMask',
      installed: true,
      connected: false,
      icon: 'https://metamask.io/images/metamask-icon.svg',
    });
  }

  // Check OKX Wallet
  if (typeof window !== 'undefined' && (window as any).okxwallet) {
    wallets.push({
      type: 'okx',
      name: 'OKX Wallet',
      installed: true,
      connected: false,
      icon: 'https://www.okx.com/favicon.ico',
    });
  }

  // Check Coinbase Wallet
  if (typeof window !== 'undefined' && (window as any).coinbaseWalletExtension) {
    wallets.push({
      type: 'coinbase',
      name: 'Coinbase Wallet',
      installed: true,
      connected: false,
      icon: 'https://www.coinbase.com/favicon.ico',
    });
  }

  // Check Binance Wallet
  if (typeof window !== 'undefined' && (window as any).BinanceChain) {
    wallets.push({
      type: 'binance',
      name: 'Binance Wallet',
      installed: true,
      connected: false,
      icon: 'https://www.binance.com/favicon.ico',
    });
  }

  // Check UniPass
  if (typeof window !== 'undefined' && (window as any).unipass) {
    wallets.push({
      type: 'unipass',
      name: 'UniPass',
      installed: true,
      connected: false,
      icon: 'https://unipass.id/favicon.ico',
    });
  }

  // Check Particle
  if (typeof window !== 'undefined' && (window as any).particle) {
    wallets.push({
      type: 'particle',
      name: 'Particle',
      installed: true,
      connected: false,
      icon: 'https://particle.network/favicon.ico',
    });
  }

  return wallets;
}

/**
 * Get recommended wallet for a chain
 */
export function getRecommendedWallet(chain: 'solana' | 'ethereum' | 'base' | 'polygon'): WalletType {
  switch (chain) {
    case 'solana':
      return 'phantom';
    case 'ethereum':
    case 'base':
    case 'polygon':
      return 'metamask';
    default:
      return 'metamask';
  }
}

/**
 * Check if a specific wallet is installed
 */
export async function isWalletInstalled(walletType: WalletType): Promise<boolean> {
  const wallets = await detectInstalledWallets();
  return wallets.some((w) => w.type === walletType && w.installed);
}

