import { useState, useEffect } from 'react';
import { SessionKeyManager } from '@/lib/session-key-manager';
import { paymentApi } from '@/lib/api/payment.api';
import { useWeb3 } from '@/contexts/Web3Context';
import { ethers } from 'ethers';

const SESSION_MANAGER_ABI = [
  'function createSession(address signer, uint256 singleLimit, uint256 dailyLimit, uint256 expiry) returns (bytes32)',
  'function getSession(bytes32) view returns (tuple(address signer, address owner, uint256 singleLimit, uint256 dailyLimit, uint256 usedToday, uint256 expiry, uint256 lastResetDate, bool isActive))',
];

export interface Session {
  id: string;
  sessionId: string;
  signer: string;
  owner?: string; // Owner wallet address for payer identification
  singleLimit: number;
  dailyLimit: number;
  usedToday: number;
  expiry: Date;
  isActive: boolean;
  agentId?: string;
  createdAt: Date;
}

export function useSessionManager() {
  const { isConnected, defaultWallet, signMessage } = useWeb3();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载 Session 列表
  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await paymentApi.getSessions();
      setSessions(data);
      
      // 查找活跃 Session
      const active = data.find((s: Session) => s.isActive && new Date(s.expiry) > new Date());
      setActiveSession(active || null);
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  // 创建 Session
  const createSession = async (config: {
    singleLimit: number; // USDC amount
    dailyLimit: number;
    expiryDays: number;
    agentId?: string;
  }) => {
    if (!isConnected || !defaultWallet) {
      throw new Error('Please connect your wallet first');
    }

    try {
      setLoading(true);
      setError(null);

      // 校验限额（后端要求：单笔 >= 0.0001，日限 >= 0.001）
      const safeSingleLimit = Math.max(config.singleLimit, 0.0001);
      const safeDailyLimit = Math.max(config.dailyLimit, Math.max(safeSingleLimit, 0.001));

      // 1. 生成 Session Key（浏览器本地）
      const sessionKey = await SessionKeyManager.generateSessionKey();

      // 2. 使用主钱包签名授权（一次性）
      if (!signMessage) {
        throw new Error('Wallet signMessage not available');
      }
      const message = `Authorize Session Key: ${sessionKey.publicKey}\nSingle Limit: ${config.singleLimit} USDC\nDaily Limit: ${config.dailyLimit} USDC\nExpiry: ${config.expiryDays} days`;
      const signature = await signMessage(message);

      // 3. 获取合约地址（ERC8004、Commission、USDT）
      // 先尝试从后端获取，如果没有则使用环境变量
      let erc8004Address: string;
      let commissionAddress: string;
      let tokenAddress: string;
      
      try {
        // 从后端API获取合约地址
        const contractInfo = await paymentApi.getContractAddress?.();
        erc8004Address = contractInfo?.erc8004ContractAddress || process.env.NEXT_PUBLIC_ERC8004_CONTRACT_ADDRESS || '0xFfEf72198A71B288EfE403AC07f9c60A1a99f29e';
        commissionAddress = contractInfo?.commissionContractAddress || '0x4d10DA389E0ADe7E7a7E3232531048aEaCa4021C'; // BSC Testnet Commission
        // 注意：API 返回的是 usdcAddress，但这里使用 USDT 地址作为默认值
        tokenAddress = contractInfo?.usdcAddress || '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'; // BSC Testnet USDT
      } catch {
        // 如果API不存在，使用环境变量或默认值
        erc8004Address = process.env.NEXT_PUBLIC_ERC8004_CONTRACT_ADDRESS || '0xFfEf72198A71B288EfE403AC07f9c60A1a99f29e';
        commissionAddress = '0x4d10DA389E0ADe7E7a7E3232531048aEaCa4021C'; // BSC Testnet Commission
        tokenAddress = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'; // BSC Testnet USDT
      }

      // 4. 检查并授权USDT（如果需要）
      // 动态获取 Provider，支持 OKX 和 MetaMask
      let provider: ethers.BrowserProvider | null = null;
      if ((window as any).okxwallet) {
          provider = new ethers.BrowserProvider((window as any).okxwallet);
      } else if (window.ethereum) {
          provider = new ethers.BrowserProvider(window.ethereum);
      }

      let signer: ethers.Signer | null = null;
      let userAddress: string | null = null;

      if (provider) {
        // 先尝试获取已授权的账户，避免触发 MetaMask 弹窗
        try {
          // 尝试获取账户列表
          const accounts = await provider.listAccounts();
          if (accounts && accounts.length > 0) {
            signer = await provider.getSigner();
            userAddress = await signer.getAddress();
            console.log('✅ 使用已授权的账户加载 Session:', userAddress);
          } else {
            // 如果没有已授权的账户，才调用 getSigner（可能会弹窗）
            signer = await provider.getSigner();
            userAddress = await signer.getAddress();
          }
        } catch (error) {
          // 如果获取失败，回退到 getSigner
          signer = await provider.getSigner();
          userAddress = await signer.getAddress();
        }
        
        // 检查当前授权额度
        const tokenContract = new ethers.Contract(
          tokenAddress,
          [
            'function allowance(address owner, address spender) view returns (uint256)',
            'function approve(address spender, uint256 amount) returns (bool)',
            'function decimals() view returns (uint8)',
          ],
          provider
        );
        
        const decimals = await tokenContract.decimals?.().then((d: number) => Number(d)).catch(() => 18);
        // 授权额度 = dailyLimit * 3（支持3天的使用，既安全又实用）
        // 这样用户可以看到明确的授权额度，而不是"无限"
        const approvalHumanAmount = Number((safeDailyLimit * 3).toFixed(6));
        const approvalAmount = ethers.parseUnits(approvalHumanAmount.toString(), decimals);

        // 使用类型断言，因为 ethers.Contract 的 connect 方法返回的类型不完整
        const tokenWithSigner = tokenContract.connect(signer) as any;

        // 辅助函数：检查并授权单个合约
        const checkAndApprove = async (spenderAddress: string, contractName: string) => {
          const currentAllowance = await tokenContract.allowance(userAddress, spenderAddress);
          const needsApproval = currentAllowance < approvalAmount;
          
          if (needsApproval) {
            console.log(`授权USDT给${contractName}合约...`, {
              tokenAddress,
              spenderAddress,
              currentAllowance: currentAllowance.toString(),
              approvalAmount: approvalAmount.toString(),
              dailyLimit: safeDailyLimit,
              explanation: `授权额度为每日限额的3倍（${approvalHumanAmount} USDT），支持3天的使用`,
            });
            
            try {
              const approveTx = await tokenWithSigner.approve(spenderAddress, approvalAmount);
              console.log(`等待${contractName}授权交易确认...`, approveTx.hash);
              await approveTx.wait();
              console.log(`✅ USDT授权给${contractName}成功，授权额度：${approvalHumanAmount} USDT（有限授权）`);
            } catch (approveError: any) {
              console.error(`❌ USDT授权给${contractName}失败:`, approveError);
              // 提供更友好的错误信息
              if (approveError.code === 4001) {
                throw new Error(`用户拒绝了${contractName}授权交易。请重新尝试并确认授权。`);
              } else if (approveError.message?.includes('insufficient funds') || approveError.message?.includes('gas')) {
                throw new Error('Gas费用不足，请确保钱包有足够的BNB/BTC来支付交易费用。');
              } else if (approveError.message?.includes('Transaction failed')) {
                throw new Error('交易失败，可能是网络问题或合约调用失败。请稍后重试。');
              } else {
                throw new Error(`授权失败：${approveError.message || '未知错误'}`);
              }
            }
          } else {
            console.log(`✅ USDT对${contractName}授权额度充足（当前：${ethers.formatUnits(currentAllowance, decimals)} USDT），无需重新授权`);
          }
        };

        // 同时授权 ERC8004 和 Commission 合约（QuickPay 需要两者的授权）
        // ERC8004: Session 管理需要
        // Commission: quickPaySplitFrom 需要从用户钱包转账
        await checkAndApprove(erc8004Address, 'ERC8004');
        await checkAndApprove(commissionAddress, 'Commission');
      }

      // 5. 调用合约创建Session（需要用户钱包执行）
      let onChainSessionId: string | null = null;
      const expiryTimestamp = Math.floor(Date.now() / 1000) + config.expiryDays * 86400;
      const singleLimitUnits = ethers.parseUnits(safeSingleLimit.toFixed(6), 6);
      const dailyLimitUnits = ethers.parseUnits(safeDailyLimit.toFixed(6), 6);

      if (signer) {
        const sessionManagerContract = new ethers.Contract(
          erc8004Address,
          SESSION_MANAGER_ABI,
          signer,
        );

        console.log('在链上注册Session...', {
          owner: userAddress,
          signer: sessionKey.publicKey,
          singleLimit: safeSingleLimit,
          dailyLimit: safeDailyLimit,
          expiryTimestamp,
        });

        const predictedSessionId = await sessionManagerContract.createSession.staticCall(
          sessionKey.publicKey,
          singleLimitUnits,
          dailyLimitUnits,
          expiryTimestamp,
        );

        // 增加 gasLimit 缓冲，防止因为 gas 估算不足导致失败
        const tx = await sessionManagerContract.createSession(
          sessionKey.publicKey,
          singleLimitUnits,
          dailyLimitUnits,
          expiryTimestamp,
          {
            gasLimit: 500000, // 增加到 50万 gas
          }
        );
        console.log('等待Session创建交易确认...', tx.hash);
        await tx.wait();
        onChainSessionId = predictedSessionId;
        console.log(`✅ Session 已在链上注册: ${predictedSessionId}`);
      } else {
        console.warn('无法获取浏览器签名器，跳过链上Session注册（仅用于本地调试）');
      }

      // 6. 调用后端登记 Session
      const session = await paymentApi.createSession({
        signer: sessionKey.publicKey,
        singleLimit: safeSingleLimit * 1e6, // 转换为 6 decimals
        dailyLimit: safeDailyLimit * 1e6,
        expiryDays: config.expiryDays,
        signature,
        sessionId: onChainSessionId || undefined,
        agentId: config.agentId,
      });

      // 7. 刷新列表
      await loadSessions();

      return session;
    } catch (err: any) {
      console.error('Failed to create session:', err);
      setError(err.message || 'Failed to create session');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 撤销 Session（包括撤销USDT授权）
  const revokeSession = async (sessionId: string) => {
    if (!isConnected || !defaultWallet) {
      throw new Error('Please connect your wallet first');
    }

    try {
      setLoading(true);
      setError(null);

      // 1. 撤销链上Session
      await paymentApi.revokeSession(sessionId);

      // 2. 撤销USDT授权（将授权额度设为0）
      // 动态获取 Provider，支持 OKX 和 MetaMask
      let provider;
      if ((window as any).okxwallet) {
          provider = new ethers.BrowserProvider((window as any).okxwallet);
      } else if (window.ethereum) {
          provider = new ethers.BrowserProvider(window.ethereum);
      }

      if (provider) {
        const erc8004Address = process.env.NEXT_PUBLIC_ERC8004_CONTRACT_ADDRESS || '0xFfEf72198A71B288EfE403AC07f9c60A1a99f29e';
        const tokenAddress = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'; // BSC Testnet USDT

        const signer = await provider.getSigner();
        
        const tokenContract = new ethers.Contract(
          tokenAddress,
          [
            'function approve(address spender, uint256 amount) returns (bool)',
          ],
          signer
        );

        console.log('撤销USDT授权给ERC8004合约...', {
          tokenAddress,
          erc8004Address,
        });

        // 将授权额度设为0，撤销授权
        const revokeTx = await tokenContract.approve(erc8004Address, 0);
        console.log('等待撤销授权交易确认...', revokeTx.hash);
        await revokeTx.wait();
        console.log('✅ USDT授权已撤销');
      }

      // 3. 刷新列表
      await loadSessions();
    } catch (err: any) {
      console.error('Failed to revoke session:', err);
      setError(err.message || 'Failed to revoke session');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 加载活跃 Session
  const loadActiveSession = async () => {
    try {
      const response = await paymentApi.getActiveSession();
      // 后端现在返回 { data: session } 或 { data: null }
      const session = response?.data !== undefined ? response.data : response;
      setActiveSession(session);
      return session;
    } catch (err: any) {
      console.error('Failed to load active session:', err);
      return null;
    }
  };

  // 初始化时加载
  useEffect(() => {
    if (isConnected) {
      loadSessions();
    }
  }, [isConnected]);

  return {
    sessions,
    activeSession,
    loading,
    error,
    createSession,
    revokeSession,
    loadSessions,
    loadActiveSession,
  };
}

