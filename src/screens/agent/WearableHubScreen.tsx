import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { useI18n } from '../../stores/i18nStore';

type DeviceKind = 'ring' | 'band' | 'clip';
type FlowStep = 'intro' | 'permissions' | 'scanning' | 'device' | 'binding' | 'done';

type WearableDevice = {
  id: string;
  name: string;
  kind: DeviceKind;
  brand: string;
  rssi: number;
  battery: number;
  serviceUuid: string;
  status: 'ready' | 'known' | 'beta';
  summary: { en: string; zh: string };
  gestures: Array<{ label: { en: string; zh: string }; event: string }>;
};

const MOCK_DEVICES: WearableDevice[] = [
  {
    id: 'aurora-ring-1',
    name: 'Aurora Ring X1',
    kind: 'ring',
    brand: 'Aurora Labs',
    rssi: -49,
    battery: 84,
    serviceUuid: '19b10000-e8f2-537e-4f6c-d104768a1214',
    status: 'ready',
    summary: {
      en: 'Best for discreet double-tap triggers and quick voice wake.',
      zh: '适合做隐蔽双击触发和快速语音唤醒。',
    },
    gestures: [
      { label: { en: 'Double tap', zh: '双击' }, event: 'Gesture_Double_Tap' },
      { label: { en: 'Long hold', zh: '长按' }, event: 'Gesture_Long_Hold' },
    ],
  },
  {
    id: 'pulse-band-7',
    name: 'Pulse Band 7',
    kind: 'band',
    brand: 'Pulse Motion',
    rssi: -57,
    battery: 62,
    serviceUuid: '8f540001-3f7b-4f72-a7d3-11fb6b111111',
    status: 'known',
    summary: {
      en: 'Good for heart-rate telemetry, wrist raise gestures and background sensing.',
      zh: '适合心率遥测、抬腕动作和持续状态感知。',
    },
    gestures: [
      { label: { en: 'Raise wrist', zh: '抬腕' }, event: 'Gesture_Raise_Wrist' },
      { label: { en: 'Heart rate spike', zh: '心率突增' }, event: 'HeartRate_Spike' },
    ],
  },
  {
    id: 'halo-clip-3',
    name: 'Halo Clip S3',
    kind: 'clip',
    brand: 'Halo Devices',
    rssi: -66,
    battery: 91,
    serviceUuid: '1bc50020-8c6a-11ee-b9d1-0242ac120002',
    status: 'beta',
    summary: {
      en: 'Pilot profile for gesture relay and silent context events.',
      zh: '试点设备，适合演示手势中继和静默上下文事件。',
    },
    gestures: [
      { label: { en: 'Triple tap', zh: '三击' }, event: 'Gesture_Triple_Tap' },
      { label: { en: 'Tilt left', zh: '左倾' }, event: 'Gesture_Tilt_Left' },
    ],
  },
];

const FILTERS: Array<{ key: 'all' | DeviceKind; icon: string }> = [
  { key: 'all', icon: '◎' },
  { key: 'ring', icon: '◌' },
  { key: 'band', icon: '▭' },
  { key: 'clip', icon: '◫' },
];

const SIGNAL_TIMELINE = [
  { en: 'Agent wake gesture', zh: '智能体唤醒手势' },
  { en: 'Characteristic subscription', zh: '特征值订阅' },
  { en: 'Payload mapper preview', zh: 'Payload 映射预览' },
  { en: 'Silent context routing', zh: '静默上下文路由' },
];

