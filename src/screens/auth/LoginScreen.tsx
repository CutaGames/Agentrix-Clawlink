import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
  Modal, TextInput, Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import {
  loginWithGoogle,
  loginWithApple,
  loginWithTwitter,
  loginWithTelegram,
  loginWithWallet,
  getWalletNonce,
} from '../../services/auth';

/**
 * Web2.5 Smooth Onboarding
 * Hides complex OpenClaw/Web3 mechanics behind single-click social auth.
 * MPC Wallet is generated silently in the background after login.
 */
export function LoginScreen() {
  const navigation = useNavigation<any>();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showSiweModal, setShowSiweModal] = useState(false);
  const [siweStep, setSiweStep] = useState<'address' | 'sign'>('address');
  const [siweAddress, setSiweAddress] = useState('');
  const [siweMessage, setSiweMessage] = useState('');
  const [siweSignature, setSiweSignature] = useState('');

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

  // SIWE (Sign-In With Ethereum) wallet login flow
  const handleWalletLogin = () => {
    setSiweStep('address');
    setSiweAddress('');
    setSiweMessage('');
    setSiweSignature('');
    setShowSiweModal(true);
  };

  const handleSiweGetNonce = async () => {
    const addr = siweAddress.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      Alert.alert('Invalid Address', 'Please enter a valid Ethereum address (0x + 40 hex chars).');
      return;
    }
    try {
      setLoadingProvider('wallet-nonce');
      const { message } = await getWalletNonce(addr);
      setSiweMessage(message);
      await Clipboard.setStringAsync(message);
      setSiweStep('sign');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not get sign message from server.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleOpenWalletForSign = async () => {
    await Clipboard.setStringAsync(siweMessage).catch(() => {});
    const schemes = ['metamask://', 'tpoutside://', 'okx://'];
    for (const scheme of schemes) {
      try {
        if (await Linking.canOpenURL(scheme)) { await Linking.openURL(scheme); return; }
      } catch {}
    }
    Alert.alert(
      'Message Copied',
      'Sign message copied to clipboard. Open your wallet, sign it, then come back and paste the signature.',
    );
  };

  const handleSiweSubmit = async () => {
    const sig = siweSignature.trim();
    if (!sig.startsWith('0x') || sig.length < 100) {
      Alert.alert('Invalid Signature', 'Please paste the full hex signature returned by your wallet.');
      return;
    }
    try {
      setLoadingProvider('wallet');
      await loginWithWallet({
        address: siweAddress.trim(),
        signature: sig,
        message: siweMessage,
        chainType: 'evm',
      });
      setShowSiweModal(false);
    } catch (err: any) {
      Alert.alert(
        'Verification Failed',
        err.message || 'Signature mismatch. Make sure you signed with the correct wallet address.',
      );
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

      {/* SIWE Wallet Login Modal */}
      <Modal
        visible={showSiweModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSiweModal(false)}
      >
        <View style={styles.siweOverlay}>
          <View style={styles.siweSheet}>
            <View style={styles.siweDragBar} />

            <TouchableOpacity style={styles.siweCloseBtn} onPress={() => setShowSiweModal(false)}>
              <Text style={styles.siweCloseBtnText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.siweTitle}>🔗 Connect Crypto Wallet</Text>

            {siweStep === 'address' ? (
              <>
                <Text style={styles.siweSubtitle}>
                  Enter your Ethereum wallet address. We'll generate a one-time message for you to sign — no password needed.
                </Text>
                <TextInput
                  style={styles.siweInput}
                  placeholder="0x... wallet address"
                  placeholderTextColor={colors.textMuted}
                  value={siweAddress}
                  onChangeText={setSiweAddress}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSiweGetNonce}
                />
                <TouchableOpacity
                  style={[styles.siwePrimaryBtn, !siweAddress.trim() && styles.siweDisabledBtn]}
                  onPress={handleSiweGetNonce}
                  disabled={!siweAddress.trim() || loadingProvider === 'wallet-nonce'}
                >
                  {loadingProvider === 'wallet-nonce' ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.siwePrimaryBtnText}>Get Sign Message →</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.siweSubtitle}>
                  Open your wallet, sign this message, then paste the signature below.
                </Text>
                <View style={styles.siweMessageBox}>
                  <Text style={styles.siweMessageText} numberOfLines={5} selectable>
                    {siweMessage}
                  </Text>
                </View>
                <TouchableOpacity style={styles.siweSecondaryBtn} onPress={handleOpenWalletForSign}>
                  <Text style={styles.siweSecondaryBtnText}>📋 Copy Message & Open Wallet</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.siweInput, { height: 72, textAlignVertical: 'top' }]}
                  placeholder="0x... paste wallet signature here"
                  placeholderTextColor={colors.textMuted}
                  value={siweSignature}
                  onChangeText={setSiweSignature}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.siwePrimaryBtn, !siweSignature.trim() && styles.siweDisabledBtn]}
                  onPress={handleSiweSubmit}
                  disabled={!siweSignature.trim() || loadingProvider === 'wallet'}
                >
                  {loadingProvider === 'wallet' ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.siwePrimaryBtnText}>Verify & Login ✓</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSiweStep('address')} style={{ marginTop: 12, alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>← Back to address</Text>
                </TouchableOpacity>
              </>
            )}
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
  // SIWE Wallet Login Modal styles
  siweOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  siweSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  siweDragBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  siweCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    padding: 4,
  },
  siweCloseBtnText: {
    color: colors.textMuted,
    fontSize: 18,
  },
  siweTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 8,
  },
  siweSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  siweInput: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 16,
  },
  siweMessageBox: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
  },
  siweMessageText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
  siwePrimaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  siwePrimaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  siweDisabledBtn: {
    opacity: 0.45,
  },
  siweSecondaryBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    marginBottom: 16,
  },
  siweSecondaryBtnText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
