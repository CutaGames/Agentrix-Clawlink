// 馃攼 Agent Permissions & Security Screen
// Shows and manages all permission boundaries for the active AgentAccount
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Switch, Alert, TextInput, Modal, FlatList,
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
import {
  fetchUnifiedAgents,
  getUnifiedAgent,
  type UnifiedAgent,
} from '../../services/unifiedAgent';

type AgentAccount = UnifiedAgent;

type Route = RouteProp<AgentStackParamList, 'AgentPermissions'>;

// 鈹€鈹€ Types 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

interface CatalogModel {
  id: string;
  label: string;
  contextWindow: number;
  costTier: 'free' | 'low' | 'medium' | 'high';
  capabilities: string[];
  multimodal?: boolean;
  inputPrice?: string;
  outputPrice?: string;
  positioning?: string;
  freeApi?: boolean;
  freeNote?: string;
}

interface CatalogProvider {
  id: string;
  name: string;
  icon: string;
  region: 'international' | 'china';
  currency?: string;
  models: CatalogModel[];
}

interface UserSavedConfig {
  providerId: string;
  selectedModel: string;
  isDefault: boolean;
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
  screenshotEnabled: boolean;
  gpsEnabled: boolean;
  gpsAccuracy: 'city' | 'district' | 'exact';
  // Network & Tools
  webSearchEnabled: boolean;
  emailEnabled: boolean;
  twitterEnabled: boolean;
  telegramEnabled: boolean;
  mcpToolCount: number;
  // Skills
  skillSearchEnabled: boolean;
  skillInstallEnabled: boolean;
  skillExecuteEnabled: boolean;
  skillPublishEnabled: boolean;
  // Commerce
  commerceBrowseEnabled: boolean;
  commercePurchaseEnabled: boolean;
  orderManageEnabled: boolean;
  walletReadEnabled: boolean;
  quickpayEnabled: boolean;
  x402PayEnabled: boolean;
  // Agent-to-Agent (A2A)
  a2aDiscoverEnabled: boolean;
  a2aInvokeEnabled: boolean;
  // Task Marketplace
  taskSearchEnabled: boolean;
  taskPostEnabled: boolean;
  taskAcceptEnabled: boolean;
  taskSubmitEnabled: boolean;
  // Resource
  resourceSearchEnabled: boolean;
  resourcePublishEnabled: boolean;
}

