'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  History,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Zap,
  X,
  Calendar,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { SessionKeyManager } from '@/lib/session-key-manager';
import { paymentApi } from '@/lib/api/payment.api';
import { useWeb3 } from '@/contexts/Web3Context';
import { ethers } from 'ethers';

interface Session {
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

interface SessionManagerProps {
  onClose?: () => void;
}

export function SessionManager({ onClose }: SessionManagerProps) {
  const { isConnected, defaultWallet, signMessage } = useWeb3();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    singleLimit: 10,
    dailyLimit: 100,
    expiryDays: 30,
    agentId: '',
  });

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      // 这里应该调用 API 获取用户的 Session 列表
      // const data = await paymentApi.getSessions();
      // setSessions(data);
      
      // Mock data for now
      setSessions([]);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!isConnected || !defaultWallet) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);

      // 1. 生成 Session Key（浏览器本地）
      const sessionKey = await SessionKeyManager.generateSessionKey();

      // 2. 使用主钱包签名授权（一次性）
      if (!signMessage) {
        throw new Error('Wallet signMessage not available');
      }
      const message = `Authorize Session Key: ${sessionKey.publicKey}\nSingle Limit: ${formData.singleLimit} USDC\nDaily Limit: ${formData.dailyLimit} USDC\nExpiry: ${formData.expiryDays} days`;
      const signature = await signMessage(message);

      // 3. 获取ERC8004合约地址和USDT地址
      const erc8004Address = process.env.NEXT_PUBLIC_ERC8004_CONTRACT_ADDRESS || '0x3310a6e841877f28C755bFb5aF90e6734EF059fA';
      const tokenAddress = process.env.NEXT_PUBLIC_USDT_ADDRESS || '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'; // BSC Testnet USDT

      // 4. 检查并授权USDT给ERC8004合约
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        
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
        const approvalHumanAmount = Number((formData.dailyLimit * 3).toFixed(6));
        const approvalAmount = ethers.parseUnits(approvalHumanAmount.toString(), decimals);
        
        // 检查是否需要授权
        const needsApproval = currentAllowance < approvalAmount;
        
        if (needsApproval) {
          console.log('授权USDT给ERC8004合约...', {
            tokenAddress,
            erc8004Address,
            currentAllowance: currentAllowance.toString(),
            approvalAmount: approvalAmount.toString(),
            dailyLimit: formData.dailyLimit,
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
              throw new Error('Gas费用不足，请确保钱包有足够的BNB/BTC来支付交易费用。');
            } else if (approveError.message?.includes('Transaction failed')) {
              throw new Error('交易失败，可能是网络问题或合约调用失败。请稍后重试。');
            } else {
              throw new Error(`授权失败：${approveError.message || '未知错误'}`);
            }
          }
        } else {
          console.log(`✅ USDT授权额度充足（当前：${ethers.formatUnits(currentAllowance, decimals)} USDT），无需重新授权`);
        }
      }

      // 5. 调用合约创建Session（需要用户钱包执行）
      let onChainSessionId: string | null = null;
      const expiryTimestamp = Math.floor(Date.now() / 1000) + formData.expiryDays * 86400;
      const safeSingleLimit = Math.max(formData.singleLimit, 0.0001);
      const safeDailyLimit = Math.max(formData.dailyLimit, Math.max(safeSingleLimit, 0.001));
      const singleLimitUnits = ethers.parseUnits(safeSingleLimit.toFixed(6), 6);
      const dailyLimitUnits = ethers.parseUnits(safeDailyLimit.toFixed(6), 6);

      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();

        const SESSION_MANAGER_ABI = [
          'function createSession(address signer, uint256 singleLimit, uint256 dailyLimit, uint256 expiry) returns (bytes32)',
          'event SessionCreated(bytes32 indexed sessionId, address indexed owner, address indexed signer, uint256 singleLimit, uint256 dailyLimit, uint256 expiry)',
        ];

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

        try {
          const predictedSessionId = await sessionManagerContract.createSession.staticCall(
            sessionKey.publicKey,
            singleLimitUnits,
            dailyLimitUnits,
            expiryTimestamp,
          );

          const tx = await sessionManagerContract.createSession(
            sessionKey.publicKey,
            singleLimitUnits,
            dailyLimitUnits,
            expiryTimestamp,
          );
          console.log('等待Session创建交易确认...', tx.hash);
          const receipt = await tx.wait();
          
          // 从事件中解析实际的 sessionId
          // SessionCreated 事件: event SessionCreated(bytes32 indexed sessionId, address indexed owner, address indexed signer, ...)
          if (receipt && receipt.logs) {
            const eventInterface = new ethers.Interface(SESSION_MANAGER_ABI);
            for (const log of receipt.logs) {
              try {
                const parsed = eventInterface.parseLog({
                  topics: log.topics as string[],
                  data: log.data,
                });
                if (parsed && parsed.name === 'SessionCreated') {
                  // indexed 参数 sessionId 在 args 中
                  onChainSessionId = parsed.args.sessionId || parsed.args[0];
                  console.log(`✅ 从事件中解析到 Session ID: ${onChainSessionId}`);
                  break;
                }
              } catch (e) {
                // 如果解析失败，尝试直接从 topics 获取
                if (log.topics && log.topics.length >= 2) {
                  const eventSignature = ethers.id('SessionCreated(bytes32,address,address,uint256,uint256,uint256)');
                  if (log.topics[0] === eventSignature) {
                    onChainSessionId = log.topics[1];
                    console.log(`✅ 从 topics 直接获取 Session ID: ${onChainSessionId}`);
                    break;
                  }
                }
              }
            }
          }
          
          // 如果事件解析失败，使用预测值
          if (!onChainSessionId) {
            onChainSessionId = predictedSessionId;
            console.log(`⚠️ 无法从事件解析，使用预测值: ${onChainSessionId}`);
          }
          
          // 等待额外几个区块确认，确保后端能查询到
          console.log('等待区块确认以确保链上数据同步...');
          await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒
          
          console.log(`✅ Session 已在链上注册: ${onChainSessionId}`);
        } catch (error: any) {
          console.error('链上创建Session失败:', error);
          throw new Error(`链上创建Session失败: ${error.message || error}`);
        }
      } else {
        console.warn('无法获取浏览器签名器，跳过链上Session注册（仅用于本地调试）');
      }

      // 6. 调用后端登记 Session（带重试机制，因为链上数据同步可能有延迟）
      let session;
      
      if (onChainSessionId) {
        // 如果有链上 sessionId，带重试机制调用
        let retries = 3;
        let lastError: any = null;
        
        while (retries > 0) {
          try {
            session = await paymentApi.createSession({
              signer: sessionKey.publicKey,
              singleLimit: safeSingleLimit * 1e6, // 转换为 6 decimals
              dailyLimit: safeDailyLimit * 1e6,
              expiryDays: formData.expiryDays,
              signature,
              sessionId: onChainSessionId, // Pass the on-chain ID
              agentId: formData.agentId || undefined,
            });
            break; // 成功则退出循环
          } catch (error: any) {
            lastError = error;
            if (error.message?.includes('Session not found on-chain') && retries > 1) {
              console.log(`后端验证失败，等待链上数据同步... (剩余重试: ${retries - 1})`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒后重试
              retries--;
            } else {
              throw error; // 其他错误或重试次数用完，直接抛出
            }
          }
        }
        
        if (!session) {
          throw lastError || new Error('Failed to create session after retries');
        }
      } else {
        // 如果没有 onChainSessionId，直接调用（后端会生成本地 sessionId）
        session = await paymentApi.createSession({
          signer: sessionKey.publicKey,
          singleLimit: safeSingleLimit * 1e6,
          dailyLimit: safeDailyLimit * 1e6,
          expiryDays: formData.expiryDays,
          signature,
          agentId: formData.agentId || undefined,
        });
      }

      // 6. 刷新列表
      await loadSessions();
      setShowCreateModal(false);
      setFormData({
        singleLimit: 10,
        dailyLimit: 100,
        expiryDays: 30,
        agentId: '',
      });
    } catch (error: any) {
      console.error('Failed to create session:', error);
      alert(error.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('确定要撤销这个Session吗？这将同时撤销USDT授权，后续无法使用QuickPay支付。')) {
      return;
    }

    if (!isConnected || !defaultWallet) {
      alert('请先连接钱包');
      return;
    }

    try {
      setLoading(true);

      // 1. 撤销链上Session
      await paymentApi.revokeSession(sessionId);

      // 2. 撤销USDT授权（将授权额度设为0）
      if (window.ethereum) {
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
        const tokenWithSigner = tokenContract.connect(signer) as any;
        const revokeTx = await tokenWithSigner.approve(erc8004Address, 0);
        console.log('等待撤销授权交易确认...', revokeTx.hash);
        await revokeTx.wait();
        console.log('✅ USDT授权已撤销');
      }

      // 3. 刷新列表
      await loadSessions();
    } catch (error: any) {
      console.error('Failed to revoke session:', error);
      alert(error.message || '撤销Session失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 font-sans">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-6 text-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Agent Authorization</h2>
            <p className="text-indigo-100 text-sm">Manage your X402 Session Keys</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!isConnected || loading}
          className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Zap size={16} />
          Create New Session
        </button>
      </div>

      {/* 内容区 */}
      <div className="p-6">
        {loading && sessions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <ShieldCheck className="mx-auto text-slate-300 mb-4" size={48} />
            <div className="text-slate-500 mb-2">No active sessions</div>
            <div className="text-sm text-slate-400">
              Create a session to enable QuickPay for your agents
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Zap size={16} className="text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          {session.agentId || 'Default Session'}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {session.signer.slice(0, 6)}...{session.signer.slice(-4)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.isActive ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                        Revoked
                      </span>
                    )}
                    {session.isActive && (
                      <button
                        onClick={() => handleRevokeSession(session.sessionId)}
                        className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <DollarSign size={12} />
                      Single Limit
                    </div>
                    <div className="font-bold text-slate-900">
                      ${session.singleLimit.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <TrendingUp size={12} />
                      Daily Limit
                    </div>
                    <div className="font-bold text-slate-900">
                      ${session.dailyLimit.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <Calendar size={12} />
                      Used Today
                    </div>
                    <div className="font-bold text-slate-900">
                      ${session.usedToday.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  Expires: {new Date(session.expiry).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建 Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Create New Session</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Single Transaction Limit (USDC)
                </label>
                <input
                  type="number"
                  value={formData.singleLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      singleLimit: Math.max(parseFloat(e.target.value) || 0, 0.0001),
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder:text-slate-400 bg-white"
                  min="0.0001"
                  step="0.0001"
                />
                <p className="text-xs text-slate-500 mt-1">最小 0.0001 USDC</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Daily Limit (USDC)
                </label>
                <input
                  type="number"
                  value={formData.dailyLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dailyLimit: Math.max(
                        parseFloat(e.target.value) || 0,
                        Math.max(formData.singleLimit, 0.001),
                      ),
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder:text-slate-400 bg-white"
                  min={Math.max(formData.singleLimit, 0.001)}
                  step="0.0001"
                />
                {/* 显示授权额度说明 */}
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-xs text-blue-800">
                    <div className="font-semibold mb-1">🔒 授权说明</div>
                    <div className="text-blue-700">
                      创建Session时，您需要授权 <span className="font-bold text-blue-900">{formData.dailyLimit * 3} USDT</span> 给ERC8004合约
                    </div>
                    <div className="text-blue-600 mt-1 text-xs">
                      • 授权额度 = 每日限额 × 3（支持3天使用）<br/>
                      • 最小单笔 0.0001 USDC，最小每日 0.001 USDC<br/>
                      • 您可以在Session管理中随时撤销授权
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Expiry (Days)
                </label>
                <input
                  type="number"
                  value={formData.expiryDays}
                  onChange={(e) =>
                    setFormData({ ...formData, expiryDays: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder:text-slate-400 bg-white"
                  min="1"
                  max="365"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Agent ID (Optional)
                </label>
                <input
                  type="text"
                  value={formData.agentId}
                  onChange={(e) =>
                    setFormData({ ...formData, agentId: e.target.value })
                  }
                  placeholder="e.g., news-reader-bot"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder:text-slate-400 bg-white"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                disabled={loading || formData.dailyLimit < formData.singleLimit}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

