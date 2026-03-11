// 🔐 Agent Permissions & Security Screen
// Shows and manages all permission boundaries for the active AgentAccount
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Switch, Alert, TextInput,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '../../theme/colors';
import { apiFetch } from '../../services/api';
import type { AgentStackParamList } from '../../navigation/types';
import { useI18n } from '../../stores/i18nStore';
import { useAuthStore } from '../../stores/authStore';
import { bindAgentAccountToInstance } from '../../services/openclaw.service';

type Route = RouteProp<AgentStackParamList, 'AgentPermissions'>;

// ── Types ──────────────────────────────────────────────────────────

interface AgentAccount {
  id: string;
  name: string;
  agentUniqueId: string;
  status: string;
  walletAddress?: string;
  permissions?: Partial<PermissionState>;
  spendingLimits?: {
    singleTxLimit: number;
    dailyLimit: number;
    monthlyLimit: number;
    currency: string;
  };
}

interface PermissionState {
  // Payment
  autonomousPaymentEnabled: boolean;
  confirmationThreshold: number;
  allowedCurrencies: string[];
  // Device
  fileReadEnabled: boolean;
  fileReadScope: string;
  programLaunchEnabled: boolean;
  clipboardEnabled: boolean;
  screenshotEnabled: boolean;
  gpsEnabled: boolean;
  gpsAccuracy: 'city' | 'district' | 'exact';
  // Network & Tools
  webSearchEnabled: boolean;
  emailEnabled: boolean;
  twitterEnabled: boolean;
  telegramEnabled: boolean;
  mcpToolCount: number;
}

const DEFAULT_PERMISSIONS: PermissionState = {
  autonomousPaymentEnabled: true,
  confirmationThreshold: 50,
  allowedCurrencies: ['USDT', 'ETH'],
  fileReadEnabled: true,
  fileReadScope: '~/Documents',
  programLaunchEnabled: false,
  clipboardEnabled: true,
  screenshotEnabled: false,
  gpsEnabled: true,
  gpsAccuracy: 'city',
  webSearchEnabled: true,
  emailEnabled: false,
  twitterEnabled: true,
  telegramEnabled: true,
  mcpToolCount: 3,
};

function normalizePermissions(value?: Partial<PermissionState> | null): PermissionState {
  return {
    ...DEFAULT_PERMISSIONS,
    ...(value || {}),
    allowedCurrencies: Array.isArray(value?.allowedCurrencies) && value?.allowedCurrencies.length
      ? value.allowedCurrencies.filter((currency): currency is string => typeof currency === 'string')
      : DEFAULT_PERMISSIONS.allowedCurrencies,
    gpsAccuracy:
      value?.gpsAccuracy === 'district' || value?.gpsAccuracy === 'exact'
        ? value.gpsAccuracy
        : DEFAULT_PERMISSIONS.gpsAccuracy,
    mcpToolCount: typeof value?.mcpToolCount === 'number' ? value.mcpToolCount : DEFAULT_PERMISSIONS.mcpToolCount,
    confirmationThreshold:
      typeof value?.confirmationThreshold === 'number'
        ? value.confirmationThreshold
        : DEFAULT_PERMISSIONS.confirmationThreshold,
  };
}

const CURRENCY_OPTIONS = ['USDT', 'ETH', 'USD'];

// ── Section header ──────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── Permission row with switch ──────────────────────────────────────

function PermRow({
  label, sub, value, onChange, destructive,
}: {
  label: string; sub?: string; value: boolean;
  onChange: (v: boolean) => void; destructive?: boolean;
}) {
  return (
    <View style={styles.permRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.permLabel, destructive && { color: colors.error }]}>{label}</Text>
        {sub ? <Text style={styles.permSub}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.bgSecondary, true: colors.accent + '88' }}
        thumbColor={value ? colors.accent : colors.textMuted}
      />
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────

