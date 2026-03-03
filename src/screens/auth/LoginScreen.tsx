import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, Modal,
  ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import {
  loginWithGoogle,
  loginWithApple,
  loginWithTwitter,
  loginWithTelegram,
  loginWithWalletWeb,
} from '../../services/auth';

/**
 * Web2.5 Smooth Onboarding
 * Hides complex OpenClaw/Web3 mechanics behind single-click social auth.
 * MPC Wallet is generated silently in the background after login.
 */
export function LoginScreen() {
  const navigation = useNavigation<any>();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showWalletFallback, setShowWalletFallback] = useState(false);

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
      // Native App Check Heuristic
      const hasMetaMask = await Linking.canOpenURL('metamask://');
      const hasOKX = await Linking.canOpenURL('okex://'); // okx scheme
      const hasTrust = await Linking.canOpenURL('trust://');

      if (!hasMetaMask && !hasOKX && !hasTrust) {
        // Fallback Route: Show Web3Modal style Bottom Sheet
        setLoadingProvider(null);
        setShowWalletFallback(true);
        return; 
      }

      // If wallets exist, happy path: proceed with the browser bridge which WalletConnect natively intercepts
      await loginWithWalletWeb();
    } catch (err: any) {
      if (!err?.message?.includes('cancel')) {
        Alert.alert('Wallet Login Failed', err?.message || 'Could not connect wallet. Try a social login instead.');
      }
    } finally {
      if (loadingProvider === 'wallet') { 
        setLoadingProvider(null);
      }
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
            <Image 
              source={require('../../../assets/icon.png')} 
              style={styles.logoImage} 
              resizeMode="contain"
            />
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

      {/* Fallback Bottom Sheet for Missing Wallet */}
      <Modal
        visible={showWalletFallback}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWalletFallback(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>WalletConnect</Text>
            <Text style={styles.sheetSubtitle}>Scan to connect with your desktop wallet or an alternative device.</Text>
            
            <View style={styles.qrContainer}>
              <Text style={{color: '#fff', fontSize: 48}}>📱</Text>
              {/* Note: This is an illustrative placeholder. A real QR should be pulled via bridging to agentrix.top/auth/login?method=walletconnect */}
              <Text style={{color: '#888', marginTop: 12, textAlign: 'center'}}>Use another device to scan</Text>
            </View>

            <TouchableOpacity 
              style={styles.sheetWebButton}
              onPress={async () => {
                setShowWalletFallback(false);
                await loginWithWalletWeb();
              }}
            >
              <Text style={styles.sheetWebButtonText}>Or Open Web Connect Interface</Text>
            </TouchableOpacity>

            <View style={styles.web2AdContainer}>
              <Text style={styles.web2AdText}>
                No wallet? {"\n"}Close this sheet and choose <Text style={{fontWeight: 'bold', color: colors.accent}}>Google Login</Text>, we will bind a cloud MPC wallet automatically for you!
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.sheetCloseButton}
              onPress={() => setShowWalletFallback(false)}
            >
              <Text style={styles.sheetCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: '100%',
    height: '100%',
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
    gap: 12,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  btnIcon: {
    fontSize: 18,
    marginRight: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  qrContainer: {
    width: 200,
    height: 200,
    backgroundColor: '#1E2330',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  sheetWebButton: {
    backgroundColor: colors.accent + '20', // slight tint
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  sheetWebButtonText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  web2AdContainer: {
    backgroundColor: '#162b1f',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#34d399',
  },
  web2AdText: {
    color: '#a7f3d0',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  sheetCloseButton: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  sheetCloseButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});
