import { useState } from 'react';
import { SessionKeyManager } from '@/lib/session-key-manager';
import { paymentApi } from '@/lib/api/payment.api';
import { ethers } from 'ethers';
import { useSessionManager } from './useSessionManager';

interface QuickPayOptions {
  paymentId: string;
  to: string;
  amount: number; // USDC amount
  currency?: string;
}

export function useQuickPay() {
  const { activeSession } = useSessionManager();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeQuickPay = async (options: QuickPayOptions) => {
    if (!activeSession) {
      throw new Error('No active session found. Please create a session first.');
    }

    if (options.amount > activeSession.singleLimit) {
      throw new Error(`Amount exceeds single limit of $${activeSession.singleLimit}`);
    }

    try {
      setProcessing(true);
      setError(null);

      // 1. 获取链 ID
      let chainId = 1; // 默认 Ethereum Mainnet
      if (window.ethereum) {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        chainId = parseInt(chainIdHex as string, 16);
      }

      // 2. 构建消息哈希（与合约一致）
      // 注意：必须使用 solidityPackedKeccak256 以匹配合约的 abi.encodePacked
      // 同时也必须匹配后端 relayer.service.ts 中的验证逻辑
      
      // 处理 paymentId (如果是 UUID，需要哈希；如果是 bytes32，直接使用)
      let paymentIdBytes32: string;
      if (options.paymentId.startsWith('0x') && options.paymentId.length === 66) {
        paymentIdBytes32 = options.paymentId;
      } else {
        paymentIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(options.paymentId));
      }

      const messageHash = ethers.solidityPackedKeccak256(
        ['bytes32', 'address', 'uint256', 'bytes32', 'uint256'],
        [
          activeSession.sessionId,
          options.to,
          ethers.parseUnits(options.amount.toString(), 6), // USDC 6 decimals
          paymentIdBytes32,
          chainId,
        ],
      );

      // 3. 使用 Session Key 签名（链下）
      const signature = await SessionKeyManager.signWithSessionKey(
        activeSession.signer,
        messageHash,
      );

      // 4. 调用 Relayer API（即时确认）
      const result = await paymentApi.relayerQuickPay({
        sessionId: activeSession.sessionId,
        paymentId: options.paymentId,
        to: options.to,
        amount: ethers.parseUnits(options.amount.toString(), 6).toString(),
        signature,
        nonce: Date.now(), // 简化实现，实际应该使用递增 nonce
      });

      return result;
    } catch (err: any) {
      console.error('QuickPay failed:', err);
      setError(err.message || 'QuickPay failed');
      throw err;
    } finally {
      setProcessing(false);
    }
  };

  return {
    executeQuickPay,
    processing,
    error,
    activeSession,
    canUseQuickPay: !!activeSession,
  };
}

