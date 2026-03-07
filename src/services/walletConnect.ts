// WalletConnect + MetaMask + OKX 钱包登录服务
import { apiFetch } from './api';
import { useAuthStore, AuthUser } from '../stores/authStore';
import { setApiConfig, saveTokenToStorage } from './api';
import { Platform } from 'react-native';

// ========== Types ==========

export type WalletProvider = 'walletconnect' | 'metamask' | 'tokenpocket' | 'okx';

export interface WalletCallbackPayload {
  address?: string;
  signature?: string;
  message?: string;
  token?: string;
  walletType?: WalletProvider;
}

interface WalletLoginResponse {
  access_token: string;
  user: {
    id: string;
    agentrixId: string;
    email?: string;
    roles: string[];
    walletAddress?: string;
  };
  wallet: {
    id: string;
    walletAddress: string;
    walletType: string;
    chain: string;
    isDefault: boolean;
  };
}

// ========== Wallet Deep Links ==========

const WALLET_DEEP_LINKS: Record<WalletProvider, { ios: string; android: string; universal: string }> = {
  metamask: {
    ios: 'metamask://',
    android: 'metamask://',
    universal: 'https://metamask.app.link',
  },
  tokenpocket: {
    ios: 'tpoutside://',
    android: 'tpoutside://',
    universal: 'https://www.tokenpocket.pro',
  },
  okx: {
    ios: 'okx://',
    android: 'okx://',
    universal: 'https://www.okx.com/download',
  },
  walletconnect: {
    ios: '',
    android: '',
    universal: '',
  },
};

// ========== Helper Functions ==========

/**
 * 获取钱包登录 nonce 和签名消息
 */
export async function getWalletNonce(address: string): Promise<{ nonce: string; message: string }> {
  return apiFetch(`/auth/wallet/nonce?address=${address}`);
}

/**
 * 使用钱包签名登录
 */
export async function walletSignatureLogin(params: {
  address: string;
  signature: string;
  message: string;
  chainType: 'evm' | 'solana';
  walletType: WalletProvider;
}): Promise<AuthUser> {
  const loginResult = await apiFetch<WalletLoginResponse>('/auth/wallet/login', {
    method: 'POST',
    body: JSON.stringify({
      walletAddress: params.address,
      walletType: params.walletType === 'okx' ? 'okx' : params.walletType === 'metamask' ? 'metamask' : 'walletconnect',
      chain: params.chainType,
      message: params.message,
      signature: params.signature,
    }),
  });

  const { setAuth } = useAuthStore.getState();

  const user: AuthUser = {
    id: loginResult.user.id,
    agentrixId: loginResult.user.agentrixId,
    email: loginResult.user.email,
    walletAddress: loginResult.wallet?.walletAddress || loginResult.user.walletAddress,
    roles: loginResult.user.roles || ['user'],
    provider: 'wallet',
  };

  setApiConfig({ token: loginResult.access_token });
  await saveTokenToStorage(loginResult.access_token);
  await setAuth(user, loginResult.access_token);

  return user;
}

/**
 * 检查钱包 app 是否已安装
 */
export function getWalletProviders(): { provider: WalletProvider; name: string; icon: string; description: string }[] {
  return [
    {
      provider: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect with MetaMask wallet',
    },
    {
      provider: 'okx',
      name: 'OKX Wallet',
      icon: '⭕',
      description: 'Connect with OKX wallet',
    },
    {
      provider: 'walletconnect',
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Scan QR code with any wallet',
    },
  ];
}

export function getWalletDeepLink(provider: WalletProvider): string {
  return WALLET_DEEP_LINKS[provider]?.[Platform.OS === 'ios' ? 'ios' : 'android'] || '';
}

export function buildWalletConnectLoginUrl(callbackUrl: string): string {
  const baseUrl = 'https://www.agentrix.top';
  return `${baseUrl}/auth/login?tab=wallet&mobile=1&callback=${encodeURIComponent(callbackUrl)}`;
}

export function parseWalletCallbackUrl(rawUrl: string): WalletCallbackPayload {
  try {
    const parsed = new URL(rawUrl);
    return {
      address: parsed.searchParams.get('address') || undefined,
      signature: parsed.searchParams.get('signature') || undefined,
      message: parsed.searchParams.get('message') || undefined,
      token: parsed.searchParams.get('token') || undefined,
      walletType: (parsed.searchParams.get('walletType') as WalletProvider | null) || undefined,
    };
  } catch {
    return {};
  }
}
