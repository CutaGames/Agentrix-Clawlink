import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  RefreshControl, ActivityIndicator, Alert, Modal,
  TextInput, ScrollView, Platform, StatusBar,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { useI18n } from '../../stores/i18nStore';
import {
  fetchUnifiedAgents,
  createUnifiedAgent,
  type UnifiedAgent,
  type CreateUnifiedAgentDto,
} from '../../services/unifiedAgent';
import { apiFetch } from '../../services/api';
import type { AgentStackParamList } from '../../navigation/types';

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Types
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
type AgentAccount = UnifiedAgent;
type CreateAgentDto = CreateUnifiedAgentDto;

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// API helpers
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

async function fetchAgentAccounts(): Promise<AgentAccount[]> {
  return fetchUnifiedAgents();
}

async function createAgentAccount(dto: CreateAgentDto): Promise<AgentAccount> {
  return createUnifiedAgent(dto);
}

async function openWalletForAgent(agentId: string): Promise<{ walletAddress: string }> {
  // Creates or retrieves the MPC wallet associated with this agent
  const res = await apiFetch<{ walletAddress: string }>('/mpc-wallet/create', {
    method: 'POST',
    body: JSON.stringify({ agentAccountId: agentId, password: `agent_${agentId}_v1` }),
  });
  return res;
}

async function suspendAgent(agentId: string): Promise<void> {
  // Use openclaw-connection to pause the instance
  await apiFetch(`/openclaw-connection/instances/${agentId}/pause`, { method: 'POST' });
}

async function resumeAgent(agentId: string): Promise<void> {
  await apiFetch(`/openclaw-connection/instances/${agentId}/resume`, { method: 'POST' });
}

async function generateAgentApiKey(agentId: string): Promise<{ apiKey: string; prefix: string }> {
  const res = await apiFetch<{ data: { apiKey: string; prefix: string } }>(`/agent-accounts/${agentId}/api-key`, {
    method: 'POST',
  });
  return res.data;
}

// Balance API
interface AgentBalance {
  platformBalance: { amount: string; currency: string };
  onchainBalance?: { amount: string; currency: string; chain: string };
}

async function fetchAgentBalance(agentAccountId: string): Promise<AgentBalance> {
  const res = await apiFetch<{ success: boolean; data: AgentBalance }>(`/agent-accounts/${agentAccountId}/balance`);
  return res.data ?? res as any;
}

// On-chain status API
interface OnchainStatus {
  registered: boolean;
  chain?: string;
  contractAddress?: string;
  attestationUid?: string;
  status?: 'pending' | 'confirmed' | 'failed';
}

async function fetchOnchainStatus(agentAccountId: string): Promise<OnchainStatus> {
  const res = await apiFetch<{ success: boolean; data: OnchainStatus }>(`/agent-accounts/${agentAccountId}/onchain-status`);
  return res.data ?? res as any;
}

