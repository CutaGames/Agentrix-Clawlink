import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { useAuthStore } from '../stores/authStore';
import {
  loginWithGoogle,
  loginWithTwitter,
  loginWithDiscord,
  loginWithTelegram,
  sendEmailCode,
  loginWithEmailCode,
} from '../services/auth';

const { width, height: SCREEN_H } = Dimensions.get('window');

type LoginProvider = 'google' | 'x' | 'telegram' | 'discord' | 'wallet' | 'email';

// ========== Social Button Config ==========
const SOCIAL_BUTTONS: {
  provider: LoginProvider;
  label: string;
  icon: string;
  gradient: [string, string];
  iconBg: string;
}[] = [
  { provider: 'google', label: 'Google', icon: 'G', gradient: ['#FFFFFF', '#F0F0F0'], iconBg: '#EA4335' },
  { provider: 'x', label: 'X (Twitter)', icon: '𝕏', gradient: ['#1A1A1A', '#000000'], iconBg: '#000' },
  { provider: 'discord', label: 'Discord', icon: 'D', gradient: ['#5865F2', '#4752C4'], iconBg: '#5865F2' },
  { provider: 'telegram', label: 'Telegram', icon: '✈', gradient: ['#2AABEE', '#229ED9'], iconBg: '#2AABEE' },
];

