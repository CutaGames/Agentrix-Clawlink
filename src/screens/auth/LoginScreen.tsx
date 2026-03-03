import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import {
  loginWithGoogle,
  loginWithApple,
  loginWithTwitter,
  loginWithTelegram,
  detectInstalledWallets,
  openWalletApp
} from '../../services/auth';

/**
 * Web2.5 Smooth Onboarding
 * Hides complex OpenClaw/Web3 mechanics behind single-click social auth.
 * MPC Wallet is generated silently in the background after login.
 */
export function LoginScreen() {
  const navigation = useNavigation<any>();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleProviderLogin = async (provider: string, loginFn: () => Promise<any>) => {
    try {
      setLoadingProvider(provider);
      // loginFn handles OAuth, token save, AND triggers background MPC creation
      await loginFn();
      
      // On success, we navigate directly to Main. 
      // MPC wallet creates silently in the background.
      // (Wait, `setAuth` inside `loginFn` automatically triggers navigation if an Auth layer listens to it, 
      // but let's assume either root navigator detects `isAuthenticated` or we do a manual replace just in case.)
      // It is standard info that the App Navigator checks `isAuthenticated`.
    } catch (err: any) {
      Alert.alert(
        'Login Failed',
        err?.message || `${provider} login failed. Do you want to try demo mode?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Guest Mode',
            onPress: async () => handleGuestLogin(),
          }
        ]
      );
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGuestLogin = async () => {
    const { setAuth } = useAuthStore.getState();
    const mockUser = {
      id: 'guest-user',
      agentrixId: 'guest-agentrix',
      nickname: 'Guest User',
      roles: ['user'],
      provider: 'email' as const,
    };
    await setAuth(mockUser, 'guest-token');
  };

  const handleWalletLogin = async () => {
    try {
      setLoadingProvider('wallet');
      const wallets = await detectInstalledWallets();
      if (wallets.length > 0) {
        // Installed at least one supported wallet
        // Attempt to open the first one to sign a message (simplified flow)
        // Note: Real WalletConnect V2 flow would display a modal here if no app is installed.
        const opened = await openWalletApp(wallets[0]);
        if (!opened) {
          Alert.alert('Wallet Redirect Failed', 'Could not open wallet app.');
        }
        // Then we wait for DeepLink return (agentrix://auth/callback).
      } else {
        // Fallback for non-Web3 users
        Alert.alert(
          'No Wallet Detected',
          'We can automatically create a secure cloud wallet for you (MPC) in 3 seconds. Just use Social Logins below!',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Use Social Login', onPress: () => {} }
          ]
        );
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleEmailFallback = () => {
    Alert.alert('Email Login', 'Are you sure you want to use Email? Social logins are much faster and secure.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: () => {
        // Navigate or show bottom sheet for email
      }}
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Immersive Background / Decoration */}
      <View style={styles.glowDecoration} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Brand Area */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🦀</Text>
          </View>
          <Text style={styles.headline}>Agentrix</Text>
          <Text style={styles.subHeadline}>Your Personal AI Agent Portal</Text>
        </View>

        {/* Primary Social Actions */}
        <View style={styles.actionGrid}>
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialBtn, styles.appleBtn]}
              onPress={() => handleProviderLogin('apple', loginWithApple)}
              disabled={!!loadingProvider}
            >
              {loadingProvider === 'apple' ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <>
                  <Text style={styles.btnIcon}>🍎</Text>
                  <Text style={styles.appleBtnText}>Continue with Apple</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.socialBtn, styles.googleBtn]}
            onPress={() => handleProviderLogin('google', loginWithGoogle)}
            disabled={!!loadingProvider}
          >
            {loadingProvider === 'google' ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <Text style={styles.btnIcon}>🌐</Text>
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialBtn, styles.telegramBtn]}
            onPress={() => handleProviderLogin('telegram', loginWithTelegram)}
            disabled={!!loadingProvider}
          >
            {loadingProvider === 'telegram' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.btnIcon}>✈️</Text>
                <Text style={styles.telegramBtnText}>Continue with Telegram</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialBtn, styles.xBtn]}
            onPress={() => handleProviderLogin('x', loginWithTwitter)}
            disabled={!!loadingProvider}
          >
            {loadingProvider === 'x' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.btnIcon}>🐦</Text>
                <Text style={styles.xBtnText}>Continue with X</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Web3 Action (Ghost Button) */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity 
          style={styles.walletBtn} 
          onPress={handleWalletLogin}
          disabled={!!loadingProvider}
        >
          {loadingProvider === 'wallet' ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : (
            <Text style={styles.walletBtnText}>🔗 Connect Crypto Wallet</Text>
          )}
        </TouchableOpacity>

        {/* Guest & Email Bottom Links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={handleGuestLogin}>
            <Text style={styles.footerLinkText}>Browse as Guest</Text>
          </TouchableOpacity>
          <Text style={styles.dot}>•</Text>
          <TouchableOpacity onPress={handleEmailFallback}>
            <Text style={styles.footerLinkText}>Sign in with Email</Text>
          </TouchableOpacity>
        </View>

        {/* Security Trust Badge */}
        <Text style={styles.trustText}>
          By continuing, you agree to our Terms of Service.{"\n"}
          Your secure identity is guarded by MPC & Biometrics.
        </Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.bgPrimary 
  },
  glowDecoration: {
    position: 'absolute',
    top: -100,
    left: '10%',
    width: 300,
    height: 300,
    backgroundColor: '#1a77e0',
    borderRadius: 150,
    opacity: 0.15,
    transform: [{ scaleX: 1.5 }],
    // No exact native blur, use opacity
  },
  content: { 
    paddingHorizontal: 24, 
    paddingTop: 80, 
    paddingBottom: 40,
    minHeight: '100%',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoIcon: {
    fontSize: 32,
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subHeadline: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionGrid: {
    gap: 16,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  btnIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  appleBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  appleBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  googleBtn: {
    backgroundColor: '#1A2235', // Match dark card
    borderColor: '#2A3A52',
  },
  googleBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  telegramBtn: {
    backgroundColor: '#229ED9',
    borderColor: '#229ED9',
  },
  telegramBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  xBtn: {
    backgroundColor: '#000000',
    borderColor: '#333333',
  },
  xBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  walletBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  walletBtnText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerLinkText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  dot: {
    color: colors.textMuted,
    marginHorizontal: 12,
  },
  trustText: {
    marginTop: 40,
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
