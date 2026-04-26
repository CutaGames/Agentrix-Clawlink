// WalletConnect + MetaMask + OKX 钱包登录服务
import { apiFetch } from './api';
import { useAuthStore } from '../stores/authStore';
import { setApiConfig, saveTokenToStorage } from './api';
// ========== Wallet Deep Links ==========
const WALLET_DEEP_LINKS = {
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
export async function getWalletNonce(address) {
    return apiFetch(`/auth/wallet/nonce?address=${address}`);
}
/**
 * 使用钱包签名登录
 */
export async function walletSignatureLogin(params) {
    const loginResult = await apiFetch('/auth/wallet/login', {
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
    const user = {
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
export function getWalletProviders() {
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
