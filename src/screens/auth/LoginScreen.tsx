import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Dimensions, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import { loginWithGoogle, loginWithApple, loginWithX, loginWithTelegram, loginWithEmail } from '../../services/auth';
import { loginWithOpenClaw } from '../../services/auth';
import type { AuthStackParamList } from '../../navigation/types';

const { width } = Dimensions.get('window');
type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const SOCIAL_PROVIDERS = [
  { id: 'google', label: 'Google', emoji: '🌐', color: '#4285f4' },
  { id: 'x', label: 'X (Twitter)', emoji: '🐦', color: '#1d9bf0' },
  { id: 'telegram', label: 'Telegram', emoji: '✈️', color: '#229ed9' },
  { id: 'discord', label: 'Discord', emoji: '🎮', color: '#5865f2' },
  { id: 'apple', label: 'Apple', emoji: '🍎', color: '#ffffff' },
];

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { setAuth } = useAuthStore.getState();
  const [mode, setMode] = useState<'openclaw' | 'social' | 'email'>('openclaw');
  const [instanceUrl, setInstanceUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleOpenClawLogin = async () => {
    const url = instanceUrl.trim();
    if (!url) {
      Alert.alert('OpenClaw URL required', 'Enter your OpenClaw instance URL (e.g. http://localhost:3001)');
      return;
    }
    try {
      setLoading(true);
      const result = await loginWithOpenClaw({ instanceUrl: url });
      if (result?.user && result?.token) {
        await setAuth(result.user, result.token);
      }
    } catch (err: any) {
      Alert.alert('Login Failed', err?.message || 'Could not connect to OpenClaw instance');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    try {
      setLoadingProvider(provider);
      let result: any;
      if (provider === 'google') result = await loginWithGoogle();
      else if (provider === 'x') result = await loginWithX();
      else if (provider === 'telegram') result = await loginWithTelegram();
      else if (provider === 'apple') result = await loginWithApple();
      else return;
      if (result?.user && result?.token) {
        await setAuth(result.user, result.token);
      }
    } catch (err: any) {
      Alert.alert('Login Failed', err?.message || `${provider} login failed`);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Enter your email and password');
      return;
    }
    try {
      setLoading(true);
      const result = await loginWithEmail(email.trim(), password.trim());
      if (result?.user && result?.token) {
        await setAuth(result.user, result.token);
      }
    } catch (err: any) {
      Alert.alert('Login Failed', err?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Logo */}
      <View style={styles.header}>
        <Text style={styles.logo}>🦀 ClawLink</Text>
        <Text style={styles.tagline}>Your OpenClaw companion app</Text>
      </View>

      {/* Mode Tabs */}
      <View style={styles.modeTabs}>
        {(['openclaw', 'social', 'email'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeTab, mode === m && styles.modeTabActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.modeTabText, mode === m && styles.modeTabTextActive]}>
              {m === 'openclaw' ? '🤖 OpenClaw' : m === 'social' ? '🌐 Social' : '📧 Email'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* OpenClaw Mode */}
      {mode === 'openclaw' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connect your OpenClaw instance</Text>
          <Text style={styles.sectionSub}>
            Have an OpenClaw instance? Enter its URL to sign in directly.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="http://localhost:3001  or  https://my-openclaw.xyz"
            placeholderTextColor={colors.textMuted}
            value={instanceUrl}
            onChangeText={setInstanceUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleOpenClawLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Connect & Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Don't have one?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMode('social')}>
            <Text style={styles.secondaryBtnText}>Register with social account →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Social Mode */}
      {mode === 'social' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sign in with social account</Text>
          <Text style={styles.sectionSub}>
            Create a ClawLink account and set up your agent after login.
          </Text>
          <View style={styles.socialGrid}>
            {SOCIAL_PROVIDERS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.socialBtn, loadingProvider === p.id && styles.btnDisabled]}
                onPress={() => handleSocialLogin(p.id)}
                disabled={!!loadingProvider}
              >
                {loadingProvider === p.id ? (
                  <ActivityIndicator color={colors.accent} size="small" />
                ) : (
                  <>
                    <Text style={styles.socialEmoji}>{p.emoji}</Text>
                    <Text style={styles.socialLabel}>{p.label}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Email Mode */}
      {mode === 'email' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email & Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleEmailLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        By continuing you agree to ClawLink's Terms of Service and Privacy Policy.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 36, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1 },
  tagline: { fontSize: 14, color: colors.textMuted, marginTop: 6 },
  modeTabs: { flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: 12, padding: 4, marginBottom: 24 },
  modeTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  modeTabActive: { backgroundColor: colors.bgSecondary },
  modeTabText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  modeTabTextActive: { color: colors.accent },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 8 },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    color: colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textMuted },
  socialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  socialBtn: {
    width: (width - 48 - 20) / 2,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  socialEmoji: { fontSize: 18 },
  socialLabel: { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
  footer: { marginTop: 32, textAlign: 'center', fontSize: 11, color: colors.textMuted, lineHeight: 18 },
});
