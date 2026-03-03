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

type PayMethod = 'quick_pay' | 'wallet' | 'qr' | 'stripe' | 'transak' | 'web_checkout';

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

// ─── Contract address helper (cached)  ──────────────────────────────────────
let _cachedAddrs: { commission: string; usdc: string } | null = null;
async function getContractAddresses(): Promise<{ commission: string; usdc: string }> {
  if (_cachedAddrs) return _cachedAddrs;
  try {
    const r = await apiFetch<any>('/payments/contract-address');
    _cachedAddrs = {
      commission: r?.commissionContractAddress || '',
      usdc: r?.usdcAddress || USDT_BSC_TESTNET,
    };
    return _cachedAddrs;
  } catch {
    return { commission: '', usdc: USDT_BSC_TESTNET };
  }
}

// ─── Build EIP-681 URI for ERC-20 transfer  ─────────────────────────────────
function buildEip681(tokenAddr: string, chainId: number, to: string, amountWei: string): string {
  return `ethereum:${tokenAddr}@${chainId}/transfer?address=${to}&uint256=${amountWei}`;
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

  // ─── Open web checkout in browser (universal fallback) ──────────────────

  const openWebCheckout = useCallback(async () => {
    const authToken = token || getApiConfig().token || '';
    let url = `${WEB_CHECKOUT_BASE}?skillId=${encodeURIComponent(skillId)}&mobile=1`;
    if (authToken) url += `&token=${encodeURIComponent(authToken)}`;
    await WebBrowser.openBrowserAsync(url);
  }, [skillId, token]);

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
        const paid = await pollOrderPaid(orderId, 60_000);
        if (!cancelRef.current) {
          if (paid) {
            goToSuccess({ orderId, paymentMethod: 'quick_pay' });
          } else {
            setPayState('idle');
            Alert.alert('QuickPay Setup', 'Complete the QuickPay setup in the browser, then tap Pay again.');
          }
        }
      } else {
        goToSuccess({ orderId, paymentMethod: 'quick_pay' });
      }
    } catch {
      // QuickPay not available — fall back to web checkout
      if (!cancelRef.current) {
        try {
          await openWebCheckout();
          setPayState('polling');
          const paid = await pollOrderPaid(orderId, 60_000);
          if (!cancelRef.current) {
            if (paid) goToSuccess({ orderId, paymentMethod: 'quick_pay' });
            else {
              setPayState('idle');
              Alert.alert('Payment', 'If you completed the payment, check My Orders.', [
                { text: 'OK' },
                { text: 'My Orders', onPress: () => (navigation as any).navigate('Me', { screen: 'MyOrders' }) },
              ]);
            }
          }
        } catch (e2: any) {
          setErrorMsg(e2?.message || 'QuickPay failed');
          setPayState('error');
        }
      }
    }
  }, [prepareOrder, skillId, goToSuccess, openWebCheckout, navigation]);

  // ─── Wallet Pay (EIP-681 deep link → wallet app → web fallback) ──────────

  const handleWalletPay = useCallback(async () => {
    const orderId = await prepareOrder('wallet');
    if (!orderId) return;
    setPayState('processing');
    cancelRef.current = false;

    try {
      // 1. Get commission contract address from backend
      const addrs = await getContractAddresses();
      const recipientAddress = addrs.commission;
      const tokenAddress = addrs.usdc || USDT_BSC_TESTNET;

      // 2. Build EIP-681 URI for ERC-20 USDT transfer
      const amountWei = BigInt(Math.round(price * 1e18)).toString();
      const eip681Uri = recipientAddress
        ? buildEip681(tokenAddress, BSC_TESTNET_CHAIN_ID, recipientAddress, amountWei)
        : '';

      // 3. Try wallet deep links (correct mobile formats)
      let opened = false;
      if (eip681Uri) {
        const walletLinks = [
          // MetaMask universal link (official format)
          { url: `https://metamask.app.link/send/${eip681Uri}` },
          // Trust Wallet
          { url: `trust://open_url?coin_id=20000714&url=${encodeURIComponent(eip681Uri)}` },
          // OKX Wallet
          { url: `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(eip681Uri)}` },
          // Try raw ethereum: scheme (many Android wallets register for this)
          { url: eip681Uri },
        ];
        for (const link of walletLinks) {
          try {
            const canOpen = await Linking.canOpenURL(link.url);
            if (canOpen) {
              await Linking.openURL(link.url);
              opened = true;
              break;
            }
          } catch { /* try next */ }
        }
      }

      // 4. Fallback: open web checkout (full SmartCheckout with WalletConnect)
      if (!opened) {
        await openWebCheckout();
      }

      // 5. Poll order after user returns from wallet/browser
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
            [{ text: 'OK' }, { text: 'My Orders', onPress: () => (navigation as any).navigate('Me', { screen: 'MyOrders' }) }],
          );
        }
      }
    } catch (e: any) {
      if (!cancelRef.current) {
        // Fall back to web checkout on any error
        try {
          await openWebCheckout();
          setPayState('polling');
          const paid = await pollOrderPaid(orderId, 60_000);
          if (!cancelRef.current) {
            if (paid) goToSuccess({ orderId, paymentMethod: 'wallet' });
            else setPayState('idle');
          }
        } catch {
          setErrorMsg(e?.message || 'Wallet pay failed');
          setPayState('error');
        }
      }
    }
  }, [prepareOrder, price, openWebCheckout, goToSuccess, navigation]);

  // ─── Scan to Pay (QR Code — builds EIP-681 URI from contract address) ────

  const handleQrPay = useCallback(async () => {
    const orderId = await prepareOrder('qr');
    if (!orderId) return;
    setPayState('processing');
    cancelRef.current = false;

    try {
      // 1. Get contract addresses from backend
      const addrs = await getContractAddresses();
      const recipientAddress = addrs.commission;
      const tokenAddress = addrs.usdc || USDT_BSC_TESTNET;

      let qrPayload: string;
      let payIntentId: string | undefined;

      if (recipientAddress) {
        // 2a. Try creating a pay-intent (backend monitors blockchain for matching tx)
        try {
          const pi = await apiFetch<any>('/pay-intents', {
            method: 'POST',
            body: JSON.stringify({
              type: 'order_payment',
              orderId,
              merchantId: merchantId || undefined,
              amount: price > 0 ? price : 1,
              currency: 'USDT',
              paymentMethod: { type: 'qrcode' },
              recipientAddress,
            }),
          });
          payIntentId = pi?.id || pi?.payIntentId;
          // Use backend-provided paymentUri if available
          qrPayload = pi?.paymentUri || '';
        } catch { /* pay-intent optional, build locally */ }

        // 2b. Build EIP-681 locally if pay-intent didn't provide a URI
        if (!qrPayload!) {
          const amountWei = BigInt(Math.round(price * 1e18)).toString();
          qrPayload = buildEip681(tokenAddress, BSC_TESTNET_CHAIN_ID, recipientAddress, amountWei);
        }
      } else {
        // 2c. No contract address — use web checkout URL as QR data
        const authToken = token || getApiConfig().token || '';
        qrPayload = `${WEB_CHECKOUT_BASE}?skillId=${encodeURIComponent(skillId)}&mobile=1${authToken ? `&token=${encodeURIComponent(authToken)}` : ''}`;
      }

      // 3. Generate QR image via qrserver.com
      const isImageUrl = qrPayload.startsWith('http') && !qrPayload.startsWith('https://agentrix');
      const imageUrl = isImageUrl
        ? qrPayload
        : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrPayload)}`;

      setQrId(payIntentId || orderId);
      setQrImageUrl(imageUrl);
      setQrHintText(`Amount: ${price > 0 ? `$${price} ${currency}` : 'Free'}\nNetwork: BSC ${BSC_TESTNET_CHAIN_ID === 97 ? 'Testnet' : 'Mainnet'}`);
      setQrVisible(true);
      setPayState('qr-open');

      // 4. Poll order status (backend auto-detects on-chain payment via pay-intent)
      const pollPaymentCompletion = async () => {
        const deadline = Date.now() + 180_000; // 3 minutes
        while (Date.now() < deadline && !cancelRef.current) {
          // Try pay-intent status first
          if (payIntentId) {
            try {
              const pi = await apiFetch<any>(`/pay-intents/${payIntentId}`);
              const s = pi?.status;
              if (s === 'paid' || s === 'completed' || s === 'executed') {
                setQrVisible(false);
                goToSuccess({ orderId, paymentId: payIntentId, paymentMethod: 'qr' });
                return;
              }
              if (s === 'expired' || s === 'cancelled') {
                setQrVisible(false);
                setPayState('idle');
                Alert.alert('QR Expired', 'The payment QR has expired. Please try again.');
                return;
              }
            } catch { /* fallback to order poll */ }
          }
          // Also check order status
          try {
            const o = await apiFetch<any>(`/orders/${orderId}`);
            const s = o?.status || o?.data?.status;
            if (s === 'paid' || s === 'completed') {
              setQrVisible(false);
              goToSuccess({ orderId, paymentMethod: 'qr' });
              return;
            }
          } catch { /* retry */ }
          await new Promise((r) => setTimeout(r, 3000));
        }
        // Timeout
        if (!cancelRef.current) {
          setQrVisible(false);
          setPayState('idle');
          Alert.alert('QR Expired', 'Payment window expired. Please try again.');
        }
      };
      pollPaymentCompletion();
    } catch (e: any) {
      if (!cancelRef.current) {
        setErrorMsg(e?.message || 'QR generation failed');
        setPayState('error');
      }
    }
  }, [prepareOrder, skillId, displayName, price, currency, merchantId, token, goToSuccess]);

  // ─── Stripe (Web checkout via WebBrowser) ────────────────────────────────

  const handleStripe = useCallback(async () => {
    if (!token) {
      Alert.alert('Login Required', 'Please log in to make a purchase.');
      return;
    }
    setActiveMethod('stripe');
    setPayState('processing');
    cancelRef.current = false;

    try {
      // Open web checkout — it auto-authenticates with ?token=JWT&mobile=1
      // and auto-starts the SmartCheckout flow (Stripe Elements + Apple Pay + Google Pay)
      await openWebCheckout();

      // After browser is closed, try to find a paid order for this skill
      setPayState('polling');
      // Check recent orders for this skillId
      let paid = false;
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline && !cancelRef.current) {
        try {
          const resp = await apiFetch<any>('/orders?limit=5&sort=-createdAt');
          const items: any[] = resp?.items || resp?.data || (Array.isArray(resp) ? resp : []);
          const match = items.find((o: any) => {
            const isSkill = o.skillId === skillId || o.productId === skillId ||
                            o.metadata?.skillId === skillId;
            const isPaid = o.status === 'paid' || o.status === 'completed';
            return isSkill && isPaid;
          });
          if (match) {
            paid = true;
            goToSuccess({ orderId: match.id, paymentMethod: 'stripe' });
            break;
          }
        } catch { /* retry */ }
        await new Promise((r) => setTimeout(r, 3000));
      }

      if (!paid && !cancelRef.current) {
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
    } catch (e: any) {
      if (!cancelRef.current) {
        setErrorMsg(e?.message || 'Stripe payment failed');
        setPayState('error');
      }
    }
  }, [token, skillId, openWebCheckout, goToSuccess, navigation]);

  // ─── Pay in Browser (universal fallback) ──────────────────────────────────

  const handleWebCheckout = useCallback(async () => {
    if (!token) {
      Alert.alert('Login Required', 'Please log in to make a purchase.');
      return;
    }
    setActiveMethod('web_checkout');
    setPayState('processing');
    cancelRef.current = false;

    try {
      await openWebCheckout();

      // Poll for paid orders after browser closes
      setPayState('polling');
      let paid = false;
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline && !cancelRef.current) {
        try {
          const resp = await apiFetch<any>('/orders?limit=5&sort=-createdAt');
          const items: any[] = resp?.items || resp?.data || (Array.isArray(resp) ? resp : []);
          const match = items.find((o: any) => {
            const isSkill = o.skillId === skillId || o.productId === skillId ||
                            o.metadata?.skillId === skillId;
            const isPaid = o.status === 'paid' || o.status === 'completed';
            return isSkill && isPaid;
          });
          if (match) {
            paid = true;
            goToSuccess({ orderId: match.id, paymentMethod: 'web' });
            break;
          }
        } catch { /* retry */ }
        await new Promise((r) => setTimeout(r, 3000));
      }

      if (!paid && !cancelRef.current) {
        setPayState('idle');
      }
    } catch (e: any) {
      if (!cancelRef.current) {
        setErrorMsg(e?.message || 'Payment failed');
        setPayState('error');
      }
    }
  }, [token, skillId, openWebCheckout, goToSuccess]);

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

        {/* ── Universal "Pay in Browser" fallback ────────────────────── */}
        <TouchableOpacity
          style={styles.webCheckoutBtn}
          onPress={handleWebCheckout}
          disabled={isBusy}
          activeOpacity={0.85}
        >
          {isActiveMethod('web_checkout') ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={styles.webCheckoutBtnText}>🌐 Open Full Checkout in Browser</Text>
          )}
        </TouchableOpacity>
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

  // "Pay in Browser" universal fallback
  webCheckoutBtn: {
    backgroundColor: '#fff', borderRadius: 13, padding: 15, alignItems: 'center',
    borderWidth: 1, borderColor: colors.accent + '44', borderStyle: 'dashed' as any,
    marginTop: 2,
  },
  webCheckoutBtnText: { color: colors.accent, fontWeight: '600', fontSize: 14 },

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
