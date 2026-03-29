import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { useI18n } from '../../stores/i18nStore';
import { WearableAgentCapabilityService } from '../../services/wearables/wearableAgentCapability.service';
import { WearableBleGatewayService } from '../../services/wearables/wearableBleGateway.service';
import { WearableDeviceAdapterService } from '../../services/wearables/wearableDeviceAdapter.service';
import { WearablePairingStoreService } from '../../services/wearables/wearablePairingStore.service';
import {
  type AgentCapabilityPreview,
  type BlePermissionState,
  type LiveCharacteristicEvent,
  type PairedWearableRecord,
  type WearableCharacteristicSnapshot,
  type WearableConnectionStage,
  type WearableKind,
  type WearableProfile,
  type WearableScanCandidate,
  type WearableServiceSnapshot,
  type WearableSupportTier,
} from '../../services/wearables/wearableTypes';

type DeviceFilter = 'all' | 'ring' | 'band' | 'clip' | 'sensor';

const FILTERS: Array<{ key: DeviceFilter; icon: string }> = [
  { key: 'all', icon: '◎' },
  { key: 'ring', icon: '◌' },
  { key: 'band', icon: '▭' },
  { key: 'clip', icon: '◫' },
  { key: 'sensor', icon: '△' },
];

function upsertCandidate(list: WearableScanCandidate[], next: WearableScanCandidate): WearableScanCandidate[] {
  const map = new Map(list.map((item) => [item.id, item]));
  map.set(next.id, next);
  return Array.from(map.values()).sort((left, right) => {
    const leftRssi = left.raw.rssi ?? -999;
    const rightRssi = right.raw.rssi ?? -999;
    return rightRssi - leftRssi;
  });
}

function formatConnectionTime(value: string): string {
  try {
    return new Date(value).toLocaleTimeString();
  } catch {
    return value;
  }
}

function kindLabel(kind: WearableKind): string {
  switch (kind) {
    case 'ring':
      return 'Ring';
    case 'band':
      return 'Band';
    case 'clip':
      return 'Clip';
    case 'sensor':
      return 'Sensor';
    default:
      return 'Unknown';
  }
}

function stageLabel(stage: WearableConnectionStage | null, t: ReturnType<typeof useI18n>['t']): string {
  switch (stage) {
    case 'connecting':
      return t({ en: 'Connecting', zh: '正在连接' });
    case 'discovering':
      return t({ en: 'Discovering GATT', zh: '正在发现 GATT' });
    case 'reading':
      return t({ en: 'Reading characteristic', zh: '正在读取特征值' });
    case 'done':
      return t({ en: 'Verified', zh: '已验证' });
    default:
      return t({ en: 'Idle', zh: '空闲' });
  }
}

