import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import { getInstanceSkills, restartInstance } from '../../services/openclaw.service';
import type { AgentStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AgentStackParamList, 'AgentConsole'>;

const STATUS_COLOR = {
  active: colors.success,
  disconnected: colors.textMuted,
  error: colors.error,
};

export function AgentConsoleScreen() {
  const navigation = useNavigation<Nav>();
  const activeInstance = useAuthStore((s) => s.activeInstance);
  const instances = useAuthStore((s) => s.user?.openClawInstances ?? []);
  const { setActiveInstance } = useAuthStore.getState();
  const [tab, setTab] = useState<'overview' | 'skills' | 'tasks'>('overview');

  const { data: skills, refetch, isLoading } = useQuery({
    queryKey: ['instance-skills', activeInstance?.id],
    queryFn: () => getInstanceSkills(activeInstance!.id),
    enabled: !!activeInstance,
  });

  const handleRestart = async () => {
    if (!activeInstance) return;
    Alert.alert('Restart Agent', 'Restart your OpenClaw instance?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restart', style: 'destructive', onPress: async () => {
          try {
            await restartInstance(activeInstance.id);
            Alert.alert('', 'Agent restarting...');
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to restart');
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
        <Text style={styles.emptySub}>Connect or deploy an OpenClaw instance to get started.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('OpenClawBind')}>
          <Text style={styles.primaryBtnText}>Connect OpenClaw →</Text>
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
            <Text style={styles.instanceUrl} numberOfLines={1}>{activeInstance.instanceUrl}</Text>
          </View>
        </View>
        <View style={styles.statusActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleRestart}>
            <Text style={styles.iconBtnText}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('OpenClawBind')}
          >
            <Text style={styles.iconBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
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
      </View>

      {/* Big Chat CTA */}
      {tab === 'overview' && (
        <>
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
              <Text style={styles.statValue} style={{ color: STATUS_COLOR[activeInstance.status] }}>
                {activeInstance.status.toUpperCase()}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{activeInstance.deployType}</Text>
              <Text style={styles.statLabel}>Type</Text>
            </View>
          </View>
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
  skillsSection: { gap: 10 },
  emptySection: { alignItems: 'center', padding: 32, gap: 12 },
  emptySectionText: { fontSize: 15, color: colors.textSecondary },
  emptySectionSub: { fontSize: 13, color: colors.textMuted },
  skillRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 12, padding: 14, gap: 12, borderWidth: 1, borderColor: colors.border },
  skillEmoji: { fontSize: 24 },
  skillName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  skillSub: { fontSize: 12, color: colors.textMuted },
  skillStatus: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.bgSecondary, borderRadius: 6 },
});
