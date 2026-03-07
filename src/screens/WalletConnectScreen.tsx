import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TextInput,
  ScrollView,
  Linking,
  Platform,
  AppState,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '../theme/colors';
import { useAuthStore } from '../stores/authStore';
import {
  WalletProvider,
  buildWalletConnectLoginUrl,
  getWalletNonce,
  parseWalletCallbackUrl,
  walletSignatureLogin,
} from '../services/walletConnect';
import { QrCode } from '../components/common/QrCode';

// ========== 钱包配置 ==========

interface WalletConfig {
  id: WalletProvider;
  name: string;
  icon: string;
  scheme: string;
  installed: boolean;
  downloadUrl: string;
}

// ========== 流程步骤类型 ==========
type FlowStep =
  | 'select'         // 选择钱包
  | 'install-guide'  // 引导安装
  | 'connecting'     // 已装钱包 → 等待授权
  | 'walletconnect'  // WalletConnect 扫码
  | 'manual';        // 手动输入（兜底）

const WALLET_DEFS: Omit<WalletConfig, 'installed'>[] = [
  {
    id: 'metamask' as WalletProvider,
    name: 'MetaMask',
    icon: '🦊',
    scheme: 'metamask://',
    downloadUrl: Platform.OS === 'ios'
      ? 'https://apps.apple.com/app/metamask/id1438144202'
      : 'https://play.google.com/store/apps/details?id=io.metamask',
  },
  {
    id: 'tokenpocket' as WalletProvider,
    name: 'TokenPocket',
    icon: '🦋',
    scheme: 'tpoutside://',
    downloadUrl: Platform.OS === 'ios'
      ? 'https://apps.apple.com/app/tokenpocket/id1436028697'
      : 'https://play.google.com/store/apps/details?id=vip.mytokenpocket',
  },
  {
    id: 'okx' as WalletProvider,
    name: 'OKX Wallet',
    icon: '⭕',
    scheme: 'okx://',
    downloadUrl: Platform.OS === 'ios'
      ? 'https://apps.apple.com/app/okx-buy-bitcoin-btc-crypto/id1327268470'
      : 'https://play.google.com/store/apps/details?id=com.okinc.okex.gp',
  },
];