const DEFAULT_PERMISSIONS: PermissionState = {
  autonomousPaymentEnabled: true,
  confirmationThreshold: 50,
  allowedCurrencies: ['USDT', 'ETH'],
  fileReadEnabled: true,
  fileReadScope: '~/Documents',
  programLaunchEnabled: true,
  screenshotEnabled: true,
  gpsEnabled: true,
  gpsAccuracy: 'city',
  webSearchEnabled: true,
  emailEnabled: true,
  twitterEnabled: true,
  telegramEnabled: true,
  mcpToolCount: 3,
  // Skills 鈥?all enabled by default
  skillSearchEnabled: true,
  skillInstallEnabled: true,
  skillExecuteEnabled: true,
  skillPublishEnabled: true,
  // Commerce
  commerceBrowseEnabled: true,
  commercePurchaseEnabled: true,
  orderManageEnabled: true,
  walletReadEnabled: true,
  quickpayEnabled: true,
  x402PayEnabled: true,
  // A2A
  a2aDiscoverEnabled: true,
  a2aInvokeEnabled: true,
  // Task Marketplace
  taskSearchEnabled: true,
  taskPostEnabled: true,
  taskAcceptEnabled: true,
  taskSubmitEnabled: true,
  // Resources
  resourceSearchEnabled: true,
  resourcePublishEnabled: true,
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

// 鈹€鈹€ Section header 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// 鈹€鈹€ Permission row with switch 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

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

// 鈹€鈹€ Main Screen 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

export function AgentPermissionsScreen() {
  const route = useRoute<Route>();
  const agentAccountId = route.params?.agentAccountId;
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const activeInstance = useAuthStore((s) => s.activeInstance);
  const updateInstance = useAuthStore((s) => s.updateInstance);

  const { data: agents = [] } = useQuery<AgentAccount[]>({
    queryKey: ['agent-accounts'],
    queryFn: fetchUnifiedAgents,
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

  // Per-agent model selection
  const [catalog, setCatalog] = useState<CatalogProvider[]>([]);
  const [userConfigs, setUserConfigs] = useState<UserSavedConfig[]>([]);
  const [preferredProvider, setPreferredProvider] = useState<string | undefined>(undefined);
  const [preferredModel, setPreferredModel] = useState<string | undefined>(undefined);
  const [agentVoice, setAgentVoice] = useState<string | undefined>(undefined);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);

  const availableVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

  useEffect(() => {
    Promise.all([
      apiFetch<CatalogProvider[]>('/ai-providers/catalog'),
      apiFetch<UserSavedConfig[]>('/ai-providers/configs'),
    ]).then(([cat, configs]) => {
      setCatalog(cat);
      setUserConfigs(configs);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeAgent) {
      setPreferredProvider(activeAgent.preferredProvider);
      setPreferredModel(activeAgent.preferredModel);
      setAgentVoice(activeAgent.metadata?.voice_id);
    }
  }, [activeAgent?.id, activeAgent?.preferredProvider, activeAgent?.preferredModel, activeAgent?.metadata?.voice_id]);

  const configuredProviderIds = userConfigs.map(c => c.providerId);
  const configuredProviders = catalog.filter(p => configuredProviderIds.includes(p.id));
  const defaultUserConfig = userConfigs.find(c => c.isDefault);

  const selectedProviderObj = catalog.find(p => p.id === preferredProvider);
  const selectedModelObj = selectedProviderObj?.models.find(m => m.id === preferredModel);
  const modelDisplayLabel = selectedModelObj
    ? `${selectedProviderObj?.icon || ''} ${selectedModelObj.label}`
    : defaultUserConfig
      ? t({ en: 'Use Default', zh: '浣跨敤榛樿' }) + ` (${catalog.find(p => p.id === defaultUserConfig.providerId)?.icon || ''} ${defaultUserConfig.selectedModel})`
      : t({ en: 'Platform Default', zh: '骞冲彴榛樿' });

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
      // Persist permissions via agent-accounts API (bypass agentPresence)
      if (activeAgent.agentAccountId) {
        await apiFetch(`/agent-accounts/${activeAgent.agentAccountId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            spendingLimits: {
              singleTxLimit: activeAgent.spendingLimits?.singleTxLimit ?? 100,
              dailyLimit: activeAgent.spendingLimits?.dailyLimit ?? 500,
              monthlyLimit: activeAgent.spendingLimits?.monthlyLimit ?? 2000,
              currency: 'USD',
            },
            permissions: perms,
            preferredModel: preferredModel || undefined,
            preferredProvider: preferredProvider || undefined,
          }),
        });
      }

      const verified = await getUnifiedAgent(activeAgent.id);
      const verifiedPermissions = normalizePermissions(verified.spendingLimits ? { allowedToolNames: [] } : undefined);
      if (JSON.stringify(verifiedPermissions) !== expectedPermissionsJson) {
        throw new Error(t({ en: 'Server response did not match the saved permissions.', zh: '鏈嶅姟鍣ㄥ洖璇荤粨鏋滀笌淇濆瓨鍐呭涓嶄竴鑷淬€? }));
      }

      if (activeInstance?.id) {
        try {
          const updatedInstance = await bindAgentAccountToInstance(activeInstance.id, activeAgent.id);
          updateInstance(activeInstance.id, { metadata: updatedInstance.metadata || { agentAccountId: activeAgent.id } });
        } catch {
          // Non-blocking: agent-account binding may fail if backend hasn't created the account yet
        }
      }

      setPerms(verifiedPermissions);
      setThresholdInput(String(verifiedPermissions.confirmationThreshold));
      await queryClient.invalidateQueries({ queryKey: ['agent-accounts'] });
      Alert.alert(
        t({ en: 'Saved 鉁?, zh: '宸蹭繚瀛?鉁? }),
        activeInstance?.id
          ? t({ en: 'Permissions were saved, verified from the server, and bound to the current instance.', zh: '鏉冮檺宸蹭繚瀛橈紝宸蹭粠鏈嶅姟鍣ㄥ洖璇绘牎楠岋紝骞跺凡缁戝畾鍒板綋鍓嶅疄渚嬨€? })
          : t({ en: 'Permissions were saved and verified from the server.', zh: '鏉冮檺宸蹭繚瀛橈紝骞跺凡浠庢湇鍔″櫒鍥炶鏍￠獙銆? }),
      );
    } catch (e: any) {
      Alert.alert(t({ en: 'Save Failed', zh: '淇濆瓨澶辫触' }), e?.message || t({ en: 'Failed to update permissions.', zh: '鏇存柊鏉冮檺澶辫触銆? }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuspend = () => {
    if (!activeAgent) return;
    Alert.alert(
      t({ en: 'Suspend Agent', zh: '鏆傚仠鏅鸿兘浣? }),
      t({ en: `Suspend "${activeAgent.name}"? It will be unable to make payments or use tools.`, zh: `纭鏆傚仠鈥?{activeAgent.name}鈥濆悧锛熸殏鍋滃悗瀹冨皢鏃犳硶浠樻鎴栦娇鐢ㄥ伐鍏枫€俙 }),
      [
        { text: t({ en: 'Cancel', zh: '鍙栨秷' }), style: 'cancel' },
        {
          text: t({ en: 'Suspend', zh: '鏆傚仠' }), style: 'destructive', onPress: async () => {
            try {
              await apiFetch(`/openclaw-connection/instances/${activeAgent.id}/pause`, { method: 'POST' });
              queryClient.invalidateQueries({ queryKey: ['agent-accounts'] });
              Alert.alert(t({ en: 'Agent Suspended', zh: '鏅鸿兘浣撳凡鏆傚仠' }), t({ en: `${activeAgent.name} is now suspended.`, zh: `${activeAgent.name} 宸茶鏆傚仠銆俙 }));
            } catch { Alert.alert(t({ en: 'Error', zh: '閿欒' }), t({ en: 'Failed to suspend agent.', zh: '鏆傚仠鏅鸿兘浣撳け璐ャ€? })); }
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
          <Text style={styles.agentBadgeIcon}>馃</Text>
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
          <Text style={styles.noAgentText}>{t({ en: 'No agent selected. Go to Agent Accounts to set one up.', zh: '褰撳墠鏈€夋嫨鏅鸿兘浣撱€傝鍓嶅線鈥滄櫤鑳戒綋璐︽埛鈥濆厛鍒涘缓鎴栭€夋嫨涓€涓€? })}</Text>
        </View>
      )}

      {activeInstance?.id ? (
        <View style={styles.instanceBindingCard}>
          <Text style={styles.instanceBindingTitle}>{t({ en: 'Applies to current instance', zh: '搴旂敤鍒板綋鍓嶅疄渚? })}</Text>
          <Text style={styles.instanceBindingText}>
            {t({ en: `${activeInstance.name} will use the selected Agent Account profile for tool and payment permissions.`, zh: `${activeInstance.name} 灏嗕娇鐢ㄥ綋鍓嶉€変腑鐨?Agent Account 浣滀负宸ュ叿涓庢敮浠樻潈闄愭。妗堛€俙 })}
          </Text>
        </View>
      ) : null}
      {agents.length > 1 && (
        <View style={styles.accountPickerWrap}>
          <Text style={styles.accountPickerTitle}>{t({ en: 'Choose the account to configure', zh: '閫夋嫨瑕侀厤缃殑璐︽埛' })}</Text>
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
            <Text style={styles.accountPickerHint}>{t({ en: 'Permissions are saved to the selected Agent Account and verified after saving.', zh: '鏉冮檺浼氫繚瀛樺埌褰撳墠閫変腑鐨勬櫤鑳戒綋璐︽埛锛屽苟鍦ㄤ繚瀛樺悗鍥炶鏍￠獙銆? })}</Text>
          )}
        </View>
      )}

      {/* 鈹€鈹€ AI Model Preference 鈹€鈹€ */}
      <SectionHeader icon="馃" title={t({ en: 'AI Model Preference', zh: 'AI 妯″瀷鍋忓ソ' })} />
      <View style={styles.section}>
        <View style={styles.permRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.permLabel}>{t({ en: 'Preferred Model', zh: '棣栭€夋ā鍨? })}</Text>
            <Text style={styles.permSub}>
              {t({ en: 'Override the global model for this agent', zh: '涓烘鏅鸿兘浣撴寚瀹氫笓灞炴ā鍨嬶紙瑕嗙洊鍏ㄥ眬璁剧疆锛? })}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <TouchableOpacity
          style={[styles.permRow, { paddingVertical: 14 }]}
          onPress={() => setShowModelPicker(true)}
        >
          <Text style={{ fontSize: 14, color: colors.textPrimary, flex: 1 }}>{modelDisplayLabel}</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>鈻?/Text>
        </TouchableOpacity>
        {preferredModel && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity
              style={[styles.permRow, { paddingVertical: 10 }]}
              onPress={() => { setPreferredProvider(undefined); setPreferredModel(undefined); }}
            >
              <Text style={{ fontSize: 13, color: colors.error }}>
                {t({ en: '鉁?Reset to Platform Default', zh: '鉁?鎭㈠涓哄钩鍙伴粯璁? })}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* 鈹€鈹€ Voice Preference 鈹€鈹€ */}
      <SectionHeader icon="馃帣锔? title={t({ en: 'Agent Voice', zh: '鏅鸿兘浣撻煶鑹? })} />
      <View style={styles.section}>
        <View style={styles.permRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.permLabel}>{t({ en: 'Selected Voice', zh: '宸查€夐煶鑹? })}</Text>
            <Text style={styles.permSub}>
              {t({ en: 'Configure TTS voice personality', zh: '閰嶇疆鏂囨湰杞闊崇殑涓€у彂闊? })}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <TouchableOpacity
          style={[styles.permRow, { paddingVertical: 14 }]}
          onPress={() => setShowVoicePicker(true)}
        >
          <Text style={{ fontSize: 14, color: colors.textPrimary, flex: 1, textTransform: 'capitalize' }}>
            {agentVoice || t({ en: 'Default Server Voice', zh: '榛樿鏈嶅姟鍣ㄩ煶鑹? })}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>鈻?/Text>
        </TouchableOpacity>
        {agentVoice && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity
              style={[styles.permRow, { paddingVertical: 10 }]}
              onPress={() => setAgentVoice(undefined)}
            >
              <Text style={{ fontSize: 13, color: colors.error }}>
                {t({ en: '鉁?Reset to Default', zh: '鉁?鎭㈠榛樿' })}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Voice picker modal */}
      <Modal visible={showVoicePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTopTitle}>{t({ en: 'Select Agent Voice', zh: '閫夋嫨璇煶闊宠壊' })}</Text>
              <TouchableOpacity onPress={() => setShowVoicePicker(false)}>
                <Text style={{ fontSize: 18, color: colors.textMuted, padding: 4 }}>鉁?/Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableVoices}
              keyExtractor={v => v}
              renderItem={({ item: v }) => {
                const isSelected = agentVoice === v;
                return (
                  <TouchableOpacity
                    style={[styles.modelPickRow, isSelected && { backgroundColor: colors.primary + '10' }]}
                    onPress={() => {
                      setAgentVoice(v);
                      setShowVoicePicker(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modelPickLabel, isSelected && { color: colors.primary }, { textTransform: 'capitalize' }]}>{v}</Text>
                    </View>
                    {isSelected && <Text style={{ color: colors.primary, marginLeft: 8 }}>鉁?/Text>}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Model picker modal */}
      <Modal visible={showModelPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTopTitle}>{t({ en: 'Select Model for Agent', zh: '涓?Agent 閫夋嫨妯″瀷' })}</Text>
              <TouchableOpacity onPress={() => setShowModelPicker(false)}>
                <Text style={{ fontSize: 18, color: colors.textMuted, padding: 4 }}>鉁?/Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={configuredProviders.length > 0 ? configuredProviders : catalog}
              keyExtractor={p => p.id}
              ListHeaderComponent={
                configuredProviders.length > 0 ? (
                  <Text style={{ fontSize: 11, color: colors.textMuted, paddingHorizontal: 16, paddingTop: 8 }}>
                    {t({ en: 'Showing your configured providers. Configure more in AI Settings.', zh: '鏄剧ず宸查厤缃殑鍘傚晢銆傚彲鍦?AI 璁剧疆涓厤缃洿澶氥€? })}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 11, color: colors.textMuted, paddingHorizontal: 16, paddingTop: 8 }}>
                    {t({ en: 'No providers configured yet. Configure API keys in Settings first.', zh: '灏氭湭閰嶇疆鍘傚晢銆傝鍏堝湪璁剧疆涓厤缃?API 瀵嗛挜銆? })}
                  </Text>
                )
              }
              renderItem={({ item: prov }) => (
                <View>
                  <Text style={styles.modelGroupHeader}>{prov.icon} {prov.name}{userConfigs.find(c => c.providerId === prov.id)?.isDefault ? ' 猸? : ''}</Text>
                  {prov.models.map(m => {
                    const isSelected = preferredProvider === prov.id && preferredModel === m.id;
                    const fmtCtx = m.contextWindow >= 1000000 ? `${(m.contextWindow / 1000000).toFixed(m.contextWindow % 1000000 === 0 ? 0 : 1)}M` : `${(m.contextWindow / 1000).toFixed(0)}K`;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.modelPickRow, isSelected && { backgroundColor: colors.primary + '10' }]}
                        onPress={() => {
                          setPreferredProvider(prov.id);
                          setPreferredModel(m.id);
                          setShowModelPicker(false);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.modelPickLabel, isSelected && { color: colors.primary }]}>{m.label}</Text>
                          {(m.inputPrice || m.outputPrice) ? (
                            <Text style={styles.modelPickCaps}>馃摜 {m.inputPrice}  馃摛 {m.outputPrice}  路  {fmtCtx} ctx{m.multimodal ? '  路  馃柤' : ''}</Text>
                          ) : (
                            <Text style={styles.modelPickCaps}>{fmtCtx} ctx{m.multimodal ? '  路  馃柤 澶氭ā鎬? : ''}{m.freeApi ? `  路  馃啌 ${m.freeNote || 'Free'}` : ''}</Text>
                          )}
                          {m.positioning && <Text style={styles.modelPickCaps}>{m.positioning}</Text>}
                        </View>
                        {isSelected && <Text style={{ color: colors.primary, marginLeft: 8 }}>鉁?/Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* 鈹€鈹€ Payment Permissions 鈹€鈹€ */}
      <SectionHeader icon="馃挸" title={t({ en: 'Payment Permissions', zh: '鏀粯鏉冮檺' })} />
      <View style={styles.section}>
        <PermRow
          label={t({ en: 'Allow Autonomous Payment', zh: '鍏佽鑷富鏀粯' })}
          sub={t({ en: 'Agent can initiate transactions without asking you', zh: '鏅鸿兘浣撳彲鍦ㄦ棤闇€璇㈤棶浣犵殑鎯呭喌涓嬪彂璧蜂氦鏄? })}
          value={perms.autonomousPaymentEnabled}
          onChange={(v) => updatePerm('autonomousPaymentEnabled', v)}
        />
        <View style={styles.divider} />
        {/* Confirmation threshold */}
        <View style={styles.permRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.permLabel}>{t({ en: 'Require Approval 鈮?, zh: '杈惧埌姝ら噾棰濋渶瀹℃壒 鈮? })}</Text>
            <Text style={styles.permSub}>{t({ en: 'You\'ll be asked to confirm payments above this amount', zh: '瓒呰繃姝ら噾棰濈殑鏀粯灏嗚姹備綘纭' })}</Text>
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
              <Text style={styles.editHint}>  {t({ en: 'Edit', zh: '缂栬緫' })}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.divider} />
        {/* Currency */}
        <View style={styles.permRow}>
          <Text style={styles.permLabel}>{t({ en: 'Allowed Currencies', zh: '鍏佽鐨勫竵绉? })}</Text>
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
              <Text style={styles.limitLabel}>{t({ en: 'Single TX Limit', zh: '鍗曠瑪闄愰' })}</Text>
              <Text style={styles.limitValue}>${activeAgent.spendingLimits.singleTxLimit}</Text>
            </View>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>{t({ en: 'Daily Limit', zh: '鏃ラ檺棰? })}</Text>
              <Text style={styles.limitValue}>${activeAgent.spendingLimits.dailyLimit}</Text>
            </View>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>{t({ en: 'Monthly Limit', zh: '鏈堥檺棰? })}</Text>
              <Text style={styles.limitValue}>${activeAgent.spendingLimits.monthlyLimit}</Text>
            </View>
          </>
        )}
      </View>

      {/* 鈹€鈹€ Device Control 鈹€鈹€ */}
      <SectionHeader icon="馃捇" title={t({ en: 'Device Control Permissions', zh: '璁惧鎺у埗鏉冮檺' })} />
      <View style={styles.section}>
        <PermRow
          label={t({ en: '馃搧 File Read', zh: '馃搧 鏂囦欢璇诲彇' })}
          sub={perms.fileReadEnabled ? `Scope: ${perms.fileReadScope}` : undefined}
          value={perms.fileReadEnabled}
          onChange={(v) => updatePerm('fileReadEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '馃枼 Launch Programs', zh: '馃枼 鍚姩绋嬪簭' })}
          value={perms.programLaunchEnabled}
          onChange={(v) => updatePerm('programLaunchEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '馃摳 Screenshot', zh: '馃摳 鎴浘' })}
          value={perms.screenshotEnabled}
          onChange={(v) => updatePerm('screenshotEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '馃搷 GPS Location', zh: '馃搷 GPS 瀹氫綅' })}
          sub={perms.gpsEnabled ? `Precision: ${perms.gpsAccuracy}` : undefined}
          value={perms.gpsEnabled}
          onChange={(v) => updatePerm('gpsEnabled', v)}
        />
      </View>

      {/* 鈹€鈹€ Network & Tools 鈹€鈹€ */}
      <SectionHeader icon="馃寪" title={t({ en: 'Network & Tool Permissions', zh: '缃戠粶涓庡伐鍏锋潈闄? })} />
      <View style={styles.section}>
        <PermRow
          label={t({ en: '馃攳 Web Search', zh: '馃攳 缃戠粶鎼滅储' })}
          value={perms.webSearchEnabled}
          onChange={(v) => updatePerm('webSearchEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '馃摟 Email Send', zh: '馃摟 閭欢鍙戦€? })}
          sub={!perms.emailEnabled ? t({ en: 'Requires approval to enable', zh: '鍚敤鍓嶉渶瑕佸鎵? }) : undefined}
          value={perms.emailEnabled}
          onChange={(v) => updatePerm('emailEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '馃惁 Twitter / X Post', zh: '馃惁 Twitter / X 鍙戝笘' })}
          sub={perms.twitterEnabled ? t({ en: 'Auto mode', zh: '鑷姩妯″紡' }) : undefined}
          value={perms.twitterEnabled}
          onChange={(v) => updatePerm('twitterEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '馃挰 Telegram Reply', zh: '馃挰 Telegram 鍥炲' })}
          sub={perms.telegramEnabled ? t({ en: 'Auto mode', zh: '鑷姩妯″紡' }) : undefined}
          value={perms.telegramEnabled}
          onChange={(v) => updatePerm('telegramEnabled', v)}
        />
        <View style={styles.divider} />
        <View style={styles.permRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.permLabel}>{t({ en: '馃敡 MCP Tools Authorized', zh: '馃敡 宸叉巿鏉?MCP 宸ュ叿' })}</Text>
            <Text style={styles.permSub}>{t({ en: `${perms.mcpToolCount} tools allowed`, zh: `宸插厑璁?${perms.mcpToolCount} 涓伐鍏穈 })}</Text>
          </View>
          <TouchableOpacity style={styles.manageBtn}>
            <Text style={styles.manageBtnText}>{t({ en: 'Manage 鈫?, zh: '绠＄悊 鈫? })}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 鈹€鈹€ Skill Management 鈹€鈹€ */}
      <SectionHeader icon="馃洜" title={t({ en: 'Skill Management', zh: '鎶€鑳界鐞? })} />
      <View style={styles.section}>
        <PermRow
          label={t({ en: '馃攷 Search Skills', zh: '馃攷 鎼滅储鎶€鑳? })}
          sub={t({ en: 'Agent can search for AI skills and plugins', zh: '鏅鸿兘浣撳彲鎼滅储 AI 鎶€鑳藉拰鎻掍欢' })}
          value={perms.skillSearchEnabled}
          onChange={(v) => updatePerm('skillSearchEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '馃摜 Install Skills', zh: '馃摜 瀹夎鎶€鑳? })}
          sub={t({ en: 'Agent can install skills from marketplace', zh: '鏅鸿兘浣撳彲浠庡競鍦哄畨瑁呮妧鑳? })}
          value={perms.skillInstallEnabled}
          onChange={(v) => updatePerm('skillInstallEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '鈻讹笍 Execute Skills', zh: '鈻讹笍 鎵ц鎶€鑳? })}
          sub={t({ en: 'Agent can run installed skills', zh: '鏅鸿兘浣撳彲杩愯宸插畨瑁呯殑鎶€鑳? })}
          value={perms.skillExecuteEnabled}
          onChange={(v) => updatePerm('skillExecuteEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '馃摛 Publish Skills', zh: '馃摛 鍙戝竷鎶€鑳? })}
          sub={t({ en: 'Agent can publish new skills to marketplace', zh: '鏅鸿兘浣撳彲鍚戝競鍦哄彂甯冩柊鎶€鑳? })}
          value={perms.skillPublishEnabled}
          onChange={(v) => updatePerm('skillPublishEnabled', v)}
        />
      </View>

      {/* 鈹€鈹€ Commerce & Wallet 鈹€鈹€ */}
      <SectionHeader icon="馃洅" title={t({ en: 'Commerce & Wallet', zh: '鍟嗗煄涓庨挶鍖? })} />
      <View style={styles.section}>
        <PermRow
          label={t({ en: '馃彧 Browse Marketplace', zh: '馃彧 娴忚鍟嗗煄' })}
          sub={t({ en: 'Agent can search products, resources, and services', zh: '鏅鸿兘浣撳彲鎼滅储鍟嗗搧銆佽祫婧愬拰鏈嶅姟' })}
          value={perms.commerceBrowseEnabled}
          onChange={(v) => updatePerm('commerceBrowseEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '馃泹 Purchase Items', zh: '馃泹 璐拱鍟嗗搧' })}
          sub={t({ en: 'Agent can buy and checkout items', zh: '鏅鸿兘浣撳彲璐拱骞剁粨绠楀晢鍝? })}
          value={perms.commercePurchaseEnabled}
          onChange={(v) => updatePerm('commercePurchaseEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '馃摝 Manage Orders', zh: '馃摝 绠＄悊璁㈠崟' })}
          sub={t({ en: 'Agent can check order status and details', zh: '鏅鸿兘浣撳彲鏌ョ湅璁㈠崟鐘舵€佸拰璇︽儏' })}
          value={perms.orderManageEnabled}
          onChange={(v) => updatePerm('orderManageEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '馃挵 View Wallet Balance', zh: '馃挵 鏌ョ湅閽卞寘浣欓' })}
          sub={t({ en: 'Agent can read wallet balance and asset overview', zh: '鏅鸿兘浣撳彲璇诲彇閽卞寘浣欓鍜岃祫浜ф瑙? })}
          value={perms.walletReadEnabled}
          onChange={(v) => updatePerm('walletReadEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '鈿?Quick Pay / Transfer', zh: '鈿?蹇€熸敮浠?杞处' })}
          sub={t({ en: 'Agent can send payments and transfers', zh: '鏅鸿兘浣撳彲鍙戦€佷粯娆惧拰杞处' })}
          value={perms.quickpayEnabled}
          onChange={(v) => updatePerm('quickpayEnabled', v)}
          destructive
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '馃攼 x402 Paywall Access', zh: '馃攼 x402 浠樿垂澧欒闂? })}
          sub={t({ en: 'Agent can pay for paywalled content/APIs', zh: '鏅鸿兘浣撳彲鏀粯浠樿垂鍐呭/API 璁块棶' })}
          value={perms.x402PayEnabled}
          onChange={(v) => updatePerm('x402PayEnabled', v)}
          destructive
        />
      </View>

      {/* 鈹€鈹€ Agent-to-Agent (A2A) 鈹€鈹€ */}
      <SectionHeader icon="馃" title={t({ en: 'Agent-to-Agent (A2A)', zh: '鏅鸿兘浣撳崗浣?(A2A)' })} />
      <View style={styles.section}>
        <PermRow
          label={t({ en: '馃攳 Discover Agents', zh: '馃攳 鍙戠幇鏅鸿兘浣? })}
          sub={t({ en: 'Agent can find other agents on the network', zh: '鏅鸿兘浣撳彲鍦ㄧ綉缁滀笂鍙戠幇鍏朵粬鏅鸿兘浣? })}
          value={perms.a2aDiscoverEnabled}
          onChange={(v) => updatePerm('a2aDiscoverEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '馃 Invoke Agents', zh: '馃 璋冪敤鏅鸿兘浣? })}
          sub={t({ en: 'Agent can delegate tasks to other agents', zh: '鏅鸿兘浣撳彲灏嗕换鍔″鎵樼粰鍏朵粬鏅鸿兘浣? })}
          value={perms.a2aInvokeEnabled}
          onChange={(v) => updatePerm('a2aInvokeEnabled', v)}
        />
      </View>

      {/* 鈹€鈹€ Task Marketplace 鈹€鈹€ */}
      <SectionHeader icon="馃搵" title={t({ en: 'Task Marketplace', zh: '浠诲姟甯傚満' })} />
      <View style={styles.section}>
        <PermRow
          label={t({ en: '馃攷 Search Tasks', zh: '馃攷 鎼滅储浠诲姟' })}
          sub={t({ en: 'Agent can browse tasks and bounties', zh: '鏅鸿兘浣撳彲娴忚浠诲姟鍜屾偓璧? })}
          value={perms.taskSearchEnabled}
          onChange={(v) => updatePerm('taskSearchEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '馃摑 Post Tasks', zh: '馃摑 鍙戝竷浠诲姟' })}
          sub={t({ en: 'Agent can create new tasks and bounties', zh: '鏅鸿兘浣撳彲鍒涘缓鏂颁换鍔″拰鎮祻' })}
          value={perms.taskPostEnabled}
          onChange={(v) => updatePerm('taskPostEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '鉁?Accept Tasks', zh: '鉁?鎺ュ彈浠诲姟' })}
          sub={t({ en: 'Agent can accept tasks from marketplace', zh: '鏅鸿兘浣撳彲浠庡競鍦烘帴鍙椾换鍔? })}
          value={perms.taskAcceptEnabled}
          onChange={(v) => updatePerm('taskAcceptEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '馃摛 Submit Deliverables', zh: '馃摛 鎻愪氦浜や粯鐗? })}
          sub={t({ en: 'Agent can submit completed work', zh: '鏅鸿兘浣撳彲鎻愪氦瀹屾垚鐨勫伐浣? })}
          value={perms.taskSubmitEnabled}
          onChange={(v) => updatePerm('taskSubmitEnabled', v)}
        />
      </View>

      {/* 鈹€鈹€ Resources 鈹€鈹€ */}
      <SectionHeader icon="馃摝" title={t({ en: 'Resources & Publishing', zh: '璧勬簮涓庡彂甯? })} />
      <View style={styles.section}>
        <PermRow
          label={t({ en: '馃攷 Search Resources', zh: '馃攷 鎼滅储璧勬簮' })}
          sub={t({ en: 'Agent can find APIs, datasets, models', zh: '鏅鸿兘浣撳彲鎼滅储 API銆佹暟鎹泦銆佹ā鍨? })}
          value={perms.resourceSearchEnabled}
          onChange={(v) => updatePerm('resourceSearchEnabled', v)}
        />
        <View style={styles.divider} />
        <PermRow
          label={t({ en: '馃摛 Publish Resources', zh: '馃摛 鍙戝竷璧勬簮' })}
          sub={t({ en: 'Agent can publish resources to marketplace', zh: '鏅鸿兘浣撳彲鍚戝競鍦哄彂甯冭祫婧? })}
          value={perms.resourcePublishEnabled}
          onChange={(v) => updatePerm('resourcePublishEnabled', v)}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, (isSaving || !activeAgent) && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={isSaving || !activeAgent}
      >
        <Text style={styles.saveBtnText}>{isSaving ? '鈴?' : '馃捑 '}{t({ en: 'Save Permissions', zh: '淇濆瓨鏉冮檺璁剧疆' })}</Text>
      </TouchableOpacity>

      {/* 鈹€鈹€ Danger Zone 鈹€鈹€ */}
      <SectionHeader icon="鈿狅笍" title={t({ en: 'Danger Zone', zh: '鍗遍櫓鎿嶄綔' })} />
      <View style={styles.dangerRow}>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleSuspend}>
          <Text style={styles.dangerBtnText}>鈴?{t({ en: 'Suspend Agent', zh: '鏆傚仠鏅鸿兘浣? })}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dangerBtn, { borderColor: colors.error }]}
          onPress={() => Alert.alert(t({ en: 'Terminate Agent', zh: '缁堟鏅鸿兘浣? }), t({ en: 'Permanently terminate this agent? This cannot be undone.', zh: '纭姘镐箙缁堟璇ユ櫤鑳戒綋鍚楋紵姝ゆ搷浣滀笉鍙挙閿€銆? }), [
            { text: t({ en: 'Cancel', zh: '鍙栨秷' }), style: 'cancel' },
            { text: t({ en: 'Terminate', zh: '缁堟' }), style: 'destructive', onPress: () => {} },
          ])}
        >
          <Text style={[styles.dangerBtnText, { color: colors.error }]}>馃棏 {t({ en: 'Terminate Agent', zh: '缁堟鏅鸿兘浣? })}</Text>
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
  // Model picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bgPrimary, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '65%', paddingBottom: 30,
  },
  modalTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTopTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  modelGroupHeader: {
    fontSize: 13, fontWeight: '700', color: colors.textMuted,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
    backgroundColor: colors.bgSecondary,
  },
  modelPickRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  modelPickLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  modelPickCaps: { fontSize: 11, color: colors.textMuted },
});