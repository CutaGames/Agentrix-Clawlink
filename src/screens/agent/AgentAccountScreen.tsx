import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  RefreshControl, ActivityIndicator, Alert, Modal,
  TextInput, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '../../theme/colors';
import { apiFetch } from '../../services/api';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface AgentAccount {
  id: string;
  agentUniqueId: string;
  name: string;
  description?: string;
  agentType: string;
  status: string;
  creditScore?: number;
  balance?: number;
  balanceCurrency?: string;
  spendingLimits?: {
    singleTxLimit: number;
    dailyLimit: number;
    monthlyLimit: number;
    currency: string;
  };
  walletAddress?: string;
  createdAt: string;
}

interface CreateAgentDto {
  name: string;
  description?: string;
  agentType: string;
  spendingLimits: {
    singleTxLimit: number;
    dailyLimit: number;
    monthlyLimit: number;
    currency: string;
  };
}

// ──────────────────────────────────────────────
// API helpers
// ──────────────────────────────────────────────

async function fetchAgentAccounts(): Promise<AgentAccount[]> {
  const res = await apiFetch<{ success: boolean; data: AgentAccount[] }>('/agent-accounts');
  return res.data ?? [];
}

async function createAgentAccount(dto: CreateAgentDto): Promise<AgentAccount> {
  const res = await apiFetch<{ success: boolean; data: AgentAccount }>('/agent-accounts', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return res.data;
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
  await apiFetch(`/agent-accounts/${agentId}/suspend`, { method: 'POST' });
}

async function resumeAgent(agentId: string): Promise<void> {
  await apiFetch(`/agent-accounts/${agentId}/resume`, { method: 'POST' });
}

// ──────────────────────────────────────────────
// Create Agent Modal
// ──────────────────────────────────────────────

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
  const [step, setStep] = useState(1); // 3-step wizard
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agentType, setAgentType] = useState('personal');
  const [singleTxLimit, setSingleTxLimit] = useState('100');
  const [dailyLimit, setDailyLimit] = useState('500');
  const [monthlyLimit, setMonthlyLimit] = useState('2000');
  const [allowedCurrencies, setAllowedCurrencies] = useState(['USDT', 'ETH']);

  const CURRENCY_OPTIONS = ['USDT', 'ETH', 'USD'];
  const toggleCurrency = (c: string) => {
    setAllowedCurrencies((prev) =>
      prev.includes(c) ? (prev.length > 1 ? prev.filter((x) => x !== c) : prev) : [...prev, c],
    );
  };

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please give your agent a name.');
      return;
    }
    onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      agentType,
      spendingLimits: {
        singleTxLimit: Number(singleTxLimit) || 100,
        dailyLimit: Number(dailyLimit) || 500,
        monthlyLimit: Number(monthlyLimit) || 2000,
        currency: 'USD',
      },
    });
  };

  const canAdvance = step === 1 ? name.trim().length > 0 : true;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modal.root}>
        <View style={modal.header}>
          <TouchableOpacity onPress={step > 1 ? () => setStep(step - 1) : onClose}>
            <Text style={modal.cancel}>{step > 1 ? '← Back' : 'Cancel'}</Text>
          </TouchableOpacity>
          <Text style={modal.title}>New Agent · Step {step}/3</Text>
          {step < 3 ? (
            <TouchableOpacity onPress={() => canAdvance && setStep(step + 1)} disabled={!canAdvance}>
              <Text style={[modal.createBtn, !canAdvance && { opacity: 0.4 }]}>Next →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleCreate} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={modal.createBtn}>Create</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Step indicator */}
        <View style={modal.stepBar}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={[modal.stepDot, s <= step && modal.stepDotActive]} />
          ))}
        </View>

        <ScrollView style={modal.body} keyboardShouldPersistTaps="handled">
          {/* ── Step 1: Identity ── */}
          {step === 1 && (
            <>
              <Text style={modal.stepTitle}>🤖 Configure Identity</Text>
              <Text style={modal.stepSub}>Name your agent and define its purpose.</Text>

              <Text style={modal.label}>Agent Name *</Text>
              <TextInput
                style={modal.input}
                placeholder="e.g. My Research Agent"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus
              />

              <Text style={modal.label}>Description</Text>
              <TextInput
                style={[modal.input, { minHeight: 70, textAlignVertical: 'top' }]}
                placeholder="What does this agent do?"
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <Text style={modal.label}>Agent Type</Text>
              <View style={modal.typeRow}>
                {AGENT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[modal.typeChip, agentType === t && modal.typeChipActive]}
                    onPress={() => setAgentType(t)}
                  >
                    <Text style={[modal.typeText, agentType === t && modal.typeTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* ── Step 2: Spending Limits ── */}
          {step === 2 && (
            <>
              <Text style={modal.stepTitle}>💳 Set Spending Limits</Text>
              <Text style={modal.stepSub}>Control how much this agent can spend autonomously.</Text>

              <View style={modal.limitsGrid}>
                <View style={modal.limitItem}>
                  <Text style={modal.limitLabel}>Single TX ($)</Text>
                  <TextInput
                    style={modal.limitInput}
                    value={singleTxLimit}
                    onChangeText={setSingleTxLimit}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={modal.limitItem}>
                  <Text style={modal.limitLabel}>Daily ($)</Text>
                  <TextInput
                    style={modal.limitInput}
                    value={dailyLimit}
                    onChangeText={setDailyLimit}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={modal.limitItem}>
                  <Text style={modal.limitLabel}>Monthly ($)</Text>
                  <TextInput
                    style={modal.limitInput}
                    value={monthlyLimit}
                    onChangeText={setMonthlyLimit}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <Text style={modal.label}>Allowed Currencies</Text>
              <View style={modal.typeRow}>
                {CURRENCY_OPTIONS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[modal.typeChip, allowedCurrencies.includes(c) && modal.typeChipActive]}
                    onPress={() => toggleCurrency(c)}
                  >
                    <Text style={[modal.typeText, allowedCurrencies.includes(c) && modal.typeTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={modal.infoBox}>
                <Text style={modal.infoText}>
                  💡 Spending limits protect you by capping how much this agent can pay autonomously.
                  You can change these later in Permissions.
                </Text>
              </View>
            </>
          )}

          {/* ── Step 3: Confirm & Activate Wallet ── */}
          {step === 3 && (
            <>
              <Text style={modal.stepTitle}>🔐 Activate Wallet</Text>
              <Text style={modal.stepSub}>Review and create. An MPC wallet will be generated automatically.</Text>

              <View style={modal.summaryCard}>
                <View style={modal.summaryRow}>
                  <Text style={modal.summaryLabel}>Name</Text>
                  <Text style={modal.summaryValue}>{name || '—'}</Text>
                </View>
                <View style={modal.summaryRow}>
                  <Text style={modal.summaryLabel}>Type</Text>
                  <Text style={modal.summaryValue}>{agentType}</Text>
                </View>
                <View style={modal.summaryRow}>
                  <Text style={modal.summaryLabel}>Single TX</Text>
                  <Text style={modal.summaryValue}>${singleTxLimit}</Text>
                </View>
                <View style={modal.summaryRow}>
                  <Text style={modal.summaryLabel}>Daily Limit</Text>
                  <Text style={modal.summaryValue}>${dailyLimit}</Text>
                </View>
                <View style={modal.summaryRow}>
                  <Text style={modal.summaryLabel}>Monthly Limit</Text>
                  <Text style={modal.summaryValue}>${monthlyLimit}</Text>
                </View>
                <View style={modal.summaryRow}>
                  <Text style={modal.summaryLabel}>Currencies</Text>
                  <Text style={modal.summaryValue}>{allowedCurrencies.join(', ')}</Text>
                </View>
              </View>

              <View style={modal.infoBox}>
                <Text style={modal.infoText}>
                  🔐 An independent MPC wallet will be created for this agent. The wallet is self-custody — only
                  this agent can sign transactions within the limits above. Tap "Create" to proceed.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  active: '#22c55e',
  draft: '#6366f1',
  suspended: '#f59e0b',
  terminated: '#ef4444',
};

export function AgentAccountScreen() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [walletLoading, setWalletLoading] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
      // No need for user to manually click "Open Wallet" — do it automatically
      try {
        const walletResult = await openWalletForAgent(result.id);
        queryClient.invalidateQueries({ queryKey: ['agent-accounts'] });
        Alert.alert(
          'Agent Ready ✅🔐',
          `"${result.name}" has been created with an independent MPC wallet.\n\nWallet Address:\n${walletResult.walletAddress}\n\nYour agent now has autonomous payment capability within the spending limits you set.`,
        );
      } catch {
        // Wallet creation failed, notify user (non-blocking — agent itself was created)
        Alert.alert(
          'Agent Created ✅',
          `"${result.name}" is ready.\n\n⚠️ Wallet activation failed — tap "Open Wallet" on the agent card to try again.`,
        );
      }
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to create agent account.');
    },
  });

  const handleOpenWallet = async (agent: AgentAccount) => {
    if (agent.walletAddress) {
      Alert.alert(
        'Agent Wallet',
        `Address: ${agent.walletAddress}`,
        [{ text: 'OK' }],
      );
      return;
    }

    Alert.alert(
      'Open Independent Wallet',
      `Create an MPC wallet for "${agent.name}"?\n\nThis generates a self-custody wallet where only this agent can sign transactions within its spending limits.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create Wallet',
          onPress: async () => {
            setWalletLoading(agent.id);
            try {
              const result = await openWalletForAgent(agent.id);
              queryClient.invalidateQueries({ queryKey: ['agent-accounts'] });
              Alert.alert(
                'Wallet Created 🎉',
                `Your agent wallet is ready!\n\nAddress: ${result.walletAddress}`,
              );
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to create wallet.');
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
      'Suspend Agent',
      `Suspend "${agent.name}"? It will no longer be able to make payments.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            try {
              await suspendAgent(agent.id);
              queryClient.invalidateQueries({ queryKey: ['agent-accounts'] });
            } catch {
              Alert.alert('Error', 'Failed to suspend agent.');
            }
          },
        },
      ],
    );
  };

  const handleResume = (agent: AgentAccount) => {
    Alert.alert(
      'Resume Agent',
      `Reactivate "${agent.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resume',
          onPress: async () => {
            setActionLoading(agent.id);
            try {
              await resumeAgent(agent.id);
              queryClient.invalidateQueries({ queryKey: ['agent-accounts'] });
              Alert.alert('Agent Reactivated ✅', `${agent.name} is active again.`);
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to resume agent.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const renderAgent = ({ item: agent }: { item: AgentAccount }) => (
    <View style={styles.card}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={styles.agentIcon}>
          <Text style={styles.agentIconText}>🤖</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.agentName}>{agent.name}</Text>
          <Text style={styles.agentId}>{agent.agentUniqueId}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[agent.status] || '#888') + '22' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[agent.status] || colors.textMuted }]}>
            {agent.status}
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
            <Text style={styles.limitChipLabel}>Single TX</Text>
            <Text style={styles.limitChipValue}>
              ${agent.spendingLimits.singleTxLimit} {agent.spendingLimits.currency}
            </Text>
          </View>
          <View style={styles.limitChip}>
            <Text style={styles.limitChipLabel}>Daily</Text>
            <Text style={styles.limitChipValue}>
              ${agent.spendingLimits.dailyLimit}
            </Text>
          </View>
          <View style={styles.limitChip}>
            <Text style={styles.limitChipLabel}>Monthly</Text>
            <Text style={styles.limitChipValue}>
              ${agent.spendingLimits.monthlyLimit}
            </Text>
          </View>
        </View>
      )}

      {/* Wallet */}
      {agent.walletAddress ? (
        <TouchableOpacity style={styles.walletRowActive} onPress={() => handleOpenWallet(agent)}>
          <Text style={styles.walletIcon}>💳</Text>
          <Text style={styles.walletAddress} numberOfLines={1}>
            {agent.walletAddress.slice(0, 14)}...{agent.walletAddress.slice(-8)}
          </Text>
          {/* Balance chip */}
          {agent.balance != null && (
            <View style={styles.balanceChip}>
              <Text style={styles.balanceText}>
                {agent.balance.toFixed(4)} {agent.balanceCurrency ?? 'USDT'}
              </Text>
            </View>
          )}
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
              <Text style={styles.openWalletIcon}>🔐</Text>
              <Text style={styles.openWalletText}>Open Independent Wallet</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Actions row */}
      <View style={styles.actionsRow}>
        {(agent.status === 'active' || agent.status === 'draft') && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleSuspend(agent)}>
            <Text style={styles.actionBtnText}>⏸ Suspend</Text>
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
              <Text style={[styles.actionBtnText, { color: colors.accent }]}>▶ Resume</Text>
            )}
          </TouchableOpacity>
        )}
        {agent.walletAddress && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnFund]}
            onPress={() =>
              Alert.alert('Fund Agent', `Top up agent wallet:\n${agent.walletAddress}\n\nSend USDT (BSC) to this address.`)
            }
          >
            <Text style={[styles.actionBtnText, { color: '#22c55e' }]}>💰 Fund</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            Alert.alert('Transactions', `Transaction history for ${agent.name} will open in the Orders tab.`)
          }
        >
          <Text style={styles.actionBtnText}>📋 Txs</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
              <Text style={styles.headerTitle}>Agent Accounts</Text>
              <Text style={styles.headerSub}>
                Each agent account is an autonomous identity with its own spending limits and optional self-custody wallet.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🤖</Text>
              <Text style={styles.emptyTitle}>No agent accounts</Text>
              <Text style={styles.emptySub}>
                Create an agent account to let your AI act autonomously on your behalf.
              </Text>
            </View>
          }
        />
      )}

      {/* FAB: Create agent */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Text style={styles.fabText}>＋ New Agent</Text>
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

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────

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
});

const modal = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
  // Wizard additions
  stepBar: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 10, backgroundColor: colors.bgSecondary },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  stepDotActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  stepTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginTop: 8 },
  stepSub: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: 8 },
  summaryCard: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 10, marginTop: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: colors.textMuted },
  summaryValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
});
