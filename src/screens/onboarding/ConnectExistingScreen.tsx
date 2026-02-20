import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import { bindOpenClaw } from '../../services/openclaw.service';
import type { OnboardingStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'ConnectExisting'>;

export function ConnectExistingScreen() {
  const navigation = useNavigation<Nav>();
  const { addInstance, setActiveInstance, setOnboardingComplete } = useAuthStore.getState();
  const [instanceUrl, setInstanceUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'manual' | 'lan'>('manual');

  const handleConnect = async () => {
    const url = instanceUrl.trim();
    if (!url) {
      Alert.alert('URL Required', 'Enter your OpenClaw instance URL');
      return;
    }
    setLoading(true);
    try {
      const result = await bindOpenClaw({ instanceUrl: url, apiToken: apiToken.trim() || undefined });
      const instance = {
        id: result.instanceId,
        name: result.name || 'My OpenClaw',
        instanceUrl: url,
        status: 'active' as const,
        deployType: 'existing' as const,
      };
      addInstance(instance);
      setActiveInstance(instance.id);
      setOnboardingComplete();
    } catch (err: any) {
      Alert.alert('Connection Failed', err?.message || 'Could not connect to this instance. Check the URL and token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Connect Existing Instance</Text>
      <Text style={styles.subtitle}>
        Enter your OpenClaw instance URL. Find it in your OpenClaw settings or admin panel.
      </Text>

      {/* Mode selector */}
      <View style={styles.tabs}>
        {(['manual', 'lan'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.tab, mode === m && styles.tabActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
              {m === 'manual' ? '⌨️ Manual' : '📡 LAN Discovery'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'manual' ? (
        <View style={styles.fields}>
          <Text style={styles.label}>Instance URL</Text>
          <TextInput
            style={styles.input}
            placeholder="http://192.168.1.100:3001  or  https://myagent.example.com"
            placeholderTextColor={colors.textMuted}
            value={instanceUrl}
            onChangeText={setInstanceUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
          <Text style={styles.label}>API Token (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="sk-oc-xxxxx (leave blank for default)"
            placeholderTextColor={colors.textMuted}
            value={apiToken}
            onChangeText={setApiToken}
            autoCapitalize="none"
            secureTextEntry
          />
        </View>
      ) : (
        <View style={styles.lanBox}>
          <Text style={styles.lanIcon}>📡</Text>
          <Text style={styles.lanTitle}>LAN Discovery</Text>
          <Text style={styles.lanSub}>
            Scanning your local network for OpenClaw instances...
          </Text>
          <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
          <Text style={styles.lanNote}>
            Make sure your OpenClaw instance is running and on the same network.
          </Text>
        </View>
      )}

      {mode === 'manual' && (
        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={handleConnect}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>🔗 Connect Instance</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>← Back to options</Text>
      </TouchableOpacity>

      <View style={styles.helpBox}>
        <Text style={styles.helpTitle}>Where to find instance URL?</Text>
        <Text style={styles.helpText}>
          • <Text style={{ color: colors.accent }}>Local</Text>: Open OpenClaw → Settings → API Info{'\n'}
          • <Text style={{ color: colors.accent }}>Server</Text>: Check your deployment config{'\n'}
          • <Text style={{ color: colors.accent }}>Cloud</Text>: From ClawLink Cloud dashboard
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 24, paddingTop: 48, paddingBottom: 40, gap: 16 },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  tabs: { flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: colors.bgSecondary },
  tabText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.accent },
  fields: { gap: 12 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backBtn: { alignItems: 'center', padding: 10 },
  backBtnText: { color: colors.textMuted, fontSize: 14 },
  helpBox: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helpTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  helpText: { fontSize: 13, color: colors.textMuted, lineHeight: 22 },
  lanBox: { alignItems: 'center', padding: 32, gap: 8 },
  lanIcon: { fontSize: 48 },
  lanTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  lanSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  lanNote: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
});
