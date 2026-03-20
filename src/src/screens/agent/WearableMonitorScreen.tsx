import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { useI18n } from '../../stores/i18nStore';
import { apiFetch } from '../../services/api';
import { WearableDataCollectorService } from '../../services/wearables/wearableDataCollector.service';
import { WearableAutomationEngineService } from '../../services/wearables/wearableAutomationEngine.service';
import { WearablePairingStoreService } from '../../services/wearables/wearablePairingStore.service';
import {
  type AutomationRule,
  type CollectorState,
  type MonitoredChannel,
  type PairedWearableRecord,
  type TelemetryChannel,
  type TelemetrySample,
  type TriggerEvent,
} from '../../services/wearables/wearableTypes';

type ScreenTab = 'live' | 'rules' | 'history';

const CHANNEL_LABELS: Record<TelemetryChannel, { label: string; icon: string; unit: string }> = {
  heart_rate: { label: 'Heart Rate', icon: '♥', unit: 'bpm' },
  spo2: { label: 'SpO₂', icon: '○', unit: '%' },
  temperature: { label: 'Temperature', icon: '🌡', unit: '°C' },
  steps: { label: 'Steps', icon: '🚶', unit: '' },
  battery: { label: 'Battery', icon: '🔋', unit: '%' },
  accelerometer: { label: 'Accel', icon: '⟐', unit: '' },
  custom: { label: 'Custom', icon: '◆', unit: '' },
};

const DEFAULT_MONITORED_CHANNELS: MonitoredChannel[] = [
  {
    channel: 'heart_rate',
    serviceUuid: '180d',
    characteristicUuid: '2a37',
    label: 'Heart Rate',
    parser: 'heart_rate_measurement',
    intervalMs: 1000,
    enabled: true,
    lastValue: null,
    lastUpdatedAt: null,
  },
  {
    channel: 'battery',
    serviceUuid: '180f',
    characteristicUuid: '2a19',
    label: 'Battery',
    parser: 'battery_level',
    intervalMs: 5000,
    enabled: true,
    lastValue: null,
    lastUpdatedAt: null,
  },
  {
    channel: 'temperature',
    serviceUuid: '1809',
    characteristicUuid: '2a1c',
    label: 'Temperature',
    parser: 'temperature',
    intervalMs: 5000,
    enabled: true,
    lastValue: null,
    lastUpdatedAt: null,
  },
];

function buildCollectorChannels(device: PairedWearableRecord): MonitoredChannel[] {
  const supportsTemperature = device.kind === 'sensor' || device.serviceLabels.some((label) => /temp/i.test(label));

  return DEFAULT_MONITORED_CHANNELS
    .filter((channel) => supportsTemperature || channel.channel !== 'temperature')
    .map((channel) => ({ ...channel }));
}