export function WearableHubScreen() {
  const { t, language } = useI18n();
  const [step, setStep] = useState<FlowStep>('intro');
  const [scanFilter, setScanFilter] = useState<'all' | DeviceKind>('all');
  const [permissions, setPermissions] = useState({ bluetooth: true, nearby: true, notifications: false });
  const [isScanning, setIsScanning] = useState(false);
  const [scanTick, setScanTick] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState<WearableDevice | null>(null);
  const [bindingPhase, setBindingPhase] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scanResults = useMemo(() => {
    return MOCK_DEVICES.filter((device) => scanFilter === 'all' || device.kind === scanFilter);
  }, [scanFilter]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isScanning) return;
    if (scanTick >= 3) {
      setIsScanning(false);
      setStep('device');
      return;
    }
    timerRef.current = setTimeout(() => {
      setScanTick((value) => value + 1);
    }, 900);
  }, [isScanning, scanTick]);

  useEffect(() => {
    if (step !== 'binding') return;
    if (bindingPhase >= 3) {
      setStep('done');
      return;
    }
    timerRef.current = setTimeout(() => {
      setBindingPhase((value) => value + 1);
    }, 850);
  }, [bindingPhase, step]);

  const stepIndex = ['intro', 'permissions', 'scanning', 'device', 'binding', 'done'].indexOf(step);

  const beginScan = () => {
    if (!permissions.bluetooth || !permissions.nearby) {
      Alert.alert(
        t({ en: 'Permissions required', zh: '需要权限' }),
        t({ en: 'Enable Bluetooth and nearby device access to start the demo scan.', zh: '请先开启蓝牙和附近设备权限，再开始演示扫描。' }),
      );
      return;
    }
    setSelectedDevice(null);
    setScanTick(0);
    setIsScanning(true);
    setStep('scanning');
  };

  const connectDevice = (device: WearableDevice) => {
    setSelectedDevice(device);
    setBindingPhase(0);
    setStep('binding');
  };

  const restartFlow = () => {
    setStep('intro');
    setIsScanning(false);
    setScanTick(0);
    setSelectedDevice(null);
    setBindingPhase(0);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>{t({ en: 'Build134 demo flow', zh: 'Build134 演示流程' })}</Text>
        </View>
        <Text style={styles.heroTitle}>{t({ en: 'Wearables can wake and feed your agent', zh: '可穿戴设备可以唤醒并补充你的智能体' })}</Text>
        <Text style={styles.heroSubtitle}>
          {t({
            en: 'This screen demonstrates the complete user journey for scan, select, bind and preview agent triggers. BLE and GATT plumbing will follow after the demo branch.',
            zh: '这个页面先演示扫描、选择、绑定和 Agent 触发预览的完整用户流程。真实 BLE 与 GATT 接入在演示分支之后再继续实施。',
          })}
        </Text>
      </View>

      <View style={styles.progressCard}>
        <Text style={styles.sectionTitle}>{t({ en: 'Demo steps', zh: '演示步骤' })}</Text>
        <View style={styles.progressRow}>
          {['准备', '授权', '扫描', '选择', '绑定', '完成'].map((label, index) => (
            <View key={label} style={styles.progressStep}>
              <View style={[styles.progressDot, index <= stepIndex && styles.progressDotActive]}>
                <Text style={[styles.progressDotText, index <= stepIndex && styles.progressDotTextActive]}>{index + 1}</Text>
              </View>
              <Text style={[styles.progressLabel, index <= stepIndex && styles.progressLabelActive]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.panel}>
        {step === 'intro' && (
          <>
            <Text style={styles.sectionTitle}>{t({ en: 'What the partner will see', zh: '合作方现场会看到什么' })}</Text>
            <View style={styles.bulletList}>
              <Bullet text={t({ en: 'Scan nearby rings, bands and clips from one entry point.', zh: '从一个入口扫描附近戒指、手环和夹式设备。' })} />
              <Bullet text={t({ en: 'Review device identity, signal quality and supported trigger gestures.', zh: '查看设备身份、信号质量和支持的触发手势。' })} />
              <Bullet text={t({ en: 'Preview how gestures route into agent wake, voice capture and silent context.', zh: '预览手势如何进入 Agent 唤醒、语音采集和静默上下文。' })} />
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('permissions')}>
              <Text style={styles.primaryButtonText}>{t({ en: 'Start wearable demo', zh: '开始可穿戴设备演示' })}</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'permissions' && (
          <>
            <Text style={styles.sectionTitle}>{t({ en: 'Pre-scan permissions', zh: '扫描前授权' })}</Text>
            <Text style={styles.sectionSub}>{t({ en: 'For the demo, permissions are simulated but fully interactive.', zh: '当前是演示分支，权限为模拟状态，但交互流程完整可点。' })}</Text>
            <PermissionRow
              label={t({ en: 'Bluetooth access', zh: '蓝牙访问' })}
              description={t({ en: 'Scan and connect to nearby BLE wearables.', zh: '用于扫描并连接附近 BLE 可穿戴设备。' })}
              enabled={permissions.bluetooth}
              onToggle={() => setPermissions((value) => ({ ...value, bluetooth: !value.bluetooth }))}
            />
            <PermissionRow
              label={t({ en: 'Nearby devices', zh: '附近设备' })}
              description={t({ en: 'Required on Android for discoverability and pairing.', zh: 'Android 侧用于发现与配对设备。' })}
              enabled={permissions.nearby}
              onToggle={() => setPermissions((value) => ({ ...value, nearby: !value.nearby }))}
            />
            <PermissionRow
              label={t({ en: 'Persistent alerts', zh: '持续提醒' })}
              description={t({ en: 'Reserve a path for future background trigger notices.', zh: '为后续后台触发提醒预留交互入口。' })}
              enabled={permissions.notifications}
              onToggle={() => setPermissions((value) => ({ ...value, notifications: !value.notifications }))}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={beginScan}>
              <Text style={styles.primaryButtonText}>{t({ en: 'Scan nearby wearables', zh: '扫描附近可穿戴设备' })}</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'scanning' && (
          <>
            <Text style={styles.sectionTitle}>{t({ en: 'Scanning nearby devices', zh: '正在扫描附近设备' })}</Text>
            <Text style={styles.sectionSub}>{t({ en: 'The animation intentionally mirrors a real BLE scan loop.', zh: '这里的动画节奏按真实 BLE 扫描流程来设计。' })}</Text>
            <View style={styles.scannerCard}>
              <Text style={styles.scannerPulse}>⌁</Text>
              <Text style={styles.scannerTitle}>{t({ en: 'Searching for service UUID and manufacturer hints', zh: '正在查找 Service UUID 与厂商特征' })}</Text>
              <View style={styles.scannerMeterTrack}>
                <View style={[styles.scannerMeterFill, { width: `${((scanTick + 1) / 4) * 100}%` }]} />
              </View>
              <Text style={styles.scannerHint}>{t({ en: `${scanTick + 1}/4 discovery rounds completed`, zh: `已完成 ${scanTick + 1}/4 轮发现` })}</Text>
            </View>
          </>
        )}

        {step === 'device' && (
          <>
            <Text style={styles.sectionTitle}>{t({ en: 'Nearby wearable list', zh: '附近设备列表' })}</Text>
            <View style={styles.filterRow}>
              {FILTERS.map((filter) => {
                const label = filter.key === 'all'
                  ? t({ en: 'All', zh: '全部' })
                  : filter.key === 'ring'
                    ? t({ en: 'Rings', zh: '戒指' })
                    : filter.key === 'band'
                      ? t({ en: 'Bands', zh: '手环' })
                      : t({ en: 'Clips', zh: '夹式' });
                return (
                  <TouchableOpacity
                    key={filter.key}
                    style={[styles.filterChip, scanFilter === filter.key && styles.filterChipActive]}
                    onPress={() => setScanFilter(filter.key)}
                  >
                    <Text style={[styles.filterChipText, scanFilter === filter.key && styles.filterChipTextActive]}>{filter.icon} {label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {scanResults.map((device) => (
              <TouchableOpacity key={device.id} style={styles.deviceCard} onPress={() => setSelectedDevice(device)} activeOpacity={0.85}>
                <View style={styles.deviceHeader}>
                  <View>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceMeta}>{device.brand} · RSSI {device.rssi} dBm · {device.battery}%</Text>
                  </View>
                  <StatusPill status={device.status} />
                </View>
                <Text style={styles.deviceSummary}>{device.summary[language === 'zh' ? 'zh' : 'en']}</Text>
                <Text style={styles.deviceService}>GATT · {device.serviceUuid}</Text>
              </TouchableOpacity>
            ))}
            {selectedDevice && (
              <View style={styles.selectedPanel}>
                <Text style={styles.selectedTitle}>{t({ en: 'Selected device preview', zh: '已选设备预览' })}</Text>
                <Text style={styles.selectedName}>{selectedDevice.name}</Text>
                <View style={styles.tagRow}>
                  {selectedDevice.gestures.map((gesture) => (
                    <View key={gesture.event} style={styles.tag}>
                      <Text style={styles.tagText}>{gesture.label[language === 'zh' ? 'zh' : 'en']}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={styles.primaryButton} onPress={() => connectDevice(selectedDevice)}>
                  <Text style={styles.primaryButtonText}>{t({ en: 'Connect and discover services', zh: '连接并发现服务' })}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {step === 'binding' && selectedDevice && (
          <>
            <Text style={styles.sectionTitle}>{t({ en: 'Binding and capability preview', zh: '绑定与能力预览' })}</Text>
            <Text style={styles.sectionSub}>{selectedDevice.name} · {selectedDevice.brand}</Text>
            <View style={styles.timelineCard}>
              {SIGNAL_TIMELINE.map((item, index) => {
                const active = index <= bindingPhase;
                return (
                  <View key={item.en} style={styles.timelineRow}>
                    <View style={[styles.timelineDot, active && styles.timelineDotActive]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.timelineTitle, active && styles.timelineTitleActive]}>{language === 'zh' ? item.zh : item.en}</Text>
                      <Text style={styles.timelineSub}>{selectedDevice.gestures[index % selectedDevice.gestures.length].event}</Text>
                    </View>
                    <Text style={[styles.timelineState, active && styles.timelineStateActive]}>{active ? t({ en: 'Ready', zh: '就绪' }) : t({ en: 'Pending', zh: '等待中' })}</Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>{t({ en: 'Agent actions preview', zh: 'Agent 动作预览' })}</Text>
              <Bullet text={t({ en: 'Double tap or raise wrist can wake the mobile voice lane.', zh: '双击或抬腕可唤醒移动端语音交互通道。' })} />
              <Bullet text={t({ en: 'Characteristic payloads will map to structured agent events.', zh: '特征值 Payload 将映射为结构化 Agent 事件。' })} />
              <Bullet text={t({ en: 'Telemetry can later enrich silent context without forcing a spoken reply.', zh: '后续可把遥测补充进静默上下文，而不强制触发语音回复。' })} />
            </View>
          </>
        )}

        {step === 'done' && selectedDevice && (
          <>
            <Text style={styles.sectionTitle}>{t({ en: 'Demo binding completed', zh: '演示绑定已完成' })}</Text>
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>⌚</Text>
              <Text style={styles.successTitle}>{selectedDevice.name}</Text>
              <Text style={styles.successText}>{t({ en: 'The wearable is now shown as agent-ready in this demo flow.', zh: '这个演示流程里，该设备已经被标记为可供 Agent 使用。' })}</Text>
              <View style={styles.successStats}>
                <StatChip label={t({ en: 'Wake gesture', zh: '唤醒手势' })} value={selectedDevice.gestures[0].label[language === 'zh' ? 'zh' : 'en']} />
                <StatChip label="UUID" value={selectedDevice.serviceUuid.slice(0, 8)} />
                <StatChip label={t({ en: 'Battery', zh: '电量' })} value={`${selectedDevice.battery}%`} />
              </View>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('device')}>
                <Text style={styles.secondaryButtonText}>{t({ en: 'Choose another device', zh: '选择其他设备' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButtonCompact} onPress={restartFlow}>
                <Text style={styles.primaryButtonText}>{t({ en: 'Replay demo', zh: '重新演示' })}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function PermissionRow({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.permissionRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.permissionLabel}>{label}</Text>
        <Text style={styles.permissionDescription}>{description}</Text>
      </View>
      <TouchableOpacity style={[styles.toggle, enabled && styles.toggleActive]} onPress={onToggle}>
        <View style={[styles.toggleThumb, enabled && styles.toggleThumbActive]} />
      </TouchableOpacity>
    </View>
  );
}

function StatusPill({ status }: { status: WearableDevice['status'] }) {
  const label = status === 'ready' ? 'Ready' : status === 'known' ? 'Known' : 'Beta';
  return (
    <View style={[styles.statusPill, status === 'ready' ? styles.statusReady : status === 'known' ? styles.statusKnown : styles.statusBeta]}>
      <Text style={styles.statusPillText}>{label}</Text>
    </View>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  heroCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.accent + '33',
    borderRadius: 22,
    padding: 18,
    gap: 10,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent + '22',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroBadgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 31,
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  progressCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  progressRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  progressStep: {
    alignItems: 'center',
    width: '15.5%',
    minWidth: 48,
    gap: 6,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  progressDotText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
  },
  progressDotTextActive: {
    color: colors.textInverse,
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  progressLabelActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  panel: {
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSub: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  bulletList: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    color: colors.textSecondary,
    lineHeight: 21,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonCompact: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    flex: 1,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  permissionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  permissionLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  permissionDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  toggle: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.cardAlt,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toggleActive: {
    backgroundColor: colors.accent,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  scannerCard: {
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  scannerPulse: {
    fontSize: 42,
    color: colors.accent,
  },
  scannerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  scannerMeterTrack: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.cardAlt,
    overflow: 'hidden',
  },
  scannerMeterFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 999,
  },
  scannerHint: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: colors.accent + '22',
    borderColor: colors.accent + '66',
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: colors.accent,
  },
  deviceCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  deviceName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  deviceMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  deviceSummary: {
    color: colors.textSecondary,
    lineHeight: 20,
    fontSize: 13,
  },
  deviceService: {
    color: colors.accent,
    fontSize: 12,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusReady: {
    backgroundColor: colors.success + '22',
  },
  statusKnown: {
    backgroundColor: colors.warning + '22',
  },
  statusBeta: {
    backgroundColor: colors.primary + '22',
  },
  statusPillText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  selectedPanel: {
    marginTop: 4,
    backgroundColor: colors.cardAlt,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  selectedTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  selectedName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: colors.accent + '22',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  timelineCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineDotActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  timelineTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  timelineTitleActive: {
    color: colors.textPrimary,
  },
  timelineSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  timelineState: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  timelineStateActive: {
    color: colors.accent,
  },
  previewCard: {
    backgroundColor: colors.cardAlt,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  previewTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  successCard: {
    backgroundColor: colors.success + '14',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.success + '44',
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  successIcon: {
    fontSize: 34,
  },
  successTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  successText: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    fontSize: 14,
  },
  successStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  statChip: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 88,
    gap: 3,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
});