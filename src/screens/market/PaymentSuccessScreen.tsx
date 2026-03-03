/**
 * PaymentSuccessScreen — Shown after a successful skill purchase.
 * Displays order details, payment confirmation, and sharing options.
 */
import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Share, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../../theme/colors';
import { apiFetch } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import type { MarketStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<MarketStackParamList, 'PaymentSuccess'>;
type RouteT = RouteProp<MarketStackParamList, 'PaymentSuccess'>;

const STATUS_ICON: Record<string, string> = {
  completed: '✅',
  paid: '✅',
  pending: '⏳',
  processing: '⚙️',
  failed: '❌',
  cancelled: '🚫',
};

const METHOD_LABEL: Record<string, string> = {
  x402: '⚡ QuickPay (Crypto)',
  wallet: '💼 Wallet Pay',
  qr: '📱 Scan to Pay',
  stripe: '💳 Stripe Card',
  transak: '🏦 Transak Fiat',
  quick_pay: '⚡ QuickPay',
  walletconnect: '🔗 WalletConnect',
  scan: '📱 Scan to Pay',
};

export function PaymentSuccessScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const { orderId, skillId, skillName, paymentMethod, amount, currency } = route.params;
  const user = useAuthStore((s) => s.user);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderId ? apiFetch<any>(`/orders/${orderId}`) : null,
    enabled: !!orderId,
    retry: 2,
  });

  const displayOrder = order?.data ?? order;
  const displayStatus = displayOrder?.status ?? 'completed';
  const displayAmount = displayOrder?.amount ?? amount ?? 0;
  const displayCurrency = displayOrder?.currency ?? currency ?? 'USD';
  const displaySkillName = displayOrder?.metadata?.skillName ?? skillName ?? 'Skill';
  const displayMethod = displayOrder?.paymentMethod ?? paymentMethod ?? 'x402';
  const shortOrderId = orderId ? `#${orderId.slice(-8).toUpperCase()}` : '#—';

  const handleShare = useCallback(() => {
    Share.share({
      title: `Check out ${displaySkillName} on Agentrix!`,
      message: `I just installed "${displaySkillName}" on Agentrix — the AI agent marketplace 🚀\n\nhttps://agentrix.top/pay/checkout?skillId=${skillId}`,
    });
  }, [displaySkillName, skillId]);

  const handleInstall = useCallback(() => {
    if (skillId) {
      navigation.navigate('SkillInstall', { skillId, skillName: displaySkillName });
    } else {
      Alert.alert('Install', 'Navigate to your installed skills in My Skills.');
    }
  }, [navigation, skillId, displaySkillName]);

  const handleViewOrders = useCallback(() => {
    (navigation as any).navigate('Me', { screen: 'MyOrders' });
  }, [navigation]);

  const handleBackToMarket = useCallback(() => {
    navigation.popToTop();
  }, [navigation]);

  const statusIcon = STATUS_ICON[displayStatus] ?? '✅';
  const isSuccess = ['completed', 'paid'].includes(displayStatus);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Success Hero */}
      <View style={[styles.heroCard, isSuccess ? styles.heroSuccess : styles.heroPending]}>
        <Text style={styles.heroIcon}>{statusIcon}</Text>
        <Text style={styles.heroTitle}>
          {isSuccess ? 'Payment Successful!' : displayStatus === 'pending' ? 'Payment Pending' : 'Payment Status'}
        </Text>
        <Text style={styles.heroSub}>
          {isSuccess
            ? `"${displaySkillName}" is ready to install`
            : `Order ${shortOrderId} is ${displayStatus}`}
        </Text>
      </View>

      {/* Order Details Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📄 Order Details</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />
        ) : (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order ID</Text>
              <Text style={styles.detailValue}>{shortOrderId}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Skill</Text>
              <Text style={[styles.detailValue, { color: colors.accent }]}>{displaySkillName}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={[styles.detailValue, { fontWeight: '800' }]}>
                {displayAmount > 0 ? `$${displayAmount} ${displayCurrency}` : 'Free'}
              </Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Method</Text>
              <Text style={styles.detailValue}>{METHOD_LABEL[displayMethod] ?? displayMethod}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={[styles.statusChip, { backgroundColor: isSuccess ? '#22c55e22' : '#f59e0b22' }]}>
                <Text style={[styles.statusChipText, { color: isSuccess ? '#22c55e' : '#f59e0b' }]}>
                  {statusIcon} {displayStatus}
                </Text>
              </View>
            </View>

            {displayOrder?.createdAt && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>
                    {new Date(displayOrder.createdAt).toLocaleString()}
                  </Text>
                </View>
              </>
            )}

            {user?.nickname && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account</Text>
                  <Text style={styles.detailValue}>{user.nickname}</Text>
                </View>
              </>
            )}
          </>
        )}
      </View>

      {/* Referral / Share Banner */}
      <TouchableOpacity style={styles.shareBanner} onPress={handleShare} activeOpacity={0.85}>
        <View style={styles.shareBannerLeft}>
          <Text style={styles.shareBannerTitle}>🎁 Share & Earn</Text>
          <Text style={styles.shareBannerSub}>Share this skill and earn referral rewards</Text>
        </View>
        <Text style={styles.shareBannerBtn}>Share →</Text>
      </TouchableOpacity>

      {/* CTA Buttons */}
      {isSuccess && (
        <TouchableOpacity style={styles.installBtn} onPress={handleInstall}>
          <Text style={styles.installBtnText}>⚡ Install to Agent Now</Text>
        </TouchableOpacity>
      )}

      <View style={styles.secondaryBtns}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleViewOrders}>
          <Text style={styles.secondaryBtnText}>📋 View Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleBackToMarket}>
          <Text style={styles.secondaryBtnText}>🏪 Back to Market</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 48, gap: 14 },

  heroCard: {
    borderRadius: 20, padding: 28, alignItems: 'center', gap: 8,
    borderWidth: 1,
  },
  heroSuccess: {
    backgroundColor: '#22c55e11',
    borderColor: '#22c55e44',
  },
  heroPending: {
    backgroundColor: '#f59e0b11',
    borderColor: '#f59e0b44',
  },
  heroIcon: { fontSize: 52 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  heroSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border, gap: 0,
  },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  detailLabel: { fontSize: 13, color: colors.textMuted },
  detailValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, flex: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.border },
  statusChip: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusChipText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

  shareBanner: {
    backgroundColor: colors.accent + '18',
    borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.accent + '44',
  },
  shareBannerLeft: { flex: 1 },
  shareBannerTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  shareBannerSub: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  shareBannerBtn: { fontSize: 14, fontWeight: '700', color: colors.accent },

  installBtn: {
    backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center',
  },
  installBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  secondaryBtns: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: 12, padding: 13,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
});
