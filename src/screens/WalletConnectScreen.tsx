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
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '../theme/colors';
import { useAuthStore } from '../stores/authStore';
import { useI18n } from '../stores/i18nStore';
import {
  WalletProvider,
  getWalletNonce,
  walletSignatureLogin,
} from '../services/walletConnect';

const WALLET_ID_ALIASES: Record<string, WalletProvider> = {
  metamask: 'metamask',
  okx: 'okx',
  okex: 'okx',
  tokenpocket: 'tokenpocket',
  tp: 'tokenpocket',
};

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
// Plan B: 所有钱包连接都通过 WebBrowser 打开前端登录页面完成。
// 移除了不可靠的剪贴板交互流程，统一使用 WalletConnect 协议。
type FlowStep =
  | 'select'         // 选择钱包
  | 'install-guide'  // 引导安装
  | 'connecting'     // WebBrowser 连接中
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

export const WalletConnectScreen: React.FC<{ navigation?: any; route?: { params?: { walletId?: string } } }> = ({ navigation, route }) => {
  const { t } = useI18n();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(true);
  const [wallets, setWallets] = useState<WalletConfig[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<WalletConfig | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [signMessage, setSignMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [step, setStep] = useState<FlowStep>('select');
  const [statusText, setStatusText] = useState('');
  const requestedWalletId = route?.params?.walletId;
  const autoHandledWalletRef = useRef<string | null>(null);
  const tr = (en: string, zh: string) => t({ en, zh });

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

  // 自动处理来自导航参数的 walletId
  useEffect(() => {
    if (detecting || step !== 'select' || !requestedWalletId) return;

    const normalizedId = WALLET_ID_ALIASES[requestedWalletId.toLowerCase()];
    if (!normalizedId || autoHandledWalletRef.current === normalizedId) return;

    const targetWallet = wallets.find((wallet) => wallet.id === normalizedId);
    if (!targetWallet) return;

    autoHandledWalletRef.current = normalizedId;
    if (targetWallet.installed) {
      void openWalletViaBrowser(targetWallet);
    } else {
      handleInstallWallet(targetWallet);
    }
  }, [detecting, requestedWalletId, step, wallets]);

  const installedWallets = wallets.filter(w => w.installed);
  const uninstalledWallets = wallets.filter(w => !w.installed);

  // ══════════════════════════════════════════════════════════════════
  // Plan B 核心：统一 WebBrowser 钱包登录流程
  // ══════════════════════════════════════════════════════════════════
  // 所有钱包（已安装钱包、WalletConnect 通用连接）都通过 WebBrowser
  // 打开前端登录页面。前端使用 WalletConnect v2 协议在移动端自动显示
  // 深链接到钱包 App，用户在钱包中确认连接和签名后，前端完成登录并
  // 通过 deep link 重定向回 App。
  //
  // 移除了旧的剪贴板交互流程（需要用户手动复制地址和签名，极不可靠）。
  // ══════════════════════════════════════════════════════════════════
  const openWalletViaBrowser = useCallback(async (wallet?: WalletConfig | null) => {
    setStep('connecting');
    if (wallet) setSelectedWallet(wallet);
    setStatusText(tr('Opening secure browser...', '正在打开安全浏览器…'));
    setLoading(true);

    const frontendUrl = 'https://www.agentrix.top';
    const callbackUrl = 'agentrix://auth/callback';
    const walletLoginUrl = `${frontendUrl}/auth/login?tab=wallet&mobile=1&callback=${encodeURIComponent(callbackUrl)}`;

    try {
      const result = await WebBrowser.openAuthSessionAsync(walletLoginUrl, callbackUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });

      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const token = typeof parsed.queryParams?.token === 'string' ? parsed.queryParams.token : undefined;
        const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : undefined;
        const provider = typeof parsed.queryParams?.provider === 'string' ? parsed.queryParams.provider : 'wallet';

        if (token || code) {
          navigation?.replace?.('AuthCallback', { token, code, provider });
          return;
        }
      }

      // 用户关闭了浏览器或未完成登录
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setStatusText(tr('Connection cancelled. Try again or use manual input.', '连接已取消。请重试或使用手动输入。'));
      }
    } catch (e: any) {
      setStatusText(e.message || tr('Connection failed', '连接失败'));
    } finally {
      setLoading(false);
      setStep('select');
    }
  }, [navigation, tr]);

  // 未安装 — 引导安装流程
  const handleInstallWallet = useCallback((wallet: WalletConfig) => {
    setSelectedWallet(wallet);
    setStep('install-guide');
  }, []);

  const resetFlow = useCallback(() => {
    setStep('select');
    setSignMessage('');
    setSignature('');
    setWalletAddress('');
    setSelectedWallet(null);
    setStatusText('');
  }, []);

  // ── 手动输入流程（兜底方案） ──
  const handleManualSubmit = useCallback(async () => {
    const addr = walletAddress.trim();
    if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      Alert.alert(tr('Error', '错误'), tr('Please enter a valid EVM address (0x...)', '请输入有效的 EVM 地址（0x...）。'));
      return;
    }

    if (!signMessage) {
      setLoading(true);
      try {
        const { message } = await getWalletNonce(addr);
        setSignMessage(message);
        await Clipboard.setStringAsync(message);
        Alert.alert(
          tr('Message Copied', '消息已复制'),
          tr('The sign message has been copied to your clipboard. Open your wallet, sign it, then come back and paste the signature.', '签名消息已复制到剪贴板。请打开你的钱包签署该消息，然后返回粘贴签名。'),
        );
      } catch (e: any) {
        Alert.alert(tr('Error', '错误'), e.message || tr('Failed to get sign message', '获取签名消息失败'));
      } finally {
        setLoading(false);
      }
      return;
    }

    const sig = signature.trim();
    if (!sig) {
      Alert.alert(tr('Error', '错误'), tr('Please paste the signature', '请粘贴签名内容'));
      return;
    }

    // 提交签名并登录
    setLoading(true);
    useAuthStore.getState().setLoading(true);
    try {
      await walletSignatureLogin({
        address: walletAddress.trim(),
        signature: sig,
        message: signMessage,
        chainType: 'evm',
        walletType: selectedWallet?.id || 'walletconnect',
      });
    } catch (e: any) {
      Alert.alert(tr('Login Failed', '登录失败'), e.message || tr('Signature verification failed', '签名验证失败'));
      useAuthStore.getState().setLoading(false);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, signMessage, signature, selectedWallet, tr]);

  const isDisabled = loading;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* ────── STEP: SELECT WALLET ────── */}
        {step === 'select' && (
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{tr('Connect Wallet', '连接钱包')}</Text>
              <Text style={styles.headerDesc}>{tr('Choose how to connect your wallet', '选择你的钱包连接方式')}</Text>
            </View>

            {isAuthenticated && (
              <TouchableOpacity
                style={styles.walletSetupCard}
                onPress={() => navigation?.navigate?.('WalletSetup')}
                activeOpacity={0.8}
              >
                <View style={styles.walletSetupBadge}>
                  <Text style={styles.walletSetupBadgeText}>MPC</Text>
                </View>
                <View style={styles.walletSetupBody}>
                  <Text style={styles.walletSetupTitle}>{tr('Use Agentrix built-in wallet', '使用 Agentrix 内置钱包')}</Text>
                  <Text style={styles.walletSetupDesc}>
                    {tr('Create a guided MPC wallet with backup and recovery, then return here for deposits and transfers.', '创建带备份与恢复的引导式 MPC 钱包，然后回来完成充值与转账。')}
                  </Text>
                </View>
                <Text style={styles.walletSetupArrow}>›</Text>
              </TouchableOpacity>
            )}

            {detecting ? (
              <View style={styles.detectingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.detectingText}>{tr('Detecting wallets...', '正在检测钱包…')}</Text>
              </View>
            ) : (
              <>
                {/* 已安装钱包 — 通过 WebBrowser 连接 */}
                {installedWallets.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{tr('Installed Wallets', '已安装钱包')}</Text>
                    {installedWallets.map(w => (
                      <TouchableOpacity
                        key={w.id}
                        style={styles.walletCard}
                        onPress={() => openWalletViaBrowser(w)}
                        activeOpacity={0.7}
                        disabled={isDisabled}
                      >
                        <View style={styles.walletIconCircle}>
                          <Text style={styles.walletIconText}>{w.icon}</Text>
                        </View>
                        <View style={styles.walletInfo}>
                          <Text style={styles.walletName}>{w.name}</Text>
                          <Text style={styles.walletStatus}>{tr('Tap to connect', '点击即可连接')}</Text>
                        </View>
                        <View style={styles.connectBadge}>
                          <Text style={styles.connectBadgeText}>{tr('Connect', '连接')}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 未安装钱包 — 引导安装 */}
                {uninstalledWallets.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      {installedWallets.length > 0 ? tr('Get a Wallet', '获取钱包') : tr('Install a Wallet to Get Started', '先安装钱包再开始')}
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
                          <Text style={styles.walletDesc}>{tr('Not installed — tap to set up', '尚未安装——点击开始设置')}</Text>
                        </View>
                        <Text style={styles.downloadIcon}>→</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* WalletConnect — 任意钱包扫码 */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{tr('Universal', '通用连接')}</Text>
                  <TouchableOpacity
                    style={styles.walletCard}
                    onPress={() => openWalletViaBrowser(null)}
                    activeOpacity={0.7}
                    disabled={isDisabled}
                  >
                    <View style={styles.walletIconCircle}>
                      <Text style={styles.walletIconText}>🔗</Text>
                    </View>
                    <View style={styles.walletInfo}>
                      <Text style={styles.walletName}>WalletConnect</Text>
                      <Text style={styles.walletDesc}>{tr('Scan QR with any compatible wallet', '使用任意兼容钱包扫码连接')}</Text>
                    </View>
                    <View style={[styles.connectBadge, { backgroundColor: '#8B5CF6' }]}>
                      <Text style={styles.connectBadgeText}>{tr('Scan', '扫码')}</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* 手动输入 */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{tr('OR', '或')}</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.manualBtn}
                  onPress={() => { setSelectedWallet(null); setStep('manual'); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.manualBtnText}>{tr('Enter wallet address manually', '手动输入钱包地址')}</Text>
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
            <Text style={styles.guideTitle}>{t({ en: `Install ${selectedWallet.name}`, zh: `安装 ${selectedWallet.name}` })}</Text>
            <Text style={styles.guideDesc}>
              {t({ en: `${selectedWallet.name} is not installed on this device. Follow these steps:`, zh: `当前设备尚未安装 ${selectedWallet.name}。请按以下步骤操作：` })}
            </Text>

            <View style={styles.stepsContainer}>
              <Text style={styles.stepItem}>{t({ en: `1. Tap "Install" below to get ${selectedWallet.name}`, zh: `1. 点击下方"安装"获取 ${selectedWallet.name}` })}</Text>
              <Text style={styles.stepItem}>{tr('2. Create or import your wallet', '2. 创建或导入你的钱包')}</Text>
              <Text style={styles.stepItem}>{tr('3. Come back here and tap "I\'ve Installed It"', '3. 返回此页并点击"我已安装完成"')}</Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#8B5CF6' }]}
              onPress={() => Linking.openURL(selectedWallet.downloadUrl)}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>{t({ en: `Install ${selectedWallet.name}`, zh: `安装 ${selectedWallet.name}` })}</Text>
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
                  openWalletViaBrowser(updated);
                } else {
                  Alert.alert(
                    tr('Not Found', '未找到'),
                    t({ en: `${selectedWallet.name} doesn't appear to be installed yet. Install it first, then come back.`, zh: `${selectedWallet.name} 似乎尚未安装。请先完成安装后再返回。` }),
                    [{ text: tr('OK', '确定') }],
                  );
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>{tr('I\'ve Installed It →', '我已安装完成 →')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backBtn} onPress={resetFlow}>
              <Text style={styles.backBtnText}>← {tr('Back', '返回')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ────── STEP: CONNECTING (WebBrowser in progress) ────── */}
        {step === 'connecting' && (
          <View style={styles.connectingContainer}>
            <View style={styles.connectingWalletIcon}>
              <Text style={{ fontSize: 48 }}>{selectedWallet?.icon || '🔗'}</Text>
            </View>
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 16 }} />
            <Text style={styles.connectingStatus}>{statusText || tr('Connecting via secure browser...', '正在通过安全浏览器连接…')}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 8 }}>
              {tr('Complete the wallet connection in the browser window', '请在浏览器窗口中完成钱包连接')}
            </Text>
          </View>
        )}

        {/* ────── STEP: MANUAL INPUT ────── */}
        {step === 'manual' && (
          <View style={styles.section}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {selectedWallet ? t({ en: `Connect ${selectedWallet.name}`, zh: `连接 ${selectedWallet.name}` }) : tr('Manual Connection', '手动连接')}
              </Text>
              <Text style={styles.headerDesc}>
                {tr('Enter your wallet address and sign the verification message', '输入你的钱包地址并签署验证消息')}
              </Text>
            </View>

            <Text style={styles.fieldLabel}>{tr('Wallet Address', '钱包地址')}</Text>
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
                <Text style={styles.pasteBtnText}>{tr('Paste', '粘贴')}</Text>
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
                  <Text style={styles.primaryButtonText}>{tr('Get Sign Message', '获取签名消息')}</Text>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.fieldLabel}>{tr('Sign this message in your wallet', '请在钱包中签署这条消息')}</Text>
                <View style={styles.messageBox}>
                  <Text style={styles.messageText} selectable numberOfLines={3}>{signMessage}</Text>
                </View>

                <Text style={styles.fieldLabel}>{tr('Paste Signature', '粘贴签名')}</Text>
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
                    <Text style={styles.pasteBtnText}>{tr('Paste', '粘贴')}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, (!signature.trim() || isDisabled) && styles.buttonDisabled]}
                  onPress={handleManualSubmit}
                  disabled={!signature.trim() || isDisabled}
                  activeOpacity={0.7}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>{tr('Sign In', '登录')}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.backBtn} onPress={resetFlow}>
              <Text style={styles.backBtnText}>← {tr('Back', '返回')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  walletSetupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '12',
    borderWidth: 1,
    borderColor: colors.primary + '35',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  walletSetupBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  walletSetupBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  walletSetupBody: { flex: 1, gap: 4 },
  walletSetupTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  walletSetupDesc: { fontSize: 12, lineHeight: 18, color: colors.muted },
  walletSetupArrow: { color: colors.primary, fontSize: 26, fontWeight: '500' },
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
});
