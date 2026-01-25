'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ArrowLeftRight, 
  Clock, 
  Plus,
  Loader2,
  ShieldCheck,
  Zap,
  RefreshCw,
  Copy,
  Check,
  ArrowDownRight,
  ArrowUpLeft,
  DollarSign,
  ExternalLink
} from 'lucide-react';
import { useAccounts } from '../../contexts/AccountContext';
import { useWeb3 } from '../../contexts/Web3Context';
import { Account, Transaction, accountApi } from '../../lib/api/account.api';
import { TransakWidget } from '../payment/TransakWidget';
import { PayoutSettingsPanel } from './PayoutSettingsPanel';

const chainIcons: Record<string, { color: string; label: string; speed: string; icon: string }> = {
  evm: { color: 'text-blue-500', label: 'Ethereum', speed: 'Fast', icon: '' },
  base: { color: 'text-blue-600', label: 'Base', speed: 'Instant', icon: '' },
  bnb: { color: 'text-yellow-500', label: 'BNB Chain', speed: 'Moderate', icon: '' },
  solana: { color: 'text-purple-500', label: 'Solana', speed: 'Instant', icon: '' },
  bitcoin: { color: 'text-orange-500', label: 'Bitcoin', speed: 'Slow', icon: '' },
};

interface AccountItemProps {
  account: Account;
  isDefault?: boolean;
  onDeposit?: () => void;
  onWithdraw?: () => void;
}