export const WalletConnectScreen: React.FC<{ navigation?: any; route?: any }> = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(true);
  const [wallets, setWallets] = useState<WalletConfig[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<WalletConfig | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [signMessage, setSignMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [step, setStep] = useState<FlowStep>('select');
  const [statusText, setStatusText] = useState('');
  const [showSignModal, setShowSignModal] = useState(false);
  const [walletConnectUrl, setWalletConnectUrl] = useState('');
  const appStateRef = useRef(AppState.currentState);
  const waitingForSignRef = useRef(false);
  const returnCountRef = useRef(0);
  const preferredWalletId = route?.params?.walletId as WalletProvider | undefined;

  // 启动时自动检测已安装的钱包
  useEffect(() => {
    (async () => {
      const results: WalletConfig[] = [];
      for (const def of WALLET_DEFS) {
        let installed = false;
        try { installed = await Linking.canOpenURL(def.scheme); } catch {}
        results.push({ ...def, installed });
      }
      results.sort((a, b) => (b.installed ? 1 : 0) - (a.installed ? 1 : 0));
      setWallets(results);
      setDetecting(false);
    })();
  }, []);

  const installedWallets = wallets.filter(w => w.installed);
  const uninstalledWallets = wallets.filter(w => !w.installed);

  // ── 监听 App 从后台返回 — 自动检查剪贴板 ──
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // Check for wallet address in clipboard (when returning from wallet app)
        if (step === 'connecting' && selectedWallet && !walletAddress) {
          returnCountRef.current++;
          setStatusText('Checking clipboard for address...');
          try {
            const text = await Clipboard.getStringAsync();
            if (text && /^0x[a-fA-F0-9]{40}$/.test(text.trim())) {
              const addr = text.trim();
              setWalletAddress(addr);
              setStatusText(`✅ Address: ${addr.slice(0, 6)}...${addr.slice(-4)}`);
              // Auto-proceed to get sign message
              setLoading(true);
              try {
                const { message } = await getWalletNonce(addr);
                setSignMessage(message);
                await Clipboard.setStringAsync(message);
                setStatusText('Sign this message in your wallet — it has been copied to clipboard');
                waitingForSignRef.current = true;
                // Re-open wallet for signing
                if (selectedWallet.installed) {
                  setTimeout(() => Linking.openURL(selectedWallet.scheme), 500);
                }
              } catch (e: any) {
                setStatusText('Failed to get sign message. Try manual entry.');
                setStep('manual');
              } finally {
                setLoading(false);
              }
            } else if (returnCountRef.current >= 2) {
              setStatusText('No address found. Tap "Enter Manually" below.');
            } else {
              setStatusText(`No address found. Copy your address in ${selectedWallet.name} and come back.`);
            }
          } catch {
            setStatusText('Could not read clipboard. Try manual entry.');
          }
        }
        // Check for signature in clipboard (returning from wallet after signing)
        if (waitingForSignRef.current && signMessage && !signature) {
          setStatusText('Checking clipboard for signature...');
          try {
            const text = await Clipboard.getStringAsync();
            if (text && text.startsWith('0x') && text.length > 100) {
              setSignature(text.trim());
              setStatusText('✅ Signature detected! Logging in...');
              // Auto-submit
              handleAutoLogin(text.trim());
            } else {
              setStatusText('No signature found. Please paste it below.');
              setShowSignModal(true);
            }
          } catch {
            setShowSignModal(true);
          }
        }
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [step, signMessage, signature, walletAddress, selectedWallet]);

  // 自动登录（签名检测到后）
  const handleAutoLogin = useCallback(async (sig: string) => {
    const addr = walletAddress.trim();
    if (!addr || !sig || !signMessage) return;
    setLoading(true);
    useAuthStore.getState().setLoading(true);
    try {
      await walletSignatureLogin({
        address: addr,
        signature: sig,
        message: signMessage,
        chainType: 'evm',
        walletType: selectedWallet?.id || 'walletconnect',
      });
    } catch (e: any) {
      Alert.alert('Login Failed', e.message || 'Signature verification failed');
      useAuthStore.getState().setLoading(false);
      setShowSignModal(true);
    } finally {
      setLoading(false);
      waitingForSignRef.current = false;
    }
  }, [walletAddress, signMessage, selectedWallet]);

  useEffect(() => {
    const sub = Linking.addEventListener('url', async ({ url }) => {
      if (!url || !url.includes('wallet-callback')) return;

      const payload = parseWalletCallbackUrl(url);

      if (payload.address) {
        setWalletAddress(payload.address);
      }
      if (payload.message) {
        setSignMessage(payload.message);
      }
      if (payload.walletType) {
        const matched = wallets.find(w => w.id === payload.walletType);
        if (matched) {
          setSelectedWallet(matched);
        }
      }

      if (payload.signature && payload.address) {
        setSignature(payload.signature);
        setStep('manual');
        setStatusText('Wallet signature received. Logging in...');
        await handleAutoLogin(payload.signature);
        return;
      }

      if (payload.address) {
        setStep('manual');
        setStatusText('Wallet returned. Continue the sign-in flow below.');
      }
    });

    return () => sub.remove();
  }, [handleAutoLogin, wallets]);

  // 一键连接已安装钱包 — open wallet app via deeplink, get address from clipboard on return
  const handleInstalledWallet = useCallback(async (wallet: WalletConfig) => {
    setSelectedWallet(wallet);
    setStep('connecting');
    setStatusText(`Opening ${wallet.name}...`);
    setLoading(true);
    setWalletAddress('');
    setSignMessage('');
    setSignature('');
    returnCountRef.current = 0;
    waitingForSignRef.current = false;

    try {
      await Clipboard.setStringAsync('');
      const canOpen = await Linking.canOpenURL(wallet.scheme);
      if (canOpen) {
        await Linking.openURL(wallet.scheme);
        setStatusText(`Copy your address in ${wallet.name}, then come back`);
      } else {
        setStep('manual');
        setStatusText('');
      }
    } catch {
      setStep('manual');
      setStatusText('');
    } finally {
      setLoading(false);
    }
  }, []);

  // 未安装 — 引导安装流程
  const handleInstallWallet = useCallback((wallet: WalletConfig) => {
    setSelectedWallet(wallet);
    setStep('install-guide');
  }, []);

  useEffect(() => {
    if (!preferredWalletId || wallets.length === 0 || selectedWallet) return;
    const preferredWallet = wallets.find(w => w.id === preferredWalletId);
    if (!preferredWallet) return;
    setSelectedWallet(preferredWallet);
    if (preferredWallet.installed) {
      handleInstalledWallet(preferredWallet);
    } else {
      setStep('install-guide');
    }
  }, [preferredWalletId, wallets, selectedWallet, handleInstalledWallet]);

  // WalletConnect — 打开网页 QR 扫码
  const handleWalletConnect = useCallback(async () => {
    const walletLoginUrl = buildWalletConnectLoginUrl('agentrix://wallet-callback');
    setWalletConnectUrl(walletLoginUrl);
    setSelectedWallet(null);
    setStatusText('Scan the QR code with a compatible wallet, or open the link on this device.');
    setStep('walletconnect');
  }, []);

  const openWalletConnect = useCallback(async () => {
    if (!walletConnectUrl) return;
    await WebBrowser.openBrowserAsync(walletConnectUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
  }, [walletConnectUrl]);

  const resetFlow = useCallback(() => {
    setStep('select');
    setSignMessage('');
    setSignature('');
    setWalletAddress('');
    setSelectedWallet(null);
    setStatusText('');
    setWalletConnectUrl('');
    waitingForSignRef.current = false;
    returnCountRef.current = 0;
  }, []);

  // 手动提交（从弹窗）
  const handleManualSubmit = useCallback(async () => {
    const addr = walletAddress.trim();
    if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      Alert.alert('Error', 'Please enter a valid EVM address (0x...)');
      return;
    }

    if (!signMessage) {
      // 还没获取签名消息
      setLoading(true);
      setStatusText('Getting sign message...');
      try {
        const { message } = await getWalletNonce(addr);
        setSignMessage(message);
        await Clipboard.setStringAsync(message);
        setStatusText('Message copied! Open your wallet to sign.');
        if (selectedWallet?.installed) {
          waitingForSignRef.current = true;
          await Linking.openURL(selectedWallet.scheme);
        }
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to get sign message');
      } finally {
        setLoading(false);
      }
      return;
    }

    const sig = signature.trim();
    if (!sig) {
      Alert.alert('Error', 'Please paste the signature');
      return;
    }

    handleAutoLogin(sig);
  }, [walletAddress, signMessage, signature, selectedWallet, handleAutoLogin]);

  const isDisabled = loading;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* ────── STEP: SELECT WALLET ────── */}
        {step === 'select' && (
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Connect Wallet</Text>
              <Text style={styles.headerDesc}>Choose how to connect your wallet</Text>
            </View>

            {detecting ? (
              <View style={styles.detectingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.detectingText}>Detecting wallets...</Text>
              </View>
            ) : (
              <>
                {/* 已安装钱包 — 一键连接 */}
                {installedWallets.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Installed Wallets</Text>
                    {installedWallets.map(w => (
                      <TouchableOpacity
                        key={w.id}
                        style={styles.walletCard}
                        onPress={() => handleInstalledWallet(w)}
                        activeOpacity={0.7}
                        disabled={isDisabled}
                      >
                        <View style={styles.walletIconCircle}>
                          <Text style={styles.walletIconText}>{w.icon}</Text>
                        </View>
                        <View style={styles.walletInfo}>
                          <Text style={styles.walletName}>{w.name}</Text>
                          <Text style={styles.walletStatus}>Tap to connect</Text>
                        </View>
                        <View style={styles.connectBadge}>
                          <Text style={styles.connectBadgeText}>Connect</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 未安装钱包 — 引导安装 */}
                {uninstalledWallets.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      {installedWallets.length > 0 ? 'Get a Wallet' : 'Install a Wallet to Get Started'}
                    </Text>
                    {uninstalledWallets.map(w => (
                      <TouchableOpacity
                        key={w.id}
                        style={[styles.walletCard, styles.walletCardDim]}
                        onPress={() => handleInstallWallet(w)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.walletIconCircle, { opacity: 0.6 }]}>
                          <Text style={styles.walletIconText}>{w.icon}</Text>
                        </View>
                        <View style={styles.walletInfo}>
                          <Text style={[styles.walletName, { opacity: 0.7 }]}>{w.name}</Text>
                          <Text style={styles.walletDesc}>Not installed — tap to set up</Text>
                        </View>
                        <Text style={styles.downloadIcon}>→</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* WalletConnect — 任意钱包扫码 */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Universal</Text>
                  <TouchableOpacity
                    style={styles.walletCard}
                    onPress={handleWalletConnect}
                    activeOpacity={0.7}
                    disabled={isDisabled}
                  >
                    <View style={styles.walletIconCircle}>
                      <Text style={styles.walletIconText}>🔗</Text>
                    </View>
                    <View style={styles.walletInfo}>
                      <Text style={styles.walletName}>WalletConnect</Text>
                      <Text style={styles.walletDesc}>Scan QR with any compatible wallet</Text>
                    </View>
                    <View style={[styles.connectBadge, { backgroundColor: '#8B5CF6' }]}>
                      <Text style={styles.connectBadgeText}>Scan</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* 手动输入 */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.manualBtn}
                  onPress={() => { setSelectedWallet(null); setStep('manual'); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.manualBtnText}>Enter wallet address manually</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* ────── STEP: INSTALL GUIDE ────── */}
        {step === 'install-guide' && selectedWallet && (
          <View style={styles.guideContainer}>
            <View style={styles.connectingWalletIcon}>
              <Text style={{ fontSize: 48 }}>{selectedWallet.icon}</Text>
            </View>
            <Text style={styles.guideTitle}>Install {selectedWallet.name}</Text>
            <Text style={styles.guideDesc}>
              {selectedWallet.name} is not installed on this device. Follow these steps:
            </Text>

            <View style={styles.stepsContainer}>
              <Text style={styles.stepItem}>1. Tap "Install" below to get {selectedWallet.name}</Text>
              <Text style={styles.stepItem}>2. Create or import your wallet</Text>
              <Text style={styles.stepItem}>3. Come back here and tap "I've Installed It"</Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#8B5CF6' }]}
              onPress={() => Linking.openURL(selectedWallet.downloadUrl)}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Install {selectedWallet.name}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 12 }]}
              onPress={async () => {
                let installed = false;
                try { installed = await Linking.canOpenURL(selectedWallet.scheme); } catch {}
                if (installed) {
                  const updated = { ...selectedWallet, installed: true };
                  setSelectedWallet(updated);
                  setWallets(prev => prev.map(w => w.id === updated.id ? updated : w));
                  handleInstalledWallet(updated);
                } else {
                  Alert.alert(
                    'Not Found',
                    `${selectedWallet.name} doesn't appear to be installed yet. Install it first, then come back.`,
                    [{ text: 'OK' }],
                  );
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>I've Installed It →</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backBtn} onPress={resetFlow}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ────── STEP: CONNECTING (installed wallet deeplink flow) ────── */}
        {step === 'connecting' && (
          <View style={styles.connectingContainer}>
            {selectedWallet && (
              <View style={styles.connectingWalletIcon}>
                <Text style={{ fontSize: 48 }}>{selectedWallet.icon}</Text>
              </View>
            )}
            {loading && <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 16 }} />}
            <Text style={styles.connectingStatus}>{statusText}</Text>

            <View style={styles.stepsContainer}>
              {!signMessage ? (
                <>
                  <Text style={[styles.stepItem, walletAddress ? styles.stepDone : styles.stepActive]}>
                    {walletAddress ? '✅' : '1️⃣'} Copy your wallet address
                  </Text>
                  <Text style={styles.stepItem}>2️⃣ Come back to Agentrix</Text>
                  <Text style={styles.stepItem}>3️⃣ Sign the verification message</Text>
                </>
              ) : (
                <>
                  <Text style={styles.stepDone}>✅ Address detected</Text>
                  <Text style={styles.stepDone}>✅ Verification message ready</Text>
                  <Text style={styles.stepActive}>3️⃣ Sign the message and copy the signature</Text>
                </>
              )}
            </View>

            {selectedWallet?.installed && !loading && (
              <TouchableOpacity
                style={[styles.primaryButton, { marginTop: 16 }]}
                onPress={() => Linking.openURL(selectedWallet.scheme)}
              >
                <Text style={styles.primaryButtonText}>Open {selectedWallet.name}</Text>
              </TouchableOpacity>
            )}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetFlow}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.primary }]}
                onPress={() => setStep('manual')}
              >
                <Text style={[styles.cancelBtnText, { color: colors.primary }]}>Enter Manually</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ────── STEP: WALLETCONNECT ────── */}
        {step === 'walletconnect' && (
          <View style={styles.connectingContainer}>
            <View style={styles.connectingWalletIcon}>
              <Text style={{ fontSize: 48 }}>🔗</Text>
            </View>
            <Text style={styles.connectingStatus}>WalletConnect fallback</Text>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 8 }}>
              Scan the QR code with your wallet app to connect, or open the link on this device.
            </Text>
            <View style={styles.qrCard}>
              <QrCode value={walletConnectUrl || 'https://www.agentrix.top/auth/login'} size={180} />
              <Text style={styles.qrHint} numberOfLines={2}>{walletConnectUrl}</Text>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={openWalletConnect} activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>Open Wallet Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, styles.secondaryButton]}
              onPress={async () => {
                if (!walletConnectUrl) return;
                await Clipboard.setStringAsync(walletConnectUrl);
                Alert.alert('Copied', 'Wallet login link copied to clipboard');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Copy Link</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                setStep('manual');
                setStatusText('Paste your wallet address and signature if the wallet does not return automatically.');
              }}
            >
              <Text style={styles.backBtnText}>Enter Address Manually</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 24 }]} onPress={resetFlow}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ────── STEP: MANUAL INPUT ────── */}
        {step === 'manual' && (
          <View style={styles.section}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {selectedWallet ? `Connect ${selectedWallet.name}` : 'Manual Connection'}
              </Text>
              <Text style={styles.headerDesc}>
                Enter your wallet address and sign the verification message
              </Text>
            </View>

            <Text style={styles.fieldLabel}>Wallet Address</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="0x..."
                placeholderTextColor={colors.muted + '60'}
                value={walletAddress}
                onChangeText={setWalletAddress}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isDisabled}
              />
              <TouchableOpacity
                style={styles.pasteBtn}
                onPress={async () => {
                  const text = await Clipboard.getStringAsync();
                  if (text) setWalletAddress(text.trim());
                }}
              >
                <Text style={styles.pasteBtnText}>Paste</Text>
              </TouchableOpacity>
            </View>

            {!signMessage ? (
              <TouchableOpacity
                style={[styles.primaryButton, (!walletAddress.trim() || isDisabled) && styles.buttonDisabled]}
                onPress={handleManualSubmit}
                disabled={!walletAddress.trim() || isDisabled}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Get Sign Message</Text>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Sign this message in your wallet</Text>
                <View style={styles.messageBox}>
                  <Text style={styles.messageText} selectable numberOfLines={3}>{signMessage}</Text>
                </View>

                <Text style={styles.fieldLabel}>Paste Signature</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, { minHeight: 56 }]}
                    placeholder="0x..."
                    placeholderTextColor={colors.muted + '60'}
                    value={signature}
                    onChangeText={setSignature}
                    autoCapitalize="none"
                    autoCorrect={false}
                    multiline
                    editable={!isDisabled}
                  />
                  <TouchableOpacity
                    style={styles.pasteBtn}
                    onPress={async () => {
                      const text = await Clipboard.getStringAsync();
                      if (text) setSignature(text.trim());
                    }}
                  >
                    <Text style={styles.pasteBtnText}>Paste</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, (!signature.trim() || isDisabled) && styles.buttonDisabled]}
                  onPress={() => handleAutoLogin(signature.trim())}
                  disabled={!signature.trim() || isDisabled}
                  activeOpacity={0.7}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.backBtn} onPress={resetFlow}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 签名粘贴弹窗 — 替代 Alert */}
      <Modal visible={showSignModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {signMessage ? 'Paste Signature' : 'Enter Wallet Address'}
            </Text>
            <Text style={styles.modalDesc}>
              {signMessage
                ? 'Sign the message in your wallet, then paste the signature here.'
                : 'Copy your wallet address from the wallet app and paste it here.'}
            </Text>

            {!signMessage ? (
              <View style={styles.modalInputRow}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="0x..."
                  placeholderTextColor={colors.muted + '60'}
                  value={walletAddress}
                  onChangeText={setWalletAddress}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.modalPasteBtn}
                  onPress={async () => {
                    const text = await Clipboard.getStringAsync();
                    if (text) setWalletAddress(text.trim());
                  }}
                >
                  <Text style={styles.pasteBtnText}>Paste</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalInputRow}>
                <TextInput
                  style={[styles.modalInput, { minHeight: 56 }]}
                  placeholder="Paste signature (0x...)"
                  placeholderTextColor={colors.muted + '60'}
                  value={signature}
                  onChangeText={setSignature}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                />
                <TouchableOpacity
                  style={styles.modalPasteBtn}
                  onPress={async () => {
                    const text = await Clipboard.getStringAsync();
                    if (text) setSignature(text.trim());
                  }}
                >
                  <Text style={styles.pasteBtnText}>Paste</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowSignModal(false); resetFlow(); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, loading && styles.buttonDisabled]}
                onPress={() => { setShowSignModal(false); handleManualSubmit(); }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {signMessage ? 'Verify & Sign In' : 'Continue'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: 20, paddingBottom: 48 },
  // Header
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 6 },
  headerDesc: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  // Detecting
  detectingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 40 },
  detectingText: { color: colors.muted, fontSize: 14 },
  // Section
  section: { marginBottom: 16, gap: 12 },
  sectionTitle: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  // Wallet cards
  walletCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  walletCardDim: { opacity: 0.7 },
  walletIconCircle: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  walletIconText: { fontSize: 24 },
  walletInfo: { flex: 1 },
  walletName: { fontSize: 16, fontWeight: '700', color: colors.text },
  walletStatus: { fontSize: 12, color: colors.success, marginTop: 2, fontWeight: '500' },
  walletDesc: { fontSize: 12, color: colors.muted, marginTop: 2 },
  connectBadge: {
    backgroundColor: colors.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  connectBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  downloadIcon: { fontSize: 18, color: colors.muted, fontWeight: '700' },
  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.muted, fontSize: 11, marginHorizontal: 14, fontWeight: '700', letterSpacing: 2 },
  // Manual button
  manualBtn: { alignItems: 'center', paddingVertical: 14 },
  manualBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  // Install guide
  guideContainer: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 16, gap: 12 },
  guideTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 12, textAlign: 'center' },
  guideDesc: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  // Steps
  stepsContainer: { width: '100%', paddingHorizontal: 16, marginVertical: 12, gap: 8 },
  stepItem: { fontSize: 14, color: colors.muted, lineHeight: 22 },
  stepActive: { fontSize: 14, color: colors.text, fontWeight: '600', lineHeight: 22 },
  stepDone: { fontSize: 14, color: colors.success, fontWeight: '500', lineHeight: 22 },
  // Connecting state
  connectingContainer: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 16 },
  connectingWalletIcon: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  connectingStatus: { fontSize: 15, color: colors.text, textAlign: 'center', lineHeight: 22, marginTop: 8 },
  qrCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    width: '100%',
  },
  qrHint: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  cancelBtn: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 24 },
  cancelBtnText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  // Fields
  fieldLabel: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 4 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  pasteBtn: {
    backgroundColor: colors.primary + '15', borderRadius: 12,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  pasteBtnText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  // Buttons
  primaryButton: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: colors.primary + '12',
  },
  secondaryButtonText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
  backBtn: { alignItems: 'center', paddingVertical: 12 },
  backBtnText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
  // Message box
  messageBox: {
    backgroundColor: colors.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: colors.primary + '20',
  },
  messageText: {
    fontSize: 11, color: colors.muted, lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', backgroundColor: colors.card,
    borderRadius: 20, padding: 24, gap: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalDesc: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  modalInputRow: { flexDirection: 'row', gap: 8 },
  modalInput: {
    flex: 1, backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modalPasteBtn: {
    backgroundColor: colors.primary + '15', borderRadius: 12,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.border,
  },
  modalCancelText: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', backgroundColor: colors.primary,
  },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
