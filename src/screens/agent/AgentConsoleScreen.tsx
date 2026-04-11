import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import { getInstanceSkills, restartInstance, getStorageInfo } from '../../services/openclaw.service';
import { fetchQuotaStatus, PLAN_LABEL, PLAN_COLOR } from '../../services/token-quota.service';
import { apiFetch } from '../../services/api';
import type { AgentStackParamList } from '../../navigation/types';
import { TokenEnergyBar } from '../../components/TokenEnergyBar';
import { useSettingsStore, SUPPORTED_MODELS } from '../../stores/settingsStore';
import { SelectEngineModal } from '../../components/SelectEngineModal';
import { switchInstanceModel } from '../../services/openclaw.service';
import { useI18n } from '../../stores/i18nStore';

type Nav = NativeStackNavigationProp<AgentStackParamList, 'AgentConsole'>;

const LOCAL_ONLY_MODEL_IDS = new Set(['gemma-4-2b', 'gemma-4-4b', 'gemma-nano-2b', 'gemma-nano-2b-local']);

function isLocalOnlyModelId(modelId?: string | null) {
  return !!modelId && LOCAL_ONLY_MODEL_IDS.has(modelId);
}

const STATUS_COLOR: Record<string, string> = {
  active: colors.success,
  disconnected: colors.textMuted,
  error: colors.error ?? '#ef4444',
  unknown: '#6b7280',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'ACTIVE',
  disconnected: 'OFFLINE',
  error: 'ERROR',
  unknown: 'UNKNOWN',
};