export const LoginScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [loadingProvider, setLoadingProvider] = useState<LoginProvider | null>(null);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleSendCode = useCallback(async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) { Alert.alert('Error', 'Please enter your email address'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { Alert.alert('Error', 'Please enter a valid email address'); return; }

    setLoadingProvider('email');
    try {
      await sendEmailCode(trimmedEmail);
      setOtpSent(true);
      setCountdown(60);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { if (countdownRef.current) clearInterval(countdownRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to send verification code');
    } finally {
      setLoadingProvider(null);
    }
  }, [email]);

  const handleVerifyCode = useCallback(async () => {
    const trimmedCode = otpCode.trim();
    if (!trimmedCode || trimmedCode.length < 4) { Alert.alert('Error', 'Please enter the verification code'); return; }

    setLoadingProvider('email');
    useAuthStore.getState().setLoading(true);
    try {
      await loginWithEmailCode(email.trim(), trimmedCode);
    } catch (error: any) {
      Alert.alert('Login Failed', error?.message || 'Invalid verification code');
      useAuthStore.getState().setLoading(false);
    } finally {
      setLoadingProvider(null);
    }
  }, [email, otpCode]);

  const handleSocialLogin = useCallback(async (provider: LoginProvider) => {
    if (provider === 'wallet') { navigation?.navigate('WalletConnect'); return; }

    setLoadingProvider(provider);
    useAuthStore.getState().setLoading(true);
    try {
      switch (provider) {
        case 'google': await loginWithGoogle(); break;
        case 'x': await loginWithTwitter(); break;
        case 'discord': await loginWithDiscord(); break;
        case 'telegram': await loginWithTelegram(); break;
      }
    } catch (error: any) {
      const message = error?.message || 'Login failed';
      if (!message.includes('cancel')) Alert.alert('Login Failed', message);
      useAuthStore.getState().setLoading(false);
    } finally {
      setLoadingProvider(null);
    }
  }, [navigation]);

  const isDisabled = isLoading || loadingProvider !== null;

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0B1220', '#0F1A2E', '#131F38', '#0B1220']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative orbs */}
      <View style={styles.orbTopRight} />
      <View style={styles.orbBottomLeft} />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ===== Brand ===== */}
            <View style={styles.brandSection}>
              <View style={styles.logoGlow}>
                <View style={styles.logoContainer}>
                  <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
                </View>
              </View>
              <Text style={styles.title}>Agentrix</Text>
              <Text style={styles.tagline}>AI Skill Marketplace</Text>
            </View>

            {/* ===== Social Login Grid ===== */}
            <View style={styles.socialSection}>
              <Text style={styles.sectionLabel}>Quick Login</Text>
              <View style={styles.socialGrid}>
                {SOCIAL_BUTTONS.map(btn => {
                  const isGoogle = btn.provider === 'google';
                  return (
                    <TouchableOpacity
                      key={btn.provider}
                      style={[styles.socialBtn, isDisabled && styles.btnDisabled]}
                      onPress={() => handleSocialLogin(btn.provider)}
                      disabled={isDisabled}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={btn.gradient}
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      <View style={[StyleSheet.absoluteFillObject, styles.socialBtnContent]}>
                        {loadingProvider === btn.provider ? (
                          <ActivityIndicator size="small" color={isGoogle ? '#333' : '#fff'} />
                        ) : (
                          <>
                            <View style={[styles.socialIconCircle, { backgroundColor: isGoogle ? '#EA4335' : 'rgba(255,255,255,0.15)' }]}>
                              <Text style={styles.socialIconText}>{btn.icon}</Text>
                            </View>
                            <Text style={[styles.socialLabel, isGoogle && { color: '#333' }]}>{btn.label}</Text>
                          </>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Wallet */}
              <TouchableOpacity
                style={[styles.walletBtn, isDisabled && styles.btnDisabled]}
                onPress={() => handleSocialLogin('wallet')}
                disabled={isDisabled}
                activeOpacity={0.7}
              >
                <Text style={styles.walletIcon}>🔗</Text>
                <Text style={styles.walletLabel}>Connect Wallet</Text>
              </TouchableOpacity>
            </View>

            {/* ===== Divider ===== */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ===== Email OTP ===== */}
            <View style={styles.emailCard}>
              <Text style={styles.emailTitle}>📧 Email Login</Text>
              <View style={styles.emailRow}>
                <TextInput
                  style={styles.emailInput}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.muted + '80'}
                  value={email}
                  onChangeText={(text) => { setEmail(text); if (otpSent) { setOtpSent(false); setOtpCode(''); } }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isDisabled}
                />
                <TouchableOpacity
                  style={[styles.sendCodeBtn, (isDisabled || countdown > 0) && styles.btnDisabled]}
                  onPress={handleSendCode}
                  disabled={isDisabled || countdown > 0}
                >
                  {loadingProvider === 'email' && !otpSent ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.sendCodeText}>{countdown > 0 ? `${countdown}s` : 'Send'}</Text>
                  )}
                </TouchableOpacity>
              </View>

              {otpSent && (
                <>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="• • • • • •"
                    placeholderTextColor={colors.muted + '60'}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isDisabled}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.verifyBtn, isDisabled && styles.btnDisabled]}
                    onPress={handleVerifyCode}
                    disabled={isDisabled}
                  >
                    {loadingProvider === 'email' && otpSent ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.verifyBtnText}>Sign In</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Loading overlay */}
            {loadingProvider && loadingProvider !== 'email' && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>
                  Connecting to {loadingProvider === 'x' ? 'Twitter/X' : loadingProvider}...
                </Text>
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By continuing, you agree to our{' '}
                <Text style={styles.footerLink}>Terms</Text>
                {' '}and{' '}
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', paddingVertical: 20 },

  // Decorative orbs
  orbTopRight: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: colors.primary + '08',
  },
  orbBottomLeft: {
    position: 'absolute', bottom: -40, left: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#8B5CF6' + '06',
  },

  // Brand
  brandSection: { alignItems: 'center', marginBottom: 28 },
  logoGlow: {
    width: 88, height: 88, borderRadius: 24,
    backgroundColor: colors.primary + '10',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 20,
  },
  logoContainer: { width: 72, height: 72, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.card },
  logo: { width: 72, height: 72 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: 1.5 },
  tagline: { fontSize: 14, color: colors.muted, marginTop: 4, letterSpacing: 0.5 },

  // Social
  socialSection: { marginBottom: 4 },
  sectionLabel: { fontSize: 12, color: colors.muted, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  socialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  socialBtn: {
    width: (width - 48 - 10) / 2,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  socialBtnContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  socialIconCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  socialIconText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  socialLabel: { fontSize: 13, fontWeight: '600', color: '#fff' },
  btnDisabled: { opacity: 0.4 },

  // Wallet
  walletBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 14, marginTop: 10,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderWidth: 1, borderColor: colors.primary + '30',
    gap: 8,
  },
  walletIcon: { fontSize: 16 },
  walletLabel: { fontSize: 14, color: colors.primary, fontWeight: '600' },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.muted, fontSize: 11, marginHorizontal: 14, fontWeight: '700', letterSpacing: 2 },

  // Email card
  emailCard: {
    backgroundColor: 'rgba(20,26,42,0.8)',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border,
    gap: 10,
  },
  emailTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  emailRow: { flexDirection: 'row', gap: 8 },
  emailInput: {
    flex: 1, backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.text,
  },
  sendCodeBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center',
  },
  sendCodeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  otpInput: {
    backgroundColor: colors.bg,
    borderWidth: 1.5, borderColor: colors.primary + '50',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 22, color: colors.text, textAlign: 'center',
    letterSpacing: 10, fontWeight: '700',
  },
  verifyBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Loading
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 8 },
  loadingText: { color: colors.muted, fontSize: 13 },

  // Footer
  footer: { paddingTop: 20, paddingBottom: 8, alignItems: 'center' },
  footerText: { fontSize: 11, color: colors.muted + '80', textAlign: 'center', lineHeight: 16 },
  footerLink: { color: colors.primary, textDecorationLine: 'underline' },
});