export function WearableHubScreen() {
  const { t } = useI18n();
  const [permissionState, setPermissionState] = useState<BlePermissionState | null>(null);
  const [scanFilter, setScanFilter] = useState<DeviceFilter>('all');
  const [scanCandidates, setScanCandidates] = useState<WearableScanCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [monitorError, setMonitorError] = useState<string | null>(null);
  const [connectionStage, setConnectionStage] = useState<WearableConnectionStage | null>(null);
  const [profile, setProfile] = useState<WearableProfile | null>(null);
  const [capabilityPreview, setCapabilityPreview] = useState<AgentCapabilityPreview | null>(null);
  const [serviceSnapshots, setServiceSnapshots] = useState<WearableServiceSnapshot[]>([]);
  const [pairedRecords, setPairedRecords] = useState<PairedWearableRecord[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveCharacteristicEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const scanStopRef = useRef<null | (() => void)>(null);
  const monitorStopRef = useRef<null | (() => void)>(null);
  const connectedDeviceIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const filteredCandidates = useMemo(() => {
    return scanCandidates.filter((candidate) => scanFilter === 'all' || candidate.kind === scanFilter);
  }, [scanCandidates, scanFilter]);

  const selectedCandidate = useMemo(() => {
    return scanCandidates.find((candidate) => candidate.id === selectedCandidateId) ?? null;
  }, [scanCandidates, selectedCandidateId]);

  const firstNotifiableCharacteristic = useMemo<WearableCharacteristicSnapshot | null>(() => {
    for (const service of serviceSnapshots) {
      const match = service.characteristics.find((characteristic) => characteristic.isNotifiable);
      if (match) {
        return match;
      }
    }
    return null;
  }, [serviceSnapshots]);

  useEffect(() => {
    void loadPairedRecords();
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      scanStopRef.current?.();
      monitorStopRef.current?.();
      const connectedId = connectedDeviceIdRef.current;
      if (connectedId) {
        void WearableBleGatewayService.disconnectDevice(connectedId);
      }
    };
  }, []);

  const loadPairedRecords = async () => {
    const records = await WearablePairingStoreService.list();
    if (mountedRef.current) {
      setPairedRecords(records);
    }
  };

  const requestPermissions = async (): Promise<BlePermissionState | null> => {
    setScanError(null);
    try {
      const nextState = await WearableBleGatewayService.requestPermissions();
      if (!mountedRef.current) {
        return null;
      }
      setPermissionState(nextState);
      if (!nextState.granted) {
        setScanError(t({
          en: 'Bluetooth permission was not fully granted. Enable Bluetooth, nearby device, and location access before scanning.',
          zh: '蓝牙权限未完整授予。开始扫描前请开启蓝牙、附近设备和定位权限。',
        }));
      }
      return nextState;
    } catch (error: any) {
      const message = error?.message || t({ en: 'Permission request failed.', zh: '权限请求失败。' });
      if (mountedRef.current) {
        setScanError(message);
      }
      return null;
    }
  };

  const stopScan = () => {
    scanStopRef.current?.();
    scanStopRef.current = null;
    if (mountedRef.current) {
      setIsScanning(false);
    }
  };

  const stopMonitor = () => {
    monitorStopRef.current?.();
    monitorStopRef.current = null;
    if (mountedRef.current) {
      setIsMonitoring(false);
    }
  };

  const disconnectCurrentDevice = async () => {
    const connectedId = connectedDeviceIdRef.current;
    if (!connectedId) {
      return;
    }
    connectedDeviceIdRef.current = null;
    await WearableBleGatewayService.disconnectDevice(connectedId);
  };

  const startScan = async () => {
    stopScan();
    stopMonitor();
    setScanError(null);
    setConnectionError(null);
    setMonitorError(null);
    setConnectionStage(null);
    setProfile(null);
    setCapabilityPreview(null);
    setServiceSnapshots([]);
    setLiveEvents([]);
    setSelectedCandidateId(null);
    await disconnectCurrentDevice();

    const nextPermissions = permissionState?.granted ? permissionState : await requestPermissions();
    if (!nextPermissions?.granted) {
      return;
    }

    setScanCandidates([]);
    setIsScanning(true);

    try {
      scanStopRef.current = await WearableBleGatewayService.startScan({
        durationMs: 12000,
        onDevice: (device) => {
          if (!mountedRef.current) {
            return;
          }
          const candidate = WearableDeviceAdapterService.buildScanCandidate(device);
          setScanCandidates((current) => upsertCandidate(current, candidate));
        },
        onFinished: (devices) => {
          if (!mountedRef.current) {
            return;
          }
          setIsScanning(false);
          const adapted = devices.map((device) => WearableDeviceAdapterService.buildScanCandidate(device));
          setScanCandidates(adapted);
        },
        onError: (error) => {
          if (!mountedRef.current) {
            return;
          }
          setIsScanning(false);
          setScanError(error.message);
        },
      });
    } catch (error: any) {
      const message = error?.message || t({ en: 'BLE scan failed to start.', zh: 'BLE 扫描启动失败。' });
      if (mountedRef.current) {
        setIsScanning(false);
        setScanError(message);
      }
    }
  };

  const connectCandidate = async (candidate: WearableScanCandidate) => {
    stopScan();
    stopMonitor();
    setSelectedCandidateId(candidate.id);
    setConnectionError(null);
    setMonitorError(null);
    setProfile(null);
    setCapabilityPreview(null);
    setServiceSnapshots([]);
    setLiveEvents([]);
    setConnectionStage('connecting');

    if (connectedDeviceIdRef.current && connectedDeviceIdRef.current !== candidate.id) {
      await disconnectCurrentDevice();
    }

    try {
      const snapshot = await WearableBleGatewayService.connectAndInspect(candidate.raw, (stage) => {
        if (mountedRef.current) {
          setConnectionStage(stage);
        }
      });

      if (!mountedRef.current) {
        return;
      }

      connectedDeviceIdRef.current = snapshot.device.id;
      setServiceSnapshots(snapshot.services);

      const nextProfile = WearableDeviceAdapterService.adaptConnectionSnapshot(snapshot);
      const nextCapabilityPreview = WearableAgentCapabilityService.buildCapabilityPreview(nextProfile);

      setProfile(nextProfile);
      setCapabilityPreview(nextCapabilityPreview);
      setConnectionStage('done');
      const records = await WearablePairingStoreService.save(nextProfile, nextCapabilityPreview.verificationEvent);
      if (mountedRef.current) {
        setPairedRecords(records);
      }
    } catch (error: any) {
      const message = error?.message || t({ en: 'Device connection failed.', zh: '设备连接失败。' });
      if (mountedRef.current) {
        setConnectionStage(null);
        setConnectionError(message);
      }
    }
  };

  const startMonitor = () => {
    if (!profile || !firstNotifiableCharacteristic) {
      return;
    }

    stopMonitor();
    setMonitorError(null);
    setLiveEvents([]);
    setIsMonitoring(true);
    monitorStopRef.current = WearableBleGatewayService.monitorCharacteristic(
      profile.id,
      firstNotifiableCharacteristic.serviceUuid,
      firstNotifiableCharacteristic.uuid,
      (event) => {
        if (!mountedRef.current) {
          return;
        }
        setLiveEvents((current) => [event, ...current].slice(0, 12));
      },
      (error) => {
        if (!mountedRef.current) {
          return;
        }
        setMonitorError(error.message);
        setIsMonitoring(false);
      },
    );
  };

  const clearFlow = async () => {
    stopScan();
    stopMonitor();
    await disconnectCurrentDevice();
    if (!mountedRef.current) {
      return;
    }
    setScanCandidates([]);
    setSelectedCandidateId(null);
    setScanError(null);
    setConnectionError(null);
    setMonitorError(null);
    setConnectionStage(null);
    setProfile(null);
    setCapabilityPreview(null);
    setServiceSnapshots([]);
    setLiveEvents([]);
  };

  const removePairedRecord = async (deviceId: string) => {
    const records = await WearablePairingStoreService.remove(deviceId);
    if (mountedRef.current) {
      setPairedRecords(records);
    }
  };

  const progressState = [
    true,
    permissionState?.granted ?? false,
    isScanning || scanCandidates.length > 0,
    selectedCandidateId !== null || connectionStage !== null,
    capabilityPreview !== null,
    pairedRecords.length > 0 || liveEvents.length > 0,
  ];

  const permissionSummary = permissionState
    ? [
        { label: t({ en: 'Bluetooth', zh: '蓝牙' }), value: permissionState.bluetooth },
        { label: t({ en: 'Nearby', zh: '附近设备' }), value: permissionState.nearbyDevices },
        { label: t({ en: 'Location', zh: '定位' }), value: permissionState.location },
      ]
    : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>{t({ en: 'Phase 1 shipped, Phase 2 started', zh: '第一阶段已落地，第二阶段已启动' })}</Text>
        </View>
        <Text style={styles.heroTitle}>{t({ en: 'Wearables now validate and persist against real GATT data', zh: '可穿戴设备现在按真实 GATT 数据完成验证与持久化' })}</Text>
        <Text style={styles.heroSubtitle}>
          {t({
            en: 'This screen now covers the real phase-1 chain and begins phase 2 with paired-device persistence, known-device enrichment, and live characteristic monitoring for notifiable endpoints.',
            zh: '这个页面现在已经覆盖真实第一阶段链路，并开始进入第二阶段：已配对设备持久化、已知设备增强和可通知特征的实时监听。',
          })}
        </Text>
      </View>

      <View style={styles.progressCard}>
        <Text style={styles.sectionTitle}>{t({ en: 'Implementation steps', zh: '实现步骤' })}</Text>
        <View style={styles.progressRow}>
          {[t({ en: 'Entry', zh: '入口' }), t({ en: 'Permissions', zh: '权限' }), t({ en: 'Scan', zh: '扫描' }), t({ en: 'Connect', zh: '连接' }), t({ en: 'Verify', zh: '验证' }), t({ en: 'Persist', zh: '持久化' })].map((label, index) => (
            <View key={label} style={styles.progressStep}>
              <View style={[styles.progressDot, progressState[index] && styles.progressDotActive]}>
                <Text style={[styles.progressDotText, progressState[index] && styles.progressDotTextActive]}>{index + 1}</Text>
              </View>
              <Text style={[styles.progressLabel, progressState[index] && styles.progressLabelActive]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>{t({ en: 'Run the validation lane', zh: '运行验证链路' })}</Text>
        <View style={styles.bulletList}>
          <Bullet text={t({ en: 'Request runtime Bluetooth permissions instead of simulating toggles.', zh: '不再模拟开关，而是直接申请运行时蓝牙权限。' })} />
          <Bullet text={t({ en: 'Scan real nearby wearables and normalize them through the device adaptation layer plus vendor registry.', zh: '扫描真实附近设备，并通过设备适配层和厂商注册表归一化。' })} />
          <Bullet text={t({ en: 'Connect, discover GATT services, read one characteristic, persist the paired device, and optionally monitor live notifications.', zh: '连接后发现 GATT 服务、读取一个特征值、保存已配对设备，并可选开启实时通知监听。' })} />
        </View>

        {permissionSummary.length > 0 && (
          <View style={styles.summaryRow}>
            {permissionSummary.map((item) => (
              <View key={item.label} style={[styles.summaryChip, item.value ? styles.summaryChipOk : styles.summaryChipWarn]}>
                <Text style={styles.summaryChipLabel}>{item.label}</Text>
                <Text style={styles.summaryChipValue}>{item.value ? t({ en: 'Granted', zh: '已授权' }) : t({ en: 'Missing', zh: '缺失' })}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionRowStack}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => { void requestPermissions(); }}>
            <Text style={styles.secondaryButtonText}>{t({ en: 'Request BLE permissions', zh: '申请 BLE 权限' })}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={() => { void startScan(); }}>
            <Text style={styles.primaryButtonText}>{isScanning ? t({ en: 'Scanning...', zh: '扫描中...' }) : t({ en: 'Scan nearby wearables', zh: '扫描附近可穿戴设备' })}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {(scanError || connectionError || monitorError) && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>{t({ en: 'Validation issue', zh: '验证问题' })}</Text>
          <Text style={styles.errorText}>{scanError || connectionError || monitorError}</Text>
        </View>
      )}

      {pairedRecords.length > 0 && (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>{t({ en: 'Paired wearables', zh: '已配对设备' })}</Text>
          {pairedRecords.map((record) => (
            <View key={record.id} style={styles.pairedCard}>
              <View style={styles.deviceHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deviceName}>{record.name}</Text>
                  <Text style={styles.deviceMeta}>{kindLabel(record.kind)} · {formatConnectionTime(record.lastSeenAt)}</Text>
                </View>
                <StatusPill status={record.supportTier} />
              </View>
              <View style={styles.tagRow}>
                {record.serviceLabels.slice(0, 4).map((label) => (
                  <View key={`${record.id}-${label}`} style={styles.tag}>
                    <Text style={styles.tagText}>{label}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.inlineButton} onPress={() => { void removePairedRecord(record.id); }}>
                <Text style={styles.inlineButtonText}>{t({ en: 'Remove', zh: '移除' })}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.panel}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t({ en: 'Discovered devices', zh: '已发现设备' })}</Text>
          <View style={styles.inlineStatus}>
            <Text style={styles.inlineStatusLabel}>{stageLabel(connectionStage, t)}</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const label = filter.key === 'all'
              ? t({ en: 'All', zh: '全部' })
              : filter.key === 'ring'
                ? t({ en: 'Rings', zh: '戒指' })
                : filter.key === 'band'
                  ? t({ en: 'Bands', zh: '手环' })
                  : filter.key === 'clip'
                    ? t({ en: 'Clips', zh: '夹式' })
                    : t({ en: 'Sensors', zh: '传感器' });
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

        {isScanning && (
          <View style={styles.scannerCard}>
            <Text style={styles.scannerPulse}>⌁</Text>
            <Text style={styles.scannerTitle}>{t({ en: 'Running real BLE discovery for 12 seconds', zh: '正在执行 12 秒真实 BLE 发现' })}</Text>
            <Text style={styles.scannerHint}>{t({ en: 'Devices will appear below as they advertise.', zh: '设备一旦发出广播，就会显示在下方。' })}</Text>
          </View>
        )}

        {!isScanning && filteredCandidates.length === 0 && (
          <EmptyState text={t({ en: 'No wearable candidates yet. Start a scan with Bluetooth enabled and keep the device nearby.', zh: '还没有找到可穿戴候选设备。请先开启蓝牙并把设备放近后再扫描。' })} />
        )}

        {filteredCandidates.map((candidate) => (
          <View key={candidate.id} style={[styles.deviceCard, selectedCandidateId === candidate.id && styles.deviceCardSelected]}>
            <View style={styles.deviceHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.deviceName}>{candidate.name}</Text>
                <Text style={styles.deviceMeta}>{kindLabel(candidate.kind)} · {candidate.signalLabel}</Text>
              </View>
              <StatusPill status={candidate.supportTier} />
            </View>
            <Text style={styles.deviceSummary}>{candidate.summary}</Text>
            <View style={styles.tagRow}>
              {candidate.serviceLabels.slice(0, 4).map((label) => (
                <View key={`${candidate.id}-${label}`} style={styles.tag}>
                  <Text style={styles.tagText}>{label}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.primaryButtonCompact} onPress={() => { void connectCandidate(candidate); }}>
              <Text style={styles.primaryButtonText}>{t({ en: 'Connect and inspect', zh: '连接并检查' })}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {(selectedCandidate || profile || capabilityPreview || connectionStage) && (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>{t({ en: 'Connection result', zh: '连接结果' })}</Text>
          {selectedCandidate && (
            <View style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>{t({ en: 'Selected device', zh: '已选设备' })}</Text>
              <Text style={styles.highlightTitle}>{selectedCandidate.name}</Text>
              <Text style={styles.highlightBody}>{t({ en: 'Current stage:', zh: '当前阶段：' })} {stageLabel(connectionStage, t)}</Text>
            </View>
          )}

          {profile && (
            <>
              <View style={styles.keyValueCard}>
                <KeyValueRow label={t({ en: 'Support tier', zh: '支持级别' })} value={profile.supportTier} />
                <KeyValueRow label={t({ en: 'Services discovered', zh: '已发现服务' })} value={String(profile.servicesCount)} />
                <KeyValueRow label={t({ en: 'Readable characteristics', zh: '可读特征数' })} value={String(profile.readableCount)} />
                <KeyValueRow label={t({ en: 'Notifiable characteristics', zh: '可通知特征数' })} value={String(profile.notifiableCount)} />
                <KeyValueRow label={t({ en: 'First read UUID', zh: '首个读取 UUID' })} value={profile.firstReadCharacteristicUuid ?? t({ en: 'None', zh: '无' })} />
                <KeyValueRow label={t({ en: 'Connected at', zh: '连接时间' })} value={formatConnectionTime(profile.connectedAt)} />
              </View>

              <View style={styles.subPanel}>
                <Text style={styles.subPanelTitle}>{t({ en: 'Normalized profile', zh: '归一化画像' })}</Text>
                <Text style={styles.deviceSummary}>{profile.summary}</Text>
                <View style={styles.tagRow}>
                  {profile.serviceLabels.map((label) => (
                    <View key={`profile-${label}`} style={styles.tag}>
                      <Text style={styles.tagText}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.subPanel}>
                <Text style={styles.subPanelTitle}>{t({ en: 'Discovered services', zh: '已发现服务列表' })}</Text>
                {serviceSnapshots.slice(0, 8).map((service) => (
                  <View key={service.uuid} style={styles.serviceRow}>
                    <Text style={styles.serviceUuid}>{service.uuid}</Text>
                    <Text style={styles.serviceMeta}>{service.characteristics.length} {t({ en: 'characteristics', zh: '个特征' })}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.subPanel}>
                <Text style={styles.subPanelTitle}>{t({ en: 'Characteristic read', zh: '特征值读取' })}</Text>
                <Text style={styles.payloadText}>
                  {profile.firstReadPayload
                    ? profile.firstReadPayload
                    : profile.readError
                      ? profile.readError
                      : t({ en: 'No readable characteristic payload was returned.', zh: '没有返回可读特征值 Payload。' })}
                </Text>
              </View>

              <View style={styles.subPanel}>
                <Text style={styles.subPanelTitle}>{t({ en: 'Live monitoring', zh: '实时监听' })}</Text>
                {firstNotifiableCharacteristic ? (
                  <>
                    <Text style={styles.deviceSummary}>{t({ en: 'The first notifiable characteristic is ready for phase-2 live monitoring.', zh: '首个可通知特征已经可用于第二阶段实时监听。' })}</Text>
                    <Text style={styles.serviceUuid}>{firstNotifiableCharacteristic.serviceUuid} / {firstNotifiableCharacteristic.uuid}</Text>
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.secondaryButton} onPress={isMonitoring ? stopMonitor : startMonitor}>
                        <Text style={styles.secondaryButtonText}>{isMonitoring ? t({ en: 'Stop monitor', zh: '停止监听' }) : t({ en: 'Start monitor', zh: '开始监听' })}</Text>
                      </TouchableOpacity>
                    </View>
                    {liveEvents.length === 0 ? (
                      <EmptyState text={t({ en: 'No live notification received yet.', zh: '尚未收到实时通知。' })} />
                    ) : (
                      liveEvents.map((event) => (
                        <View key={event.id} style={styles.eventCard}>
                          <Text style={styles.eventTime}>{formatConnectionTime(event.receivedAt)}</Text>
                          <Text style={styles.serviceUuid}>{event.characteristicUuid}</Text>
                          <Text style={styles.payloadText}>{event.value ?? t({ en: 'No payload', zh: '无 Payload' })}</Text>
                        </View>
                      ))
                    )}
                  </>
                ) : (
                  <EmptyState text={t({ en: 'This device does not expose a notifiable characteristic yet.', zh: '这个设备当前没有暴露可通知特征。' })} />
                )}
              </View>
            </>
          )}

          {capabilityPreview && (
            <>
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>{capabilityPreview.title}</Text>
                <Text style={styles.previewSummary}>{capabilityPreview.summary}</Text>
                <Text style={styles.previewSectionLabel}>{t({ en: 'Trigger suggestions', zh: '触发建议' })}</Text>
                {capabilityPreview.triggers.map((item) => (
                  <Bullet key={item} text={item} />
                ))}
                <Text style={styles.previewSectionLabel}>{t({ en: 'Verification evidence', zh: '验证证据' })}</Text>
                {capabilityPreview.evidence.map((item) => (
                  <Bullet key={item} text={item} />
                ))}
              </View>

              <View style={styles.subPanel}>
                <Text style={styles.subPanelTitle}>{t({ en: 'Agent verification event', zh: 'Agent 验证事件' })}</Text>
                <Text style={styles.jsonText}>{JSON.stringify(capabilityPreview.verificationEvent, null, 2)}</Text>
              </View>
            </>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => { void clearFlow(); }}>
              <Text style={styles.secondaryButtonText}>{t({ en: 'Disconnect and clear', zh: '断开并清空' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButtonCompact} onPress={() => { void startScan(); }}>
              <Text style={styles.primaryButtonText}>{t({ en: 'Scan again', zh: '重新扫描' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.keyValueRow}>
      <Text style={styles.keyValueLabel}>{label}</Text>
      <Text style={styles.keyValueValue}>{value}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: WearableSupportTier }) {
  const label = status === 'ready' ? 'Ready' : status === 'known' ? 'Known' : 'Beta';
  return (
    <View style={[styles.statusPill, status === 'ready' ? styles.statusReady : status === 'known' ? styles.statusKnown : styles.statusBeta]}>
      <Text style={styles.statusPillText}>{label}</Text>
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
    width: '15.2%',
    minWidth: 52,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
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
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryChip: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    minWidth: 96,
  },
  summaryChipOk: {
    backgroundColor: colors.success + '15',
    borderColor: colors.success + '55',
  },
  summaryChipWarn: {
    backgroundColor: colors.warning + '15',
    borderColor: colors.warning + '55',
  },
  summaryChipLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryChipValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },
  actionRowStack: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
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
  inlineButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.cardAlt,
  },
  inlineButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  errorCard: {
    backgroundColor: colors.error + '12',
    borderColor: colors.error + '40',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  errorText: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  inlineStatus: {
    backgroundColor: colors.cardAlt,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineStatusLabel: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 12,
  },
  pairedCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
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
  scannerHint: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  emptyText: {
    color: colors.textSecondary,
    lineHeight: 21,
  },
  deviceCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  deviceCardSelected: {
    borderColor: colors.accent,
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
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: colors.cardAlt,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  highlightCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  highlightLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  highlightTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  highlightBody: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  keyValueCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  keyValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  keyValueLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  keyValueValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  subPanel: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  subPanelTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  serviceUuid: {
    color: colors.accent,
    fontSize: 12,
    flex: 1,
  },
  serviceMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  payloadText: {
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },
  eventCard: {
    backgroundColor: colors.cardAlt,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  eventTime: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  previewCard: {
    backgroundColor: colors.cardAlt,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  previewTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  previewSummary: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  previewSectionLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  jsonText: {
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },
});