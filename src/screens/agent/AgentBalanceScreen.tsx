import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  RefreshControl, ActivityIndicator, Alert, TextInput, Modal,
  ScrollView, Platform, StatusBar, Clipboard,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useI18n } from '../../stores/i18nStore';
import { apiFetch } from '../../services/api';

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Types
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
interface AgentBalance {
  platformBalance: { amount: string; currency: string };
  onchainBalance?: { amount: string; currency: string; chain: string };
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  reference?: string;
  createdAt: string;
}

interface TransactionPage {
  items: Transaction[];
  total: number;
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// API
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
async function fetchBalance(agentAccountId: string): Promise<AgentBalance> {
  const res = await apiFetch<{ success: boolean; data: AgentBalance }>(`/agent-accounts/${agentAccountId}/balance`);
  return res.data ?? res as any;
}

async function fetchTransactions(
  agentAccountId: string,
  offset: number,
  limit: number,
  type?: string,
): Promise<TransactionPage> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (type) params.set('type', type);
  const res = await apiFetch<TransactionPage>(`/accounts/${agentAccountId}/transactions?${params}`);
  return res;
}

async function transfer(dto: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
}): Promise<any> {
  return apiFetch('/accounts/transfer', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Transaction type icons/labels
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
const TX_META: Record<string, { icon: string; color: string }> = {
  deposit: { icon: '馃挵', color: '#22c55e' },
  withdrawal: { icon: '馃摛', color: '#ef4444' },
  transfer_in: { icon: '馃摜', color: '#22c55e' },
  transfer_out: { icon: '馃摛', color: '#f59e0b' },
  payment: { icon: '馃挸', color: '#ef4444' },
  refund: { icon: '鈫╋笍', color: '#22c55e' },
  commission: { icon: '馃彿锔?, color: '#6366f1' },
  revenue_share: { icon: '馃搳', color: '#22c55e' },
  default: { icon: '馃搵', color: colors.textMuted },
};

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Filter tabs
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
const TX_FILTERS = ['all', 'deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'payment'];

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Transfer Modal
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function TransferModal({
  visible,
  onClose,
  fromAccountId,
}: {
  visible: boolean;
  onClose: () => void;
  fromAccountId: string;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTransfer = async () => {
    if (!toId.trim() || !amount.trim()) {
      Alert.alert(t({ en: 'Required', zh: '蹇呭～' }), t({ en: 'Enter recipient and amount.', zh: '璇疯緭鍏ユ帴鏀舵柟鍜岄噾棰濄€? }));
      return;
    }
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      Alert.alert(t({ en: 'Invalid', zh: '鏃犳晥' }), t({ en: 'Amount must be > 0.', zh: '閲戦蹇呴』 > 0銆? }));
      return;
    }
    setLoading(true);
    try {
      await transfer({ fromAccountId, toAccountId: toId.trim(), amount: num, description: desc.trim() || undefined });
      queryClient.invalidateQueries({ queryKey: ['agent-balance'] });
      queryClient.invalidateQueries({ queryKey: ['agent-transactions'] });
      Alert.alert('鉁?, t({ en: 'Transfer successful!', zh: '杞处鎴愬姛锛? }));
      onClose();
      setToId('');
      setAmount('');
      setDesc('');
    } catch (err: any) {
      Alert.alert(t({ en: 'Error', zh: '閿欒' }), err?.message || t({ en: 'Transfer failed.', zh: '杞处澶辫触銆? }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={ms.root}>
        <View style={ms.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={ms.cancel}>{t({ en: 'Cancel', zh: '鍙栨秷' })}</Text>
          </TouchableOpacity>
          <Text style={ms.title}>{t({ en: 'Send Funds', zh: '杞处' })}</Text>
          <TouchableOpacity onPress={handleTransfer} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.accent} size="small" /> : (
              <Text style={ms.send}>{t({ en: 'Send', zh: '鍙戦€? })}</Text>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView style={ms.body} keyboardShouldPersistTaps="handled">
          <Text style={ms.label}>{t({ en: 'Recipient Account ID', zh: '鎺ユ敹鏂硅处鎴?ID' })}</Text>
          <TextInput style={ms.input} value={toId} onChangeText={setToId} placeholder="account-uuid..." placeholderTextColor={colors.textMuted} />

          <Text style={ms.label}>{t({ en: 'Amount (USD)', zh: '閲戦 (USD)' })}</Text>
          <TextInput style={ms.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textMuted} />

          <Text style={ms.label}>{t({ en: 'Description (optional)', zh: '澶囨敞锛堝彲閫夛級' })}</Text>
          <TextInput style={[ms.input, { minHeight: 60, textAlignVertical: 'top' }]} value={desc} onChangeText={setDesc} multiline placeholder={t({ en: 'e.g. Task payment', zh: '渚嬪锛氫换鍔℃姤閰? })} placeholderTextColor={colors.textMuted} />
        </ScrollView>
      </View>
    </Modal>
  );
}
const ms = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 12 : 16,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bgSecondary,
  },
  cancel: { fontSize: 15, color: colors.textMuted },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  send: { fontSize: 15, color: colors.accent, fontWeight: '700' },
  body: { flex: 1, padding: 16 },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: colors.bgCard, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, fontSize: 14, color: colors.textPrimary },
});

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Main Screen
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

export function AgentBalanceScreen() {
  const { t } = useI18n();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { agentAccountId, agentName } = route.params || {};
  const [txFilter, setTxFilter] = useState('all');
  const [showTransfer, setShowTransfer] = useState(false);

  const { data: balance, isLoading: balLoading, refetch: refetchBalance } = useQuery({
    queryKey: ['agent-balance', agentAccountId],
    queryFn: () => fetchBalance(agentAccountId),
    enabled: !!agentAccountId,
    retry: false,
  });

  const { data: txPage, isLoading: txLoading, refetch: refetchTx } = useQuery({
    queryKey: ['agent-transactions', agentAccountId, txFilter],
    queryFn: () => fetchTransactions(agentAccountId, 0, 50, txFilter === 'all' ? undefined : txFilter),
    enabled: !!agentAccountId,
    retry: false,
  });

  const transactions = txPage?.items || [];
  const platformAmt = parseFloat(balance?.platformBalance?.amount || '0');
  const chainAmt = balance?.onchainBalance ? parseFloat(balance.onchainBalance.amount || '0') : 0;

  const refetchAll = () => { refetchBalance(); refetchTx(); };

  const renderTx = ({ item: tx }: { item: Transaction }) => {
    const meta = TX_META[tx.type] || TX_META.default;
    const isPositive = tx.amount >= 0;
    return (
      <View style={s.txCard}>
        <Text style={s.txIcon}>{meta.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.txType}>{tx.type.replace(/_/g, ' ')}</Text>
          {tx.description ? <Text style={s.txDesc} numberOfLines={1}>{tx.description}</Text> : null}
          <Text style={s.txDate}>{new Date(tx.createdAt).toLocaleString()}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.txAmount, { color: isPositive ? '#22c55e' : '#ef4444' }]}>
            {isPositive ? '+' : ''}{tx.amount.toFixed(2)} {tx.currency}
          </Text>
          <View style={[s.txStatusDot, { backgroundColor: tx.status === 'completed' ? '#22c55e' : tx.status === 'pending' ? '#f59e0b' : '#ef4444' }]} />
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* Balance Hero */}
      <View style={s.heroCard}>
        <Text style={s.heroLabel}>{agentName}</Text>
        <Text style={s.heroAmount}>${(platformAmt + chainAmt).toFixed(2)}</Text>
        <Text style={s.heroSub}>{t({ en: 'Total Balance', zh: '鎬讳綑棰? })}</Text>
        <View style={s.heroBreakdown}>
          <View style={s.heroChip}>
            <Text style={s.heroChipLabel}>{t({ en: 'Platform', zh: '骞冲彴' })}</Text>
            <Text style={s.heroChipVal}>${platformAmt.toFixed(2)}</Text>
          </View>
          {chainAmt > 0 && (
            <View style={[s.heroChip, { backgroundColor: '#a78bfa22', borderColor: '#a78bfa44' }]}>
              <Text style={[s.heroChipLabel, { color: '#a78bfa' }]}>{t({ en: 'On-chain', zh: '閾句笂' })}</Text>
              <Text style={[s.heroChipVal, { color: '#a78bfa' }]}>${chainAmt.toFixed(2)}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={s.transferBtn} onPress={() => setShowTransfer(true)}>
          <Text style={s.transferBtnText}>馃捀 {t({ en: 'Send Funds', zh: '杞处' })}</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
        {TX_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, txFilter === f && s.filterChipActive]}
            onPress={() => setTxFilter(f)}
          >
            <Text style={[s.filterText, txFilter === f && s.filterTextActive]}>
              {f === 'all' ? t({ en: 'All', zh: '鍏ㄩ儴' }) : f.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Transaction list */}
      {txLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(tx) => tx.id}
          renderItem={renderTx}
          refreshControl={<RefreshControl refreshing={balLoading} onRefresh={refetchAll} tintColor={colors.accent} />}
          contentContainerStyle={s.txList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>馃搵</Text>
              <Text style={s.emptyText}>{t({ en: 'No transactions yet', zh: '鏆傛棤浜ゆ槗璁板綍' })}</Text>
            </View>
          }
        />
      )}

      <TransferModal visible={showTransfer} onClose={() => setShowTransfer(false)} fromAccountId={agentAccountId} />
    </View>
  );
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Styles
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  // Hero
  heroCard: {
    margin: 16, padding: 20, borderRadius: 16,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', gap: 6,
  },
  heroLabel: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  heroAmount: { fontSize: 36, fontWeight: '800', color: colors.textPrimary },
  heroSub: { fontSize: 12, color: colors.textMuted },
  heroBreakdown: { flexDirection: 'row', gap: 8, marginTop: 8 },
  heroChip: {
    flex: 1, alignItems: 'center', padding: 8, borderRadius: 10,
    backgroundColor: '#22c55e18', borderWidth: 1, borderColor: '#22c55e33', gap: 2,
  },
  heroChipLabel: { fontSize: 10, color: '#22c55e', fontWeight: '600' },
  heroChipVal: { fontSize: 14, fontWeight: '800', color: '#22c55e' },
  transferBtn: {
    marginTop: 10, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 20, backgroundColor: colors.accent,
  },
  transferBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  // Filters
  filterScroll: { maxHeight: 44 },
  filterRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.accent + '22', borderColor: colors.accent },
  filterText: { fontSize: 12, color: colors.textMuted, fontWeight: '600', textTransform: 'capitalize' },
  filterTextActive: { color: colors.accent },
  // Transaction list
  txList: { padding: 16, gap: 8, paddingBottom: 40 },
  txCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bgCard, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  txIcon: { fontSize: 20 },
  txType: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, textTransform: 'capitalize' },
  txDesc: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  txDate: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txStatusDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  // Empty
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, color: colors.textMuted },
});