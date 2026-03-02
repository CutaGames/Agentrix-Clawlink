import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../../theme/colors';
import { apiFetch } from '../../services/api';
import { marketplaceApi } from '../../services/marketplace.api';
import { getHubSkillDetail } from '../../services/openclawHub.service';
import type { MarketStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<MarketStackParamList, 'Checkout'>;
type RouteT = RouteProp<MarketStackParamList, 'Checkout'>;

export function CheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const { skillId, skillName } = route.params;
  const [paying, setPaying] = useState(false);
  const [expandFiat, setExpandFiat] = useState(false);

  const { data: skill } = useQuery<any>({
    queryKey: ['skill', skillId],
    queryFn: async () => {
      if (skillId.startsWith('oc-') || skillId.startsWith('s')) {
        const hubSkill = await getHubSkillDetail(skillId);
        if (hubSkill) return hubSkill;
      }
      return marketplaceApi.getDetail(skillId);
    },
    enabled: !!skillId,
  });

  // Poll order status after redirect to external payment page
  const pollOrderStatus = useCallback(async (orderId: string) => {
    const maxAttempts = 30; // 30 × 3s = 90s max
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const status = await apiFetch<any>(`/unified-marketplace/orders/${orderId}/status`);
        if (status?.status === 'completed' || status?.status === 'paid') {
          Alert.alert('✅ Payment Complete!', 'Skill purchased and ready to install!', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
          return;
        }
        if (status?.status === 'failed' || status?.status === 'cancelled') {
          Alert.alert('Payment Cancelled', 'The payment was not completed.');
          return;
        }
      } catch { /* retry */ }
    }
  }, [navigation]);

  const handlePay = async (method: 'stripe' | 'x402' | 'transak' | 'wallet' | 'qr') => {
    setPaying(true);
    try {
      // Map method to backend payment method names
      const backendMethod = method === 'wallet' ? 'x402' : method === 'qr' ? 'x402' : method;
      const order = await apiFetch<any>('/unified-marketplace/purchase', {
        method: 'POST',
        body: JSON.stringify({ skillId, quantity: 1, paymentMethod: backendMethod, subMethod: method }),
      });
      const checkoutUrl = order?.checkoutUrl || order?.result?.checkoutUrl;
      if (checkoutUrl) {
        const supported = await Linking.canOpenURL(checkoutUrl);
        if (supported) {
          await Linking.openURL(checkoutUrl);
        } else {
          Alert.alert('Payment', `Please open this URL to complete payment:\n${checkoutUrl}`);
        }
        const orderId = order?.orderId || order?.id || order?.result?.orderId;
        if (orderId) {
          pollOrderStatus(orderId);
        } else {
          Alert.alert('Payment Initiated', 'After completing payment in your browser, return here.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      } else if (order?.success !== false) {
        Alert.alert('✅ Success!', 'Skill purchased and ready to install!');
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('Payment Failed', e?.message || 'Could not process payment');
    } finally {
      setPaying(false);
    }
  };

  const price = skill?.pricing?.pricePerCall ?? skill?.price ?? 0;
  const currency = skill?.pricing?.currency ?? skill?.priceUnit ?? 'USD';
  const usdtEquiv = price > 0 ? `≈ ${(price * 0.995).toFixed(2)} USDT` : '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Close button */}
      <View style={styles.headerRow}>
        <View style={styles.brandLogo}><Text style={styles.brandLogoText}>⚡</Text></View>
        <Text style={styles.brandName}>AGENTRIX</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Total Amount */}
      <View style={styles.amountSection}>
        <Text style={styles.amountLabel}>Total Amount</Text>
        <Text style={styles.amountValue}>{price > 0 ? `$${price} ${currency}` : 'Free'}</Text>
        <Text style={styles.amountSkill}>{skillName || skill?.displayName || skill?.name}</Text>
      </View>

      {/* ═══ CRYPTO PAYMENT ═══ */}
      <View style={styles.sectionRow}>
        <View style={styles.sectionIconWrap}><Text style={styles.sectionIcon}>💰</Text></View>
        <Text style={styles.sectionTitle}>CRYPTO PAYMENT</Text>
        <View style={styles.testnetBadge}><Text style={styles.testnetText}>BSC TESTNET</Text></View>
      </View>

      {/* QuickPay */}
      <TouchableOpacity style={[styles.payOption, styles.payOptionHighlight]} onPress={() => handlePay('x402')} disabled={paying}>
        <Text style={styles.payOptionEmoji}>⚡</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.payOptionTitle}>QuickPay</Text>
          <Text style={styles.payOptionSub}>Enable for instant payment</Text>
        </View>
        {paying ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.setupText}>SETUP ›</Text>}
      </TouchableOpacity>

      {/* Wallet Pay */}
      <TouchableOpacity style={styles.payOption} onPress={() => handlePay('wallet')} disabled={paying}>
        <Text style={styles.payOptionEmoji}>💼</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.payOptionTitle}>Wallet Pay</Text>
          <Text style={styles.payOptionSub}>Connect Wallet</Text>
        </View>
        <Text style={styles.usdtAmount}>{usdtEquiv}</Text>
      </TouchableOpacity>

      {/* Scan to Pay */}
      <TouchableOpacity style={styles.payOption} onPress={() => handlePay('qr')} disabled={paying}>
        <Text style={styles.payOptionEmoji}>📱</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.payOptionTitle}>Scan to Pay</Text>
          <Text style={styles.payOptionSub}>Pay with any mobile wallet</Text>
        </View>
        <Text style={styles.usdtAmount}>{usdtEquiv}</Text>
      </TouchableOpacity>

      {/* OR divider */}
      <View style={styles.orDivider}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.orLine} />
      </View>

      {/* ═══ FIAT PAYMENT ═══ */}
      <View style={styles.sectionRow}>
        <View style={styles.sectionIconWrap}><Text style={styles.sectionIcon}>💳</Text></View>
        <Text style={styles.sectionTitle}>FIAT PAYMENT</Text>
      </View>

      <TouchableOpacity style={styles.fiatOption} onPress={() => setExpandFiat(!expandFiat)}>
        <Text style={styles.fiatOptionText}>PAY VIA STRIPE</Text>
        <Text style={styles.fiatChevron}>{expandFiat ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expandFiat && (
        <View style={styles.fiatExpanded}>
          <TouchableOpacity style={styles.stripeBtn} onPress={() => handlePay('stripe')} disabled={paying}>
            {paying ? <ActivityIndicator color="#fff" /> : <Text style={styles.stripeBtnText}>💳 Pay ${price} with Card</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.transakBtn} onPress={() => handlePay('transak')} disabled={paying}>
            <Text style={styles.transakBtnText}>🏦 Pay via Transak</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 24, paddingBottom: 48, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  brandLogo: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  brandLogoText: { fontSize: 18 },
  brandName: { flex: 1, fontSize: 14, fontWeight: '700', letterSpacing: 3, color: '#333' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 16, color: '#666' },
  amountSection: { alignItems: 'center', paddingVertical: 20, gap: 4 },
  amountLabel: { fontSize: 14, color: '#888' },
  amountValue: { fontSize: 32, fontWeight: '800', color: '#111' },
  amountSkill: { fontSize: 14, color: colors.accent },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 },
  sectionIconWrap: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#eef', alignItems: 'center', justifyContent: 'center' },
  sectionIcon: { fontSize: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#555', letterSpacing: 0.5, flex: 1 },
  testnetBadge: { backgroundColor: '#ef444422', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  testnetText: { fontSize: 10, fontWeight: '700', color: '#ef4444' },
  payOption: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  payOptionHighlight: { borderColor: colors.accent + '66', backgroundColor: colors.accent + '08' },
  payOptionEmoji: { fontSize: 24 },
  payOptionTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  payOptionSub: { fontSize: 12, color: '#888' },
  setupText: { fontSize: 12, fontWeight: '700', color: colors.accent },
  usdtAmount: { fontSize: 13, fontWeight: '600', color: '#555' },
  orDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  orLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  orText: { fontSize: 12, color: '#aaa', fontWeight: '600' },
  fiatOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  fiatOptionText: { fontSize: 13, fontWeight: '700', color: '#555', letterSpacing: 0.5 },
  fiatChevron: { fontSize: 12, color: '#aaa' },
  fiatExpanded: { gap: 10, paddingTop: 4 },
  stripeBtn: { backgroundColor: '#635BFF', borderRadius: 12, padding: 15, alignItems: 'center' },
  stripeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  transakBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  transakBtnText: { color: '#555', fontWeight: '600', fontSize: 14 },
});