async function registerOnchain(agentAccountId: string): Promise<any> {
  return apiFetch(`/agent-accounts/${agentAccountId}/onchain-register`, { method: 'POST' });
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Create Agent Modal
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

const AGENT_TYPES = ['personal', 'assistant', 'commerce', 'research', 'automation'];

function CreateAgentModal({
  visible,
  onClose,
  onCreate,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (dto: CreateAgentDto) => void;
  loading: boolean;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agentType, setAgentType] = useState('personal');
  const [singleTxLimit, setSingleTxLimit] = useState('100');
  const [dailyLimit, setDailyLimit] = useState('500');
  const [monthlyLimit, setMonthlyLimit] = useState('2000');

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert(t({ en: 'Name required', zh: '闇€瑕佸悕绉? }), t({ en: 'Please give your agent a name.', zh: '璇蜂负浣犵殑鏅鸿兘浣撳～鍐欏悕绉般€? }));
      return;
    }
    onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      spendingLimits: {
        singleTxLimit: Number(singleTxLimit) || 100,
        dailyLimit: Number(dailyLimit) || 500,
        monthlyLimit: Number(monthlyLimit) || 2000,
        currency: 'USD',
      },
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modal.root}>
        <View style={modal.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={modal.cancel}>{t({ en: 'Cancel', zh: '鍙栨秷' })}</Text>
          </TouchableOpacity>
          <Text style={modal.title}>{t({ en: 'New Agent Account', zh: '鏂板缓鏅鸿兘浣撹处鎴? })}</Text>
          <TouchableOpacity onPress={handleCreate} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Text style={modal.createBtn}>{t({ en: 'Create', zh: '鍒涘缓' })}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={modal.body} keyboardShouldPersistTaps="handled">
          <Text style={modal.label}>{t({ en: 'Agent Name *', zh: '鏅鸿兘浣撳悕绉?*' })}</Text>
          <TextInput
            style={modal.input}
            placeholder={t({ en: 'e.g. My Research Agent', zh: '渚嬪锛氭垜鐨勭爺绌舵櫤鑳戒綋' })}
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Text style={modal.label}>{t({ en: 'Description', zh: '鎻忚堪' })}</Text>
          <TextInput
            style={[modal.input, { minHeight: 70, textAlignVertical: 'top' }]}
            placeholder={t({ en: 'What does this agent do?', zh: '杩欎釜鏅鸿兘浣撹礋璐ｄ粈涔堬紵' })}
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={modal.label}>{t({ en: 'Agent Type', zh: '鏅鸿兘浣撶被鍨? })}</Text>
          <View style={modal.typeRow}>
            {AGENT_TYPES.map((typeKey) => (
              <TouchableOpacity
                key={typeKey}
                style={[modal.typeChip, agentType === typeKey && modal.typeChipActive]}
                onPress={() => setAgentType(typeKey)}
              >
                <Text style={[modal.typeText, agentType === typeKey && modal.typeTextActive]}>
                  {t({ en: typeKey, zh: typeKey === 'personal' ? '涓汉' : typeKey === 'assistant' ? '鍔╃悊' : typeKey === 'commerce' ? '鍟嗕笟' : typeKey === 'research' ? '鐮旂┒' : '鑷姩鍖? })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={modal.label}>{t({ en: 'Spending Limits (USD)', zh: '鏀嚭闄愬埗锛圲SD锛? })}</Text>
          <View style={modal.limitsGrid}>
            <View style={modal.limitItem}>
              <Text style={modal.limitLabel}>{t({ en: 'Single TX', zh: '鍗曠瑪' })}</Text>
              <TextInput
                style={modal.limitInput}
                value={singleTxLimit}
                onChangeText={setSingleTxLimit}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={modal.limitItem}>
              <Text style={modal.limitLabel}>{t({ en: 'Daily', zh: '姣忔棩' })}</Text>
              <TextInput
                style={modal.limitInput}
                value={dailyLimit}
                onChangeText={setDailyLimit}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={modal.limitItem}>
              <Text style={modal.limitLabel}>{t({ en: 'Monthly', zh: '姣忔湀' })}</Text>
              <TextInput
                style={modal.limitInput}
                value={monthlyLimit}
                onChangeText={setMonthlyLimit}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={modal.infoBox}>
            <Text style={modal.infoText}>
              馃挕 {t({ en: 'Spending limits protect you by capping how much this agent can pay autonomously.', zh: '鏀嚭闄愬埗鍙害鏉熻鏅鸿兘浣撶殑鑷富鏀粯棰濆害锛屼繚鎶や綘鐨勮祫閲戝畨鍏ㄣ€? })}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Main Screen
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

const STATUS_COLOR: Record<string, string> = {
  active: '#22c55e',
  draft: '#6366f1',
  suspended: '#f59e0b',
  terminated: '#ef4444',
  error: '#ef4444',
  disconnected: '#6b7280',
};

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Balance Badge (inline in agent card)
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function BalanceBadge({ agentAccountId, t: _t }: { agentAccountId?: string; t: ReturnType<typeof useI18n>['t'] }) {
  const { data: balance } = useQuery({
    queryKey: ['agent-balance', agentAccountId],
    queryFn: () => fetchAgentBalance(agentAccountId!),
    enabled: !!agentAccountId,
    retry: false,
    staleTime: 30_000,
  });
  if (!balance) return null;
  const amt = parseFloat(balance?.platformBalance?.amount || '0');
  const chainAmt = balance?.onchainBalance ? parseFloat(balance.onchainBalance.amount || '0') : 0;
  return (
    <View style={balBadge.row}>
      <View style={balBadge.chip}>
        <Text style={balBadge.label}>{_t({ en: 'Platform', zh: '骞冲彴' })}</Text>
        <Text style={balBadge.value}>${amt.toFixed(2)}</Text>
      </View>
      {chainAmt > 0 && (
        <View style={[balBadge.chip, balBadge.chipChain]}>
          <Text style={[balBadge.label, { color: '#a78bfa' }]}>{_t({ en: 'On-chain', zh: '閾句笂' })}</Text>
          <Text style={[balBadge.value, { color: '#a78bfa' }]}>${chainAmt.toFixed(2)}</Text>
        </View>
      )}
    </View>
  );
}
const balBadge = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  chip: {
    flex: 1,
    backgroundColor: '#22c55e18',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: '#22c55e33',
  },
  chipChain: {
    backgroundColor: '#a78bfa18',
    borderColor: '#a78bfa33',
  },
  label: { fontSize: 10, color: '#22c55e', fontWeight: '600' },
  value: { fontSize: 14, color: '#22c55e', fontWeight: '800' },
});

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Chain Identity Badge
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function ChainIdentityBadge({ agentAccountId, t: _t }: { agentAccountId?: string; t: ReturnType<typeof useI18n>['t'] }) {
  const queryClient = useQueryClient();
  const { data: onchain } = useQuery({
    queryKey: ['onchain-status', agentAccountId],
    queryFn: () => fetchOnchainStatus(agentAccountId!),
    enabled: !!agentAccountId,
    retry: false,
    staleTime: 60_000,
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!agentAccountId) return;
    Alert.alert(
      _t({ en: 'Register On-Chain Identity', zh: '娉ㄥ唽閾句笂韬唤' }),
      _t({ en: 'This will create an on-chain attestation for this agent. Gas fees are subsidized.', zh: '杩欏皢涓鸿鏅鸿兘浣撳垱寤洪摼涓婅韩浠借瘉鏄庯紝Gas璐圭敱骞冲彴琛ヨ创銆? }),
      [
        { text: _t({ en: 'Cancel', zh: '鍙栨秷' }), style: 'cancel' },
        {
          text: _t({ en: 'Register', zh: '娉ㄥ唽' }),
          onPress: async () => {
            setLoading(true);
            try {
              await registerOnchain(agentAccountId);
              queryClient.invalidateQueries({ queryKey: ['onchain-status', agentAccountId] });
              Alert.alert('鉁?, _t({ en: 'On-chain registration submitted!', zh: '閾句笂娉ㄥ唽宸叉彁浜わ紒' }));
            } catch (err: any) {
              Alert.alert(_t({ en: 'Error', zh: '閿欒' }), err?.message || _t({ en: 'Registration failed.', zh: '娉ㄥ唽澶辫触銆? }));
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  if (!onchain) return null;
  if (onchain.registered) {
    return (
      <View style={chainBadge.confirmed}>
        <Text style={chainBadge.confirmedIcon}>鉀擄笍</Text>
        <View style={{ flex: 1 }}>
          <Text style={chainBadge.confirmedText}>{_t({ en: 'On-Chain Identity', zh: '閾句笂韬唤' })}</Text>
          <Text style={chainBadge.chainName}>{onchain.chain || 'BSC Testnet'}</Text>
        </View>
        <Text style={chainBadge.confirmedStatus}>{_t({ en: 'Verified', zh: '宸茶璇? })}</Text>
      </View>
    );
  }
  return (
    <TouchableOpacity style={chainBadge.register} onPress={handleRegister} disabled={loading}>
      {loading ? (
        <ActivityIndicator color="#a78bfa" size="small" />
      ) : (
        <>
          <Text style={chainBadge.registerIcon}>鉀擄笍</Text>
          <Text style={chainBadge.registerText}>{_t({ en: 'Register On-Chain Identity', zh: '娉ㄥ唽閾句笂韬唤' })}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
const chainBadge = StyleSheet.create({
  confirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#a78bfa15',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#a78bfa33',
  },
  confirmedIcon: { fontSize: 16 },
  confirmedText: { fontSize: 12, color: '#a78bfa', fontWeight: '700' },
  chainName: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  confirmedStatus: { fontSize: 11, color: '#22c55e', fontWeight: '700' },
  register: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a78bfa44',
    paddingVertical: 9,
    backgroundColor: '#a78bfa11',
  },
  registerIcon: { fontSize: 14 },
  registerText: { fontSize: 13, color: '#a78bfa', fontWeight: '600' },
});

export function AgentAccountScreen() {
  const { t } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<AgentStackParamList>>();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [walletLoading, setWalletLoading] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState<string | null>(null);
  // { [agentId]: { key?: string (full, shown once); prefix?: string } }
  const [apiKeys, setApiKeys] = useState<Record<string, { key?: string; prefix?: string }>>({}); 

  const { data: agents = [], isLoading, refetch } = useQuery({
    queryKey: ['agent-accounts'],
    queryFn: fetchAgentAccounts,
    retry: false,
  });

  const { mutate: create, isPending: isCreating } = useMutation({
    mutationFn: createAgentAccount,
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['agent-accounts'] });
      setShowCreate(false);
      // Auto-trigger wallet creation immediately after agent is created
      // No need for user to manually click "Open Wallet" 鈥?do it automatically
      try {
        const walletResult = await openWalletForAgent(result.id);
        queryClient.invalidateQueries({ queryKey: ['agent-accounts'] });
        Alert.alert(
          t({ en: 'Agent Ready 鉁咅煍?, zh: '鏅鸿兘浣撳凡灏辩华 鉁咅煍? }),
          t({ en: `"${result.name}" has been created with an independent MPC wallet.\n\nWallet Address:\n${walletResult.walletAddress}\n\nYour agent now has autonomous payment capability within the spending limits you set.`, zh: `鈥?{result.name}鈥濆凡鍒涘缓瀹屾垚锛屽苟宸查厤缃嫭绔?MPC 閽卞寘銆俓n\n閽卞寘鍦板潃锛歕n${walletResult.walletAddress}\n\n浣犵殑鏅鸿兘浣撶幇鍦ㄥ彲浠ュ湪璁惧畾鐨勬敮鍑洪檺鍒跺唴鑷富鏀粯銆俙 }),
        );
      } catch {
        // Wallet creation failed, notify user (non-blocking 鈥?agent itself was created)
        Alert.alert(
          t({ en: 'Agent Created 鉁?, zh: '鏅鸿兘浣撳凡鍒涘缓 鉁? }),
          t({ en: `"${result.name}" is ready.\n\n鈿狅笍 Wallet activation failed 鈥?tap "Open Wallet" on the agent card to try again.`, zh: `鈥?{result.name}鈥濆凡灏辩华銆俓n\n鈿狅笍 閽卞寘婵€娲诲け璐モ€斺€旇鐐瑰嚮鍗＄墖涓婄殑鈥滄墦寮€鐙珛閽卞寘鈥濋噸璇曘€俙 }),
        );
      }
    },
    onError: (err: any) => {
      Alert.alert(t({ en: 'Error', zh: '閿欒' }), err?.message || t({ en: 'Failed to create agent account.', zh: '鍒涘缓鏅鸿兘浣撹处鎴峰け璐ャ€? }));
    },
  });

  const handleOpenWallet = async (agent: AgentAccount) => {
    if (agent.walletAddress) {
      Alert.alert(
        t({ en: 'Agent Wallet', zh: '鏅鸿兘浣撻挶鍖? }),
        t({ en: `Address: ${agent.walletAddress}`, zh: `鍦板潃锛?{agent.walletAddress}` }),
        [{ text: t({ en: 'OK', zh: '纭畾' }) }],
      );
      return;
    }

    Alert.alert(
      t({ en: 'Open Independent Wallet', zh: '鎵撳紑鐙珛閽卞寘' }),
      t({ en: `Create an MPC wallet for "${agent.name}"?\n\nThis generates a self-custody wallet where only this agent can sign transactions within its spending limits.`, zh: `瑕佷负鈥?{agent.name}鈥濆垱寤?MPC 閽卞寘鍚楋紵\n\n杩欎細鐢熸垚涓€涓嚜鎵樼閽卞寘锛屽彧鏈夎鏅鸿兘浣撹兘鍦ㄥ叾鏀嚭闄愬埗鍐呯缃蹭氦鏄撱€俙 }),
      [
        { text: t({ en: 'Cancel', zh: '鍙栨秷' }), style: 'cancel' },
        {
          text: t({ en: 'Create Wallet', zh: '鍒涘缓閽卞寘' }),
          onPress: async () => {
            setWalletLoading(agent.id);
            try {
              const result = await openWalletForAgent(agent.id);
              queryClient.invalidateQueries({ queryKey: ['agent-accounts'] });
              Alert.alert(
                t({ en: 'Wallet Created 馃帀', zh: '閽卞寘宸插垱寤?馃帀' }),
                t({ en: `Your agent wallet is ready!\n\nAddress: ${result.walletAddress}`, zh: `浣犵殑鏅鸿兘浣撻挶鍖呭凡灏辩华锛乗n\n鍦板潃锛?{result.walletAddress}` }),
              );
            } catch (err: any) {
              Alert.alert(t({ en: 'Error', zh: '閿欒' }), err?.message || t({ en: 'Failed to create wallet.', zh: '鍒涘缓閽卞寘澶辫触銆? }));
            } finally {
              setWalletLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleSuspend = (agent: AgentAccount) => {
    Alert.alert(
      t({ en: 'Suspend Agent', zh: '鏆傚仠鏅鸿兘浣? }),
      t({ en: `Suspend "${agent.name}"? It will no longer be able to make payments.`, zh: `瑕佹殏鍋溾€?{agent.name}鈥濆悧锛熸殏鍋滃悗瀹冨皢鏃犳硶缁х画鏀粯銆俙 }),
      [
        { text: t({ en: 'Cancel', zh: '鍙栨秷' }), style: 'cancel' },
        {
          text: t({ en: 'Suspend', zh: '鏆傚仠' }),
          style: 'destructive',
          onPress: async () => {
            try {
              await suspendAgent(agent.id);
              queryClient.invalidateQueries({ queryKey: ['agent-accounts'] });
            } catch {
              Alert.alert(t({ en: 'Error', zh: '閿欒' }), t({ en: 'Failed to suspend agent.', zh: '鏆傚仠鏅鸿兘浣撳け璐ャ€? }));
            }
          },
        },
      ],
    );
  };

  const handleResume = (agent: AgentAccount) => {
    Alert.alert(
      t({ en: 'Resume Agent', zh: '鎭㈠鏅鸿兘浣? }),
      t({ en: `Reactivate "${agent.name}"?`, zh: `瑕侀噸鏂版縺娲烩€?{agent.name}鈥濆悧锛焋 }),
      [
        { text: t({ en: 'Cancel', zh: '鍙栨秷' }), style: 'cancel' },
        {
          text: t({ en: 'Resume', zh: '鎭㈠' }),
          onPress: async () => {
            setActionLoading(agent.id);
            try {
              await resumeAgent(agent.id);
              queryClient.invalidateQueries({ queryKey: ['agent-accounts'] });
              Alert.alert(t({ en: 'Agent Reactivated 鉁?, zh: '鏅鸿兘浣撳凡閲嶆柊婵€娲?鉁? }), t({ en: `${agent.name} is active again.`, zh: `${agent.name} 宸查噸鏂板惎鐢ㄣ€俙 }));
            } catch (e: any) {
              Alert.alert(t({ en: 'Error', zh: '閿欒' }), e?.message || t({ en: 'Failed to resume agent.', zh: '鎭㈠鏅鸿兘浣撳け璐ャ€? }));
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleGenerateApiKey = (agent: AgentAccount) => {
    Alert.alert(
      t({ en: 'Generate API Key', zh: '鐢熸垚 API Key' }),
      t({ en: `Generate a new API Key for "${agent.name}"?\n\nThis will invalidate any existing key.`, zh: `涓?${agent.name}"鐢熸垚鏂?API Key锛焅n\n杩欏皢浣挎棫 Key 澶辨晥銆俙 }),
      [
        { text: t({ en: 'Cancel', zh: '鍙栨秷' }), style: 'cancel' },
        {
          text: t({ en: 'Generate', zh: '鐢熸垚' }),
          onPress: async () => {
            setApiKeyLoading(agent.id);
            try {
              const result = await generateAgentApiKey(agent.id);
              setApiKeys((prev) => ({ ...prev, [agent.id]: { key: result.apiKey, prefix: result.prefix } }));
            } catch (err: any) {
              Alert.alert(t({ en: 'Error', zh: '閿欒' }), err?.message || t({ en: 'Failed to generate API Key.', zh: '鐢熸垚 API Key 澶辫触銆? }));
            } finally {
              setApiKeyLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleNavigateBalance = (agent: AgentAccount) => {
    try {
      navigation.navigate('AgentBalance' as any, { agentAccountId: agent.agentAccountId, agentName: agent.name });
    } catch {
      Alert.alert(t({ en: 'Navigate', zh: '瀵艰埅' }), t({ en: 'Please access Balance from the Agent tab.', zh: '璇蜂粠 Agent 鏍囩椤佃闂綑棰濄€? }));
    }
  };

  const renderAgent = ({ item: agent }: { item: AgentAccount }) => {
    if (!agent?.id) return null;
    const agentApiKey = apiKeys[agent.id];
    try {
    return (
    <View style={styles.card}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={styles.agentIcon}>
          <Text style={styles.agentIconText}>馃</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.agentName}>{agent.name}</Text>
          <Text style={styles.agentId}>{agent.agentUniqueId}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[agent.status] || '#888') + '22' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[agent.status] || colors.textMuted }]}>
            {t({ en: agent.status, zh: agent.status === 'active' ? '娲昏穬' : agent.status === 'draft' ? '鑽夌' : agent.status === 'suspended' ? '宸叉殏鍋? : agent.status === 'terminated' ? '宸茬粓姝? : agent.status === 'error' ? '閿欒' : '鏈繛鎺? })}
          </Text>
        </View>
      </View>

      {/* Description */}
      {agent.description ? (
        <Text style={styles.description}>{agent.description}</Text>
      ) : null}

      {/* Spending limits */}
      {agent.spendingLimits && (
        <View style={styles.limitsRow}>
          <View style={styles.limitChip}>
            <Text style={styles.limitChipLabel}>{t({ en: 'Single TX', zh: '鍗曠瑪' })}</Text>
            <Text style={styles.limitChipValue}>
              ${agent.spendingLimits.singleTxLimit} {agent.spendingLimits.currency}
            </Text>
          </View>
          <View style={styles.limitChip}>
            <Text style={styles.limitChipLabel}>{t({ en: 'Daily', zh: '姣忔棩' })}</Text>
            <Text style={styles.limitChipValue}>
              ${agent.spendingLimits.dailyLimit}
            </Text>
          </View>
          <View style={styles.limitChip}>
            <Text style={styles.limitChipLabel}>{t({ en: 'Monthly', zh: '姣忔湀' })}</Text>
            <Text style={styles.limitChipValue}>
              ${agent.spendingLimits.monthlyLimit}
            </Text>
          </View>
        </View>
      )}

      {/* Wallet address display */}
      {(agent as any).walletAddress ? (
        <TouchableOpacity
          style={styles.walletRowActive}
          onPress={() => {
            Clipboard.setStringAsync((agent as any).walletAddress);
            Alert.alert(t({ en: 'Copied', zh: '宸插鍒? }), t({ en: 'Wallet address copied.', zh: '閽卞寘鍦板潃宸插鍒躲€? }));
          }}
        >
          <Text style={styles.walletIcon}>馃攼</Text>
          <Text style={styles.walletAddress} numberOfLines={1}>{(agent as any).walletAddress}</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>馃搵</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.openWalletBtn}
          onPress={() => handleOpenWallet(agent)}
          disabled={walletLoading === agent.id}
        >
          {walletLoading === agent.id ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : (
            <>
              <Text style={styles.openWalletIcon}>馃攼</Text>
              <Text style={styles.openWalletText}>{t({ en: 'Open Wallet', zh: '鎵撳紑鐙珛閽卞寘' })}</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Balance display */}
      <BalanceBadge agentAccountId={agent.agentAccountId} t={t} />

      {/* Chain Identity */}
      <ChainIdentityBadge agentAccountId={agent.agentAccountId} t={t} />

      {/* Actions row */}
      <View style={styles.actionsRow}>
        {(agent.status === 'active' || agent.status === 'draft') && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleSuspend(agent)}>
            <Text style={styles.actionBtnText}>鈴?{t({ en: 'Suspend', zh: '鏆傚仠' })}</Text>
          </TouchableOpacity>
        )}
        {agent.status === 'suspended' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnResume]}
            onPress={() => handleResume(agent)}
            disabled={actionLoading === agent.id}
          >
            {actionLoading === agent.id ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <Text style={[styles.actionBtnText, { color: colors.accent }]}>鈻?{t({ en: 'Resume', zh: '鎭㈠' })}</Text>
            )}
          </TouchableOpacity>
        )}
        {/* Credit Score */}
        {agent.creditScore != null && (
          <View style={[styles.actionBtn, styles.actionBtnFund]}>
            <Text style={[styles.actionBtnText, { color: '#22c55e' }]}>猸?{agent.creditScore}</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleNavigateBalance(agent)}
        >
          <Text style={styles.actionBtnText}>馃搵 {t({ en: 'Txs', zh: '浜ゆ槗' })}</Text>
        </TouchableOpacity>
      </View>

      {/* API Key section */}
      {agentApiKey?.key ? (
        <View style={styles.apiKeyBox}>
          <View style={styles.apiKeyHeader}>
            <Text style={styles.apiKeyLabel}>馃攽 API Key</Text>
            <TouchableOpacity
              onPress={() => {
                Clipboard.setStringAsync(agentApiKey.key!);
                Alert.alert(t({ en: 'Copied', zh: '宸插鍒? }), t({ en: 'API Key copied to clipboard.', zh: 'API Key 宸插鍒跺埌鍓创鏉裤€? }));
              }}
            >
              <Text style={styles.apiKeyCopyBtn}>{t({ en: 'Copy', zh: '澶嶅埗' })}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.apiKeyText} numberOfLines={2} selectable>{agentApiKey.key}</Text>
          <Text style={styles.apiKeyWarn}>
            鈿狅笍 {t({ en: 'Store this key now 鈥?it will not be shown again.', zh: '璇风珛鍗充繚瀛樻 Key锛屽叧闂悗鏃犳硶鍐嶆鏌ョ湅銆? })}
          </Text>
        </View>
      ) : agentApiKey?.prefix ? (
        <View style={styles.apiKeyExisting}>
          <Text style={styles.apiKeyExistingText}>馃攽 {agentApiKey.prefix}***</Text>
          <TouchableOpacity
            style={styles.apiKeyRegenBtn}
            onPress={() => handleGenerateApiKey(agent)}
            disabled={apiKeyLoading === agent.id}
          >
            {apiKeyLoading === agent.id ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <Text style={styles.apiKeyRegenText}>{t({ en: 'Regenerate', zh: '閲嶆柊鐢熸垚' })}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.apiKeyBtn}
          onPress={() => handleGenerateApiKey(agent)}
          disabled={apiKeyLoading === agent.id}
        >
          {apiKeyLoading === agent.id ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : (
            <Text style={styles.apiKeyBtnText}>馃攽 {t({ en: 'Generate API Key', zh: '鐢熸垚 API Key' })}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
    );
    } catch (e: any) {
      console.error('[AgentAccountScreen] renderAgent error:', e?.message);
      return (
        <View style={styles.card}>
          <Text style={{ color: colors.textMuted, textAlign: 'center' }}>鈿狅笍 {t({ en: 'Failed to render agent card', zh: '娓叉煋 Agent 鍗＄墖澶辫触' })}</Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(a) => a.id}
          renderItem={renderAgent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.accent} />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.headerCard}>
              <Text style={styles.headerTitle}>{t({ en: 'Agent Accounts', zh: '鏅鸿兘浣撹处鎴? })}</Text>
              <Text style={styles.headerSub}>
                {t({ en: 'Each agent account is an autonomous identity with its own spending limits and optional self-custody wallet.', zh: '姣忎釜鏅鸿兘浣撹处鎴烽兘鏄竴涓嫭绔嬭韩浠斤紝鎷ユ湁鑷繁鐨勬敮鍑洪檺鍒讹紝骞跺彲閫夐厤鑷墭绠￠挶鍖呫€? })}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>馃</Text>
              <Text style={styles.emptyTitle}>{t({ en: 'No agent accounts', zh: '鏆傛棤鏅鸿兘浣撹处鎴? })}</Text>
              <Text style={styles.emptySub}>
                {t({ en: 'Create an agent account to let your AI act autonomously on your behalf.', zh: '鍒涘缓涓€涓櫤鑳戒綋璐︽埛锛岃浣犵殑 AI 浠ｈ〃浣犺嚜涓绘墽琛屾搷浣溿€? })}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB: Create agent */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Text style={styles.fabText}>锛?{t({ en: 'New Agent', zh: '鏂板缓鏅鸿兘浣? })}</Text>
      </TouchableOpacity>

      {/* Create modal */}
      <CreateAgentModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={create}
        loading={isCreating}
      />
    </View>
  );
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Styles
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agentIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  agentIconText: { fontSize: 20 },
  agentName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  agentId: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  description: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  limitsRow: { flexDirection: 'row', gap: 6 },
  limitChip: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    gap: 2,
  },
  limitChipLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  limitChipValue: { fontSize: 12, color: colors.textPrimary, fontWeight: '700' },
  walletRowActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgSecondary,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletIcon: { fontSize: 16 },
  walletAddress: { fontSize: 12, color: colors.accent, flex: 1, fontFamily: 'monospace' },
  openWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent + '60',
    paddingVertical: 10,
    backgroundColor: colors.accent + '11',
  },
  openWalletIcon: { fontSize: 16 },
  openWalletText: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  // Actions row
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnResume: { borderColor: colors.accent + '55', backgroundColor: colors.accent + '11' },
  actionBtnFund: { borderColor: '#22c55e55', backgroundColor: '#22c55e11' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  // Balance chip
  balanceChip: {
    backgroundColor: colors.accent + '22',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.accent + '55',
  },
  balanceText: { fontSize: 10, fontWeight: '700', color: colors.accent },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: colors.accent,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  // Empty
  empty: { alignItems: 'center', padding: 40, gap: 10, marginTop: 40 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  // Header
  headerCard: { marginBottom: 8, gap: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  headerSub: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  // API Key
  apiKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent + '66',
    paddingVertical: 9,
    backgroundColor: colors.accent + '0f',
  },
  apiKeyBtnText: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  apiKeyBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.accent + '55',
  },
  apiKeyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  apiKeyLabel: { fontSize: 12, color: colors.accent, fontWeight: '700' },
  apiKeyCopyBtn: { fontSize: 12, color: colors.accent, fontWeight: '600', textDecorationLine: 'underline' },
  apiKeyText: {
    fontSize: 11,
    color: '#a5f3fc',
    fontFamily: 'monospace',
    letterSpacing: 0.3,
    lineHeight: 17,
  },
  apiKeyWarn: { fontSize: 11, color: '#f59e0b', lineHeight: 16 },
  apiKeyExisting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgSecondary,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  apiKeyExistingText: { flex: 1, fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' },
  apiKeyRegenBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  apiKeyRegenText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
});

const modal = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  cancel: { fontSize: 15, color: colors.textMuted },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  createBtn: { fontSize: 15, color: colors.accent, fontWeight: '700' },
  body: { flex: 1, padding: 16 },
  label: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    backgroundColor: colors.accent + '22',
    borderColor: colors.accent,
  },
  typeText: { fontSize: 13, color: colors.textMuted },
  typeTextActive: { color: colors.accent, fontWeight: '600' },
  limitsGrid: { flexDirection: 'row', gap: 8 },
  limitItem: { flex: 1, gap: 4 },
  limitLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  limitInput: {
    backgroundColor: colors.bgCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  infoBox: {
    marginTop: 20,
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
});