export function AgentPermissionsScreen() {
  const route = useRoute<Route>();
  const agentAccountId = route.params?.agentAccountId;
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const activeInstance = useAuthStore((s) => s.activeInstance);
  const updateInstance = useAuthStore((s) => s.updateInstance);

  const { data: agents = [] } = useQuery<AgentAccount[]>({
    queryKey: ['agent-accounts'],
    queryFn: async () => {
      const res = await apiFetch<{ success: boolean; data: AgentAccount[] }>('/agent-accounts');
      return res.data ?? [];
    },
    retry: false,
  });

  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(agentAccountId);

  useEffect(() => {
    if (agentAccountId) {
      setSelectedAgentId(agentAccountId);
      return;
    }
    if (!selectedAgentId && activeInstance?.metadata?.agentAccountId) {
      setSelectedAgentId(activeInstance.metadata.agentAccountId);
      return;
    }
    if (!selectedAgentId && agents[0]?.id) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agentAccountId, activeInstance?.metadata?.agentAccountId, agents, selectedAgentId]);

  const activeAgent = (selectedAgentId
    ? agents.find((a) => a.id === selectedAgentId)
    : undefined) ?? agents[0];

  const [perms, setPerms] = useState<PermissionState>(DEFAULT_PERMISSIONS);
  const [editingThreshold, setEditingThreshold] = useState(false);
  const [thresholdInput, setThresholdInput] = useState(String(DEFAULT_PERMISSIONS.confirmationThreshold));
  const [isSaving, setIsSaving] = useState(false);

  const expectedPermissionsJson = JSON.stringify(normalizePermissions(perms));

  useEffect(() => {
    const nextPermissions = normalizePermissions(activeAgent?.permissions);
    setPerms(nextPermissions);
    setThresholdInput(String(nextPermissions.confirmationThreshold));
  }, [activeAgent?.id, activeAgent?.permissions]);

  const updatePerm = <K extends keyof PermissionState>(key: K, value: PermissionState[K]) => {
    setPerms((p) => ({ ...p, [key]: value }));
  };

  const toggleCurrency = (currency: string) => {
    setPerms((p) => {
      const cur = p.allowedCurrencies;
      if (cur.includes(currency)) {
        if (cur.length === 1) return p; // keep at least one
        return { ...p, allowedCurrencies: cur.filter((c) => c !== currency) };
      }
      return { ...p, allowedCurrencies: [...cur, currency] };
    });
  };

  const handleSave = async () => {
    if (!activeAgent) return;
    try {
      setIsSaving(true);
      // Persist spending limits and permissions to backend.
      await apiFetch(`/agent-accounts/${activeAgent.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          spendingLimits: {
            singleTxLimit: activeAgent.spendingLimits?.singleTxLimit ?? 100,
            dailyLimit: activeAgent.spendingLimits?.dailyLimit ?? 500,
            monthlyLimit: activeAgent.spendingLimits?.monthlyLimit ?? 2000,
            currency: 'USD',
          },
          permissions: perms,
        }),
      });

      const verified = await apiFetch<{ success: boolean; data: AgentAccount }>(`/agent-accounts/${activeAgent.id}`);
      const verifiedPermissions = normalizePermissions(verified.data?.permissions);
      if (JSON.stringify(verifiedPermissions) !== expectedPermissionsJson) {
        throw new Error(t({ en: 'Server response did not match the saved permissions.', zh: '服务器回读结果与保存内容不一致。' }));
      }

      if (activeInstance?.id) {
        const updatedInstance = await bindAgentAccountToInstance(activeInstance.id, activeAgent.id);
        updateInstance(activeInstance.id, { metadata: updatedInstance.metadata || { agentAccountId: activeAgent.id } });
      }

      setPerms(verifiedPermissions);
      setThresholdInput(String(verifiedPermissions.confirmationThreshold));
      await queryClient.invalidateQueries({ queryKey: ['agent-accounts'] });
      Alert.alert(
        t({ en: 'Saved ✅', zh: '已保存 ✅' }),
        activeInstance?.id
          ? t({ en: 'Permissions were saved, verified from the server, and bound to the current instance.', zh: '权限已保存，已从服务器回读校验，并已绑定到当前实例。' })
          : t({ en: 'Permissions were saved and verified from the server.', zh: '权限已保存，并已从服务器回读校验。' }),
      );
    } catch (e: any) {
      Alert.alert(t({ en: 'Save Failed', zh: '保存失败' }), e?.message || t({ en: 'Failed to update permissions.', zh: '更新权限失败。' }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuspend = () => {
    if (!activeAgent) return;
    Alert.alert(
      t({ en: 'Suspend Agent', zh: '暂停智能体' }),
      t({ en: `Suspend "${activeAgent.name}"? It will be unable to make payments or use tools.`, zh: `确认暂停“${activeAgent.name}”吗？暂停后它将无法付款或使用工具。` }),
      [
        { text: t({ en: 'Cancel', zh: '取消' }), style: 'cancel' },
        {
          text: t({ en: 'Suspend', zh: '暂停' }), style: 'destructive', onPress: async () => {
            try {
              await apiFetch(`/agent-accounts/${activeAgent.id}/suspend`, { method: 'PATCH' });
              queryClient.invalidateQueries({ queryKey: ['agent-accounts'] });
              Alert.alert(t({ en: 'Agent Suspended', zh: '智能体已暂停' }), t({ en: `${activeAgent.name} is now suspended.`, zh: `${activeAgent.name} 已被暂停。` }));
            } catch { Alert.alert(t({ en: 'Error', zh: '错误' }), t({ en: 'Failed to suspend agent.', zh: '暂停智能体失败。' })); }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Agent Selector */}
      {activeAgent ? (
        <View style={styles.agentBadge}>
          <Text style={styles.agentBadgeIcon}>🤖</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.agentBadgeName}>{activeAgent.name}</Text>
            <Text style={styles.agentBadgeId}>{activeAgent.agentUniqueId}</Text>
          </View>
          <View style={[styles.statusDot, {
            backgroundColor: activeAgent.status === 'active' ? colors.success : colors.error
          }]} />
        </View>
      ) : (
        <View style={styles.noAgentBox}>
          <Text style={styles.noAgentText}>{t({ en: 'No agent selected. Go to Agent Accounts to set one up.', zh: '当前未选择智能体。请前往“智能体账户”先创建或选择一个。' })}</Text>
        </View>
      )}

      {activeInstance?.id ? (
        <View style={styles.instanceBindingCard}>
          <Text style={styles.instanceBindingTitle}>{t({ en: 'Applies to current instance', zh: '应用到当前实例' })}</Text>
          <Text style={styles.instanceBindingText}>
            {t({ en: `${activeInstance.name} will use the selected Agent Account profile for tool and payment permissions.`, zh: `${activeInstance.name} 将使用当前选中的 Agent Account 作为工具与支付权限档案。` })}
          </Text>
        </View>
      ) : null}
      {agents.length > 1 && (
        <View style={styles.accountPickerWrap}>
          <Text style={styles.accountPickerTitle}>{t({ en: 'Choose the account to configure', zh: '选择要配置的账户' })}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountPickerRow}>
            {agents.map((agent) => {
              const selected = agent.id === activeAgent?.id;
              return (
                <TouchableOpacity
                  key={agent.id}
                  style={[styles.accountChip, selected && styles.accountChipActive]}
                  onPress={() => setSelectedAgentId(agent.id)}
                >
                  <Text style={[styles.accountChipText, selected && styles.accountChipTextActive]}>{agent.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {!agentAccountId && (
            <Text style={styles.accountPickerHint}>{t({ en: 'Permissions are saved to the selected Agent Account and verified after saving.', zh: '权限会保存到当前选中的智能体账户，并在保存后回读校验。' })}</Text>
          )}
        </View>
      )}

      {/* ── Payment Permissions ── */}
      <SectionHeader icon="💳" title={t({ en: 'Payment Permissions', zh: '支付权限' })} />
      <View style={styles.section}>
        <PermRow
          label={t({ en: 'Allow Autonomous Payment', zh: '允许自主支付' })}
          sub={t({ en: 'Agent can initiate transactions without asking you', zh: '智能体可在无需询问你的情况下发起交易' })}
          value={perms.autonomousPaymentEnabled}
          onChange={(v) => updatePerm('autonomousPaymentEnabled', v)}
        />
        <View style={styles.divider} />
        {/* Confirmation threshold */}
        <View style={styles.permRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.permLabel}>{t({ en: 'Require Approval ≥', zh: '达到此金额需审批 ≥' })}</Text>
            <Text style={styles.permSub}>{t({ en: 'You\'ll be asked to confirm payments above this amount', zh: '超过此金额的支付将要求你确认' })}</Text>
          </View>
          {editingThreshold ? (
            <View style={styles.thresholdEdit}>
              <Text style={styles.currency}>$</Text>
              <TextInput
                style={styles.thresholdInput}
                value={thresholdInput}
                onChangeText={setThresholdInput}
                keyboardType="decimal-pad"
                autoFocus
                onBlur={() => {
                  updatePerm('confirmationThreshold', Number(thresholdInput) || 50);
                  setEditingThreshold(false);
                }}
              />
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingThreshold(true)} style={styles.editableValue}>
              <Text style={styles.editableText}>${perms.confirmationThreshold}</Text>
              <Text style={styles.editHint}>  {t({ en: 'Edit', zh: '编辑' })}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.divider} />
        {/* Currency */}
        <View style={styles.permRow}>
          <Text style={styles.permLabel}>{t({ en: 'Allowed Currencies', zh: '允许的币种' })}</Text>
          <View style={styles.currencyRow}>
            {CURRENCY_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.currencyChip, perms.allowedCurrencies.includes(c) && styles.currencyChipActive]}
                onPress={() => toggleCurrency(c)}
              >
                <Text style={[styles.currencyChipText, perms.allowedCurrencies.includes(c) && styles.currencyChipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.divider} />
        {/* Spending limits from agent account */}
        {activeAgent?.spendingLimits && (
          <>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>{t({ en: 'Single TX Limit', zh: '单笔限额' })}</Text>
              <Text style={styles.limitValue}>${activeAgent.spendingLimits.singleTxLimit}</Text>
            </View>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>{t({ en: 'Daily Limit', zh: '日限额' })}</Text>
              <Text style={styles.limitValue}>${activeAgent.spendingLimits.dailyLimit}</Text>
            </View>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>{t({ en: 'Monthly Limit', zh: '月限额' })}</Text>
              <Text style={styles.limitValue}>${activeAgent.spendingLimits.monthlyLimit}</Text>
            </View>
          </>
        )}
      </View>

      {/* ── Device Control ── */}
      <SectionHeader icon="💻" title={t({ en: 'Device Control Permissions', zh: '设备控制权限' })} />
      <View style={styles.section}>
        <PermRow
          label={t({ en: '📁 File Read', zh: '📁 文件读取' })}
          sub={perms.fileReadEnabled ? `Scope: ${perms.fileReadScope}` : undefined}
          value={perms.fileReadEnabled}
          onChange={(v) => updatePerm('fileReadEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '🖥 Launch Programs', zh: '🖥 启动程序' })}
          value={perms.programLaunchEnabled}
          onChange={(v) => updatePerm('programLaunchEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '📋 Clipboard Read/Write', zh: '📋 剪贴板读写' })}
          value={perms.clipboardEnabled}
          onChange={(v) => updatePerm('clipboardEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '📸 Screenshot', zh: '📸 截图' })}
          value={perms.screenshotEnabled}
          onChange={(v) => updatePerm('screenshotEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '📍 GPS Location', zh: '📍 GPS 定位' })}
          sub={perms.gpsEnabled ? `Precision: ${perms.gpsAccuracy}` : undefined}
          value={perms.gpsEnabled}
          onChange={(v) => updatePerm('gpsEnabled', v)}
        />
      </View>

      {/* ── Network & Tools ── */}
      <SectionHeader icon="🌐" title={t({ en: 'Network & Tool Permissions', zh: '网络与工具权限' })} />
      <View style={styles.section}>
        <PermRow
          label={t({ en: '🔍 Web Search', zh: '🔍 网络搜索' })}
          value={perms.webSearchEnabled}
          onChange={(v) => updatePerm('webSearchEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '📧 Email Send', zh: '📧 邮件发送' })}
          sub={!perms.emailEnabled ? t({ en: 'Requires approval to enable', zh: '启用前需要审批' }) : undefined}
          value={perms.emailEnabled}
          onChange={(v) => updatePerm('emailEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '🐦 Twitter / X Post', zh: '🐦 Twitter / X 发帖' })}
          sub={perms.twitterEnabled ? t({ en: 'Auto mode', zh: '自动模式' }) : undefined}
          value={perms.twitterEnabled}
          onChange={(v) => updatePerm('twitterEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '💬 Telegram Reply', zh: '💬 Telegram 回复' })}
          sub={perms.telegramEnabled ? t({ en: 'Auto mode', zh: '自动模式' }) : undefined}
          value={perms.telegramEnabled}
          onChange={(v) => updatePerm('telegramEnabled', v)}
        />
        <View style={styles.divider} />
        <View style={styles.permRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.permLabel}>{t({ en: '🔧 MCP Tools Authorized', zh: '🔧 已授权 MCP 工具' })}</Text>
            <Text style={styles.permSub}>{t({ en: `${perms.mcpToolCount} tools allowed`, zh: `已允许 ${perms.mcpToolCount} 个工具` })}</Text>
          </View>
          <TouchableOpacity style={styles.manageBtn}>
            <Text style={styles.manageBtnText}>{t({ en: 'Manage →', zh: '管理 →' })}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, (isSaving || !activeAgent) && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={isSaving || !activeAgent}
      >
        <Text style={styles.saveBtnText}>{isSaving ? '⏳ ' : '💾 '}{t({ en: 'Save Permissions', zh: '保存权限设置' })}</Text>
      </TouchableOpacity>

      {/* ── Danger Zone ── */}
      <SectionHeader icon="⚠️" title={t({ en: 'Danger Zone', zh: '危险操作' })} />
      <View style={styles.dangerRow}>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleSuspend}>
          <Text style={styles.dangerBtnText}>⏸ {t({ en: 'Suspend Agent', zh: '暂停智能体' })}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dangerBtn, { borderColor: colors.error }]}
          onPress={() => Alert.alert(t({ en: 'Terminate Agent', zh: '终止智能体' }), t({ en: 'Permanently terminate this agent? This cannot be undone.', zh: '确认永久终止该智能体吗？此操作不可撤销。' }), [
            { text: t({ en: 'Cancel', zh: '取消' }), style: 'cancel' },
            { text: t({ en: 'Terminate', zh: '终止' }), style: 'destructive', onPress: () => {} },
          ])}
        >
          <Text style={[styles.dangerBtnText, { color: colors.error }]}>🗑 {t({ en: 'Terminate Agent', zh: '终止智能体' })}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 48, gap: 8 },
  accountPickerWrap: { gap: 10, marginBottom: 4 },
  accountPickerTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  accountPickerRow: { gap: 8 },
  accountChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountChipActive: { backgroundColor: colors.accent + '22', borderColor: colors.accent },
  accountChipText: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
  accountChipTextActive: { color: colors.accent },
  accountPickerHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  agentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 4,
  },
  agentBadgeIcon: { fontSize: 28 },
  agentBadgeName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  agentBadgeId: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  noAgentBox: {
    backgroundColor: colors.bgCard, borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  noAgentText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  instanceBindingCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.accent + '44',
    marginBottom: 4,
  },
  instanceBindingTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  instanceBindingText: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 4, paddingTop: 12, paddingBottom: 4,
  },
  sectionIcon: { fontSize: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  section: {
    backgroundColor: colors.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  permRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 12, gap: 12,
  },
  permLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  permSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 14 },
  thresholdEdit: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  currency: { fontSize: 16, color: colors.accent, fontWeight: '700' },
  thresholdInput: {
    color: colors.textPrimary, fontSize: 16, fontWeight: '700',
    borderBottomWidth: 1, borderColor: colors.accent, minWidth: 60, textAlign: 'right',
  },
  editableValue: { flexDirection: 'row', alignItems: 'center' },
  editableText: { fontSize: 15, fontWeight: '700', color: colors.accent },
  editHint: { fontSize: 11, color: colors.textMuted },
  currencyRow: { flexDirection: 'row', gap: 6 },
  currencyChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
  },
  currencyChipActive: { borderColor: colors.accent, backgroundColor: colors.accent + '22' },
  currencyChipText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  currencyChipTextActive: { color: colors.accent },
  limitRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 9,
    borderTopWidth: 1, borderColor: colors.border,
  },
  limitLabel: { fontSize: 13, color: colors.textSecondary },
  limitValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  manageBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.bgSecondary, borderRadius: 8 },
  manageBtnText: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 14, padding: 15,
    alignItems: 'center', marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  dangerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  dangerBtn: {
    flex: 1, alignItems: 'center', padding: 13,
    backgroundColor: colors.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: '#f59e0b66',
  },
  dangerBtnText: { color: '#f59e0b', fontWeight: '700', fontSize: 14 },
});