export function AgentConsoleScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const activeInstance = useAuthStore((s) => s.activeInstance);
  const updateInstance = useAuthStore((s) => s.updateInstance);
  // NOTE: do NOT use `?? []` inside the selector 鈥?it creates a new array reference
  // every render and triggers an infinite re-render loop.
  const rawInstances = useAuthStore((s) => s.user?.openClawInstances);
  const instances = rawInstances ?? [];
  const { setActiveInstance } = useAuthStore.getState();
  const [tab, setTab] = useState<'overview' | 'skills' | 'tasks' | 'permissions'>('overview');
  const selectedModelId = useSettingsStore((s) => s.selectedModelId);
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel);
  const uiComplexity = useSettingsStore((s) => s.uiComplexity);
  const [showEngineModal, setShowEngineModal] = useState(false);
  const [dynamicModels, setDynamicModels] = useState<Array<{ id: string; label: string }>>([]);

  // Fetch dynamic model list from backend
  useEffect(() => {
    (async () => {
      try {
        const models = await apiFetch<Array<{ id: string; label: string }>>('/ai-providers/available-models');
        if (Array.isArray(models) && models.length > 0) {
          setDynamicModels(models);
        }
      } catch {}
    })();
  }, []);

  const currentEngineId = isLocalOnlyModelId(selectedModelId)
    ? selectedModelId
    : activeInstance?.resolvedModel || selectedModelId;
  const selectedModelLabel = dynamicModels.find((m) => m.id === currentEngineId)?.label
    ?? SUPPORTED_MODELS.find((m) => m.id === currentEngineId)?.label
    ?? currentEngineId;

  const { data: instanceSkillsRaw, refetch, isLoading } = useQuery({
    queryKey: ['instance-skills', activeInstance?.id],
    queryFn: () => getInstanceSkills(activeInstance!.id),
    enabled: !!activeInstance,
  });

  // Also fetch marketplace-installed skills from Agentrix DB
  const { data: marketInstalledRaw } = useQuery({
    queryKey: ['my-skills', activeInstance?.id],
    queryFn: () => apiFetch<any>('/skills/installed'),
    enabled: !!activeInstance,
    staleTime: 60_000,
  });

  // Merge instance skills + marketplace installed skills (dedupe by id/name)
  const skills = (() => {
    const list: any[] = [];
    const seen = new Set<string>();
    for (const s of (instanceSkillsRaw || [])) { if (!seen.has(s.id)) { seen.add(s.id); list.push(s); } }
    const mkt = marketInstalledRaw?.items || marketInstalledRaw?.data || marketInstalledRaw || [];
    for (const s of mkt) {
      const key = s.skill?.id || s.skillId || s.id;
      if (!seen.has(key)) { seen.add(key); list.push({ ...s, id: key, name: s.skill?.name || s.name, description: s.skill?.description || s.description, icon: s.skill?.icon || s.icon, enabled: true, _source: 'marketplace' }); }
    }
    return list;
  })();

  const { data: storageInfo } = useQuery({
    queryKey: ['storage-info', activeInstance?.id],
    queryFn: getStorageInfo,
    enabled: !!activeInstance,
    retry: 1,
    staleTime: 60_000,
  });

  const { data: quota } = useQuery({
    queryKey: ['token-quota', activeInstance?.id],
    queryFn: fetchQuotaStatus,
    enabled: !!activeInstance,
    retry: 1,
    staleTime: 60_000,
  });

  const handleRestart = async () => {
    if (!activeInstance) return;
    Alert.alert('Restart Agent', 'Restart your OpenClaw instance?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restart', style: 'destructive', onPress: async () => {
          try {
            await restartInstance(activeInstance.id);
            Alert.alert(t({ en: 'Success', zh: '鎴愬姛' }), t({ en: 'Agent restarting...', zh: '鏅鸿兘浣撴鍦ㄩ噸鍚€? }));
          } catch (e: any) {
            Alert.alert(t({ en: 'Restart Failed', zh: '閲嶅惎澶辫触' }), e?.message || t({ en: 'The agent server might be offline. Please try again later.', zh: '鏅鸿兘浣撴湇鍔″彲鑳芥殏鏃剁绾匡紝璇风◢鍚庨噸璇曘€? }));
          }
        }
      },
    ]);
  };

  if (!activeInstance) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>馃</Text>
        <Text style={styles.emptyTitle}>{t({ en: 'No Agent Connected', zh: '灏氭湭杩炴帴鏅鸿兘浣? })}</Text>
        <Text style={styles.emptySub}>{t({ en: 'Deploy or connect an OpenClaw instance to get started.', zh: '鍏堥儴缃叉垨杩炴帴涓€涓?OpenClaw 瀹炰緥鍗冲彲寮€濮嬨€? })}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('DeploySelect')}>
          <Text style={styles.primaryBtnText}>馃殌 {t({ en: 'Deploy / Connect Agent 鈫?, zh: '閮ㄧ讲 / 杩炴帴鏅鸿兘浣?鈫? })}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, marginTop: 8 }]} onPress={() => navigation.navigate('OpenClawBind')}>
          <Text style={[styles.primaryBtnText, { color: colors.textSecondary }]}>{t({ en: 'Connect existing OpenClaw', zh: '杩炴帴宸叉湁 OpenClaw' })}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      testID="agent-console-screen"
      accessibilityLabel="agent-console-screen"
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.accent} />}
    >
      {/* Instance Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusLeft}>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[activeInstance.status] }]} />
          <View>
            <Text style={styles.instanceName}>{activeInstance.name}</Text>
            <Text style={styles.instanceUrl} numberOfLines={1}>
                {activeInstance.deployType === 'cloud' ? t({ en: '鈽侊笍 Agentrix Cloud', zh: '鈽侊笍 Agentrix 浜戠' }) : 
                activeInstance.deployType === 'local' ? t({ en: '馃捇 Local Device', zh: '馃捇 鏈湴璁惧' }) : 
               activeInstance.instanceUrl}
            </Text>
          </View>
        </View>
        <View style={styles.statusActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleRestart}>
            <Text style={styles.iconBtnText}>馃攧</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('DeploySelect')}
          >
            <Text style={styles.iconBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Token Energy Bar */}
      <TokenEnergyBar />

      {/* Model Switcher */}
      <View style={styles.modelSwitcher}>
        <Text style={styles.modelLabel}>{t({ en: 'Current Engine:', zh: '褰撳墠寮曟搸锛? })}</Text>
        <TouchableOpacity 
          style={styles.modelSelector}
          onPress={() => setShowEngineModal(true)}
        >
          <Text style={styles.modelSelectorText}>{selectedModelLabel}</Text>
          <Text style={styles.modelSelectorArrow}>鈻?/Text>
        </TouchableOpacity>
      </View>

      {/* Multi-instance switcher */}
      {instances.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.instanceScroll}>
          {instances.map((inst) => (
            <TouchableOpacity
              key={inst.id}
              style={[styles.instanceChip, activeInstance.id === inst.id && styles.instanceChipActive]}
              onPress={() => setActiveInstance(inst.id)}
            >
              <View style={[styles.chipDot, { backgroundColor: STATUS_COLOR[inst.status] }]} />
              <Text style={[styles.chipText, activeInstance.id === inst.id && { color: colors.accent }]}>
                {inst.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Tab Bar */}
      <View style={styles.tabs}>
        {(['overview', 'skills', 'tasks'] as const).map((tabKey) => (
          <TouchableOpacity
            key={tabKey}
            style={[styles.tabBtn, tab === tabKey && styles.tabBtnActive]}
            onPress={() => setTab(tabKey)}
          >
            <Text style={[styles.tabText, tab === tabKey && styles.tabTextActive]}>
              {tabKey === 'overview'
                ? `馃搳 ${t({ en: 'Overview', zh: '姒傝' })}`
                : tabKey === 'skills'
                  ? `鈿?${t({ en: 'Skills', zh: '鎶€鑳? })}`
                  : `馃搵 ${t({ en: 'Tasks', zh: '浠诲姟' })}`}
            </Text>
          </TouchableOpacity>
        ))}
        {/* 4th tab: Permissions 鈥?visible in advanced/professional mode */}
        {(uiComplexity === 'advanced' || uiComplexity === 'professional') && (
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'permissions' && styles.tabBtnActive]}
            onPress={() => setTab('permissions')}
          >
            <Text style={[styles.tabText, tab === 'permissions' && styles.tabTextActive]}>馃攼 {t({ en: 'Perms', zh: '鏉冮檺' })}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Big Chat CTA */}
      {tab === 'overview' && (
        <>
          <TouchableOpacity
            testID="agent-console-chat-cta"
            accessibilityLabel="agent-console-chat-cta"
            style={styles.chatCta}
            onPress={() => navigation.navigate('AgentChat', { instanceId: activeInstance.id, instanceName: activeInstance.name })}
          >
            <Text style={styles.chatCtaEmoji}>馃挰</Text>
            <View>
              <Text style={styles.chatCtaTitle}>{t({ en: `Chat with ${activeInstance.name}`, zh: `涓?${activeInstance.name} 瀵硅瘽` })}</Text>
              <Text style={styles.chatCtaSub}>{t({ en: 'Start a conversation with your agent', zh: '绔嬪嵆寮€濮嬩笌浣犵殑鏅鸿兘浣撲氦娴? })}</Text>
            </View>
            <Text style={styles.chatCtaArrow}>鈥?/Text>
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{skills?.length ?? 0}</Text>
              <Text style={styles.statLabel}>{t({ en: 'Skills', zh: '鎶€鑳? })}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: STATUS_COLOR[activeInstance.status] ?? '#6b7280' }]}>
                {STATUS_LABEL[activeInstance.status] ?? activeInstance.status.toUpperCase()}
              </Text>
              <Text style={styles.statLabel}>{t({ en: 'Status', zh: '鐘舵€? })}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{activeInstance.deployType || '鈥?}</Text>
              <Text style={styles.statLabel}>{t({ en: 'Type', zh: '绫诲瀷' })}</Text>
            </View>
          </View>

          {/* Error instance hint */}
          {activeInstance.status === 'error' && (
            <View style={{ backgroundColor: '#ef444418', borderRadius: 12, padding: 12, marginTop: -8 }}>
              <Text style={{ color: '#f87171', fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
                {t({ en: '鈿狅笍 This instance encountered an error during provisioning.', zh: '鈿狅笍 璇ュ疄渚嬪湪閮ㄧ讲杩囩▼涓亣鍒颁簡閿欒銆? })}
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 12, lineHeight: 18 }}>
                {t({ en: 'Go to My Agents to clean up error instances, then deploy a new one.', zh: '璇峰墠寰€鈥滄垜鐨勬櫤鑳戒綋鈥濇竻鐞嗗紓甯稿疄渚嬶紝鐒跺悗閲嶆柊閮ㄧ讲銆? })}
              </Text>
            </View>
          )}

          {/* Storage Card */}
          <TouchableOpacity
            style={styles.storageCard}
            onPress={() => navigation.navigate('StoragePlan')}
            activeOpacity={0.8}
          >
            <View style={styles.storageCardHeader}>
              <Text style={styles.storageCardTitle}>
                馃捑 {storageInfo
                  ? `${storageInfo.usedGb.toFixed(1)} / ${storageInfo.totalGb} GB`
                  : '10 GB'} {t({ en: 'Storage', zh: '瀛樺偍' })}
              </Text>
              {storageInfo?.isGiftStorage && (
                <View style={styles.giftBadge}>
                  <Text style={styles.giftBadgeText}>馃巵 {t({ en: 'Free', zh: '鍏嶈垂' })}</Text>
                </View>
              )}
              <Text style={styles.storageCardArrow}>鈥?/Text>
            </View>
            <View style={styles.storageBar}>
              <View style={[styles.storageBarFill, {
                width: `${Math.min(storageInfo?.usedPercent ?? 2, 100)}%` as any,
                backgroundColor: (storageInfo?.usedPercent ?? 0) > 80 ? '#ef4444' : '#7c3aed',
              }]} />
            </View>
            <Text style={styles.storageCardSub}>
              {storageInfo
                ? t({ en: `${storageInfo.availableGb.toFixed(1)} GB available 路 Tap to manage`, zh: `鍙敤 ${storageInfo.availableGb.toFixed(1)} GB 路 鐐瑰嚮绠＄悊` })
                : t({ en: 'Upgrade for more storage', zh: '鍗囩骇浠ヨ幏寰楁洿澶氬瓨鍌? })}
            </Text>
          </TouchableOpacity>

          {/* 鈹€鈹€ Token Usage Card 鈹€鈹€ */}
          {quota && (
            <View style={styles.quotaCard}>
              <View style={styles.quotaHeader}>
                <Text style={styles.quotaTitle}>鈿?{t({ en: 'Token Usage', zh: 'Token 鐢ㄩ噺' })}</Text>
                <View style={[styles.planBadge, { backgroundColor: PLAN_COLOR[quota.planType] + '22' }]}>
                  <Text style={[styles.planBadgeText, { color: PLAN_COLOR[quota.planType] }]}>
                    {PLAN_LABEL[quota.planType]}
                  </Text>
                </View>
              </View>
              <View style={styles.quotaBarBg}>
                <View style={[styles.quotaBarFill, {
                  width: `${Math.min(quota.usagePercent, 100)}%` as any,
                  backgroundColor: quota.usagePercent > 85 ? '#ef4444' : quota.usagePercent > 60 ? '#f59e0b' : PLAN_COLOR[quota.planType],
                }]} />
              </View>
              <View style={styles.quotaStats}>
                <Text style={styles.quotaStat}>
                  {(quota.usedTokens / 1000).toFixed(0)}k / {(quota.totalQuota / 1000000).toFixed(1)}M tokens
                </Text>
                <Text style={styles.quotaStat}>{t({ en: `${quota.callCount} calls 路 ${quota.usagePercent.toFixed(1)}% used`, zh: `${quota.callCount} 娆¤皟鐢?路 宸蹭娇鐢?${quota.usagePercent.toFixed(1)}%` })}</Text>
              </View>
              {quota.quotaExhausted && (
                <View style={styles.quotaExhausted}>
                  <Text style={styles.quotaExhaustedText}>鈿狅笍 {t({ en: 'Quota exhausted 鈥?upgrade plan', zh: '棰濆害宸茬敤灏?鈥?璇峰崌绾у椁? })}</Text>
                </View>
              )}
            </View>
          )}

          {/* 鈹€鈹€ Quick Actions 鈹€鈹€ */}
          <View style={styles.quickActions}>
            {([
              { icon: '馃摲', label: t({ en: 'Scan QR', zh: '鎵竴鎵? }), route: 'Scan' as const },
              { icon: '馃搵', label: t({ en: 'Activity Logs', zh: '娲诲姩鏃ュ織' }), route: 'AgentLogs' as const },
              { icon: '馃捇', label: t({ en: 'Desktop Control', zh: '妗岄潰鎺у埗' }), route: 'DesktopControl' as const },
              { icon: '鈱?, label: t({ en: 'Wearables', zh: '鍙┛鎴磋澶? }), route: 'WearableHub' as const },
              { icon: '馃', label: t({ en: 'Memory Hub', zh: '璁板繂涓績' }), route: 'MemoryManagement' as const },
              { icon: '馃梼锔?, label: t({ en: 'Memory Slots', zh: '璁板繂妲? }), route: 'AgentMemory' as const },
              { icon: '馃攣', label: t({ en: 'ACP Sessions', zh: 'ACP 浼氳瘽' }), route: 'AcpSessions' as const },
              { icon: '鈿欙笍', label: t({ en: 'Workflows', zh: '宸ヤ綔娴? }), route: 'WorkflowList' as const },
              { icon: '馃洜锔?, label: t({ en: 'Agent Tools', zh: '绯荤粺宸ュ叿' }), route: 'AgentTools' as const },
              { icon: '锟?, label: t({ en: 'Dreaming', zh: '姊﹀寮曟搸' }), route: 'DreamingDashboard' as const },
              { icon: '馃З', label: t({ en: 'Plugin Hub', zh: '鎻掍欢涓績' }), route: 'PluginHub' as const },
              { icon: '馃摑', label: t({ en: 'Memory Wiki', zh: '璁板繂Wiki' }), route: 'MemoryWiki' as const },
              { icon: '馃攲', label: t({ en: 'MCP Manager', zh: 'MCP 绠＄悊' }), route: 'McpManager' as const },
              { icon: '锟金煈?, label: t({ en: 'Team Space', zh: '鍥㈤槦绌洪棿' }), route: 'TeamSpace' as const },
              { icon: '馃', label: t({ en: 'Agent Accounts', zh: '鏅鸿兘浣撹处鎴? }), route: 'AgentAccount' as const },
            ] as const).map((item) => (
              <TouchableOpacity
                key={item.route}
                style={styles.quickAction}
                onPress={() => navigation.navigate(
                  item.route as any,
                  'params' in item
                    ? item.params
                    : undefined,
                )}
                activeOpacity={0.7}
              >
                <Text style={styles.quickActionIcon}>{item.icon}</Text>
                <Text style={styles.quickActionLabel}>{item.label}</Text>
                <Text style={styles.quickActionArrow}>鈥?/Text>
              </TouchableOpacity>
            ))}
          </View>
        {/* 鈹€鈹€ Download Desktop App Banner 鈹€鈹€ */}
        <TouchableOpacity
          style={styles.downloadBanner}
          onPress={() => {
            Alert.alert(
              t({ en: '馃捇 Agentrix Desktop', zh: '馃捇 Agentrix 妗岄潰鐗? }),
              t({ en: 'Download the Agentrix Desktop app to control your computer with AI, run local agents, and sync with your mobile.', zh: '涓嬭浇 Agentrix 妗岄潰鐗堬紝鐢?AI 鎺у埗浣犵殑鐢佃剳銆佽繍琛屾湰鍦版櫤鑳戒綋锛屽苟涓庢墜鏈哄悓姝ャ€? }),
              [
                { text: t({ en: 'Cancel', zh: '鍙栨秷' }), style: 'cancel' },
                { text: t({ en: 'Download Standard (.exe)', zh: '涓嬭浇鏍囧噯鐗?(.exe)' }), onPress: () => {} },
                { text: t({ en: 'Download AIO (All-in-One)', zh: '涓嬭浇 AIO 涓€浣撶増' }), onPress: () => {} },
              ]
            );
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.downloadBannerIcon}>馃捇</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.downloadBannerTitle}>{t({ en: 'Get Agentrix Desktop', zh: '鑾峰彇 Agentrix 妗岄潰鐗? })}</Text>
            <Text style={styles.downloadBannerSub}>{t({ en: 'Run AI agents on your computer 鈥?one-click AIO installer available', zh: '鍦ㄤ綘鐨勭數鑴戜笂杩愯 AI 鏅鸿兘浣?鈥斺€?鏀寔涓€閿?AIO 瀹夎鍣? })}</Text>
          </View>
          <Text style={styles.downloadBannerArrow}>鈫?/Text>
        </TouchableOpacity>
        </>
      )}

      {/* Skills Tab */}
      {tab === 'skills' && (
        <View style={styles.skillsSection}>
          {(!skills || skills.length === 0) ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>{t({ en: 'No skills installed.', zh: '杩樻病鏈夊畨瑁呮妧鑳姐€? })}</Text>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate('SkillInstall', { skillId: '', skillName: '' })}
              >
                <Text style={styles.secondaryBtnText}>{t({ en: 'Browse Skill Market 鈫?, zh: '娴忚鎶€鑳藉競鍦?鈫? })}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            skills.map((skill: any) => (
              <View key={skill.id} style={styles.skillRow}>
                <Text style={styles.skillEmoji}>{skill.icon || '鈿?}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.skillName}>{skill.name}</Text>
                  <Text style={styles.skillSub}>{skill.description}</Text>
                </View>
                <View style={[styles.skillStatus, skill.enabled && { backgroundColor: colors.success + '22' }]}>
                  <Text style={{ fontSize: 11, color: skill.enabled ? colors.success : colors.textMuted }}>
                    {skill.enabled ? t({ en: 'ON', zh: '寮€' }) : t({ en: 'OFF', zh: '鍏? })}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {tab === 'tasks' && (
        <View style={styles.emptySection}>
          <Text style={styles.emptySectionText}>{t({ en: 'No recent tasks.', zh: '鏆傛棤鏈€杩戜换鍔°€? })}</Text>
          <Text style={styles.emptySectionSub}>{t({ en: 'Tasks triggered by your agent will appear here.', zh: '鐢变綘鐨勬櫤鑳戒綋瑙﹀彂鐨勪换鍔′細鏄剧ず鍦ㄨ繖閲屻€? })}</Text>
        </View>
      )}

      {/* Permissions Tab */}
      {tab === 'permissions' && (
        <View style={{ gap: 10 }}>
          <TouchableOpacity
            style={styles.permissionsCard}
            onPress={() => navigation.navigate('AgentPermissions', { agentAccountId: activeInstance.metadata?.agentAccountId })}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionsCardIcon}>馃攼</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.permissionsCardTitle}>{t({ en: 'Permissions & Security', zh: '鏉冮檺涓庡畨鍏? })}</Text>
              <Text style={styles.permissionsCardSub}>{t({ en: 'Manage payment limits, device access, network tools', zh: '绠＄悊鏀粯闄愰銆佽澶囪闂拰缃戠粶宸ュ叿鏉冮檺' })}</Text>
            </View>
            <Text style={styles.permissionsCardArrow}>鈥?/Text>
          </TouchableOpacity>
          {/* Quick summary rows */}
          {[
            { icon: '馃挸', label: t({ en: 'Autonomous Payment', zh: '鑷富鏀粯' }), status: t({ en: 'ON', zh: '寮€' }), color: colors.success },
            { icon: '馃攳', label: t({ en: 'Web Search', zh: '缃戠粶鎼滅储' }), status: t({ en: 'ON', zh: '寮€' }), color: colors.success },
            { icon: '馃搧', label: t({ en: 'File Read', zh: '鏂囦欢璇诲彇' }), status: t({ en: 'ON', zh: '寮€' }), color: colors.success },
            { icon: '馃摳', label: t({ en: 'Screenshot', zh: '鎴浘' }), status: t({ en: 'OFF', zh: '鍏? }), color: colors.textMuted },
            { icon: '馃摟', label: t({ en: 'Email Send', zh: '閭欢鍙戦€? }), status: t({ en: 'OFF', zh: '鍏? }), color: colors.textMuted },
          ].map((row) => (
            <View key={row.label} style={styles.permSummaryRow}>
              <Text style={styles.permSummaryIcon}>{row.icon}</Text>
              <Text style={styles.permSummaryLabel}>{row.label}</Text>
              <View style={[styles.permSummaryBadge, { backgroundColor: row.color + '22' }]}>
                <Text style={[styles.permSummaryBadgeText, { color: row.color }]}>{row.status}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 4 }]}
            onPress={() => navigation.navigate('AgentPermissions', { agentAccountId: activeInstance.metadata?.agentAccountId })}
          >
            <Text style={styles.primaryBtnText}>馃攼 {t({ en: 'Open Full Permissions Manager 鈫?, zh: '鎵撳紑瀹屾暣鏉冮檺绠＄悊鍣?鈫? })}</Text>
          </TouchableOpacity>
        </View>
      )}

      <SelectEngineModal 
        visible={showEngineModal} 
        onClose={() => setShowEngineModal(false)}
        selectedModelId={currentEngineId}
        onSelect={async (id) => {
          setSelectedModel(id);
          if (activeInstance?.id && !isLocalOnlyModelId(id)) {
            const nextLabel = dynamicModels.find((model) => model.id === id)?.label
              ?? SUPPORTED_MODELS.find((model) => model.id === id)?.label
              ?? id;
            updateInstance(activeInstance.id, {
              capabilities: {
                ...(activeInstance.capabilities || {}),
                activeModel: id,
                modelPinned: true,
              },
              resolvedModel: id,
              resolvedModelLabel: nextLabel,
            });
            try { await switchInstanceModel(activeInstance.id, id); } catch (_) {}
          }
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  empty: { flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  secondaryBtnText: { color: colors.accent, fontWeight: '600', fontSize: 14 },
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  statusLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  instanceName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  instanceUrl: { fontSize: 11, color: colors.textMuted, maxWidth: 200 },
  statusActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { backgroundColor: colors.bgSecondary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  iconBtnText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  modelSwitcher: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  modelLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  modelSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 6 },
  modelSelectorText: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  modelSelectorArrow: { fontSize: 10, color: colors.textMuted },
  instanceScroll: { marginHorizontal: -16, paddingHorizontal: 16 },
  instanceChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: colors.border, gap: 6 },
  instanceChipActive: { borderColor: colors.accent },
  chipDot: { width: 7, height: 7, borderRadius: 3.5 },
  chipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  tabs: { flexDirection: 'row', gap: 8 },
  tabBtn: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 10, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  tabBtnActive: { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
  tabText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.accent },
  chatCta: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '22', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary + '66', gap: 12 },
  chatCtaEmoji: { fontSize: 32 },
  chatCtaTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  chatCtaSub: { fontSize: 13, color: colors.textSecondary },
  chatCtaArrow: { fontSize: 24, color: colors.primary, marginLeft: 'auto' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  storageCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#7c3aed33',
    gap: 7,
  },
  storageCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  storageCardTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  storageCardArrow: { fontSize: 18, color: colors.textMuted },
  storageCardSub: { fontSize: 12, color: colors.textMuted },
  storageBar: {
    height: 6,
    backgroundColor: colors.bgSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  storageBarFill: { height: '100%', borderRadius: 3 },
  giftBadge: {
    backgroundColor: '#22c55e22',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  giftBadgeText: { fontSize: 11, fontWeight: '700', color: '#22c55e' },
  skillsSection: { gap: 10 },
  emptySection: { alignItems: 'center', padding: 32, gap: 12 },
  emptySectionText: { fontSize: 15, color: colors.textSecondary },
  emptySectionSub: { fontSize: 13, color: colors.textMuted },
  skillRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 12, padding: 14, gap: 12, borderWidth: 1, borderColor: colors.border },
  skillEmoji: { fontSize: 24 },
  skillName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  skillSub: { fontSize: 12, color: colors.textMuted },
  skillStatus: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.bgSecondary, borderRadius: 6 },
  // 鈹€鈹€ Token Quota 鈹€鈹€
  quotaCard: {
    backgroundColor: colors.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#2563eb33', gap: 8,
  },
  quotaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quotaTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  planBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  planBadgeText: { fontSize: 11, fontWeight: '700' },
  quotaBarBg: { height: 6, backgroundColor: colors.bgSecondary, borderRadius: 3, overflow: 'hidden' },
  quotaBarFill: { height: '100%', borderRadius: 3 },
  quotaStats: { flexDirection: 'row', justifyContent: 'space-between' },
  quotaStat: { fontSize: 11, color: colors.textMuted },
  quotaExhausted: {
    backgroundColor: '#ef444422', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#ef444440',
  },
  quotaExhaustedText: { fontSize: 12, color: '#ef4444', fontWeight: '600', textAlign: 'center' },
  // 鈹€鈹€ Quick Actions 鈹€鈹€
  quickActions: { gap: 8 },
  quickAction: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, gap: 12,
  },
  quickActionIcon: { fontSize: 20 },
  quickActionLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  quickActionArrow: { fontSize: 20, color: colors.textMuted },
  // 鈹€鈹€ Download Desktop Banner 鈹€鈹€
  downloadBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.accent + '44', gap: 12,
    marginTop: 4,
  },
  downloadBannerIcon: { fontSize: 26 },
  downloadBannerTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  downloadBannerSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  downloadBannerArrow: { fontSize: 22, color: colors.accent },
  // 鈹€鈹€ Permissions Tab 鈹€鈹€
  permissionsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#7c3aed44',
  },
  permissionsCardIcon: { fontSize: 28 },
  permissionsCardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  permissionsCardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  permissionsCardArrow: { fontSize: 22, color: colors.textMuted },
  permSummaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bgCard, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: colors.border,
  },
  permSummaryIcon: { fontSize: 18, width: 26 },
  permSummaryLabel: { flex: 1, fontSize: 14, color: colors.textPrimary },
  permSummaryBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  permSummaryBadgeText: { fontSize: 11, fontWeight: '700' },
});