export function WearableMonitorScreen() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<ScreenTab>('live');
  const [collectorState, setCollectorState] = useState<CollectorState | null>(null);
  const [recentSamples, setRecentSamples] = useState<TelemetrySample[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [triggerHistory, setTriggerHistory] = useState<TriggerEvent[]>([]);
  const [pairedDevices, setPairedDevices] = useState<PairedWearableRecord[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    void initialize();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const unsub = WearableDataCollectorService.onStateChange((state) => {
      if (mountedRef.current) setCollectorState(state);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = WearableDataCollectorService.onSample((sample) => {
      if (mountedRef.current) {
        setRecentSamples((prev) => [sample, ...prev].slice(0, 50));
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = WearableAutomationEngineService.onTrigger((event) => {
      if (mountedRef.current) {
        setTriggerHistory((prev) => [event, ...prev].slice(0, 100));
      }
    });
    return unsub;
  }, []);

  const initialize = async () => {
    const devices = await WearablePairingStoreService.list();
    if (!mountedRef.current) return;
    setPairedDevices(devices);
    if (devices.length > 0) {
      setSelectedDeviceId(devices[0].id);
    }
    await WearableAutomationEngineService.initialize();
    setRules(WearableAutomationEngineService.getRules());
    setTriggerHistory(WearableAutomationEngineService.getHistory());
  };

  const handleStartCollector = async () => {
    if (!selectedDeviceId) return;
    try {
      const device = pairedDevices.find((item) => item.id === selectedDeviceId);
      if (!device) {
        throw new Error('Selected device not found');
      }

      WearableDataCollectorService.configure(
        {
          deviceId: device.id,
          deviceName: device.name,
          channels: buildCollectorChannels(device),
          flushIntervalMs: 30_000,
          maxBufferSize: 50,
          reconnectMaxAttempts: 5,
          reconnectDelayMs: 3_000,
        },
        async (payload) => {
          await apiFetch('/wearable-telemetry/upload', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        },
      );

      await WearableDataCollectorService.start();
      WearableAutomationEngineService.start();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start collector');
    }
  };

  const handleStopCollector = () => {
    WearableDataCollectorService.stop();
    WearableAutomationEngineService.stop();
  };

  const handlePauseCollector = () => {
    WearableDataCollectorService.pause();
  };

  const handleResumeCollector = async () => {
    await WearableDataCollectorService.resume();
  };

  const handleAddTemplate = async (templateIndex: number) => {
    if (!selectedDeviceId) return;
    const templates = WearableAutomationEngineService.getTemplates();
    const template = templates[templateIndex];
    if (!template) return;
    await WearableAutomationEngineService.addRule({
      ...template.rule,
      deviceId: selectedDeviceId,
    });
    setRules(WearableAutomationEngineService.getRules());
  };

  const handleToggleRule = async (ruleId: string) => {
    await WearableAutomationEngineService.toggleRule(ruleId);
    setRules(WearableAutomationEngineService.getRules());
  };

  const handleDeleteRule = async (ruleId: string) => {
    Alert.alert(
      t({ en: 'Delete Rule', zh: '删除规则' }),
      t({ en: 'Are you sure?', zh: '确定删除？' }),
      [
        { text: t({ en: 'Cancel', zh: '取消' }), style: 'cancel' },
        {
          text: t({ en: 'Delete', zh: '删除' }),
          style: 'destructive',
          onPress: async () => {
            await WearableAutomationEngineService.deleteRule(ruleId);
            setRules(WearableAutomationEngineService.getRules());
          },
        },
      ],
    );
  };

  const handleAcknowledgeEvent = async (eventId: string) => {
    await WearableAutomationEngineService.acknowledgeEvent(eventId);
    setTriggerHistory(WearableAutomationEngineService.getHistory());
  };

  const unacknowledgedCount = useMemo(
    () => triggerHistory.filter((e) => !e.acknowledged).length,
    [triggerHistory],
  );

  const statusColor = useMemo(() => {
    switch (collectorState?.status) {
      case 'collecting': return colors.success;
      case 'connecting':
      case 'reconnecting': return colors.warning;
      case 'error': return colors.error;
      case 'paused': return '#8B8B8B';
      default: return colors.textMuted;
    }
  }, [collectorState?.status]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {t({ en: 'Wearable Monitor', zh: '穿戴设备监控' })}
        </Text>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>
          {collectorState?.status ?? 'idle'}
        </Text>
      </View>

      {/* Device Selector */}
      {pairedDevices.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deviceBar}>
          {pairedDevices.map((device) => (
            <TouchableOpacity
              key={device.id}
              onPress={() => setSelectedDeviceId(device.id)}
              style={[
                styles.deviceChip,
                selectedDeviceId === device.id && styles.deviceChipActive,
              ]}
            >
              <Text style={styles.deviceChipIcon}>
                {device.kind === 'ring' ? '◌' : device.kind === 'band' ? '▭' : '△'}
              </Text>
              <Text style={[
                styles.deviceChipText,
                selectedDeviceId === device.id && styles.deviceChipTextActive,
              ]}>
                {device.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Collector Controls */}
      <View style={styles.controls}>
        {(!collectorState || collectorState.status === 'idle' || collectorState.status === 'error') && (
          <TouchableOpacity style={styles.btnStart} onPress={handleStartCollector}>
            <Text style={styles.btnText}>▶ {t({ en: 'Start', zh: '开始' })}</Text>
          </TouchableOpacity>
        )}
        {collectorState?.status === 'collecting' && (
          <>
            <TouchableOpacity style={styles.btnPause} onPress={handlePauseCollector}>
              <Text style={styles.btnText}>⏸ {t({ en: 'Pause', zh: '暂停' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnStop} onPress={handleStopCollector}>
              <Text style={styles.btnText}>⏹ {t({ en: 'Stop', zh: '停止' })}</Text>
            </TouchableOpacity>
          </>
        )}
        {collectorState?.status === 'paused' && (
          <>
            <TouchableOpacity style={styles.btnStart} onPress={handleResumeCollector}>
              <Text style={styles.btnText}>▶ {t({ en: 'Resume', zh: '恢复' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnStop} onPress={handleStopCollector}>
              <Text style={styles.btnText}>⏹ {t({ en: 'Stop', zh: '停止' })}</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>
            {t({ en: 'Collected', zh: '已采集' })}: {collectorState?.samplesCollected ?? 0}
          </Text>
          <Text style={styles.statLabel}>
            {t({ en: 'Uploaded', zh: '已上传' })}: {collectorState?.samplesUploaded ?? 0}
          </Text>
          <Text style={styles.statLabel}>
            {t({ en: 'Buffer', zh: '缓冲' })}: {WearableDataCollectorService.getBufferSize()}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {([
          { key: 'live' as const, label: t({ en: 'Live Data', zh: '实时数据' }) },
          { key: 'rules' as const, label: t({ en: 'Rules', zh: '规则' }) },
          { key: 'history' as const, label: `${t({ en: 'Alerts', zh: '告警' })}${unacknowledgedCount > 0 ? ` (${unacknowledgedCount})` : ''}` },
        ]).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'live' && (
        <LiveDataTab
          collectorState={collectorState}
          recentSamples={recentSamples}
          t={t}
        />
      )}
      {activeTab === 'rules' && (
        <RulesTab
          rules={rules}
          onToggle={handleToggleRule}
          onDelete={handleDeleteRule}
          onAddTemplate={handleAddTemplate}
          t={t}
        />
      )}
      {activeTab === 'history' && (
        <HistoryTab
          events={triggerHistory}
          onAcknowledge={handleAcknowledgeEvent}
          t={t}
        />
      )}
    </View>
  );
}

// ── Live Data Tab ────────────────────────────────────────────────────────────

function LiveDataTab({
  collectorState,
  recentSamples,
  t,
}: {
  collectorState: CollectorState | null;
  recentSamples: TelemetrySample[];
  t: ReturnType<typeof useI18n>['t'];
}) {
  const channels = collectorState?.channels ?? [];

  return (
    <ScrollView style={styles.tabContent}>
      {/* Channel Cards */}
      {channels.length > 0 ? (
        <View style={styles.channelGrid}>
          {channels.filter((ch) => ch.enabled).map((ch) => {
            const meta = CHANNEL_LABELS[ch.channel] || CHANNEL_LABELS.custom;
            return (
              <View key={ch.characteristicUuid} style={styles.channelCard}>
                <Text style={styles.channelIcon}>{meta.icon}</Text>
                <Text style={styles.channelLabel}>{meta.label}</Text>
                <Text style={styles.channelValue}>
                  {ch.lastValue != null ? ch.lastValue.toFixed(1) : '--'}
                </Text>
                <Text style={styles.channelUnit}>{meta.unit}</Text>
                {ch.lastUpdatedAt && (
                  <Text style={styles.channelTime}>
                    {new Date(ch.lastUpdatedAt).toLocaleTimeString()}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📡</Text>
          <Text style={styles.emptyText}>
            {t({ en: 'No channels configured. Start the collector to begin monitoring.', zh: '暂无配置通道。启动采集器开始监控。' })}
          </Text>
        </View>
      )}

      {/* Recent Samples Feed */}
      <Text style={styles.sectionTitle}>
        {t({ en: 'Recent Samples', zh: '最近数据' })} ({recentSamples.length})
      </Text>
      {recentSamples.slice(0, 20).map((sample) => {
        const meta = CHANNEL_LABELS[sample.channel] || CHANNEL_LABELS.custom;
        return (
          <View key={sample.id} style={styles.sampleRow}>
            <Text style={styles.sampleIcon}>{meta.icon}</Text>
            <Text style={styles.sampleChannel}>{meta.label}</Text>
            <Text style={styles.sampleValue}>{sample.value.toFixed(1)} {sample.unit}</Text>
            <Text style={styles.sampleTime}>{new Date(sample.timestamp).toLocaleTimeString()}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── Rules Tab ────────────────────────────────────────────────────────────────

function RulesTab({
  rules,
  onToggle,
  onDelete,
  onAddTemplate,
  t,
}: {
  rules: AutomationRule[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddTemplate: (index: number) => void;
  t: ReturnType<typeof useI18n>['t'];
}) {
  const templates = WearableAutomationEngineService.getTemplates();

  return (
    <ScrollView style={styles.tabContent}>
      {/* Existing Rules */}
      <Text style={styles.sectionTitle}>
        {t({ en: 'Active Rules', zh: '已有规则' })} ({rules.length})
      </Text>

      {rules.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚡</Text>
          <Text style={styles.emptyText}>
            {t({ en: 'No automation rules yet. Add a template below.', zh: '暂无自动化规则。请从下方模板添加。' })}
          </Text>
        </View>
      ) : (
        rules.map((rule) => {
          const meta = CHANNEL_LABELS[rule.channel] || CHANNEL_LABELS.custom;
          return (
            <View key={rule.id} style={[styles.ruleCard, !rule.enabled && styles.ruleCardDisabled]}>
              <View style={styles.ruleHeader}>
                <Text style={styles.ruleIcon}>{meta.icon}</Text>
                <View style={styles.ruleInfo}>
                  <Text style={styles.ruleName}>{rule.name}</Text>
                  <Text style={styles.ruleCondition}>
                    {meta.label} {rule.condition} {rule.threshold}{rule.thresholdHigh != null ? `–${rule.thresholdHigh}` : ''} {meta.unit}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => onToggle(rule.id)} style={styles.ruleToggle}>
                  <View style={[styles.toggleTrack, rule.enabled && styles.toggleTrackOn]}>
                    <View style={[styles.toggleThumb, rule.enabled && styles.toggleThumbOn]} />
                  </View>
                </TouchableOpacity>
              </View>
              <View style={styles.ruleFooter}>
                <Text style={styles.ruleStats}>
                  {t({ en: 'Fired', zh: '触发' })}: {rule.triggerCount}x
                </Text>
                <TouchableOpacity onPress={() => onDelete(rule.id)}>
                  <Text style={styles.ruleDelete}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Template Library */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
        {t({ en: 'Rule Templates', zh: '规则模板' })}
      </Text>
      {templates.map((tmpl, idx) => (
        <TouchableOpacity key={idx} style={styles.templateCard} onPress={() => onAddTemplate(idx)}>
          <View style={styles.templateInfo}>
            <Text style={styles.templateName}>{tmpl.name}</Text>
            <Text style={styles.templateDesc}>{tmpl.description}</Text>
          </View>
          <Text style={styles.templateAdd}>＋</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({
  events,
  onAcknowledge,
  t,
}: {
  events: TriggerEvent[];
  onAcknowledge: (id: string) => void;
  t: ReturnType<typeof useI18n>['t'];
}) {
  return (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>
        {t({ en: 'Trigger History', zh: '触发历史' })} ({events.length})
      </Text>

      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>
            {t({ en: 'No trigger events yet.', zh: '暂无触发事件。' })}
          </Text>
        </View>
      ) : (
        events.map((ev) => {
          const meta = CHANNEL_LABELS[ev.channel] || CHANNEL_LABELS.custom;
          return (
            <View key={ev.id} style={[styles.triggerCard, !ev.acknowledged && styles.triggerCardNew]}>
              <View style={styles.triggerHeader}>
                <Text style={styles.triggerIcon}>{meta.icon}</Text>
                <View style={styles.triggerInfo}>
                  <Text style={styles.triggerName}>{ev.ruleName}</Text>
                  <Text style={styles.triggerDetail}>
                    {meta.label}: {ev.value.toFixed(1)} {ev.condition} {ev.threshold}
                  </Text>
                  <Text style={styles.triggerTime}>
                    {new Date(ev.triggeredAt).toLocaleString()}
                  </Text>
                </View>
                {!ev.acknowledged && (
                  <TouchableOpacity
                    style={styles.ackBtn}
                    onPress={() => onAcknowledge(ev.id)}
                  >
                    <Text style={styles.ackBtnText}>✓</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 8, gap: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },

  deviceBar: { paddingHorizontal: 16, maxHeight: 48, marginBottom: 8 },
  deviceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.surface, marginRight: 8,
    borderWidth: 1, borderColor: 'transparent',
  },
  deviceChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
  deviceChipIcon: { fontSize: 14, color: colors.textMuted },
  deviceChipText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  deviceChipTextActive: { color: colors.primary },

  controls: {
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8,
  },
  btnStart: {
    backgroundColor: colors.success, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8,
  },
  btnPause: {
    backgroundColor: colors.warning, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8,
  },
  btnStop: {
    backgroundColor: colors.error, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 4, width: '100%' },
  statLabel: { fontSize: 11, color: colors.textMuted },

  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.primary },

  tabContent: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },

  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: colors.text,
    marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5,
  },

  channelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  channelCard: {
    width: '47%', backgroundColor: colors.surface, borderRadius: 16,
    padding: 16, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  channelIcon: { fontSize: 24 },
  channelLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  channelValue: { fontSize: 28, fontWeight: '700', color: colors.text },
  channelUnit: { fontSize: 11, color: colors.textMuted },
  channelTime: { fontSize: 10, color: colors.textMuted, marginTop: 4 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 20 },

  sampleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sampleIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  sampleChannel: { fontSize: 12, color: colors.textMuted, width: 80 },
  sampleValue: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 },
  sampleTime: { fontSize: 10, color: colors.textMuted },

  ruleCard: {
    backgroundColor: colors.surface, borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  ruleCardDisabled: { opacity: 0.5 },
  ruleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleIcon: { fontSize: 20 },
  ruleInfo: { flex: 1 },
  ruleName: { fontSize: 14, fontWeight: '600', color: colors.text },
  ruleCondition: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  ruleToggle: { padding: 4 },
  toggleTrack: {
    width: 36, height: 20, borderRadius: 10,
    backgroundColor: colors.border, justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleTrackOn: { backgroundColor: colors.primary },
  toggleThumb: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#FFF',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  ruleFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  ruleStats: { fontSize: 11, color: colors.textMuted },
  ruleDelete: { fontSize: 16, color: colors.error, padding: 4 },

  templateCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  templateInfo: { flex: 1 },
  templateName: { fontSize: 13, fontWeight: '600', color: colors.text },
  templateDesc: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  templateAdd: { fontSize: 22, color: colors.primary, paddingLeft: 12 },

  triggerCard: {
    backgroundColor: colors.surface, borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  triggerCardNew: { borderColor: colors.warning, backgroundColor: colors.warning + '10' },
  triggerHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  triggerIcon: { fontSize: 20, marginTop: 2 },
  triggerInfo: { flex: 1 },
  triggerName: { fontSize: 14, fontWeight: '600', color: colors.text },
  triggerDetail: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  triggerTime: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  ackBtn: {
    backgroundColor: colors.success, width: 28, height: 28,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  ackBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
