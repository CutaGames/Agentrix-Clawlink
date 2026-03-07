// 我的订单页
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { colors } from '../theme/colors';
import { apiFetch } from '../services/api';

interface Order {
  id: string;
  skillName: string;
  price: number;
  priceUnit: string;
  status: 'completed' | 'pending' | 'refunded';
  createdAt: string;
}

interface Props {
  navigation: any;
}

export function MyOrdersScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await apiFetch<any[]>('/orders');
      const mapped: Order[] = (data || []).map((o: any) => ({
        id: o.id,
        skillName: o.product?.displayName || o.product?.name || o.metadata?.skillName || 'Unknown',
        price: o.amount || 0,
        priceUnit: o.currency || 'USD',
        status: o.status === 'SETTLED' || o.status === 'DELIVERED' ? 'completed' :
                o.status === 'REFUNDED' ? 'refunded' : 'pending',
        createdAt: o.createdAt,
      }));
      setOrders(mapped);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    completed: { label: '已完成', color: colors.success },
    pending: { label: '处理中', color: colors.warning },
    refunded: { label: '已退款', color: colors.muted },
  };

  const renderItem = ({ item }: { item: Order }) => {
    const status = statusMap[item.status] || statusMap.pending;
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => navigation.navigate('SkillDetail', { skillId: item.id, skillName: item.skillName })}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderName}>{item.skillName}</Text>
          <Text style={[styles.orderStatus, { color: status.color }]}>{status.label}</Text>
        </View>
        <View style={styles.orderFooter}>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.orderPrice}>
            ${item.price < 1 ? item.price.toFixed(4) : item.price.toFixed(2)}/{item.priceUnit}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyText}>暂无订单</Text>
        <Text style={styles.emptySubtext}>去市场看看有什么好用的技能</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  listContent: { padding: 16, paddingBottom: 20 },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderName: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  orderStatus: { fontSize: 12, fontWeight: '600' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderDate: { color: colors.muted, fontSize: 12 },
  orderPrice: { color: colors.success, fontSize: 14, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: colors.muted, fontSize: 13, marginTop: 4 },
});
