import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Platform, Linking, Clipboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import { provisionLocalAgent, getRelayStatus } from '../../services/openclaw.service';
import type { OnboardingStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'LocalDeploy'>;

type Step = 'intro' | 'provisioning' | 'download' | 'waiting';

export function LocalDeployScreen() {
  const navigation = useNavigation<Nav>();
  const { addInstance, setActiveInstance, setOnboardingComplete } = useAuthStore.getState();

  const [step, setStep] = useState<Step>('intro');
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [relayToken, setRelayToken] = useState<string | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<{ win: string; mac: string } | null>(null);
  const [connected, setConnected] = useState(false);
  const [polling, setPolling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Start provisioning ───────────────────────────────────────────────────────
  const handleStart = async () => {
    setStep('provisioning');
    setErrorMsg(null);
    try {
      const result = await provisionLocalAgent({ name: 'My Local Agent', os: Platform.OS as 'android' | 'ios' });
      setInstanceId(result.instanceId);
      setRelayToken(result.relayToken);
      setDownloadUrls(result.downloadUrls);
      setStep('download');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Provisioning failed. Please try again.');
      setStep('intro');
    }
  };

  // ── Poll relay status ────────────────────────────────────────────────────────
  const pollStatus = useCallback(async () => {
    if (!instanceId) return;
    try {
      const res = await getRelayStatus(instanceId);
      if (res.connected) {
        setConnected(true);
        setPolling(false);
      }
    } catch (_) {}
  }, [instanceId]);

  useEffect(() => {
    if (step !== 'waiting' || !instanceId) return;
    setPolling(true);
    const timer = setInterval(pollStatus, 3000);
    return () => clearInterval(timer);
  }, [step, instanceId, pollStatus]);

  // ── On connected → navigate to social bind ──────────────────────────────────
  useEffect(() => {
    if (!connected || !instanceId) return;
    // Add instance to store
    addInstance?.({
      id: instanceId,
      name: 'My Local Agent',
      instanceUrl: '',
      status: 'active',
      deployType: 'local',
    });
    setActiveInstance?.(instanceId);
    navigation.navigate('SocialBind', { instanceId, platform: 'telegram' });
  }, [connected, instanceId]);

  const copyToken = () => {
    if (relayToken) {
      Clipboard.setString(relayToken);
      Alert.alert('Copied', 'Relay token copied to clipboard');
    }
  };

  const openDownload = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Could not open link. Please try again.')
    );
  };

  // ── Rendering ────────────────────────────────────────────────────────────────

  if (step === 'provisioning') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Setting up your local agent...</Text>
      </View>
    );
  }

  if (step === 'intro') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Local Agent</Text>
        <Text style={styles.subtitle}>
          Run your AI agent on your own PC — fully private, zero cloud cost, connects via our
          secure relay.
        </Text>

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {errorMsg}</Text>
          </View>
        )}

        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.requirementBox}>
          <Text style={styles.requirementTitle}>Requirements</Text>
          <Text style={styles.requirementItem}>• Windows 10+ or macOS 12+</Text>
          <Text style={styles.requirementItem}>• Ollama (free) or any OpenAI-compatible LLM</Text>
          <Text style={styles.requirementItem}>• Internet connection for relay</Text>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleStart} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Get Started →</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === 'download') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Download Agent</Text>
        <Text style={styles.subtitle}>
          Download and run the installer on your PC. It will connect automatically.
        </Text>

        {/* Download buttons */}
        <View style={styles.downloadRow}>
          <TouchableOpacity
            style={[styles.downloadBtn, styles.downloadBtnWin]}
            activeOpacity={0.85}
            onPress={() => downloadUrls && openDownload(downloadUrls.win)}
          >
            <Text style={styles.downloadIcon}>🪟</Text>
            <Text style={styles.downloadBtnText}>Windows</Text>
            <Text style={styles.downloadBtnSub}>.exe — one click</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.downloadBtn, styles.downloadBtnMac]}
            activeOpacity={0.85}
            onPress={() => downloadUrls && openDownload(downloadUrls.mac)}
          >
            <Text style={styles.downloadIcon}>🍎</Text>
            <Text style={styles.downloadBtnText}>macOS</Text>
            <Text style={styles.downloadBtnSub}>Universal binary</Text>
          </TouchableOpacity>
        </View>

        {/* Token display */}
        <View style={styles.tokenCard}>
          <Text style={styles.tokenLabel}>Your Relay Token</Text>
          <View style={styles.tokenRow}>
            <Text style={styles.tokenValue} numberOfLines={1} ellipsizeMode="middle">
              {relayToken}
            </Text>
            <TouchableOpacity onPress={copyToken} style={styles.copyBtn}>
              <Text style={styles.copyBtnText}>Copy</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.tokenHint}>
            The app will ask for this token on first launch.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => setStep('waiting')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>I've launched the app →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // step === 'waiting'
  return (
    <View style={styles.centered}>
      <View style={styles.waitingCard}>
        <Text style={styles.waitingEmoji}>{connected ? '✅' : '⏳'}</Text>
        <Text style={styles.waitingTitle}>
          {connected ? 'Agent Connected!' : 'Waiting for your agent...'}
        </Text>
        <Text style={styles.waitingSubtitle}>
          {connected
            ? 'Your local agent is online. Setting up social binding...'
            : 'Launch the downloaded app on your PC. It will connect automatically.'}
        </Text>
        {!connected && (
          <>
            <ActivityIndicator
              size="small"
              color={colors.accent}
              style={{ marginTop: 20, marginBottom: 8 }}
            />
            <Text style={styles.pollingText}>Checking every 3s...</Text>
          </>
        )}
      </View>
      {!connected && (
        <TouchableOpacity onPress={() => setStep('download')} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Go back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const FEATURES = [
  { icon: '🔒', text: 'Fully private — messages stay on your PC' },
  { icon: '💸', text: 'Free tier: no monthly cloud fee' },
  { icon: '⚡', text: 'Use any local LLM (Ollama, LM Studio, etc.)' },
  { icon: '📲', text: 'Connect via Telegram, WeChat and more' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 24, paddingTop: 56, paddingBottom: 48 },
  centered: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 },
  subtitle: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: 28 },
  loadingText: { marginTop: 20, fontSize: 15, color: colors.textSecondary },

  errorBox: {
    backgroundColor: colors.error + '22',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.error + '55',
  },
  errorText: { color: colors.error, fontSize: 14, lineHeight: 20 },

  featureList: { gap: 12, marginBottom: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { fontSize: 22, width: 34, textAlign: 'center' },
  featureText: { fontSize: 14, color: colors.textSecondary, flex: 1, lineHeight: 20 },

  requirementBox: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  requirementTitle: { fontSize: 13, fontWeight: '700', color: colors.accent, marginBottom: 6 },
  requirementItem: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },

  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: colors.bgPrimary },

  backLink: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  backLinkText: { fontSize: 14, color: colors.textMuted },

  downloadRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  downloadBtn: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  downloadBtnWin: { borderColor: colors.primary + '88' },
  downloadBtnMac: { borderColor: colors.textMuted + '88' },
  downloadIcon: { fontSize: 32 },
  downloadBtnText: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  downloadBtnSub: { fontSize: 11, color: colors.textMuted },

  tokenCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  tokenLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8 },
  tokenRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tokenValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'monospace',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  copyBtn: {
    backgroundColor: colors.accent + '22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: { fontSize: 13, fontWeight: '700', color: colors.accent },
  tokenHint: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },

  waitingCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 360,
  },
  waitingEmoji: { fontSize: 52, marginBottom: 16 },
  waitingTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  waitingSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  pollingText: { fontSize: 12, color: colors.textMuted },
});
