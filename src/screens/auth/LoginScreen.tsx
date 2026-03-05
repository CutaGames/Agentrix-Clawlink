import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Dimensions, ActivityIndicator, Linking, Platform, Image, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../stores/i18nStore';
import { loginWithGoogle, loginWithApple, loginWithX, loginWithTelegram, loginWithEmail, registerWithEmail } from '../../services/auth';
import { loginWithOpenClaw } from '../../services/auth';
import type { AuthStackParamList } from '../../navigation/types';

const { width } = Dimensions.get('window');
type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const WALLET_PROVIDERS = [
  { id: 'metamask', label: 'MetaMask', emoji: '🦊', scheme: 'metamask://' },
  { id: 'okx', label: 'OKX Wallet', emoji: '🖤', scheme: 'okx://' },
  { id: 'okex', label: 'OKEx (Legacy)', emoji: '🔳', scheme: 'okex://' },
  { id: 'imtoken', label: 'imToken', emoji: '💎', scheme: 'imtokenv2://' },
  { id: 'bitget', label: 'Bitget Wallet', emoji: '📈', scheme: 'bitkeep://' },
  { id: 'tp', label: 'TokenPocket', emoji: '🔵', scheme: 'tpoutside://' },
];

const SOCIAL_PROVIDERS = [
  { id: 'google', label: 'Google', emoji: '🌐', color: '#4285f4' },
  { id: 'x', label: 'X (Twitter)', emoji: '🐦', color: '#1d9bf0' },
  { id: 'telegram', label: 'Telegram', emoji: '✈️', color: '#229ed9' },
  { id: 'discord', label: 'Discord', emoji: '🎮', color: '#5865f2' },
];

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { setAuth } = useAuthStore.getState();
  const { t } = useI18n();
  const [mode, setMode] = useState<'web25' | 'openclaw' | 'email'>('web25');
  const [isSignUp, setIsSignUp] = useState(false);
  const [instanceUrl, setInstanceUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  
  // Wallet detection
  const [detectedWallets, setDetectedWallets] = useState<typeof WALLET_PROVIDERS>([]);
  const [showWalletModal, setShowWalletModal] = useState(false);

  useEffect(() => {
    checkWallets();
  }, []);

  const checkWallets = async () => {
    const detected = [];
    for (const w of WALLET_PROVIDERS) {
      try {
        const canOpen = await Linking.canOpenURL(w.scheme);
        if (canOpen) detected.push(w);
      } catch (e) {}
    }
    setDetectedWallets(detected);
  };

  const handleWalletLogin = async (wallet?: typeof WALLET_PROVIDERS[0]) => {
    if (!wallet && detectedWallets.length > 1) {
      setShowWalletModal(true);
      return;
    }
    
    const target = wallet || detectedWallets[0];
    if (target) {
      // Navigate to WalletConnect screen which handles the full nonce→sign→verify flow
      (navigation as any).navigate('WalletConnect', { walletId: target.id });
    } else {
      // No wallet detected — show WalletConnect screen for manual entry
      (navigation as any).navigate('WalletConnect');
    }
    setShowWalletModal(false);
  };

  const handleOpenClawLogin = async () => {
    const url = instanceUrl.trim();
    if (!url) {
      Alert.alert(t({ en: 'OpenClaw URL required', zh: '请输入 OpenClaw URL' }), t({ en: 'Enter your OpenClaw instance URL (e.g. http://localhost:3001)', zh: '请输入你的 OpenClaw 实例地址（如 http://localhost:3001）' }));
      return;
    }
    try {
      setLoading(true);
      const result = await loginWithOpenClaw({ instanceUrl: url, apiToken: '' }) as any;
      if (result?.user && result?.token) {
        await setAuth(result.user, result.token);
      }
    } catch (err: any) {
      Alert.alert(
        t({ en: 'Connection Failed', zh: '连接失败' }),
        err?.message || t({ en: 'Could not connect to OpenClaw instance. The server might be offline. Do you want to force bind it anyway?', zh: '无法连接到 OpenClaw 实例，服务器可能离线。是否强制绑定？' }),
        [
          { text: t({ en: 'Cancel', zh: '取消' }), style: 'cancel' },
          {
            text: t({ en: 'Force Bind', zh: '强制绑定' }),
            style: 'destructive',
            onPress: async () => {
              // Mock a successful login for demo/testing purposes
              const mockUser = {
                id: 'mock-user-id',
                agentrixId: 'mock-agentrix-id',
                nickname: 'OpenClaw User',
                roles: ['user'],
                provider: 'openclaw' as const,
                openClawInstances: [{
                  id: 'mock-instance-id',
                  name: 'My OpenClaw',
                  instanceUrl: url,
                  status: 'active' as const,
                  deployType: 'cloud' as const,
                }],
                activeInstanceId: 'mock-instance-id',
              };
              await setAuth(mockUser, 'mock-token-123');
            }
          }
        ]
      );
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
      // handleLoginResult (inside loginWith*) already calls setAuth + fetches instances.
      // Do NOT call setAuth again here — it would overwrite instances.
    } catch (err: any) {
      Alert.alert(
        t({ en: 'Login Failed', zh: '登录失败' }), 
        err?.message || `${provider} ${t({ en: 'login failed. Do you want to mock login for testing?', zh: '登录失败。是否使用模拟登录进行测试？' })}`,
        [
          { text: t({ en: 'Cancel', zh: '取消' }), style: 'cancel' },
          {
            text: t({ en: 'Mock Login', zh: '模拟登录' }),
            onPress: async () => {
              const mockUser = {
                id: `mock-${provider}-user`,
                agentrixId: `mock-${provider}-agentrix`,
                nickname: `${provider} User`,
                roles: ['user'],
                provider: provider as any,
              };
              await setAuth(mockUser, `mock-${provider}-token`);
            }
          }
        ]
      );
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t({ en: 'Missing Fields', zh: '请填写完整' }), t({ en: 'Enter your email and password', zh: '请输入邮筱和密码' }));
      return;
    }
    try {
      setLoading(true);
      const result = isSignUp 
        ? await registerWithEmail(email.trim(), password.trim()) as any
        : await loginWithEmail(email.trim(), password.trim()) as any;
      // handleLoginResult (inside loginWithEmail/registerWithEmail) already calls setAuth.
      // Do NOT call setAuth again here — it would overwrite instances.
    } catch (err: any) {
      Alert.alert(isSignUp ? t({ en: 'Registration Failed', zh: '注册失败' }) : t({ en: 'Login Failed', zh: '登录失败' }), err?.message || t({ en: 'Invalid credentials', zh: '账号或密码错误' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Brand Header */}
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoInitials}>AX</Text>
        </View>
        <Text style={styles.logoText}>Agentrix</Text>
        <Text style={styles.tagline}>Intelligent Agents at your Fingertips</Text>
      </View>

      {/* Web2.5 Main Login Area */}
      {mode === 'web25' && (
        <View style={styles.section}>
          <Text style={styles.web25Title}>{t({ en: 'Welcome Back', zh: '欢迎回来' })}</Text>
          <Text style={styles.web25Sub}>{t({ en: 'Choose your preferred sign-in method', zh: '选择你偏好的登录方式' })}</Text>

          {/* Primary Wallet Login */}
          <TouchableOpacity 
            style={styles.walletMainBtn} 
            onPress={() => handleWalletLogin()}
            activeOpacity={0.8}
          >
            <View style={styles.walletIconRow}>
              {detectedWallets.slice(0, 3).map(w => (
                <Text key={w.id} style={styles.walletBadge}>{w.emoji}</Text>
              ))}
              {detectedWallets.length === 0 && <Text style={styles.walletBadge}>💼</Text>}
            </View>
            <Text style={styles.walletMainText}>
              {detectedWallets.length > 0 ? t({ en: 'Connect Wallet', zh: '连接钉包' }) : t({ en: 'Connect Crypto Wallet', zh: '连接加密钉包' })}
            </Text>
            {detectedWallets.length > 0 && (
              <Text style={styles.walletDetectedText}>Detected: {detectedWallets.map(w => w.label).join(', ')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t({ en: 'or social sign-in', zh: '或社交账号登录' })}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Grid */}
          <View style={styles.socialGridWide}>
            {SOCIAL_PROVIDERS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.socialBtnWide, loadingProvider === p.id && styles.btnDisabled]}
                onPress={() => handleSocialLogin(p.id)}
                disabled={!!loadingProvider}
              >
                {loadingProvider === p.id ? (
                  <ActivityIndicator color={colors.accent} size="small" />
                ) : (
                  <>
                    <Text style={[styles.socialEmoji, { color: p.color }]}>{p.emoji}</Text>
                    <Text style={styles.socialLabelWide}>{p.label}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.linkRow} onPress={() => setMode('email')}>
            <Text style={styles.linkText}>{t({ en: 'Use Email Address instead →', zh: '使用邮筱登录 →' })}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* OpenClaw Mode */}
      {mode === 'openclaw' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t({ en: 'Connect OpenClaw Instance', zh: '连接 OpenClaw 实例' })}</Text>
          <Text style={styles.sectionSub}>
            {t({ en: 'Enter your instance URL to sign in directly.', zh: '输入你的实例地址直接登录。' })}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="https://my-openclaw.xyz"
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
              <Text style={styles.primaryBtnText}>{t({ en: 'Connect & Sign In', zh: '连接并登录' })}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={() => setMode('web25')}>
            <Text style={styles.backBtnText}>← {t({ en: 'Back to Web2.5 Login', zh: '返回 Web2.5 登录' })}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Email Mode */}
      {mode === 'email' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isSignUp ? t({ en: 'Create Account', zh: '注册账号' }) : t({ en: 'Sign In with Email', zh: '邮筱登录' })}</Text>
          <TextInput
            style={styles.input}
            placeholder={t({ en: 'Email', zh: '邮筱' })}
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder={t({ en: 'Password', zh: '密码' })}
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
              <Text style={styles.primaryBtnText}>{isSignUp ? t({ en: 'Create Account', zh: '注册账号' }) : t({ en: 'Sign In', zh: '登录' })}</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={{ color: colors.accent, fontSize: 14 }}>
              {isSignUp ? t({ en: 'Already have an account? Sign In', zh: '已有账号？登录' }) : t({ en: "Don't have an account? Sign Up", zh: '没有账号？注册' })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={() => setMode('web25')}>
            <Text style={styles.backBtnText}>← {t({ en: 'Back to Web2.5 Login', zh: '返回 Web2.5 登录' })}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showWalletModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t({ en: 'Select Wallet', zh: '选择钉包' })}</Text>
            <View style={styles.modalGrid}>
              {detectedWallets.map(w => (
                <TouchableOpacity key={w.id} style={styles.modalItem} onPress={() => { setShowWalletModal(false); handleWalletLogin(w); }}>
                  <Text style={styles.modalEmoji}>{w.emoji}</Text>
                  <Text style={styles.modalLabel}>{w.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowWalletModal(false)}>
              <Text style={styles.modalCloseText}>{t({ en: 'Cancel', zh: '取消' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Instance Bind Link - Hidden for regular users */}
      <TouchableOpacity 
        style={{ marginTop: 40, alignSelf: 'center' }} 
        onPress={() => setMode('openclaw')}
      >
        <Text style={{ color: colors.textMuted, fontSize: 12, textDecorationLine: 'underline' }}>
          Legacy OpenClaw Login
        </Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        {t({ en: 'By continuing you agree to Agentrix Terms of Service and Privacy Policy.', zh: '继续即表示你同意 Agentrix 服务条款和隐私政策。' })}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 24, paddingTop: 80, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 48 },
  logoCircle: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 },
  logoInitials: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  logoText: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  
  web25Title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  web25Sub: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: 32 },
  
  walletMainBtn: { backgroundColor: colors.primary, borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 5 },
  walletIconRow: { flexDirection: 'row', gap: -8, marginBottom: 12 },
  walletBadge: { fontSize: 24, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', padding: 4, borderWidth: 2, borderColor: colors.primary },
  walletMainText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  walletDetectedText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },

  socialGridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  socialBtnWide: {
    width: (width - 48 - 12) / 2,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  socialEmoji: { fontSize: 24, marginBottom: 8 },
  socialLabelWide: { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
  
  linkRow: { alignItems: 'center', marginTop: 24 },
  linkText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
  
  section: { width: '100%' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  sectionSub: { fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
  
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backBtn: { marginTop: 20, padding: 12, alignItems: 'center' },
  backBtnText: { color: colors.textSecondary, fontSize: 15 },
  
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 32 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 13, color: colors.textMuted },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.bgSecondary, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 48 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 24 },
  modalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  modalItem: { width: (width - 64 - 32) / 3, alignItems: 'center', gap: 8 },
  modalEmoji: { fontSize: 32 },
  modalLabel: { color: colors.textPrimary, fontSize: 12, textAlign: 'center' },
  modalClose: { marginTop: 32, padding: 16, borderRadius: 16, backgroundColor: colors.bgCard, alignItems: 'center' },
  modalCloseText: { color: colors.textSecondary, fontWeight: '600' },

  footer: { marginTop: 40, textAlign: 'center', fontSize: 12, color: colors.textMuted, lineHeight: 20 },
});