const AccountItem: React.FC<AccountItemProps> = ({ account, isDefault, onDeposit, onWithdraw }) => {
  const [copied, setCopied] = useState(false);
  const chainInfo = chainIcons[account.chainType] || chainIcons.evm;
  const balances = account.balances || {};
  const [currency, amount] = Object.entries(balances)[0] || ['USDC', '0'];

  const copyAddress = () => {
    if (account.walletAddress) {
      navigator.clipboard.writeText(account.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 hover:bg-slate-800 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl">
            {chainInfo.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{chainInfo.label}</span>
              {isDefault && <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full font-bold">DEFAULT</span>}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 font-mono mt-0.5">
              {account.walletAddress ? `${account.walletAddress.slice(0, 6)}...${account.walletAddress.slice(-4)}` : 'Internal'}
              {account.walletAddress && (
                <button onClick={copyAddress} className="hover:text-white transition-colors">
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono font-bold text-white">${parseFloat(amount).toLocaleString()}</div>
          <div className="text-xs text-slate-500 uppercase tracking-widest">{currency}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={onDeposit}
          className="flex items-center justify-center gap-1.5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all"
        >
          <ArrowDownToLine size={14} /> RECHARGE
        </button>
        <button 
          onClick={onWithdraw}
          className="flex items-center justify-center gap-1.5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all"
        >
          <ArrowUpFromLine size={14} /> WITHDRAW
        </button>
      </div>
    </div>
  );
};

const DepositModal = ({ isOpen, onClose, walletAddress }: { isOpen: boolean; onClose: () => void; walletAddress?: string }) => {
  const [method, setMethod] = useState<'transak' | 'crypto'>('transak');
  const [copied, setCopied] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [showTransakWidget, setShowTransakWidget] = useState(false);

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDepositAmount('');
      setShowTransakWidget(false);
      setMethod('transak');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // For display, shorten the address
  const shortAddress = walletAddress 
    ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}` 
    : 'No wallet connected';

  const canProceedTransak = walletAddress && depositAmount && parseFloat(depositAmount) > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Recharge Funds</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all">
            <RefreshCw size={20} />
          </button>
        </div>
        
        <div className="p-4 flex gap-2">
          <button 
            onClick={() => { setMethod('transak'); setShowTransakWidget(false); }}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${method === 'transak' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white/5 text-slate-400 hover:text-white'}`}
          >
            Fiat/Card (Transak)
          </button>
          <button 
            onClick={() => setMethod('crypto')}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${method === 'crypto' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white/5 text-slate-400 hover:text-white'}`}
          >
            Direct Crypto
          </button>
        </div>

        <div className="p-6 min-h-[400px]">
          {method === 'transak' ? (
            showTransakWidget && canProceedTransak ? (
              <TransakWidget 
                orderId={`deposit-${Date.now()}`} 
                walletAddress={walletAddress} 
                amount={parseFloat(depositAmount)} 
                onSuccess={() => onClose()} 
                onClose={onClose} 
              />
            ) : (
              <div className="space-y-6">
                {/* Amount Input Section */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Deposit Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="100.00"
                      min="10"
                      className="w-full bg-slate-800 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-2xl font-mono font-bold text-white focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div className="flex gap-2">
                    {[50, 100, 500, 1000].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setDepositAmount(preset.toString())}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                          depositAmount === preset.toString() 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        ${preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wallet Address Display */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Receiving Wallet
                  </label>
                  {walletAddress ? (
                    <div className="flex items-center gap-2 p-4 bg-white/5 rounded-2xl border border-white/10">
                      <Wallet size={18} className="text-emerald-400" />
                      <span className="font-mono text-sm text-slate-300 truncate">{shortAddress}</span>
                      <Check size={16} className="text-emerald-400 ml-auto" />
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 text-sm">
                      <Wallet size={18} className="inline mr-2" />
                      No wallet connected. Please connect a wallet first.
                    </div>
                  )}
                </div>

                {/* Proceed Button */}
                <button
                  onClick={() => setShowTransakWidget(true)}
                  disabled={!canProceedTransak}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  <ArrowDownToLine size={18} />
                  Continue to Payment
                </button>

                <p className="text-[10px] text-slate-600 text-center">
                  Powered by Transak. Supports credit/debit cards, bank transfer, and more.
                </p>
              </div>
            )
          ) : (
            <div className="space-y-6 text-center">
              {walletAddress ? (
                <>
                  <div className="w-48 h-48 bg-white rounded-2xl mx-auto flex items-center justify-center p-4 relative">
                    {/* QR Code placeholder - in production, use a QR library */}
                    <div className="absolute inset-4 border-4 border-slate-200 rounded-xl flex items-center justify-center">
                      <Wallet size={60} className="text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Your Deposit Address (USDC)</p>
                    <div className="flex items-center justify-center gap-2 p-4 bg-white/5 rounded-2xl border border-white/10">
                      <span className="font-mono text-sm text-slate-300 truncate">{shortAddress}</span>
                      <button onClick={copyAddress} className="text-blue-400 hover:text-blue-300 transition-colors">
                        {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16}/>}
                      </button>
                      <a 
                        href={`https://etherscan.io/address/${walletAddress}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                    {/* Full address (copyable) */}
                    <div className="text-[10px] text-slate-600 font-mono break-all px-4 py-2 bg-slate-800/50 rounded-lg">
                      {walletAddress}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Send USDC via Ethereum, Base, BNB Chain, or Avalanche networks. Credits usually appear within 5-10 minutes after network confirmation.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-[10px] text-emerald-400 bg-emerald-500/10 rounded-full px-4 py-2">
                    <ShieldCheck size={14} />
                    <span>This is your personal deposit address</span>
                  </div>
                </>
              ) : (
                <div className="py-10 space-y-4">
                  <div className="w-20 h-20 bg-amber-500/10 text-amber-400 rounded-full mx-auto flex items-center justify-center">
                    <Wallet size={36} />
                  </div>
                  <h4 className="text-lg font-bold text-white">Connect Your Wallet</h4>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto">
                    Connect a wallet first to get your personal deposit address for receiving crypto.
                  </p>
                  <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all">
                    Connect Wallet
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const WithdrawModal = ({ isOpen, onClose, selectedAccount }: { isOpen: boolean; onClose: () => void; selectedAccount?: Account }) => {
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleWithdraw = async () => {
    if (!selectedAccount) return;
    setIsProcessing(true);
    try {
      const currency = Object.keys(selectedAccount.balances)[0] || 'USDC';
      await accountApi.withdraw(selectedAccount.id, {
        amount: parseFloat(amount),
        currency,
        toAddress: address
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Withdraw Funds</h3>
        
        {success ? (
          <div className="py-10 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full mx-auto flex items-center justify-center">
              <Check size={32} />
            </div>
            <h4 className="text-lg font-bold text-white">Withdrawal Initiated</h4>
            <p className="text-slate-400 text-sm">Funds will arrive shortly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Source Account</label>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-white text-sm">
                {selectedAccount ? selectedAccount.chainType.toUpperCase() : 'Default Account'} - ${selectedAccount ? Object.values(selectedAccount.balances)[0] : '0'}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Destination Address</label>
              <input 
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Amount (USDC)</label>
              <input 
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <button 
              onClick={handleWithdraw}
              disabled={isProcessing || !amount || !address}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all mt-4 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {isProcessing ? <RefreshCw size={18} className="animate-spin" /> : <ArrowUpFromLine size={18} />}
              {isProcessing ? 'Verifying...' : 'Withdraw Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TransactionHistory: React.FC<{ accountId: string }> = ({ accountId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { getTransactions } = useAccounts();

  const fetchTx = useCallback(async () => {
    setLoading(true);
    const result = await getTransactions(accountId);
    if (result) setTransactions(result.transactions);
    setLoading(false);
  }, [accountId, getTransactions]);

  useEffect(() => { fetchTx(); }, [fetchTx]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/5 font-bold text-slate-500 text-[10px] tracking-widest uppercase">
            <th className="px-6 py-4">Activity</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Amount</th>
            <th className="px-6 py-4">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {transactions.map(tx => {
            const isPayment = ['payment', 'withdraw', 'transfer_out'].includes(tx.type);
            return (
              <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isPayment ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {isPayment ? <ArrowUpLeft size={14} /> : <ArrowDownRight size={14} />}
                    </div>
                    <div>
                      <div className="font-bold text-white capitalize">{tx.type.replace('_', ' ')}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{tx.txHash ? tx.txHash.slice(0, 10) + '...' : 'Internal'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {tx.status}
                  </span>
                </td>
                <td className={`px-6 py-4 font-mono font-bold ${isPayment ? 'text-white' : 'text-emerald-400'}`}>
                  {isPayment ? '-' : '+'}${parseFloat(tx.amount).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-slate-500 text-xs">{new Date(tx.createdAt).toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

interface UnifiedAccountPanelProps {
  onCreateAccount?: () => void;
  activeView?: 'balances' | 'transactions' | 'deposit' | 'withdraw' | 'payout-settings';
  showPendingEarnings?: boolean;
}

const UnifiedAccountPanel: React.FC<UnifiedAccountPanelProps> = ({ 
  onCreateAccount,
  activeView: initialView = 'balances'
}) => {
  const { accounts, defaultAccount, summary, loading } = useAccounts();
  const { address: connectedWalletAddress, defaultWallet, isConnected } = useWeb3();
  const [activeView, setActiveView] = useState<'balances' | 'transactions' | 'payout-settings'>(
    initialView === 'transactions' ? 'transactions' : 
    initialView === 'payout-settings' ? 'payout-settings' : 'balances'
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(initialView === 'deposit');
  const [showWithdrawModal, setShowWithdrawModal] = useState(initialView === 'withdraw');

  // Update modals when initialView changes sync with L1/L2 nav
  useEffect(() => {
    if (initialView === 'deposit') setShowDepositModal(true);
    if (initialView === 'withdraw') setShowWithdrawModal(true);
    if (initialView === 'transactions') setActiveView('transactions');
    if (initialView === 'payout-settings') setActiveView('payout-settings');
    if (initialView === 'balances') setActiveView('balances');
  }, [initialView]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId) || defaultAccount || undefined;
  
  // Get the best available wallet address: from selected account, default account, or connected wallet
  const depositWalletAddress = selectedAccount?.walletAddress || defaultAccount?.walletAddress || connectedWalletAddress || defaultWallet?.address;

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <div className="max-w-5xl mx-auto py-4">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-4xl font-bold text-white tracking-tight">Unified Account</h2>
          <p className="text-slate-400 mt-2">Institutional-grade liquidity management for autonomous agents.</p>
        </div>
        <div className="flex bg-slate-900 border border-white/5 p-1.5 rounded-2xl">
           <button onClick={() => setActiveView('balances')} className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeView === 'balances' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>ASSETS</button>
           <button onClick={() => setActiveView('transactions')} className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeView === 'transactions' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>HISTORY</button>
           <button onClick={() => setActiveView('payout-settings')} className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeView === 'payout-settings' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{process.env.NEXT_PUBLIC_LANG === 'zh' ? '结算配置' : 'PAYOUTS'}</button>
        </div>
      </div>

      {activeView === 'transactions' ? (
        <TransactionHistory accountId={selectedAccountId || defaultAccount?.id || ''} />
      ) : activeView === 'payout-settings' ? (
        <div className="p-0">
          <PayoutSettingsPanel />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4 opacity-70 uppercase tracking-widest text-[10px] font-bold">
                <DollarSign size={14} /> Total Net Worth
              </div>
              <div className="text-6xl font-mono font-bold tracking-tighter mb-10">
                ${summary?.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
              </div>
              <div className="grid grid-cols-3 gap-10 pt-8 border-t border-white/10 font-mono">
                <div><div className="text-[10px] opacity-50 uppercase mb-1">Liquid</div><div className="text-xl font-bold">${((summary?.totalBalance || 0) - (summary?.totalFrozen || 0)).toLocaleString()}</div></div>
                <div><div className="text-[10px] opacity-50 uppercase mb-1">Staked</div><div className="text-xl font-bold text-amber-300">${summary?.totalFrozen.toLocaleString() || '0'}</div></div>
                <div><div className="text-[10px] opacity-50 uppercase mb-1">Pending</div><div className="text-xl font-bold text-emerald-300">${summary?.totalPending.toLocaleString() || '0'}</div></div>
              </div>
              <div className="flex gap-4 mt-10">
                 <button onClick={() => setShowDepositModal(true)} className="px-8 py-4 bg-white text-blue-700 font-bold rounded-2xl hover:bg-slate-100 flex items-center gap-2 text-sm shadow-xl"><ArrowDownToLine size={20} /> Recharge</button>
                 <button onClick={() => setShowWithdrawModal(true)} className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 font-bold rounded-2xl flex items-center gap-2 text-sm"><ArrowUpFromLine size={20} /> Withdraw</button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center pr-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Multi-Chain Accounts ({accounts.length})</h3>
              <button onClick={onCreateAccount} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest flex items-center gap-1"><Plus size={14} /> Add Wallet</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {accounts.map(account => (
                 <AccountItem key={account.id} account={account} isDefault={account.id === defaultAccount?.id} onDeposit={() => { setSelectedAccountId(account.id); setShowDepositModal(true); }} onWithdraw={() => { setSelectedAccountId(account.id); setShowWithdrawModal(true); }} />
               ))}
            </div>
          </div>

          <div className="bg-slate-900/50 border border-white/5 rounded-[2rem] p-8 flex items-start gap-6">
             <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400"><ShieldCheck size={32} /></div>
             <div>
                <h4 className="font-bold text-white text-lg">Protected by Agentrix Securitas</h4>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-lg font-medium">Your assets are secured by enterprise KMS. All agent-to-agent internal settlement is instant and gas-less.</p>
             </div>
          </div>
        </div>
      )}

      <DepositModal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} walletAddress={depositWalletAddress} />
      <WithdrawModal isOpen={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} selectedAccount={selectedAccount} />
    </div>
  );
};

export default UnifiedAccountPanel;
