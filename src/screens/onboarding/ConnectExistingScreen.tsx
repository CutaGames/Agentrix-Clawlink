/**
 * ConnectExistingScreen 鈥?4-step wizard for existing OpenClaw users
 *
 * Step 1  DISCOVER  鈥?LAN auto-scan / manual URL
 * Step 2  VERIFY    鈥?Ping instance, show metadata (skills, memory, version)
 * Step 3  MIGRATE   鈥?Pull skills, memory, config, chat sessions into Agentrix
 * Step 4  DONE      鈥?Summary card, navigate to SocialBind
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import { mapRawInstance } from '../../services/auth';
import { bindOpenClaw } from '../../services/openclaw.service';
import {
  probeInstanceUrl,
  migrateInstance,
  getDiscoveryConfig,
  lanScan,
  type ProbeResult,
  type MigrationResult,
  type LanCandidate,
} from '../../services/openclaw-bridge.service';

type WizardStep = 'discover' | 'verify' | 'migrate' | 'done';
type DiscoverTab = 'manual' | 'lan';

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

export function ConnectExistingScreen() {
  const navigation = useNavigation<any>();
  const { addInstance, setActiveInstance, setOnboardingComplete } = useAuthStore.getState();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('discover');
  const [discoverTab, setDiscoverTab] = useState<DiscoverTab>('manual');

  // Form fields
  const [instanceUrl, setInstanceUrl] = useState('');
  const [apiToken, setApiToken] = useState('');

  // Operation state
  const [loading, setLoading] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [boundInstanceId, setBoundInstanceId] = useState<string | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  // LAN scan state
  const [lanCandidates, setLanCandidates] = useState<LanCandidate[]>([]);
  const [lanProgress, setLanProgress] = useState(0);
  const [lanScanning, setLanScanning] = useState(false);

  // Migrate progress animation
  const migrateProgress = useRef(new Animated.Value(0)).current;

  // 鈹€鈹€ Step 1a: Manual URL probe 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

  const handleProbeManual = useCallback(async () => {
    const url = instanceUrl.trim();
    if (!url) {
      Alert.alert('闇€瑕佽緭鍏ュ湴鍧€', '璇疯緭鍏?OpenClaw 瀹炰緥鐨?URL\n渚嬪锛歨ttp://192.168.1.42:3001');
      return;
    }
    setLoading(true);
    setProbeResult(null);
    try {
      // Try direct device-to-instance probe first (LAN)
      let result: ProbeResult;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${url.replace(/\/$/, '')}/api/health`, { signal: controller.signal });
        clearTimeout(timer);
        let data: Record<string, unknown> = {};
        try { data = await res.json(); } catch (_) { /* ignore */ }
        result = {
          reachable: res.ok || res.status === 401 || res.status === 403,
          instanceName: (data.name ?? data.agentName) as string | undefined,
          version: data.version as string | undefined,
          model: (data.model ?? data.currentModel) as string | undefined,
        };
      } catch (_) {
        // Fallback: proxy through backend (public/HTTPS instances)
        result = await probeInstanceUrl(url, apiToken.trim() || undefined);
      }

      setProbeResult(result);
      if (result.reachable) {
        setStep('verify');
      } else {
        Alert.alert(
          '鏃犳硶杩炴帴',
          result.error ?? '杩炴帴澶辫触銆傝纭 OpenClaw 姝ｅ湪杩愯锛屼笖鎵嬫満涓庡疄渚嬪湪鍚屼竴缃戠粶銆?,
        );
      }
    } catch (err: any) {
      Alert.alert('閿欒', err?.message ?? '妫€娴嬪け璐?);
    } finally {
      setLoading(false);
    }
  }, [instanceUrl, apiToken]);

  // 鈹€鈹€ Step 1b: LAN auto-scan 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

  const startLanScan = useCallback(async () => {
    setLanScanning(true);
    setLanCandidates([]);
    setLanProgress(0);
    try {
      const config = await getDiscoveryConfig();
      const found = await lanScan(
        config,
        '192.168.1',
        (checked, total) => setLanProgress(Math.round((checked / total) * 100)),
      );
      setLanCandidates(found);
    } catch (err: any) {
      Alert.alert('鎵弿澶辫触', err?.message ?? 'LAN 鎵弿閿欒');
    } finally {
      setLanScanning(false);
      setLanProgress(100);
    }
  }, []);

  const selectLanCandidate = useCallback((candidate: LanCandidate) => {
    setInstanceUrl(candidate.url);
    setProbeResult(candidate.probe);
    setStep('verify');
  }, []);

  // 鈹€鈹€ Step 2 鈫?3: Bind then migrate 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

  const handleBindAndMigrate = useCallback(async () => {
    const url = instanceUrl.trim();
    setLoading(true);
    try {
      // Derive a safe name from probe discovery; fallback to hostname so the
      // backend never receives a null on the NOT-NULL `name` column.
      const derivedName =
        probeResult?.instanceName ||
        `OpenClaw-${url.replace(/^https?:\/\//, '').split('/')[0].replace(/[^a-zA-Z0-9.-]/g, '-')}`;
      const result = await bindOpenClaw({
        instanceUrl: url,
        apiToken: apiToken.trim() || '',
        instanceName: derivedName,
        deployType: 'existing',
      });
      const instance = mapRawInstance(result, {
        name: result.name || probeResult?.instanceName || 'My OpenClaw',
        instanceUrl: url,
        deployType: 'existing',
      });
      addInstance(instance);
      setActiveInstance(instance.id);
      setBoundInstanceId(result.id);
      setStep('migrate');
      Animated.timing(migrateProgress, { toValue: 30, duration: 600, useNativeDriver: false }).start();
    } catch (err: any) {
      Alert.alert('缁戝畾澶辫触', err?.message ?? '璇锋鏌ュ湴鍧€鍜?Token 鏄惁姝ｇ‘');
    } finally {
      setLoading(false);
    }
  }, [instanceUrl, apiToken, probeResult, addInstance, setActiveInstance, migrateProgress]);

  const handleRunMigration = useCallback(async () => {
    if (!boundInstanceId) return;
    setLoading(true);
    Animated.timing(migrateProgress, { toValue: 60, duration: 800, useNativeDriver: false }).start();
    try {
      const result = await migrateInstance(boundInstanceId);
      setMigrationResult(result);
      Animated.timing(migrateProgress, { toValue: 100, duration: 400, useNativeDriver: false }).start();
      setStep('done');
    } catch (_) {
      Animated.timing(migrateProgress, { toValue: 100, duration: 300, useNativeDriver: false }).start();
      setStep('done');
    } finally {
      setLoading(false);
    }
  }, [boundInstanceId, migrateProgress]);

  useEffect(() => {
    if (step === 'migrate' && boundInstanceId) {
      handleRunMigration();
    }
  }, [step, boundInstanceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFinish = useCallback(() => {
    setOnboardingComplete();
    try {
      navigation.navigate('AgentChat');
    } catch (_) {
      // In onboarding context: setOnboardingComplete() triggers RootNavigator to show Main
    }
  }, [navigation, setOnboardingComplete]);

  // 鈹€鈹€ Render 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      <StepDots current={step} />

      {/* 鈺愨晲鈺?STEP 1: DISCOVER 鈺愨晲鈺?*/}
      {step === 'discover' && (
        <View>
          <Text style={styles.title}>杩炴帴鐜版湁瀹炰緥</Text>
          <Text style={styles.subtitle}>灏嗘偍鐜版湁鐨?OpenClaw 瀹炰緥鎺ュ叆 Agentrix锛屾暟鎹畬鏁翠繚鐣?/Text>

          <View style={styles.tabBar}>
            {(['manual', 'lan'] as DiscoverTab[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, discoverTab === t && styles.tabActive]}
                onPress={() => setDiscoverTab(t)}
              >
                <Text style={[styles.tabText, discoverTab === t && styles.tabTextActive]}>
                  {t === 'manual' ? '鈱笍 鎵嬪姩杈撳叆' : '馃摗 灞€鍩熺綉鎵弿'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {discoverTab === 'manual' && (
            <View>
              <Text style={styles.label}>瀹炰緥鍦板潃</Text>
              <TextInput
                style={styles.input}
                placeholder="http://192.168.1.42:3001"
                placeholderTextColor={colors.textMuted}
                value={instanceUrl}
                onChangeText={setInstanceUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Text style={styles.label}>API Token锛堝彲閫夛級</Text>
              <TextInput
                style={styles.input}
                placeholder="鐣欑┖鑻ユ湭璁剧疆瀵嗙爜"
                placeholderTextColor={colors.textMuted}
                value={apiToken}
                onChangeText={setApiToken}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleProbeManual}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>妫€娴嬭繛鎺?/Text>}
              </TouchableOpacity>
            </View>
          )}

          {discoverTab === 'lan' && (
            <View>
              <Text style={styles.sectionHint}>鑷姩鎵弿鏈湴缃戠粶锛屽彂鐜版鍦ㄨ繍琛岀殑 OpenClaw 瀹炰緥</Text>

              {!lanScanning && lanProgress === 0 && (
                <TouchableOpacity style={styles.primaryBtn} onPress={startLanScan}>
                  <Text style={styles.primaryBtnText}>馃摗 寮€濮嬫壂鎻?/Text>
                </TouchableOpacity>
              )}

              {lanScanning && (
                <View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${lanProgress}%` }]} />
                  </View>
                  <Text style={styles.progressLabel}>鎵弿涓€?{lanProgress}%</Text>
                  <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
                </View>
              )}

              {!lanScanning && lanProgress === 100 && lanCandidates.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>馃攳</Text>
                  <Text style={styles.emptyStateText}>鏈彂鐜板疄渚?/Text>
                  <Text style={styles.emptyStateHint}>璇风‘璁?OpenClaw 宸插惎鍔紝鎴栧垏鎹㈠埌鎵嬪姩杈撳叆</Text>
                  <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12 }]} onPress={startLanScan}>
                    <Text style={styles.primaryBtnText}>閲嶆柊鎵弿</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!lanScanning && lanCandidates.length > 0 && (
                <View>
                  <Text style={styles.sectionHint}>鍙戠幇 {lanCandidates.length} 涓疄渚嬶細</Text>
                  {lanCandidates.map((c) => (
                    <TouchableOpacity key={c.url} style={styles.candidateCard} onPress={() => selectLanCandidate(c)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.candidateName}>{c.probe.instanceName ?? 'OpenClaw Instance'}</Text>
                        <Text style={styles.candidateUrl}>{c.url}</Text>
                        {c.probe.version && <Text style={styles.candidateMeta}>v{c.probe.version}</Text>}
                      </View>
                      <Text style={styles.arrowIcon}>鈥?/Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* 鈺愨晲鈺?STEP 2: VERIFY 鈺愨晲鈺?*/}
      {step === 'verify' && probeResult && (
        <View>
          <Text style={styles.title}>纭瀹炰緥淇℃伅</Text>
          <Text style={styles.subtitle}>璇风‘璁や互涓嬩俊鎭棤璇悗锛岀户缁粦瀹氬苟杩佺Щ鏁版嵁</Text>

          <View style={styles.infoCard}>
            <InfoRow icon="馃" label="鍚嶇О" value={probeResult.instanceName ?? '鏈煡'} />
            <InfoRow icon="馃敡" label="鐗堟湰" value={probeResult.version ?? '鏈煡'} />
            <InfoRow icon="馃" label="妯″瀷" value={probeResult.model ?? '鏈煡'} />
            {probeResult.skillCount !== undefined && (
              <InfoRow icon="鈿? label="宸插畨瑁呮妧鑳? value={`${probeResult.skillCount} 涓猔} />
            )}
            {probeResult.memoryEntries !== undefined && (
              <InfoRow icon="馃捑" label="璁板繂鏉＄洰" value={`${probeResult.memoryEntries} 鏉} />
            )}
            {probeResult.latencyMs !== undefined && (
              <InfoRow icon="鈴? label="寤惰繜" value={`${probeResult.latencyMs} ms`} />
            )}
            <InfoRow icon="馃寪" label="鍦板潃" value={instanceUrl} small />
          </View>

          <View style={styles.migrationNotice}>
            <Text style={styles.migrationNoticeTitle}>馃攧 鍗冲皢杩佺Щ鐨勬暟鎹?/Text>
            <Text style={styles.migrationNoticeBody}>
              {'鈥?宸插畨瑁呯殑鎶€鑳藉垪琛╘n鈥?AI 璁板繂鍜屼笂涓嬫枃\n鈥?浠ｇ悊閰嶇疆锛堝悕绉般€佷釜鎬с€佹彁绀鸿瘝锛塡n鈥?瀵硅瘽鍘嗗彶鎽樿'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleBindAndMigrate}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>缁戝畾骞惰縼绉绘暟鎹?鈫?/Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('discover')}>
            <Text style={styles.secondaryBtnText}>鈫?杩斿洖淇敼</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 鈺愨晲鈺?STEP 3: MIGRATE 鈺愨晲鈺?*/}
      {step === 'migrate' && (
        <View>
          <Text style={styles.title}>姝ｅ湪杩佺Щ鏁版嵁鈥?/Text>
          <Text style={styles.subtitle}>Agentrix 姝ｅ湪璇诲彇骞跺悓姝ユ偍鐨?OpenClaw 鏁版嵁锛岃绋嶅€?/Text>

          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                { width: migrateProgress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
              ]}
            />
          </View>

          <View style={styles.migrationStepList}>
            {[
              { icon: '馃敡', label: '浠ｇ悊閰嶇疆' },
              { icon: '鈿?, label: '鎶€鑳藉垪琛? },
              { icon: '馃捑', label: '璁板繂涓庝笂涓嬫枃' },
              { icon: '馃挰', label: '瀵硅瘽鍘嗗彶' },
            ].map((item) => (
              <View key={item.label} style={styles.migrationStepItem}>
                <Text style={styles.migrationStepIcon}>{item.icon}</Text>
                <Text style={styles.migrationStepLabel}>{item.label}</Text>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 鈺愨晲鈺?STEP 4: DONE 鈺愨晲鈺?*/}
      {step === 'done' && (
        <View>
          <View style={styles.successBadge}>
            <Text style={styles.successIcon}>鉁?/Text>
          </View>
          <Text style={styles.title}>杩佺Щ瀹屾垚锛?/Text>
          <Text style={styles.subtitle}>鎮ㄧ殑 OpenClaw 瀹炰緥宸叉垚鍔熸帴鍏?Agentrix锛屾暟鎹畬鏁翠繚鐣?/Text>

          {migrationResult && (
            <View style={styles.summaryGrid}>
              {[
                { icon: '鈿?, label: '宸插悓姝ユ妧鑳?, value: String(migrationResult.skills.length) },
                { icon: '馃捑', label: '璁板繂鏉＄洰', value: String(migrationResult.memoryEntries.length) },
                { icon: '馃挰', label: '瀵硅瘽鍘嗗彶', value: String(migrationResult.sessionSummaries.length) },
                { icon: '馃敡', label: '閰嶇疆鍚屾', value: migrationResult.config ? '瀹屾垚' : '璺宠繃' },
              ].map((t) => (
                <View key={t.label} style={styles.summaryTile}>
                  <Text style={styles.summaryTileIcon}>{t.icon}</Text>
                  <Text style={styles.summaryTileValue}>{t.value}</Text>
                  <Text style={styles.summaryTileLabel}>{t.label}</Text>
                </View>
              ))}
            </View>
          )}

          {!migrationResult && (
            <View style={styles.migrationNotice}>
              <Text style={styles.migrationNoticeBody}>
                瀹炰緥宸茬粦瀹氭垚鍔熴€傛偍鍙湪璁剧疆涓墜鍔ㄨЕ鍙戞暟鎹縼绉汇€?
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish}>
            <Text style={styles.primaryBtnText}>寮€濮嬩娇鐢?鈫?/Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Sub-components
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

const STEPS: WizardStep[] = ['discover', 'verify', 'migrate', 'done'];
const STEP_LABELS: Record<WizardStep, string> = { discover: '鍙戠幇', verify: '楠岃瘉', migrate: '杩佺Щ', done: '瀹屾垚' };

function StepDots({ current }: { current: WizardStep }) {
  const idx = STEPS.indexOf(current);
  return (
    <View style={styles.stepRow}>
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <View style={[styles.dot, i <= idx && styles.dotActive]}>
            <Text style={[styles.dotLabel, i <= idx && styles.dotLabelActive]}>{STEP_LABELS[s]}</Text>
          </View>
          {i < STEPS.length - 1 && <View style={[styles.stepLine, i < idx && styles.stepLineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

function InfoRow({ icon, label, value, small }: { icon: string; label: string; value: string; small?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoRowIcon}>{icon}</Text>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={[styles.infoRowValue, small && { fontSize: 12 }]} numberOfLines={1} ellipsizeMode="middle">
        {value}
      </Text>
    </View>
  );
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Styles
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 60 },

  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  dot: {
    alignItems: 'center', justifyContent: 'center',
    width: 54, height: 26, borderRadius: 13,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotLabel: { fontSize: 11, color: colors.textMuted },
  dotLabelActive: { color: '#fff', fontWeight: '600' },
  stepLine: { flex: 1, height: 1, backgroundColor: colors.border, marginHorizontal: 2 },
  stepLineActive: { backgroundColor: colors.primary },

  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 20, lineHeight: 20 },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  sectionHint: { fontSize: 13, color: colors.textMuted, marginBottom: 12, lineHeight: 18 },

  tabBar: {
    flexDirection: 'row', borderRadius: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.bgCard },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, color: colors.textMuted },
  tabTextActive: { color: '#fff', fontWeight: '600' },

  input: {
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: colors.text, marginBottom: 4,
  },

  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 16,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  secondaryBtnText: { color: colors.textMuted, fontSize: 14 },

  progressBarBg: {
    height: 8, backgroundColor: colors.bgCard, borderRadius: 4,
    overflow: 'hidden', marginVertical: 16,
  },
  progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  progressLabel: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  candidateCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  candidateName: { fontSize: 15, fontWeight: '600', color: colors.text },
  candidateUrl: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  candidateMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  arrowIcon: { fontSize: 22, color: colors.textMuted },

  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyStateIcon: { fontSize: 40, marginBottom: 8 },
  emptyStateText: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptyStateHint: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 18 },

  infoCard: {
    backgroundColor: colors.bgCard, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  infoRowIcon: { fontSize: 16, width: 28 },
  infoRowLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  infoRowValue: { fontSize: 13, color: colors.text, fontWeight: '500', maxWidth: '55%' },

  migrationNotice: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: `${colors.primary}30`,
  },
  migrationNoticeTitle: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 6 },
  migrationNoticeBody: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },

  migrationStepList: { marginTop: 16 },
  migrationStepItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  migrationStepIcon: { fontSize: 16, marginRight: 10 },
  migrationStepLabel: { flex: 1, fontSize: 14, color: colors.text },

  successBadge: { alignItems: 'center', marginBottom: 12 },
  successIcon: { fontSize: 56 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, marginHorizontal: -6 },
  summaryTile: {
    width: '46%', margin: '2%',
    backgroundColor: colors.bgCard, borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  summaryTileIcon: { fontSize: 24, marginBottom: 6 },
  summaryTileValue: { fontSize: 22, fontWeight: '700', color: colors.text },
  summaryTileLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
});