import { useState, useEffect } from 'react';
import { SessionKeyManager } from '@/lib/session-key-manager';
import { paymentApi } from '@/lib/api/payment.api';
import { useWeb3 } from '@/contexts/Web3Context';
import { ethers } from 'ethers';

// 完整的 ERC8004SessionManager ABI（包含事件）
const SESSION_MANAGER_ABI = [
  'function createSession(address signer, uint256 singleLimit, uint256 dailyLimit, uint256 expiry) returns (bytes32)',
  'function getSession(bytes32) view returns (tuple(address signer, address owner, uint256 singleLimit, uint256 dailyLimit, uint256 usedToday, uint256 expiry, uint256 lastResetDate, bool isActive))',
  'event SessionCreated(bytes32 indexed sessionId, address indexed owner, address indexed signer, uint256 singleLimit, uint256 dailyLimit, uint256 expiry)',
];

export interface Session {
  id: string;
  sessionId: string;
  signer: string;
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

      // 3. 获取ERC8004合约地址和USDT地址（从后端API或环境变量）
      // 先尝试从后端获取，如果没有则使用环境变量
      let erc8004Address: string;
      let tokenAddress: string;
      
      try {
        // 从后端API获取合约地址
        const contractInfo = await paymentApi.getContractAddress?.();
        erc8004Address = contractInfo?.erc8004ContractAddress || process.env.NEXT_PUBLIC_ERC8004_CONTRACT_ADDRESS || '0x3310a6e841877f28C755bFb5aF90e6734EF059fA';
        // 注意：API 返回的是 usdcAddress，但这里使用 USDT 地址作为默认值
        tokenAddress = contractInfo?.usdcAddress || process.env.NEXT_PUBLIC_USDT_ADDRESS || '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'; // BSC Testnet USDT
      } catch {
        // 如果API不存在，使用环境变量或默认值
        erc8004Address = process.env.NEXT_PUBLIC_ERC8004_CONTRACT_ADDRESS || '0x3310a6e841877f28C755bFb5aF90e6734EF059fA';
        tokenAddress = process.env.NEXT_PUBLIC_USDT_ADDRESS || '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'; // BSC Testnet USDT
      }

      // 4. 检查并授权USDT给ERC8004合约
      let provider: ethers.BrowserProvider | null = null;
      let signer: ethers.Signer | null = null;
      let userAddress: string | null = null;

