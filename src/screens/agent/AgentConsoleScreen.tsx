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

type Nav = NativeStackNavigationProp<AgentStackParamList, 'AgentConsole'>;

const STATUS_COLOR = {
  active: colors.success,
  disconnected: colors.textMuted,
  error: colors.error,
};

// ── Onboarding Checklist Card ─────────────────────────────────────
function OnboardingChecklist({ navigation }: { navigation: Nav }) {
  const { onboardingDeployedAgent, onboardingInstalledSkill, onboardingCreatedWorkflow, markOnboardingStep, setUiComplexity } =
    useSettingsStore();
  const steps = [
    { key: 'deployedAgent' as const, done: onboardingDeployedAgent, label: 'Deploy your first Agent', action: undefined, actionLabel: '' },
    { key: 'installedSkill' as const, done: onboardingInstalledSkill, label: 'Install your first Skill', action: () => navigation.navigate('SkillInstall', { skillId: '', skillName: '' }), actionLabel: 'Browse Market →' },
    { key: 'createdWorkflow' as const, done: onboardingCreatedWorkflow, label: 'Create your first Workflow', action: () => navigation.navigate('WorkflowList'), actionLabel: 'Create →' },
  ];
  const completedCount = steps.filter((s) => s.done).length;
  if (completedCount === 3) return null; // all done, hide card

  const handleComplete = (key: 'deployedAgent' | 'installedSkill' | 'createdWorkflow') => {
    markOnboardingStep(key);
    const newCount = completedCount + 1;
    if (newCount >= 2) setUiComplexity('advanced');
  };

  return (
    <View style={onboard.card}>
      <Text style={onboard.title}>🎯 Complete these steps to unlock Agent full power</Text>
      {steps.map((step, i) => (
        <View key={step.key} style={onboard.row}>
          <TouchableOpacity
            onPress={() => !step.done && handleComplete(step.key)}
            style={onboard.checkbox}
          >
            <Text style={{ fontSize: 16 }}>{step.done ? '✅' : '⬜'}</Text>
          </TouchableOpacity>
          <Text style={[onboard.stepLabel, step.done && onboard.stepDone]}>
            {i + 1}. {step.label}
          </Text>
          {!step.done && step.action && (
            <TouchableOpacity onPress={step.action} style={onboard.actionBtn}>
              <Text style={onboard.actionBtnText}>{step.actionLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <View style={onboard.progress}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[onboard.dot, i < completedCount && onboard.dotFilled]} />
        ))}
        <Text style={onboard.progressLabel}>{completedCount}/3 · {completedCount < 2 ? `${2 - completedCount} more to unlock Advanced mode` : 'Advanced mode unlocked! 🎉'}</Text>
      </View>
    </View>
  );
}

const onboard = StyleSheet.create({
  card: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.accent + '44', gap: 10 },
  title: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { paddingVertical: 2 },
  stepLabel: { flex: 1, fontSize: 14, color: colors.textPrimary },
  stepDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  actionBtn: { backgroundColor: colors.primary + '22', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  actionBtnText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.bgSecondary },
  dotFilled: { backgroundColor: colors.accent },
  progressLabel: { fontSize: 12, color: colors.textMuted, flex: 1 },
});

export function AgentConsoleScreen() {
  const navigation = useNavigation<Nav>();
  const activeInstance = useAuthStore((s) => s.activeInstance);
  // NOTE: do NOT use `?? []` inside the selector — it creates a new array reference
  // every render and triggers an infinite re-render loop.
  const rawInstances = useAuthStore((s) => s.user?.openClawInstances);
  const instances = rawInstances ?? [];
  const { setActiveInstance } = useAuthStore.getState();
  const [tab, setTab] = useState<'overview' | 'skills' | 'tasks' | 'permissions'>('overview');
  const selectedModelId = useSettingsStore((s) => s.selectedModelId);
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel);
  const uiComplexity = useSettingsStore((s) => s.uiComplexity);
  const selectedModelLabel = SUPPORTED_MODELS.find((m) => m.id === selectedModelId)?.label ?? selectedModelId;

  // Auto-mark onboarding step 1 when user has an active instance
  useEffect(() => {
    if (activeInstance) {
      useSettingsStore.getState().markOnboardingStep('deployedAgent');
    }
  }, [activeInstance?.id]);

  const { data: instanceSkillsRaw, refetch, isLoading } = useQuery({
    queryKey: ['instance-skills', activeInstance?.id],
    queryFn: () => getInstanceSkills(activeInstance!.id),
    enabled: !!activeInstance,
  });

  // Auto-mark onboarding step 2 when user has at least one skill
  useEffect(() => {
    if (instanceSkillsRaw && instanceSkillsRaw.length > 0) {
      useSettingsStore.getState().markOnboardingStep('installedSkill');
    }
  }, [instanceSkillsRaw?.length]);

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
            Alert.alert('Success', 'Agent restarting...');
          } catch (e: any) {
            Alert.alert('Restart Failed', e?.message || 'The agent server might be offline. Please try again later.');
          }
        }
      },
    ]);
  };

  if (!activeInstance) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🤖</Text>
        <Text style={styles.emptyTitle}>No Agent Connected</Text>
        <Text style={styles.emptySub}>Deploy or connect an OpenClaw instance to get started.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('DeploySelect')}>
          <Text style={styles.primaryBtnText}>🚀 Deploy / Connect Agent →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, marginTop: 8 }]} onPress={() => navigation.navigate('OpenClawBind')}>
          <Text style={[styles.primaryBtnText, { color: colors.textSecondary }]}>Connect existing OpenClaw</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
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
              {activeInstance.deployType === 'cloud' ? '☁️ Agentrix Cloud' : 
               activeInstance.deployType === 'local' ? '💻 Local Device' : 
               activeInstance.instanceUrl}
            </Text>
          </View>
        </View>
        <View style={styles.statusActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleRestart}>
            <Text style={styles.iconBtnText}>🔄</Text>
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
        <Text style={styles.modelLabel}>Current Engine:</Text>
        <TouchableOpacity 
          style={styles.modelSelector}
          onPress={() => {
            Alert.alert('Select Engine', 'Choose the AI model for your agent',
              [
                ...SUPPORTED_MODELS.map((m) => ({ text: m.label, onPress: () => setSelectedModel(m.id) })),
                { text: 'Cancel', style: 'cancel' as const },
              ]
            );
          }}
        >
          <Text style={styles.modelSelectorText}>{selectedModelLabel}</Text>
          <Text style={styles.modelSelectorArrow}>▼</Text>
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
        {(['overview', 'skills', 'tasks'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'overview' ? '📊 Overview' : t === 'skills' ? '⚡ Skills' : '📋 Tasks'}
            </Text>
          </TouchableOpacity>
        ))}
        {/* 4th tab: Permissions — visible in advanced/professional mode */}
        {(uiComplexity === 'advanced' || uiComplexity === 'professional') && (
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'permissions' && styles.tabBtnActive]}
            onPress={() => setTab('permissions')}
          >
            <Text style={[styles.tabText, tab === 'permissions' && styles.tabTextActive]}>🔐 Perms</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Big Chat CTA */}
      {tab === 'overview' && (
        <>
          {/* Onboarding Checklist */}
          <OnboardingChecklist navigation={navigation} />

          <TouchableOpacity
            style={styles.chatCta}
            onPress={() => navigation.navigate('AgentChat', { instanceId: activeInstance.id, instanceName: activeInstance.name })}
          >
            <Text style={styles.chatCtaEmoji}>💬</Text>
            <View>
              <Text style={styles.chatCtaTitle}>Chat with {activeInstance.name}</Text>
              <Text style={styles.chatCtaSub}>Start a conversation with your agent</Text>
            </View>
            <Text style={styles.chatCtaArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{skills?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Skills</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: STATUS_COLOR[activeInstance.status] }]}>
                {activeInstance.status.toUpperCase()}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{activeInstance.deployType}</Text>
              <Text style={styles.statLabel}>Type</Text>
            </View>
          </View>

          {/* Storage Card */}
          <TouchableOpacity
            style={styles.storageCard}
            onPress={() => navigation.navigate('StoragePlan')}
            activeOpacity={0.8}
          >
            <View style={styles.storageCardHeader}>
              <Text style={styles.storageCardTitle}>
                💾 {storageInfo
                  ? `${storageInfo.usedGb.toFixed(1)} / ${storageInfo.totalGb} GB`
                  : '10 GB'} Storage
              </Text>
              {storageInfo?.isGiftStorage && (
                <View style={styles.giftBadge}>
                  <Text style={styles.giftBadgeText}>🎁 Free</Text>
                </View>
              )}
              <Text style={styles.storageCardArrow}>›</Text>
            </View>
            <View style={styles.storageBar}>
              <View style={[styles.storageBarFill, {
                width: `${Math.min(storageInfo?.usedPercent ?? 2, 100)}%` as any,
                backgroundColor: (storageInfo?.usedPercent ?? 0) > 80 ? '#ef4444' : '#7c3aed',
              }]} />
            </View>
            <Text style={styles.storageCardSub}>
              {storageInfo
                ? `${storageInfo.availableGb.toFixed(1)} GB available · Tap to manage`
                : 'Upgrade for more storage'}
            </Text>
          </TouchableOpacity>

          {/* ── Token Usage Card ── */}
          {quota && (
            <View style={styles.quotaCard}>
              <View style={styles.quotaHeader}>
                <Text style={styles.quotaTitle}>⚡ Token Usage</Text>
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
                <Text style={styles.quotaStat}>{quota.callCount} calls · {quota.usagePercent.toFixed(1)}% used</Text>
              </View>
              {quota.quotaExhausted && (
                <View style={styles.quotaExhausted}>
                  <Text style={styles.quotaExhaustedText}>⚠️ Quota exhausted — upgrade plan</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Quick Actions ── */}
          <View style={styles.quickActions}>
            {([
              { icon: '📋', label: 'Activity Logs', route: 'AgentLogs' as const },
              { icon: '🧠', label: 'Memory Hub', route: 'MemoryManagement' as const },
              { icon: '⚙️', label: 'Workflows', route: 'WorkflowList' as const },
              { icon: '🎤', label: 'Voice Chat', route: 'VoiceChat' as const },
              { icon: '👥', label: 'Team Space', route: 'TeamSpace' as const },
              { icon: '🤖', label: 'Agent Accounts', route: 'AgentAccount' as const },
            ]).map((item) => (
              <TouchableOpacity
                key={item.route}
                style={styles.quickAction}
                onPress={() => navigation.navigate(item.route as any)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickActionIcon}>{item.icon}</Text>
                <Text style={styles.quickActionLabel}>{item.label}</Text>
                <Text style={styles.quickActionArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        {/* ── Download Desktop App Banner ── */}
        <TouchableOpacity
          style={styles.downloadBanner}
          onPress={() => {
            Alert.alert(
              '💻 Agentrix Desktop',
              'Download the Agentrix Desktop app to control your computer with AI, run local agents, and sync with your mobile.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Download Standard (.exe)', onPress: () => {} },
                { text: 'Download AIO (All-in-One)', onPress: () => {} },
              ]
            );
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.downloadBannerIcon}>💻</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.downloadBannerTitle}>Get Agentrix Desktop</Text>
            <Text style={styles.downloadBannerSub}>Run AI agents on your computer — one-click AIO installer available</Text>
          </View>
          <Text style={styles.downloadBannerArrow}>↓</Text>
        </TouchableOpacity>
        </>
      )}

      {/* Skills Tab */}
      {tab === 'skills' && (
        <View style={styles.skillsSection}>
          {(!skills || skills.length === 0) ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No skills installed.</Text>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate('SkillInstall', { skillId: '', skillName: '' })}
              >
                <Text style={styles.secondaryBtnText}>Browse Skill Market →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            skills.map((skill: any) => (
              <View key={skill.id} style={styles.skillRow}>
                <Text style={styles.skillEmoji}>{skill.icon || '⚡'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.skillName}>{skill.name}</Text>
                  <Text style={styles.skillSub}>{skill.description}</Text>
                </View>
                <View style={[styles.skillStatus, skill.enabled && { backgroundColor: colors.success + '22' }]}>
                  <Text style={{ fontSize: 11, color: skill.enabled ? colors.success : colors.textMuted }}>
                    {skill.enabled ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {tab === 'tasks' && (
        <View style={styles.emptySection}>
          <Text style={styles.emptySectionText}>No recent tasks.</Text>
          <Text style={styles.emptySectionSub}>Tasks triggered by your agent will appear here.</Text>
        </View>
      )}

      {/* Permissions Tab */}
      {tab === 'permissions' && (
        <View style={{ gap: 10 }}>
          <TouchableOpacity
            style={styles.permissionsCard}
            onPress={() => navigation.navigate('AgentPermissions', {})}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionsCardIcon}>🔐</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.permissionsCardTitle}>Permissions & Security</Text>
              <Text style={styles.permissionsCardSub}>Manage payment limits, device access, network tools</Text>
            </View>
            <Text style={styles.permissionsCardArrow}>›</Text>
          </TouchableOpacity>
          {/* Quick summary rows */}
          {[
            { icon: '💳', label: 'Autonomous Payment', status: 'ON', color: colors.success },
            { icon: '🔍', label: 'Web Search', status: 'ON', color: colors.success },
            { icon: '📁', label: 'File Read', status: 'ON', color: colors.success },
            { icon: '📸', label: 'Screenshot', status: 'OFF', color: colors.textMuted },
            { icon: '📧', label: 'Email Send', status: 'OFF', color: colors.textMuted },
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
            onPress={() => navigation.navigate('AgentPermissions', {})}
          >
            <Text style={styles.primaryBtnText}>🔐 Open Full Permissions Manager →</Text>
          </TouchableOpacity>
        </View>
      )}
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
  // ── Token Quota ──
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
  // ── Quick Actions ──
  quickActions: { gap: 8 },
  quickAction: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, gap: 12,
  },
  quickActionIcon: { fontSize: 20 },
  quickActionLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  quickActionArrow: { fontSize: 20, color: colors.textMuted },
  // ── Download Desktop Banner ──
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
  // ── Permissions Tab ──
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
