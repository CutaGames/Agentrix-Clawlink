/**
 * CheckoutScreen — Full end-to-end payment flow for skill purchase.
 *
 * Flow:
 *  1. Load skill detail (useQuery)
 *  2. User selects payment method → POST /orders → orderId
 *  3. Method-specific payment:
 *     - QuickPay  : POST /unified-marketplace/purchase (MPC wallet auto-pay)
 *     - Wallet Pay: Build EIP-681 URI → deep link to wallet app → poll order
 *     - Scan QR   : POST /qr/generate → QR modal → poll /qr/:id/poll
 *     - Stripe    : WebBrowser with web checkout (?mobile=1&token=JWT) → poll on return
 *     - Transak   : POST /payments/provider/transak/session → WebBrowser → poll
 *  4. On paid → navigate.replace('PaymentSuccess', {...})
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Linking, Image, Modal, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '../../theme/colors';
import { apiFetch, getApiConfig } from '../../services/api';
import { marketplaceApi } from '../../services/marketplace.api';
import { getHubSkillDetail } from '../../services/openclawHub.service';
import { useAuthStore } from '../../stores/authStore';
import type { MarketStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<MarketStackParamList, 'Checkout'>;
type RouteT = RouteProp<MarketStackParamList, 'Checkout'>;

type PayMethod = 'quick_pay' | 'wallet' | 'qr' | 'stripe' | 'transak';

// Valid AssetType values for the backend
const ASSET_TYPE = 'virtual';

// BSC Testnet config (matches web SmartCheckout)
const BSC_CHAIN_ID = 56; // mainnet; testnet = 97
const BSC_TESTNET_CHAIN_ID = 97;
const USDT_BSC_TESTNET = '0xc23453b4842FDc4360A0a3518E2C0f51a2069386';

const WEB_CHECKOUT_BASE = 'https://agentrix.top/pay/checkout';

// ─────────────────────────────────────────────────────────────────────────────

async function createOrder(params: {
  skillId: string;
  skillName: string;
  amount: number;
  currency: string;
  merchantId?: string;
  userId?: string;
}): Promise<string> {
  const order = await apiFetch<any>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      productId: params.skillId,
      amount: params.amount,
      currency: params.currency,
      merchantId: params.merchantId || undefined,
      assetType: ASSET_TYPE,
      skillId: params.skillId,
      metadata: {
        assetType: ASSET_TYPE,
        productType: 'skill',
        skillId: params.skillId,
        skillName: params.skillName,
        paymentMethod: undefined,
      },
    }),
  });
  const id = order?.id || order?.data?.id;
  if (!id) throw new Error('Order creation failed — no ID returned');
  return id;
}

async function pollOrderPaid(orderId: string, maxMs = 90_000): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const o = await apiFetch<any>(`/orders/${orderId}`);
      const s = o?.status || o?.data?.status;
      if (s === 'paid' || s === 'completed') return true;
      if (s === 'cancelled' || s === 'failed') return false;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────

export function CheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const { skillId, skillName } = route.params;

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [payState, setPayState] = useState<
    'idle' | 'creating-order' | 'processing' | 'polling' | 'qr-open' | 'done' | 'error'
  >('idle');
  const [activeMethod, setActiveMethod] = useState<PayMethod | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandFiat, setExpandFiat] = useState(false);

  // QR modal state
  const [qrVisible, setQrVisible] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [qrHintText, setQrHintText] = useState('');
  const [qrId, setQrId] = useState('');

  const cancelRef = useRef(false);
  const orderIdRef = useRef('');

  const { data: skill, isLoading: skillLoading } = useQuery<any>({
    queryKey: ['skill-checkout', skillId],
    queryFn: async () => {
      // Try OpenClaw hub first, then unified marketplace
      if (skillId.startsWith('oc-') || skillId.startsWith('s')) {
        try {
          const hub = await getHubSkillDetail(skillId);
          if (hub) return hub;
        } catch { /* fallthrough */ }
      }
      return marketplaceApi.getDetail(skillId);
    },
    enabled: !!skillId,
    retry: 1,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  const price: number = Number(
    skill?.pricing?.oneTimePrice ??
    skill?.pricing?.pricePerCall ??
    skill?.pricing?.subscriptionPrice ??
    skill?.price ??
    0,
  );
  const currency: string = skill?.pricing?.currency ?? skill?.priceUnit ?? 'USD';
  const displayName: string = skillName || skill?.displayName || skill?.name || 'Skill';
  const merchantId: string | undefined =
    skill?.authorId || skill?.author?.id || skill?.metadata?.authorId;

  // ─── Go to success screen ───────────────────────────────────────────────

  const goToSuccess = useCallback(
    (params: { orderId?: string; paymentId?: string; paymentMethod?: string }) => {
      setPayState('done');
      setQrVisible(false);
      navigation.replace('PaymentSuccess', {
        skillId,
        skillName: displayName,
        orderId: params.orderId || orderIdRef.current || undefined,
        paymentId: params.paymentId,
        amount: price,
        currency,
        paymentMethod: params.paymentMethod,
      });
    },
    [navigation, skillId, displayName, price, currency],
  );

  // ─── Step 1: Create order ────────────────────────────────────────────────

  const prepareOrder = useCallback(async (method: PayMethod): Promise<string | null> => {
    if (!token) {
      Alert.alert('Login Required', 'Please log in to make a purchase.');
      return null;
    }
    setActiveMethod(method);
    setPayState('creating-order');
    setErrorMsg('');

    try {
      const orderId = await createOrder({
        skillId,
        skillName: displayName,
        amount: price > 0 ? price : 1,
        currency,
        merchantId,
      });
      orderIdRef.current = orderId;
      return orderId;
    } catch (e: any) {
      const msg = e?.message || 'Failed to create order';
      setErrorMsg(msg);
      setPayState('error');
      return null;
    }
  }, [token, skillId, displayName, price, currency, merchantId]);

  // ─── QuickPay (MPC Wallet auto-pay) ────────────────────────────────────

  const handleQuickPay = useCallback(async () => {
    const orderId = await prepareOrder('quick_pay');
    if (!orderId) return;
    setPayState('processing');
    cancelRef.current = false;

    try {
      // Try direct purchase — backend checks MPC wallet authorization
      const result = await apiFetch<any>('/unified-marketplace/purchase', {
        method: 'POST',
        body: JSON.stringify({
          skillId,
          quantity: 1,
          paymentMethod: 'quick_pay',
          orderId,
        }),
      });

      const bought = result?.success || result?.status === 'completed' || result?.status === 'paid';
      if (bought) {
        goToSuccess({ orderId, paymentId: result?.paymentId || result?.id, paymentMethod: 'quick_pay' });
        return;
      }

      // Backend may return a checkout URL for QuickPay setup
      const url = result?.checkoutUrl || result?.result?.checkoutUrl || result?.sessionUrl;
      if (url) {
        setPayState('polling');
        await WebBrowser.openBrowserAsync(url);
        // After browser closes, check order
        const paid = await pollOrderPaid(orderId, 60_000);
        if (!cancelRef.current) {
          if (paid) {
            goToSuccess({ orderId, paymentMethod: 'quick_pay' });
          } else {
            setPayState('idle');
            Alert.alert(
              'QuickPay Setup',
              'Complete the QuickPay setup in the browser, then tap Pay again.',
            );
          }
        }
      } else {
        // Assume free skill or instant grant
        goToSuccess({ orderId, paymentMethod: 'quick_pay' });
      }
    } catch (e: any) {
      if (!cancelRef.current) {
        setErrorMsg(e?.message || 'QuickPay failed');
        setPayState('error');
      }
    }
  }, [prepareOrder, skillId, goToSuccess]);

  // ─── Wallet Pay (EIP-681 deep link) ────────────────────────────────────

  const handleWalletPay = useCallback(async () => {
    const orderId = await prepareOrder('wallet');
    if (!orderId) return;
    setPayState('processing');
    cancelRef.current = false;

    try {
      // Build payment transaction info from backend
      let recipientAddress = '';
      let payAmount = price;
      let payCurrency = currency;

      try {
        // Get payment address from contract-address endpoint
        const addrs = await apiFetch<any>('/payments/contract-address');
        recipientAddress = addrs?.commissionContract || addrs?.erc8004 || '';
      } catch { /* use fallback */ }

      if (!recipientAddress) {
        // Fallback: use purchase endpoint which returns payment address
        const pResult = await apiFetch<any>('/unified-marketplace/purchase', {
          method: 'POST',
          body: JSON.stringify({ skillId, quantity: 1, paymentMethod: 'walletconnect', orderId }),
        });
        recipientAddress = pResult?.paymentAddress || pResult?.to || pResult?.result?.to || '';
        payAmount = pResult?.amount || payAmount;
        payCurrency = pResult?.currency || payCurrency;

        if (pResult?.success) {
          goToSuccess({ orderId, paymentMethod: 'wallet' });
          return;
        }
      }

      // Build EIP-681 URI for ERC-20 USDT payment on BSC testnet
      // Format: ethereum:<TOKEN_ADDRESS>@<CHAIN_ID>/transfer?address=<RECIPIENT>&uint256=<AMOUNT*1e18>
      const amountWei = BigInt(Math.round(payAmount * 1e18)).toString();
      const eip681Uri = recipientAddress
        ? `ethereum:${USDT_BSC_TESTNET}@${BSC_TESTNET_CHAIN_ID}/transfer?address=${recipientAddress}&uint256=${amountWei}`
        : '';

      // Try wallet deep links in order of likelihood
      const walletLinks: Array<{ name: string; url: string }> = [
        ...(eip681Uri ? [
          { name: 'MetaMask', url: `metamask://send?data=${encodeURIComponent(eip681Uri)}` },
          { name: 'Trust Wallet', url: `trust://send?data=${encodeURIComponent(eip681Uri)}` },
          // WalletConnect universal link
          { name: 'WalletConnect', url: `wc:?uri=${encodeURIComponent(eip681Uri)}` },
        ] : []),
        // Fallback: open web checkout with wallet option
        {
          name: 'Web Checkout',
          url: `${WEB_CHECKOUT_BASE}?skillId=${skillId}&mobile=1&token=${token}&paymentMethod=walletconnect`,
        },
      ];

      // Try to open the first working wallet link
      let opened = false;
      for (const link of walletLinks.slice(0, 3)) {
        try {
          const canOpen = await Linking.canOpenURL(link.url);
          if (canOpen) {
            await Linking.openURL(link.url);
            opened = true;
            break;
          }
        } catch { /* try next */ }
      }

      if (!opened) {
        // Fall back to web checkout with walletconnect mode
        await WebBrowser.openBrowserAsync(
          `${WEB_CHECKOUT_BASE}?skillId=${skillId}&mobile=1${token ? `&token=${token}` : ''}`,
        );
      }

      // Poll order after user returns
      setPayState('polling');
      const paid = await pollOrderPaid(orderId, 120_000);
      if (!cancelRef.current) {
        if (paid) {
          goToSuccess({ orderId, paymentMethod: 'wallet' });
        } else {
          setPayState('idle');
          Alert.alert(
            'Wallet Pay',
            'Payment not detected yet. Complete the transaction in your wallet, then check My Orders.',
            [{ text: 'OK' }, { text: 'Check Orders', onPress: () => (navigation as any).navigate('Me', { screen: 'MyOrders' }) }],
          );
        }
      }
    } catch (e: any) {
      if (!cancelRef.current) {
        setErrorMsg(e?.message || 'Wallet pay failed');
        setPayState('error');
      }
    }
  }, [prepareOrder, skillId, price, currency, token, goToSuccess, navigation]);

  // ─── Scan to Pay (QR Code) ───────────────────────────────────────────────

  const handleQrPay = useCallback(async () => {
    const orderId = await prepareOrder('qr');
    if (!orderId) return;
    setPayState('processing');
    cancelRef.current = false;

    try {
      // Generate QR code from backend
      const qrResult = await apiFetch<any>('/qr/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'fixed_amount',
          amount: price > 0 ? price : 1,
          currency,
          description: `Buy "${displayName}"`,
          orderId,
          merchantId: merchantId || undefined,
        }),
      });

      const generatedQrId = qrResult?.qrId || qrResult?.id || qrResult?.data?.qrId;
      const qrData: string =
        qrResult?.qrImageUrl ||      // backend-served QR image URL
        qrResult?.qrDataUrl ||       // data: URL
        qrResult?.paymentUri ||      // EIP/ETH URI
        qrResult?.data ||
        generatedQrId ||
        `${WEB_CHECKOUT_BASE}?skillId=${skillId}&orderId=${orderId}`;

      const isImageUrl = qrData.startsWith('http') || qrData.startsWith('data:');

      // Use qrserver.com to render non-image data as QR
      const imageUrl = isImageUrl
        ? qrData
        : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

      setQrId(generatedQrId || orderId);
      setQrImageUrl(imageUrl);
      setQrHintText(`Amount: ${price > 0 ? `$${price} ${currency}` : 'Free'}`);
      setQrVisible(true);
      setPayState('qr-open');

      // Long-poll QR status in background
      if (generatedQrId) {
        pollQrStatus(generatedQrId, orderId);
      } else {
        // Fallback: poll order directly
        const paid = await pollOrderPaid(orderId, 120_000);
        if (!cancelRef.current) {
          setQrVisible(false);
          if (paid) {
            goToSuccess({ orderId, paymentMethod: 'qr' });
          } else {
            setPayState('idle');
          }
        }
      }
    } catch (e: any) {
      if (!cancelRef.current) {
        setErrorMsg(e?.message || 'QR generation failed');
        setPayState('error');
      }
    }
  }, [prepareOrder, skillId, displayName, price, currency, merchantId, goToSuccess]);

  const pollQrStatus = async (qrIdParam: string, orderId: string) => {
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline && !cancelRef.current) {
      try {
        // Backend /qr/:qrId/poll is long-poll (up to 30s each call)
        const result = await apiFetch<any>(`/qr/${qrIdParam}/poll`);
        const status = result?.status;
        if (status === 'paid' || status === 'completed') {
          if (!cancelRef.current) {
            setQrVisible(false);
            goToSuccess({ orderId, paymentId: result?.payIntentId, paymentMethod: 'qr' });
            return;
          }
        }
        if (status === 'expired' || status === 'cancelled') {
          if (!cancelRef.current) {
            setQrVisible(false);
            setPayState('idle');
            Alert.alert('QR Expired', 'The payment QR code has expired. Please try again.');
            return;
          }
        }
        // timeout:true means the long-poll timed out (no change), retry
        if (!result?.timeout) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    // After deadline, check order
    if (!cancelRef.current) {
      try {
        const paid = await pollOrderPaid(orderId, 5000);
        setQrVisible(false);
        if (paid) {
          goToSuccess({ orderId, paymentMethod: 'qr' });
        } else {
          setPayState('idle');
          Alert.alert('QR Expired', 'Payment window expired. Please try again.');
        }
      } catch {
        setQrVisible(false);
        setPayState('idle');
      }
    }
  };

  // ─── Stripe (Web checkout via WebBrowser) ────────────────────────────────

  const handleStripe = useCallback(async () => {
    const orderId = await prepareOrder('stripe');
    if (!orderId) return;
    setPayState('processing');
    cancelRef.current = false;

    try {
      const authToken = token || getApiConfig().token || '';
      // Build checkout URL — web supports ?mobile=1&token=JWT for embedded mode
      const checkoutUrl = `${WEB_CHECKOUT_BASE}?skillId=${skillId}&mobile=1${authToken ? `&token=${encodeURIComponent(authToken)}` : ''}`;

      // Open web checkout in browser (Stripe Elements lives in the web page)
      await WebBrowser.openBrowserAsync(checkoutUrl);

      // After browser is closed (user tapped "Done"/back), poll order status
      setPayState('polling');
      const paid = await pollOrderPaid(orderId, 30_000);
      if (!cancelRef.current) {
        if (paid) {
          goToSuccess({ orderId, paymentMethod: 'stripe' });
        } else {
          setPayState('idle');
          Alert.alert(
            'Stripe Payment',
            'Payment not confirmed yet. If you completed the payment, check My Orders.',
            [
              { text: 'Check Later', style: 'cancel' },
              { text: 'View Orders', onPress: () => (navigation as any).navigate('Me', { screen: 'MyOrders' }) },
            ],
          );
        }
      }
    } catch (e: any) {
      if (!cancelRef.current) {
        setErrorMsg(e?.message || 'Stripe payment failed');
        setPayState('error');
      }
    }
  }, [prepareOrder, skillId, token, goToSuccess, navigation]);

  // ─── Transak (Fiat on-ramp) ──────────────────────────────────────────────

  const handleTransak = useCallback(async () => {
    const orderId = await prepareOrder('transak');
    if (!orderId) return;
    setPayState('processing');
    cancelRef.current = false;

    try {
      // Create Transak session
      const session = await apiFetch<any>('/payments/provider/transak/session', {
        method: 'POST',
        body: JSON.stringify({
          amount: price > 0 ? price : 1,
          fiatCurrency: 'USD',
          cryptoCurrency: 'USDT',
          network: 'bsc',
          orderId,
          email: user?.email || '',
          redirectURL: `${WEB_CHECKOUT_BASE}/success?orderId=${orderId}&mobile=1`,
          productType: 'BUY',
          isFiatAmount: true,
        }),
      });

      const sessionUrl: string =
        session?.sessionUrl ||
        session?.url ||
        session?.data?.url ||
        `https://global.transak.com/?orderId=${orderId}`;

      await WebBrowser.openBrowserAsync(sessionUrl);

      // Poll after browser returns
      setPayState('polling');
      const paid = await pollOrderPaid(orderId, 30_000);
      if (!cancelRef.current) {
        if (paid) {
          goToSuccess({ orderId, paymentMethod: 'transak' });
        } else {
          setPayState('idle');
          Alert.alert('Transak', 'Fiat purchase may take a few minutes. Check My Orders shortly.');
        }
      }
    } catch (e: any) {
      if (!cancelRef.current) {
        setErrorMsg(e?.message || 'Transak session failed');
        setPayState('error');
      }
    }
  }, [prepareOrder, skillId, price, user, goToSuccess, navigation]);

  // ─── UI helpers ──────────────────────────────────────────────────────────

  const isBusy = payState === 'creating-order' || payState === 'processing' || payState === 'polling';
  const isActiveMethod = (m: PayMethod) => activeMethod === m && isBusy;

  const usdtEquiv = price > 0 ? `≈ ${(price * 0.995).toFixed(2)} USDT` : '';

  const LoadingOverlay = ({ text }: { text: string }) => (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={styles.loadingText}>{text}</Text>
    </View>
  );

  if (skillLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={{ color: colors.textMuted, marginTop: 12 }}>Loading skill…</Text>
      </View>
    );
  }

  const stateLabel: Record<typeof payState, string> = {
    idle: '',
    'creating-order': 'Creating order…',
    processing: 'Processing payment…',
    polling: 'Verifying payment…',
    'qr-open': 'Waiting for payment…',
    done: '',
    error: '',
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View style={styles.brandLogo}><Text style={styles.brandLogoText}>⚡</Text></View>
          <Text style={styles.brandName}>AGENTRIX</Text>
          <View style={styles.testnetBadge}><Text style={styles.testnetText}>BSC TESTNET</Text></View>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ── Amount ─────────────────────────────────────────────────────── */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>
            {price > 0 ? `$${price} ${currency}` : 'Free'}
          </Text>
          <Text style={styles.amountSkill} numberOfLines={2}>{displayName}</Text>
        </View>

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {payState === 'error' && !!errorMsg && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>❌ {errorMsg}</Text>
            <TouchableOpacity onPress={() => { setPayState('idle'); setErrorMsg(''); }}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Processing / Polling indicator ─────────────────────────────── */}
        {isBusy && (
          <View style={styles.progressBanner}>
            <ActivityIndicator color={colors.accent} size="small" />
            <Text style={styles.progressText}>{stateLabel[payState]}</Text>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            CRYPTO PAYMENT SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionIconWrap}><Text style={styles.sectionIcon}>💰</Text></View>
          <Text style={styles.sectionTitle}>CRYPTO PAYMENT</Text>
        </View>

        {/* QuickPay */}
        <TouchableOpacity
          style={[styles.payOption, styles.payOptionHighlight]}
          onPress={handleQuickPay}
          disabled={isBusy}
          activeOpacity={0.85}
        >
          <Text style={styles.payOptionEmoji}>⚡</Text>
          <View style={styles.payOptionBody}>
            <Text style={styles.payOptionTitle}>QuickPay</Text>
            <Text style={styles.payOptionSub}>Instant payment via MPC wallet</Text>
          </View>
          {isActiveMethod('quick_pay') ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={styles.setupText}>PAY ›</Text>
          )}
        </TouchableOpacity>

        {/* Wallet Pay */}
        <TouchableOpacity
          style={styles.payOption}
          onPress={handleWalletPay}
          disabled={isBusy}
          activeOpacity={0.85}
        >
          <Text style={styles.payOptionEmoji}>💼</Text>
          <View style={styles.payOptionBody}>
            <Text style={styles.payOptionTitle}>Wallet Pay</Text>
            <Text style={styles.payOptionSub}>MetaMask · Trust · WalletConnect</Text>
          </View>
          {isActiveMethod('wallet') ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={styles.usdtAmount}>{usdtEquiv}</Text>
          )}
        </TouchableOpacity>

        {/* Scan to Pay */}
        <TouchableOpacity
          style={styles.payOption}
          onPress={handleQrPay}
          disabled={isBusy}
          activeOpacity={0.85}
        >
          <Text style={styles.payOptionEmoji}>📱</Text>
          <View style={styles.payOptionBody}>
            <Text style={styles.payOptionTitle}>Scan to Pay</Text>
            <Text style={styles.payOptionSub}>Pay with any compatible wallet</Text>
          </View>
          {isActiveMethod('qr') ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={styles.usdtAmount}>{usdtEquiv}</Text>
          )}
        </TouchableOpacity>

        {/* ── OR divider ──────────────────────────────────────────────────── */}
        <View style={styles.orDivider}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            FIAT PAYMENT SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionIconWrap}><Text style={styles.sectionIcon}>💳</Text></View>
          <Text style={styles.sectionTitle}>FIAT PAYMENT</Text>
        </View>

        {/* Stripe collapsible panel */}
        <TouchableOpacity
          style={styles.fiatOption}
          onPress={() => setExpandFiat(!expandFiat)}
          activeOpacity={0.85}
        >
          <View style={styles.fiatRow}>
            <Text style={styles.fiatOptionText}>💳  PAY VIA STRIPE</Text>
            <Text style={styles.fiatChevron}>{expandFiat ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {expandFiat && (
          <View style={styles.fiatExpanded}>
            <TouchableOpacity
              style={styles.stripeBtn}
              onPress={handleStripe}
              disabled={isBusy}
              activeOpacity={0.85}
            >
              {isActiveMethod('stripe') ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.stripeBtnText}>
                  💳 Pay {price > 0 ? `$${price}` : ''} with Card
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.transakBtn}
              onPress={handleTransak}
              disabled={isBusy}
              activeOpacity={0.85}
            >
              {isActiveMethod('transak') ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={styles.transakBtnText}>🏦 Buy via Transak (Fiat → Crypto)</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Trust badges ─────────────────────────────────────────────── */}
        <View style={styles.trustRow}>
          <Text style={styles.trustItem}>🔒 Secure</Text>
          <Text style={styles.trustItem}>⚡ Instant</Text>
          <Text style={styles.trustItem}>✅ Verified</Text>
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════
          QR CODE MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={qrVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          cancelRef.current = true;
          setQrVisible(false);
          setPayState('idle');
        }}
      >
        <View style={styles.qrBackdrop}>
          <View style={styles.qrSheet}>
            {/* Header */}
            <View style={styles.qrHeader}>
              <Text style={styles.qrTitle}>📱 Scan to Pay</Text>
              <TouchableOpacity
                onPress={() => {
                  cancelRef.current = true;
                  setQrVisible(false);
                  setPayState('idle');
                }}
                style={styles.qrCloseBtn}
              >
                <Text style={styles.qrCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.qrSkillName}>{displayName}</Text>
            <Text style={styles.qrAmountText}>
              {price > 0 ? `$${price} ${currency}` : 'Free'}
            </Text>

            {/* QR Image */}
            <View style={styles.qrImageWrap}>
              {qrImageUrl ? (
                <Image
                  source={{ uri: qrImageUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              ) : (
                <ActivityIndicator color={colors.accent} size="large" />
              )}
            </View>

            {/* Polling indicator */}
            <View style={styles.qrPolling}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={styles.qrPollingText}>Waiting for payment…</Text>
            </View>

            <Text style={styles.qrHint}>
              {qrHintText || 'Open any crypto wallet and scan this QR code to pay'}
            </Text>

            {/* Supported wallets hint */}
            <View style={styles.qrWalletRow}>
              {['MetaMask', 'Trust', 'imToken', 'TokenPocket'].map((w) => (
                <View key={w} style={styles.qrWalletChip}>
                  <Text style={styles.qrWalletText}>{w}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.qrCancelBtn}
              onPress={() => {
                cancelRef.current = true;
                setQrVisible(false);
                setPayState('idle');
              }}
            >
              <Text style={styles.qrCancelText}>Cancel Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 56, gap: 10 },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  brandLogo: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  brandLogoText: { fontSize: 18 },
  brandName: { flex: 1, fontSize: 14, fontWeight: '700', letterSpacing: 3, color: '#333' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 16, color: '#666' },

  // Amount hero
  amountSection: { alignItems: 'center', paddingVertical: 18, gap: 4 },
  amountLabel: { fontSize: 13, color: '#888' },
  amountValue: { fontSize: 34, fontWeight: '800', color: '#111', letterSpacing: -0.5 },
  amountSkill: { fontSize: 14, color: colors.accent, textAlign: 'center', maxWidth: '80%' },

  // Feedback banners
  errorBanner: { backgroundColor: '#fee2e2', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  errorText: { fontSize: 13, color: '#dc2626', flex: 1 },
  retryText: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  progressBanner: { backgroundColor: colors.accent + '15', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressText: { fontSize: 13, color: colors.accent, fontWeight: '600' },

  // Testnet badge
  testnetBadge: { backgroundColor: '#ef444422', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  testnetText: { fontSize: 10, fontWeight: '700', color: '#ef4444' },

  // Section headers
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 },
  sectionIconWrap: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#eef', alignItems: 'center', justifyContent: 'center' },
  sectionIcon: { fontSize: 14 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#666', letterSpacing: 0.8 },

  // Payment options
  payOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  payOptionHighlight: { borderColor: colors.accent + '55', backgroundColor: colors.accent + '08' },
  payOptionEmoji: { fontSize: 26 },
  payOptionBody: { flex: 1 },
  payOptionTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  payOptionSub: { fontSize: 12, color: '#999', marginTop: 2 },
  setupText: { fontSize: 12, fontWeight: '700', color: colors.accent },
  usdtAmount: { fontSize: 12, fontWeight: '600', color: '#666' },

  // Divider
  orDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 2 },
  orLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  orText: { fontSize: 11, color: '#bbb', fontWeight: '600' },

  // Fiat / Stripe
  fiatOption: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  fiatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fiatOptionText: { fontSize: 13, fontWeight: '700', color: '#555', letterSpacing: 0.5 },
  fiatChevron: { fontSize: 12, color: '#aaa' },
  fiatExpanded: { gap: 10, paddingTop: 2 },
  stripeBtn: { backgroundColor: '#635BFF', borderRadius: 13, padding: 15, alignItems: 'center' },
  stripeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  transakBtn: {
    backgroundColor: '#fff', borderRadius: 13, padding: 15, alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  transakBtnText: { color: '#555', fontWeight: '600', fontSize: 14 },

  // Trust row
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 6 },
  trustItem: { fontSize: 12, color: '#999', fontWeight: '500' },

  // Loading overlay (full-screen used during creation)
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { fontSize: 15, color: colors.accent, fontWeight: '600' },

  // ── QR Modal ────────────────────────────────────────────────────────────
  qrBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  qrSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 28, gap: 12,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 20,
  },
  qrHeader: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' },
  qrTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  qrCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  qrCloseBtnText: { fontSize: 14, color: '#666' },
  qrSkillName: { fontSize: 14, color: colors.accent, fontWeight: '600', textAlign: 'center' },
  qrAmountText: { fontSize: 24, fontWeight: '800', color: '#111' },
  qrImageWrap: {
    width: 240, height: 240, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa',
    marginVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  qrImage: { width: 220, height: 220, borderRadius: 12 },
  qrPolling: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qrPollingText: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  qrHint: { fontSize: 12, color: '#999', textAlign: 'center', maxWidth: 280 },
  qrWalletRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  qrWalletChip: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  qrWalletText: { fontSize: 11, color: '#555', fontWeight: '600' },
  qrCancelBtn: { marginTop: 4, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  qrCancelText: { fontSize: 14, color: '#999', fontWeight: '600' },
});