      if (typeof window !== 'undefined' && window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
        
        // 先尝试获取已授权的账户，避免触发 MetaMask 弹窗
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            userAddress = accounts[0];
            // 使用已授权的账户创建 signer（不会弹窗）
            signer = await provider.getSigner();
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
        const currentAllowance = await tokenContract.allowance(userAddress, erc8004Address);
        // 授权额度 = dailyLimit * 3（支持3天的使用，既安全又实用）
        // 这样用户可以看到明确的授权额度，而不是"无限"
        const approvalHumanAmount = Number((safeDailyLimit * 3).toFixed(6));
        const approvalAmount = ethers.parseUnits(approvalHumanAmount.toString(), decimals);
        
        // 检查是否需要授权
        const needsApproval = currentAllowance < approvalAmount;
        
        if (needsApproval) {
          console.log('授权USDT给ERC8004合约...', {
            tokenAddress,
            erc8004Address,
            currentAllowance: currentAllowance.toString(),
            approvalAmount: approvalAmount.toString(),
            dailyLimit: safeDailyLimit,
            explanation: `授权额度为每日限额的3倍（${approvalHumanAmount} USDT），支持3天的使用`,
          });
          
          // 使用类型断言，因为 ethers.Contract 的 connect 方法返回的类型不完整
          const tokenWithSigner = tokenContract.connect(signer) as any;
          
          // 授权有限额度（dailyLimit * 3），而不是无限授权
          try {
            const approveTx = await tokenWithSigner.approve(erc8004Address, approvalAmount);
            console.log('等待授权交易确认...', approveTx.hash);
            await approveTx.wait();
            console.log(`✅ USDT授权成功，授权额度：${approvalHumanAmount} USDT（有限授权）`);
          } catch (approveError: any) {
            console.error('❌ USDT授权失败:', approveError);
            // 提供更友好的错误信息
            if (approveError.code === 4001) {
              throw new Error('用户拒绝了授权交易。请重新尝试并确认授权。');
            } else if (approveError.message?.includes('insufficient funds') || approveError.message?.includes('gas')) {
              throw new Error('Gas费用不足。请确保钱包有足够的BNB（BSC测试网）来支付交易费用。\n\n获取测试网BNB：https://testnet.bnbchain.org/faucet-smart');
            } else if (approveError.message?.includes('Transaction failed')) {
              throw new Error('交易失败。可能原因：\n1. 钱包BNB余额不足（需要支付Gas费）\n2. USDT余额不足\n3. 网络拥堵\n\n请检查钱包余额后重试。\n获取测试网资产：https://testnet.bnbchain.org/faucet-smart');
            } else {
              throw new Error(`授权失败：${approveError.message || '未知错误'}\n\n请确保钱包有足够的BNB和USDT。`);
            }
          }
        } else {
          console.log(`✅ USDT授权额度充足（当前：${ethers.formatUnits(currentAllowance, decimals)} USDT），无需重新授权`);
        }
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

        // 先使用 staticCall 预检查，获取可能的错误信息
        try {
          // 预检查 - 如果这一步失败，说明合约会拒绝交易
          const predictedSessionId = await sessionManagerContract.createSession.staticCall(
            sessionKey.publicKey,
            singleLimitUnits,
            dailyLimitUnits,
            expiryTimestamp,
          );
          console.log('预测的 SessionId:', predictedSessionId);

          // 执行实际交易
          const tx = await sessionManagerContract.createSession(
            sessionKey.publicKey,
            singleLimitUnits,
            dailyLimitUnits,
            expiryTimestamp,
          );
          console.log('等待Session创建交易确认...', tx.hash);
          
          // 等待交易确认
          const receipt = await tx.wait();
          
          if (!receipt || receipt.status === 0) {
            throw new Error('交易已发送但执行失败，请检查钱包中的交易状态');
          }
          
          // 从交易日志中获取实际的 sessionId
          // SessionCreated 事件: event SessionCreated(bytes32 indexed sessionId, address indexed owner, address indexed signer, ...)
          // indexed 参数在 topics 中: topics[0]=事件签名, topics[1]=sessionId, topics[2]=owner, topics[3]=signer
          let foundSessionId: string | null = null;
          
          for (const log of receipt.logs) {
            try {
              const parsed = sessionManagerContract.interface.parseLog({
                topics: log.topics as string[],
                data: log.data,
              });
              
              if (parsed?.name === 'SessionCreated') {
                // 对于 indexed 参数，ethers v6 会正确解析到 args 中
                foundSessionId = parsed.args.sessionId || parsed.args[0];
                console.log(`✅ 从 SessionCreated 事件获取 sessionId: ${foundSessionId}`);
                break;
              }
            } catch (e) {
              // 如果解析失败，尝试直接从 topics 获取（sessionId 是第一个 indexed 参数）
              if (log.topics && log.topics.length >= 2) {
                // 检查是否是 SessionCreated 事件（通过事件签名）
                const eventSignature = ethers.id('SessionCreated(bytes32,address,address,uint256,uint256,uint256)');
                if (log.topics[0] === eventSignature) {
                  foundSessionId = log.topics[1]; // sessionId 在 topics[1]
                  console.log(`✅ 从 topics 直接获取 sessionId: ${foundSessionId}`);
                  break;
                }
              }
            }
          }
          
          if (foundSessionId) {
            onChainSessionId = foundSessionId;
            console.log(`✅ Session 已在链上注册: ${onChainSessionId}`);
          } else {
            // 最后的 fallback：使用预测值（但这可能不准确）
            console.warn('⚠️ 无法从事件解析 sessionId，使用预测值（可能不准确）');
            onChainSessionId = predictedSessionId;
          }
          
          // 验证 session 是否真的存在
          console.log('验证链上 Session...');
          try {
            const verifySession = await sessionManagerContract.getSession(onChainSessionId);
            if (!verifySession || verifySession.signer === ethers.ZeroAddress) {
              console.warn('⚠️ 链上验证失败：Session 未找到，可能需要等待区块同步');
              // 不抛出错误，让后端重试
            } else {
              console.log('✅ 链上验证成功');
            }
          } catch (verifyError) {
            console.warn('⚠️ 链上验证出错:', verifyError);
          }
          
        } catch (txError: any) {
          console.error('❌ Session创建交易失败:', txError);
          // 提供更友好的错误提示
          if (txError.code === 4001) {
            throw new Error('用户拒绝了交易。请重新尝试并在钱包中确认交易。');
          } else if (txError.message?.includes('insufficient funds') || txError.message?.includes('gas')) {
            throw new Error('Gas费用不足。请确保钱包有足够的BNB（BSC测试网）来支付交易费用。\n\n获取测试网BNB：https://testnet.bnbchain.org/faucet-smart');
          } else if (txError.message?.includes('Transaction failed') || txError.code === -32603) {
            throw new Error('链上交易执行失败。可能原因：\n1. 已存在相同配置的 Session\n2. 合约状态检查未通过\n3. Gas 估算不准确\n\n请稍后重试或联系支持。');
          } else if (txError.message?.includes('nonce')) {
            throw new Error('交易 nonce 冲突。请等待之前的交易完成后重试。');
          } else {
            throw new Error(`Session创建失败：${txError.message || '未知错误'}\n\n请检查钱包状态后重试。`);
          }
        }
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
      if (typeof window !== 'undefined' && window.ethereum) {
        const erc8004Address = process.env.NEXT_PUBLIC_ERC8004_CONTRACT_ADDRESS || '0x3310a6e841877f28C755bFb5aF90e6734EF059fA';
        const tokenAddress = process.env.NEXT_PUBLIC_USDT_ADDRESS || '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'; // BSC Testnet USDT

        const provider = new ethers.BrowserProvider(window.ethereum);
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
      setLoading(true);  // 设置加载状态
      const response = await paymentApi.getActiveSession();
      // 后端现在返回 { data: session } 或 { data: null }
      const session = response?.data !== undefined ? response.data : response;
      setActiveSession(session);
      return session;
    } catch (err: any) {
      console.error('Failed to load active session:', err);
      return null;
    } finally {
      setLoading(false);  // 无论成功还是失败都重置加载状态
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

