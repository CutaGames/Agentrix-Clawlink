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

type CapType = 'tool' | 'hook' | 'channel' | 'service';

interface OwnedCapability {
  type: CapType;
  name: string;
  pluginId: string;
  pluginName: string;
  config: Record<string, any>;
}

interface RuntimeSnapshot {
  tools: OwnedCapability[];
  hooks: OwnedCapability[];
  channels: OwnedCapability[];
  services: OwnedCapability[];
}

const TAB_META: { key: CapType; emoji: string; label: { en: string; zh: string } }[] = [
  { key: 'tool', emoji: '馃敡', label: { en: 'Tools', zh: '宸ュ叿' } },
  { key: 'hook', emoji: '馃獫', label: { en: 'Hooks', zh: '閽╁瓙' } },
  { key: 'channel', emoji: '馃摗', label: { en: 'Channels', zh: '閫氶亾' } },
  { key: 'service', emoji: '鈿欙笍', label: { en: 'Services', zh: '鏈嶅姟' } },
];

export function PluginHubScreen() {
  const { t } = useI18n();
  const token = useAuthStore((s) => s.token);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<CapType>('tool');
  const [loading, setLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);

  const fetchSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || 'https://agentrix.top'}/plugin-owned/snapshot`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        setSnapshot(await res.json());
      }
    } catch (err: any) {
      console.warn('Plugin snapshot fetch failed:', err.message);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  const rebuild = async () => {
    setRebuilding(true);
    try {
      await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || 'https://agentrix.top'}/plugin-owned/rebuild`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      await fetchSnapshot();
    } catch {}
    setRebuilding(false);
  };

  const getList = (): OwnedCapability[] => {
    if (!snapshot) return [];
    switch (activeTab) {
      case 'tool': return snapshot.tools;
      case 'hook': return snapshot.hooks;
      case 'channel': return snapshot.channels;
      case 'service': return snapshot.services;
    }
  };

  const renderCapability = ({ item }: { item: OwnedCapability }) => (
    <View style={styles.capCard}>
      <View style={styles.capHeader}>
        <Text style={styles.capName}>{item.name}</Text>
        <Text style={styles.capPlugin}>馃摝 {item.pluginName}</Text>
      </View>
      {item.config?.description && (
        <Text style={styles.capDesc}>{item.config.description}</Text>
      )}
    </View>
  );

  const total = snapshot
    ? snapshot.tools.length + snapshot.hooks.length + snapshot.channels.length + snapshot.services.length
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Stats banner */}
      <View style={styles.statsBanner}>
        <Text style={styles.statsText}>
          {t({ en: 'Plugin Runtime', zh: '鎻掍欢杩愯鏃? })} 鈥?{total} {t({ en: 'capabilities', zh: '鑳藉姏' })}
        </Text>
        <TouchableOpacity style={styles.rebuildBtn} onPress={rebuild} disabled={rebuilding}>
          {rebuilding ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={styles.rebuildBtnText}>馃攧 {t({ en: 'Rebuild', zh: '閲嶅缓' })}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TAB_META.map((tab) => {
          const count = snapshot?.[`${tab.key}s` as keyof RuntimeSnapshot]?.length ?? 0;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}>
              <Text style={styles.tabEmoji}>{tab.emoji}</Text>
              <Text style={styles.tabLabel}>{t(tab.label)} ({count})</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Capability list */}
      <FlatList
        data={getList()}
        keyExtractor={(item, idx) => `${item.pluginId}-${item.name}-${idx}`}
        renderItem={renderCapability}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchSnapshot} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {t({ en: 'No capabilities found. Install plugins to add tools.', zh: '鏆傛棤鑳藉姏銆傚畨瑁呮彃浠舵潵娣诲姞宸ュ叿銆? })}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  statsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statsText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  rebuildBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,212,255,0.1)',
  },
  rebuildBtnText: { color: colors.accent, fontSize: 12 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 8, gap: 4, paddingVertical: 8 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.bgCard,
  },
  tabActive: { backgroundColor: 'rgba(0,212,255,0.1)', borderWidth: 1, borderColor: colors.accent },
  tabEmoji: { fontSize: 16 },
  tabLabel: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  capCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  capHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  capPlugin: { color: colors.textMuted, fontSize: 11 },
  capDesc: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },
});