import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, Modal, ScrollView, RefreshControl, Clipboard,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../services/api';
import { colors } from '../../theme/colors';

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  pending:    { color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
  paid:       { color: '#22c55e', bg: '#dcfce7', icon: '✅' },
  completed:  { color: '#22c55e', bg: '#dcfce7', icon: '✅' },
  processing: { color: '#3b82f6', bg: '#dbeafe', icon: '⚙️' },
  shipped:    { color: '#8b5cf6', bg: '#ede9fe', icon: '🚚' },
  delivered:  { color: '#22c55e', bg: '#dcfce7', icon: '📦' },
  cancelled:  { color: '#6b7280', bg: '#f3f4f6', icon: '🚫' },
  failed:     { color: '#ef4444', bg: '#fee2e2', icon: '❌' },
  disputed:   { color: '#f59e0b', bg: '#fef3c7', icon: '⚠️' },
  refunded:   { color: '#6b7280', bg: '#f3f4f6', icon: '↩️' },
};

function getStatusCfg(s: string) {
  return STATUS_CONFIG[s?.toLowerCase()] || { color: colors.textMuted, bg: colors.bgCard, icon: '📋' };
}

function OrderDetailModal({ order, onClose }: { order: any; onClose: () => void }) {
  if (!order) return null;
  const cfg = getStatusCfg(order.status);
  const skillName =
    order.metadata?.skillName ||
    order.skillName ||
    order.product?.name ||
    'Skill Purchase';
  const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleString() : '—';
  const updatedAt = order.updatedAt ? new Date(order.updatedAt).toLocaleString() : '—';

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={dStyles.backdrop}>
        <View style={dStyles.sheet}>
          {/* Header */}
          <View style={dStyles.header}>
            <Text style={dStyles.headerTitle}>Order Detail</Text>
            <TouchableOpacity onPress={onClose} style={dStyles.closeBtn}>
              <Text style={dStyles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Status hero */}
            <View style={[dStyles.heroCard, { backgroundColor: cfg.bg, borderColor: cfg.color + '44' }]}>
              <Text style={dStyles.heroIcon}>{cfg.icon}</Text>
              <Text style={[dStyles.heroStatus, { color: cfg.color }]}>
                {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
              </Text>
            </View>

            {/* Skill name */}
            <Text style={dStyles.skillName}>{skillName}</Text>

            {/* Details */}
            <View style={dStyles.detailCard}>
              {[
                { label: 'Order ID', value: `#${(order.id || '').slice(-12).toUpperCase()}`, mono: true },
                { label: 'Amount', value: order.amount > 0 ? `$${order.amount} ${order.currency || 'USD'}` : 'Free', bold: true },
                { label: 'Method', value: order.metadata?.paymentMethod || order.paymentMethod || '—' },
                { label: 'Asset Type', value: order.assetType || order.metadata?.assetType || '—' },
                { label: 'Created', value: createdAt },
                { label: 'Updated', value: updatedAt },
                ...(order.metadata?.skillId ? [{ label: 'Skill ID', value: order.metadata.skillId, mono: true }] : []),
                ...(order.merchantId ? [{ label: 'Merchant', value: order.merchantId.slice(-12) + '…', mono: true }] : []),
              ].map((row, i) => (
                <React.Fragment key={row.label}>
                  {i > 0 && <View style={dStyles.divider} />}
                  <View style={dStyles.detailRow}>
                    <Text style={dStyles.detailLabel}>{row.label}</Text>
                    <Text style={[
                      dStyles.detailValue,
                      (row as any).mono && { fontFamily: 'monospace', fontSize: 11 },
                      (row as any).bold && { fontWeight: '800', color: colors.textPrimary },
                    ]}>{row.value}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            {/* Copy order ID */}
            <TouchableOpacity
              style={dStyles.copyBtn}
              onPress={() => {
                Clipboard.setString(order.id);
              }}
            >
              <Text style={dStyles.copyBtnText}>📋 Copy Order ID</Text>
            </TouchableOpacity>

            {/* Refund button for paid orders */}
            {(order.status === 'paid' || order.status === 'completed') && (
              <TouchableOpacity
                style={dStyles.refundBtn}
                onPress={async () => {
                  try {
                    await apiFetch(`/orders/${order.id}/refund`, {
                      method: 'POST',
                      body: JSON.stringify({ reason: 'User requested refund' }),
                    });
                    onClose();
                  } catch (e: any) {
                    // show error
                  }
                }}
              >
                <Text style={dStyles.refundBtnText}>↩️ Request Refund</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function MyOrdersScreen() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    // ✅ Fixed endpoint: /orders (not /user/orders)
    queryFn: () => apiFetch<any>('/orders'),
    retry: 2,
  });

  const orders: any[] = Array.isArray(data)
    ? data
    : (data?.items || data?.data || data?.orders || []);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    setRefreshing(false);
  };

  const renderOrder = ({ item: order }: { item: any }) => {
    const cfg = getStatusCfg(order.status);
    const skillName =
      order.metadata?.skillName ||
      order.skillName ||
      order.product?.name ||
      'Order';
    const date = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString()
      : '';

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => setSelectedOrder(order)}
        activeOpacity={0.8}
      >
        {/* Left: icon + info */}
        <View style={[styles.statusDot, { backgroundColor: cfg.bg }]}>
          <Text style={{ fontSize: 16 }}>{cfg.icon}</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.orderItem} numberOfLines={1}>{skillName}</Text>
          <Text style={styles.orderId}>#{(order.id || '').slice(-8).toUpperCase()} · {date}</Text>
        </View>

        {/* Right: amount + status */}
        <View style={styles.orderRight}>
          <Text style={styles.orderAmount}>
            {order.amount > 0 ? `$${order.amount}` : 'Free'}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusChipText, { color: cfg.color }]}>
              {order.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading orders…</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o: any) => o.id || String(Math.random())}
          contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.empty}>No orders yet</Text>
              <Text style={styles.emptySub}>Your skill purchases will appear here</Text>
            </View>
          }
          renderItem={renderOrder}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        />
      )}

      {/* Order detail modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: colors.textMuted },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  emptyContainer: { flex: 1 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 48 },
  empty: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  statusDot: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  orderItem: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  orderId: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  orderRight: { alignItems: 'flex-end', gap: 6 },
  orderAmount: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  statusChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusChipText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
});

const dStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '85%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, color: colors.textMuted },
  heroCard: {
    borderRadius: 16, padding: 20, alignItems: 'center', gap: 6,
    borderWidth: 1, marginBottom: 12,
  },
  heroIcon: { fontSize: 36 },
  heroStatus: { fontSize: 18, fontWeight: '800', textTransform: 'capitalize' },
  skillName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 16 },
  detailCard: {
    backgroundColor: colors.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9 },
  detailLabel: { fontSize: 13, color: colors.textMuted },
  detailValue: { fontSize: 13, color: colors.textSecondary, flex: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.border },
  copyBtn: {
    backgroundColor: colors.bgCard, borderRadius: 12, padding: 13,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 10,
  },
  copyBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  refundBtn: {
    backgroundColor: '#fee2e2', borderRadius: 12, padding: 13,
    alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5',
  },
  refundBtnText: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
});
