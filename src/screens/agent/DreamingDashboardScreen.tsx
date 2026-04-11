import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../../stores/i18nStore';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';

type DreamPhase = 'light' | 'deep' | 'rem';
type DreamStatus = 'pending' | 'running' | 'completed' | 'failed';

interface DreamSession {
  id: string;
  phase: DreamPhase;
  status: DreamStatus;
  memoriesProcessed: number;
  insightsGenerated: number;
  insights: Array<{
    type: string;
    content: string;
    confidence: number;
    createdAt: string;
  }>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

const PHASES: { key: DreamPhase; emoji: string; label: { en: string; zh: string } }[] = [
  { key: 'light', emoji: '馃寵', label: { en: 'Light', zh: '娴呯湢' } },
  { key: 'deep', emoji: '馃寠', label: { en: 'Deep', zh: '娣辩湢' } },
  { key: 'rem', emoji: '鈿?, label: { en: 'REM', zh: 'REM' } },
];

const STATUS_EMOJI: Record<DreamStatus, string> = {
  pending: '鈴?,
  running: '馃挙',
  completed: '鉁?,
  failed: '鉂?,
};

export function DreamingDashboardScreen() {
  const { t } = useI18n();
  const token = useAuthStore((s) => s.token);
  const [sessions, setSessions] = useState<DreamSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [activePhase, setActivePhase] = useState<DreamPhase | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || 'https://agentrix.top'}/dreaming/sessions?limit=20`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err: any) {
      console.warn('Dream sessions fetch failed:', err.message);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const startDream = async (phase: DreamPhase) => {
    setStarting(true);
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || 'https://agentrix.top'}/dreaming/start`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phase, triggerType: 'manual' }),
        },
      );
      if (res.ok) {
        await fetchSessions();
      }
    } catch (err: any) {
      console.warn('Start dream failed:', err.message);
    }
    setStarting(false);
  };

  const renderInsight = (insight: DreamSession['insights'][0], idx: number) => (
    <View key={idx} style={styles.insightCard}>
      <Text style={styles.insightType}>
        {insight.type === 'pattern' ? '馃攳' : insight.type === 'consolidation' ? '馃摝' : insight.type === 'creative' ? '馃帹' : '馃敆'}{' '}
        {insight.type}
      </Text>
      <Text style={styles.insightContent}>{insight.content}</Text>
      <Text style={styles.insightConfidence}>
        {t({ en: 'Confidence', zh: '缃俊搴? })}: {Math.round(insight.confidence * 100)}%
      </Text>
    </View>
  );

  const renderSession = ({ item }: { item: DreamSession }) => (
    <View style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionPhase}>
          {PHASES.find((p) => p.key === item.phase)?.emoji} {item.phase.toUpperCase()}
        </Text>
        <Text style={styles.sessionStatus}>
          {STATUS_EMOJI[item.status]} {item.status}
        </Text>
      </View>
      <View style={styles.sessionStats}>
        <Text style={styles.statText}>
          馃 {item.memoriesProcessed} {t({ en: 'memories', zh: '璁板繂' })}
        </Text>
        <Text style={styles.statText}>
          馃挕 {item.insightsGenerated} {t({ en: 'insights', zh: '娲炲療' })}
        </Text>
      </View>
      {item.insights?.length > 0 && (
        <View style={styles.insightsList}>
          {item.insights.slice(0, 3).map((ins, idx) => renderInsight(ins, idx))}
        </View>
      )}
      <Text style={styles.sessionTime}>
        {new Date(item.createdAt).toLocaleString()}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Phase selector & trigger */}
      <View style={styles.phaseBar}>
        {PHASES.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.phaseTab, activePhase === p.key && styles.phaseTabActive]}
            onPress={() => setActivePhase(p.key)}>
            <Text style={styles.phaseEmoji}>{p.emoji}</Text>
            <Text style={styles.phaseLabel}>{t(p.label)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Start dream button */}
      <TouchableOpacity
        style={[styles.startBtn, starting && styles.startBtnDisabled]}
        onPress={() => activePhase && startDream(activePhase)}
        disabled={starting || !activePhase}>
        {starting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.startBtnText}>
            {activePhase
              ? t({ en: `Start ${activePhase} dream`, zh: `寮€濮?{PHASES.find(p => p.key === activePhase)?.label.zh}` })
              : t({ en: 'Select a phase', zh: '閫夋嫨闃舵' })}
          </Text>
        )}
      </TouchableOpacity>

      {/* Session list */}
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderSession}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchSessions} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {t({ en: 'No dream sessions yet. Start your first dream!', zh: '鏆傛棤姊﹀璁板綍锛屽紑濮嬩綘鐨勭涓€娆℃ⅵ澧冨惂锛? })}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  phaseBar: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, paddingTop: 8 },
  phaseTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  phaseTabActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(0,212,255,0.1)',
  },
  phaseEmoji: { fontSize: 20 },
  phaseLabel: { color: colors.text, fontSize: 12, marginTop: 2 },
  startBtn: {
    margin: 12,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  sessionCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sessionPhase: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  sessionStatus: { color: colors.textSecondary, fontSize: 13 },
  sessionStats: { flexDirection: 'row', gap: 16, marginBottom: 6 },
  statText: { color: colors.textSecondary, fontSize: 12 },
  insightsList: { marginTop: 6 },
  insightCard: {
    backgroundColor: 'rgba(0,212,255,0.06)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  insightType: { color: colors.accent, fontSize: 11, fontWeight: '600' },
  insightContent: { color: colors.text, fontSize: 12, marginTop: 2 },
  insightConfidence: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  sessionTime: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },
});