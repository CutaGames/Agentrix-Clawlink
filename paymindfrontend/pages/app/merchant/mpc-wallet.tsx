import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Wallet,
  Key,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { mpcWalletApi, MPCWallet, CreateMPCWalletResponse } from '@/lib/api/mpc-wallet.api';

export default function MPCWalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<MPCWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 创建钱包相关状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createPassword, setCreatePassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<CreateMPCWalletResponse | null>(null);
  const [shardCBackedUp, setShardCBackedUp] = useState(false);


  // 恢复钱包相关状态
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [recoverShardA, setRecoverShardA] = useState('');
  const [recoverShardC, setRecoverShardC] = useState('');
  const [recoverPassword, setRecoverPassword] = useState('');
  const [recovering, setRecovering] = useState(false);

  // 显示/隐藏敏感信息
  const [showShardC, setShowShardC] = useState(false);
  const [showShardA, setShowShardA] = useState(false);
  const [showShardCInWallet, setShowShardCInWallet] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mpcWalletApi.getMyWallet();
      setWallet(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        // 钱包不存在，这是正常情况
        setWallet(null);
      } else {
        setError(err.message || '加载钱包信息失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!createPassword || createPassword.length < 8) {
      setError('密码长度至少 8 位');
      return;
    }

    if (createPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setCreating(true);
    try {
      const result = await mpcWalletApi.createWallet({ password: createPassword });
      setCreateResult(result);

      // 保存分片A和分片C到本地存储（永久保存，防止丢失）
      localStorage.setItem('mpc_shard_a', result.encryptedShardA);
      localStorage.setItem('mpc_shard_c', result.encryptedShardC);

      setSuccess('钱包创建成功！分片A和分片C已保存到本地，请妥善保管。');
    } catch (err: any) {
      setError(err.message || '创建钱包失败');
    } finally {
      setCreating(false);
    }
  };


  const handleRecoverWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!recoverShardA || !recoverShardC || !recoverPassword) {
      setError('请填写所有字段');
      return;
    }

    setRecovering(true);
    try {
      const result = await mpcWalletApi.recoverWallet({
        encryptedShardA: recoverShardA,
        encryptedShardC: recoverShardC,
        password: recoverPassword,
      });
      setSuccess(result.message);
      setShowRecoverModal(false);
      await loadWallet();
    } catch (err: any) {
      setError(err.message || '恢复钱包失败');
    } finally {
      setRecovering(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('已复制到剪贴板');
    setTimeout(() => setSuccess(null), 2000);
  };

  const downloadShardC = () => {
    const shardC = createResult?.encryptedShardC || getShardC();
    if (!shardC) {
      setError('分片C未找到，可能已丢失。请使用分片A+C恢复钱包。');
      return;
    }
    const blob = new Blob([shardC], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mpc-wallet-shard-c-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadShardA = () => {
    const shardA = localStorage.getItem('mpc_shard_a');
    if (!shardA) {
      setError('分片A未找到，可能已丢失。请使用分片A+C恢复钱包。');
      return;
    }
    const blob = new Blob([shardA], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mpc-wallet-shard-a-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getShardA = (): string | null => {
    return localStorage.getItem('mpc_shard_a');
  };

  const getShardC = (): string | null => {
    return localStorage.getItem('mpc_shard_c');
  };

  if (loading) {
    return (
      <DashboardLayout userType="merchant">
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="animate-spin text-indigo-600" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="merchant">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">MPC钱包管理</h1>
          <p className="text-slate-600">管理您的多方计算（MPC）钱包，安全存储和管理</p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="text-red-600" size={20} />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* 成功提示 */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="text-green-600" size={20} />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {/* 钱包不存在 - 显示创建界面 */}
        {!wallet && !createResult && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <div className="text-center mb-8">
              <Wallet className="mx-auto text-slate-400 mb-4" size={64} />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">您还没有MPC钱包</h2>
              <p className="text-slate-600 mb-6">
                MPC钱包使用3分片、2/3阈值机制，提供更高的安全性和灵活性
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                <p className="text-sm text-blue-800 font-semibold mb-2 flex items-center gap-2">
                  <Info size={16} />
                  关于MPC钱包
                </p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 私钥分成3份，需要2份才能恢复</li>
                  <li>• 分片A：存储在您的设备上（加密）</li>
                  <li>• 分片B：PayMind服务器持有</li>
                  <li>• 分片C：您需要备份保存</li>
                  <li>• 即使PayMind停止服务，您也可以使用分片A+C恢复钱包</li>
                </ul>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                创建MPC钱包
              </button>
            </div>
          </div>
        )}

        {/* 创建钱包结果 */}
        {createResult && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6">
            <div className="text-center mb-6">
              <CheckCircle2 className="mx-auto text-green-500 mb-4" size={48} />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">钱包创建成功</h2>
              <p className="text-slate-600">{createResult.message}</p>
            </div>

            {/* 分片说明 */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
              <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                <Info size={16} />
                MPC钱包分片说明
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-blue-800">
                <div className="bg-white p-3 rounded border border-blue-200">
                  <p className="font-semibold mb-1">分片A（您的设备）</p>
                  <p>已自动保存到浏览器本地存储，建议下载备份</p>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <p className="font-semibold mb-1">分片B（PayMind服务器）</p>
                  <p>由PayMind安全保管，存储在加密数据库中</p>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <p className="font-semibold mb-1">分片C（您的备份）</p>
                  <p>需要您自己保存，用于恢复钱包</p>
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                💡 恢复钱包需要任意2个分片：A+B、A+C 或 B+C
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-lg">
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  钱包地址
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono text-slate-900 break-all">
                    {createResult.walletAddress}
                  </code>
                  <button
                    onClick={() => copyToClipboard(createResult.walletAddress)}
                    className="p-2 hover:bg-slate-200 rounded transition"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              {/* 分片A */}
              <div className="bg-blue-50 border-2 border-blue-300 p-6 rounded-lg">
                <label className="text-base font-bold text-blue-900 mb-3 block flex items-center gap-2">
                  <Key size={20} className="text-blue-600" />
                  分片A（设备存储）- 建议备份
                </label>
                
                <div className="bg-white border border-blue-300 rounded-lg p-4 mb-4">
                  {showShardA ? (
                    <div className="space-y-3">
                      <code className="block text-sm font-mono text-slate-900 break-all whitespace-pre-wrap bg-slate-50 p-3 rounded border">
                        {createResult.encryptedShardA}
                      </code>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            copyToClipboard(createResult.encryptedShardA);
                            setSuccess('分片A已复制到剪贴板！');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                        >
                          <Copy size={16} />
                          复制分片A
                        </button>
                        <button
                          onClick={() => {
                            downloadShardA();
                            setSuccess('分片A已下载！请保存到安全的地方。');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                        >
                          <Download size={16} />
                          下载分片A
                        </button>
                        <button
                          onClick={() => setShowShardA(false)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm font-medium"
                        >
                          <EyeOff size={16} />
                          隐藏
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="mb-4">
                        <Lock size={32} className="mx-auto text-blue-600 mb-2" />
                        <p className="text-sm text-blue-800 font-medium mb-4">
                          分片A已保存在浏览器本地，点击下方按钮查看
                        </p>
                      </div>
                      <button
                        onClick={() => setShowShardA(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium mx-auto"
                      >
                        <Eye size={20} />
                        查看分片A
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                  <p className="text-sm text-blue-900 font-semibold mb-2">
                    ℹ️ 说明：
                  </p>
                  <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                    <li>分片A已自动保存到您的浏览器本地存储</li>
                    <li>建议下载备份，以防浏览器数据丢失</li>
                    <li>与分片C一起可以恢复钱包</li>
                  </ul>
                </div>
              </div>

              {/* 分片C */}
              <div className="bg-yellow-50 border-2 border-yellow-300 p-6 rounded-lg">
                <label className="text-base font-bold text-yellow-900 mb-3 block flex items-center gap-2">
                  <AlertCircle size={20} className="text-yellow-600" />
                  分片C（备份）- 请妥善保管
                </label>
                
                {/* 分片C内容区域 */}
                <div className="bg-white border border-yellow-300 rounded-lg p-4 mb-4">
                  {showShardC ? (
                    <div className="space-y-3">
                      <code className="block text-sm font-mono text-slate-900 break-all whitespace-pre-wrap bg-slate-50 p-3 rounded border">
                        {createResult.encryptedShardC}
                      </code>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            copyToClipboard(createResult.encryptedShardC);
                            setSuccess('分片C已复制到剪贴板！');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                        >
                          <Copy size={16} />
                          复制分片C
                        </button>
                        <button
                          onClick={() => {
                            downloadShardC();
                            setSuccess('分片C已下载！请保存到安全的地方。');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                        >
                          <Download size={16} />
                          下载分片C
                        </button>
                        <button
                          onClick={() => setShowShardC(false)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm font-medium"
                        >
                          <EyeOff size={16} />
                          隐藏
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="mb-4">
                        <Lock size={32} className="mx-auto text-yellow-600 mb-2" />
                        <p className="text-sm text-yellow-800 font-medium mb-4">
                          分片C已加密，点击下方按钮查看
                        </p>
                      </div>
                      <button
                        onClick={() => setShowShardC(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium mx-auto"
                      >
                        <Eye size={20} />
                        查看分片C
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                  <p className="text-sm text-yellow-900 font-semibold mb-2">
                    ⚠️ 重要提示：
                  </p>
                  <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                    <li>分片C已自动保存到浏览器本地存储，但建议立即下载备份</li>
                    <li>这是恢复钱包的关键，请务必保存到安全的地方（如加密U盘、密码管理器等）</li>
                    <li>不要将分片C存储在云端或与他人分享</li>
                    <li>即使已保存在本地，也建议下载备份以防浏览器数据丢失</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center mb-6 space-x-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="backedUpA"
                  checked={showShardA && getShardA() !== null}
                  readOnly
                  className="mr-2"
                />
                <label htmlFor="backedUpA" className="text-sm text-slate-600">
                  分片A已保存到本地存储
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="backedUpC"
                  checked={shardCBackedUp}
                  onChange={(e) => setShardCBackedUp(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="backedUpC" className="text-sm text-slate-600">
                  我已妥善保存分片C
                </label>
              </div>
            </div>

            <button
              onClick={async () => {
                if (shardCBackedUp) {
                  setCreateResult(null);
                  setCreatePassword('');
                  setConfirmPassword('');
                  setShardCBackedUp(false);
                  await loadWallet();
                } else {
                  setError('请确认已保存分片C');
                }
              }}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              完成
            </button>
          </div>
        )}

        {/* 钱包信息 */}
        {wallet && (
          <div className="space-y-6">
            {/* 钱包概览 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Wallet size={24} />
                  钱包信息
                </h2>
                <button
                  onClick={loadWallet}
                  className="p-2 hover:bg-slate-100 rounded transition"
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              {/* 分片说明 */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <Info size={16} />
                  MPC钱包分片说明
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-blue-800">
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <p className="font-semibold mb-1">分片A（您的设备）</p>
                    <p>保存在浏览器本地存储，可查看和下载</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <p className="font-semibold mb-1">分片B（PayMind服务器）</p>
                    <p>由PayMind安全保管，存储在加密数据库中</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <p className="font-semibold mb-1">分片C（您的备份）</p>
                    <p>已保存在浏览器本地存储，可随时查看和下载</p>
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  💡 恢复钱包需要任意2个分片：A+B、A+C 或 B+C
                </p>
              </div>

              {/* 分片A管理 */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <Key size={16} />
                    分片A（设备存储）
                  </label>
                  {getShardA() ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const shardA = getShardA();
                          if (shardA) {
                            copyToClipboard(shardA);
                            setSuccess('分片A已复制到剪贴板！');
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-xs font-medium"
                      >
                        <Copy size={14} />
                        复制
                      </button>
                      <button
                        onClick={() => {
                          downloadShardA();
                          setSuccess('分片A已下载！请保存到安全的地方。');
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-medium"
                      >
                        <Download size={14} />
                        下载
                      </button>
                      <button
                        onClick={() => setShowShardA(!showShardA)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-xs font-medium"
                      >
                        {showShardA ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showShardA ? '隐藏' : '查看'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-red-600 font-medium">
                      ⚠️ 分片A未找到，请使用分片A+C恢复钱包
                    </span>
                  )}
                </div>
                {showShardA && getShardA() && (
                  <div className="bg-white border border-blue-300 rounded-lg p-3 mt-2">
                    <code className="block text-xs font-mono text-slate-900 break-all whitespace-pre-wrap">
                      {getShardA()}
                    </code>
                  </div>
                )}
                <p className="text-xs text-blue-700 mt-2">
                  ℹ️ 分片A已保存在浏览器本地存储，建议下载备份以防数据丢失
                </p>
              </div>

              {/* 分片C管理 */}
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-yellow-900 flex items-center gap-2">
                    <AlertCircle size={16} />
                    分片C（备份）- 请妥善保管
                  </label>
                  {getShardC() ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const shardC = getShardC();
                          if (shardC) {
                            copyToClipboard(shardC);
                            setSuccess('分片C已复制到剪贴板！');
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-xs font-medium"
                      >
                        <Copy size={14} />
                        复制
                      </button>
                      <button
                        onClick={() => {
                          downloadShardC();
                          setSuccess('分片C已下载！请保存到安全的地方。');
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-medium"
                      >
                        <Download size={14} />
                        下载
                      </button>
                      <button
                        onClick={() => setShowShardCInWallet(!showShardCInWallet)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-xs font-medium"
                      >
                        {showShardCInWallet ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showShardCInWallet ? '隐藏' : '查看'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-xs text-red-600 font-medium block">
                        ⚠️ 分片C未在本地找到
                      </span>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-800">
                        <p className="font-semibold mb-1">可能的原因：</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>钱包是在其他设备或浏览器中创建的</li>
                          <li>浏览器数据已被清除</li>
                          <li>您之前没有下载备份</li>
                        </ul>
                        <p className="mt-2 font-semibold">解决方案：</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>如果您之前下载过分片C备份文件，请上传恢复</li>
                          <li>如果您有分片A，可以联系PayMind支持，使用A+B方式恢复</li>
                          <li>如果您有分片A和分片C的备份，可以使用恢复功能</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                {showShardCInWallet && getShardC() && (
                  <div className="bg-white border border-yellow-300 rounded-lg p-3 mt-2">
                    <code className="block text-xs font-mono text-slate-900 break-all whitespace-pre-wrap">
                      {getShardC()}
                    </code>
                  </div>
                )}
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mt-2">
                  <p className="text-xs text-yellow-900 font-semibold mb-1">
                    ⚠️ 重要提示：
                  </p>
                  <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                    <li>分片C已保存在浏览器本地存储，但建议立即下载并保存到安全的地方</li>
                    <li>这是恢复钱包的关键，请务必妥善保管</li>
                    <li>不要将分片C存储在云端或与他人分享</li>
                    <li>丢失分片C将无法恢复钱包，请谨慎保管</li>
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">
                    钱包地址
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-slate-900 break-all">
                      {wallet.walletAddress}
                    </code>
                    <button
                      onClick={() => copyToClipboard(wallet.walletAddress)}
                      className="p-1 hover:bg-slate-100 rounded transition"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">
                    链类型
                  </label>
                  <p className="text-sm text-slate-900">{wallet.chain}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">
                    币种
                  </label>
                  <p className="text-sm text-slate-900">{wallet.currency}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">
                    状态
                  </label>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      wallet.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {wallet.isActive ? '激活' : '未激活'}
                  </span>
                </div>
              </div>
            </div>


            {/* 钱包恢复 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Key size={24} />
                钱包恢复
              </h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">恢复方式说明：</p>
                <div className="space-y-2 text-xs text-blue-800">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">方式1（推荐）：</span>
                    <span>使用分片A + 分片C - 完全自主恢复，不需要PayMind服务器</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">方式2：</span>
                    <span>使用分片A + 分片B - 需要PayMind服务器配合（请联系支持）</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">方式3：</span>
                    <span>使用分片B + 分片C - 需要PayMind服务器配合（请联系支持）</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setShowRecoverModal(true)}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  使用分片A+C恢复钱包（推荐）
                </button>
                <div className="text-xs text-slate-500 text-center">
                  其他恢复方式请联系PayMind技术支持
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 创建钱包模态框 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">创建MPC钱包</h2>

              <form onSubmit={handleCreateWallet}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      设置密码
                    </label>
                    <input
                      type="password"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="至少 8 位字符"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      确认密码
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="再次输入密码"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreatePassword('');
                      setConfirmPassword('');
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {creating ? '创建中...' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* 恢复钱包模态框 */}
        {showRecoverModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">恢复钱包</h2>
              <p className="text-sm text-slate-600 mb-4">
                使用分片A + 分片C恢复钱包（推荐方式）
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-800">
                  💡 <strong>提示：</strong>如果您有分片A和分片C的备份文件，可以直接粘贴内容。如果分片C丢失，请联系PayMind技术支持，我们可以协助使用其他方式恢复。
                </p>
              </div>

              <form onSubmit={handleRecoverWallet}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      分片A（加密）
                    </label>
                    <textarea
                      value={recoverShardA}
                      onChange={(e) => setRecoverShardA(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                      placeholder="粘贴加密的分片A（从备份文件或localStorage复制）"
                      rows={3}
                      required
                    />
                    {getShardA() && (
                      <button
                        type="button"
                        onClick={() => setRecoverShardA(getShardA() || '')}
                        className="mt-1 text-xs text-indigo-600 hover:text-indigo-700"
                      >
                        使用本地存储的分片A
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      分片C（加密）
                    </label>
                    <textarea
                      value={recoverShardC}
                      onChange={(e) => setRecoverShardC(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                      placeholder="粘贴加密的分片C（从备份文件复制）"
                      rows={3}
                      required
                    />
                    {getShardC() && (
                      <button
                        type="button"
                        onClick={() => setRecoverShardC(getShardC() || '')}
                        className="mt-1 text-xs text-indigo-600 hover:text-indigo-700"
                      >
                        使用本地存储的分片C
                      </button>
                    )}
                    {!getShardC() && (
                      <p className="mt-1 text-xs text-red-600">
                        ⚠️ 本地未找到分片C，请使用备份文件
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      密码
                    </label>
                    <input
                      type="password"
                      value={recoverPassword}
                      onChange={(e) => setRecoverPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="输入创建钱包时的密码"
                      required
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      这是创建钱包时设置的密码，用于解密分片
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-yellow-800">
                    <strong>其他恢复方式：</strong>如果您只有分片A或分片C，可以联系PayMind技术支持，我们可以协助使用A+B或B+C方式恢复。
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecoverModal(false);
                      setRecoverShardA('');
                      setRecoverShardC('');
                      setRecoverPassword('');
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={recovering}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {recovering ? '恢复中...' : '恢复钱包'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

