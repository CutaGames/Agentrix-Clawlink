// 商户身份首页内容
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../Card';
import { PrimaryButton } from '../PrimaryButton';
import { colors } from '../../theme/colors';

// Mock 数据
const mockMerchantData = {
  todayRevenue: 5678.9,
  pendingSettlement: 12000,
  availableBalance: 8500,
};

const mockRecentOrders = [
  { id: '1', amount: 1500, status: 'completed', time: '5分钟前' },
  { id: '2', amount: 800, status: 'processing', time: '1小时前' },
  { id: '3', amount: 2300, status: 'completed', time: '今天' },
];

const mockSplitPlans = [
  { id: '1', name: '标准 10%', rate: 10, status: 'active' },
  { id: '2', name: '高级 15%', rate: 15, status: 'active' },
  { id: '3', name: 'VIP 20%', rate: 20, status: 'inactive' },
];

export const MerchantHomeContent: React.FC = () => {
  const navigation = useNavigation<any>();
  const [payAmount, setPayAmount] = React.useState('');

  return (
    <View style={styles.container}>
      {/* 收款概览 */}
      <Card style={styles.overviewCard}>
        <View style={styles.overviewHeader}>
          <Text style={styles.overviewLabel}>📈 今日收款</Text>
        </View>
        <Text style={styles.overviewValue}>
          ¥{mockMerchantData.todayRevenue.toLocaleString()}
        </Text>
        <View style={styles.overviewStats}>
          <View style={styles.overviewStat}>
            <Text style={styles.statLabel}>待结算</Text>
            <Text style={styles.statValue}>¥{mockMerchantData.pendingSettlement.toLocaleString()}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.overviewStat}>
            <Text style={styles.statLabel}>可提现</Text>
            <Text style={styles.statValue}>¥{mockMerchantData.availableBalance.toLocaleString()}</Text>
          </View>
        </View>
      </Card>

      {/* 快速收款 */}
      <Card>
        <Text style={styles.sectionTitle}>💳 快速收款</Text>
        <View style={styles.quickPayForm}>
          <View style={styles.inputRow}>
            <Text style={styles.currencyPrefix}>¥</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="输入金额"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              value={payAmount}
              onChangeText={setPayAmount}
            />
          </View>
          <TouchableOpacity style={styles.planSelector}>
            <Text style={styles.planSelectorLabel}>分佣计划</Text>
            <Text style={styles.planSelectorValue}>标准 10% ▼</Text>
          </TouchableOpacity>
          <PrimaryButton 
            title="生成收款码" 
            onPress={() => navigation.navigate('QuickPay', { amount: payAmount })}
          />
        </View>
      </Card>

      {/* 最近订单 */}
      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📋 最近订单</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settlements')}>
            <Text style={styles.viewAll}>查看全部 →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.orderList}>
          {mockRecentOrders.map((order) => (
            <View key={order.id} style={styles.orderItem}>
              <View>
                <Text style={styles.orderAmount}>¥{order.amount.toLocaleString()}</Text>
                <Text style={styles.orderTime}>{order.time}</Text>
              </View>
              <View style={[
                styles.orderStatus,
                order.status === 'completed' && styles.statusCompleted,
                order.status === 'processing' && styles.statusProcessing,
              ]}>
                <Text style={styles.orderStatusText}>
                  {order.status === 'completed' ? '已完成' : '处理中'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* 分佣计划 */}
      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📊 分佣计划</Text>
          <Text style={styles.badge}>{mockSplitPlans.filter(p => p.status === 'active').length} 个</Text>
        </View>
        <View style={styles.planList}>
          {mockSplitPlans.map((plan) => (
            <TouchableOpacity 
              key={plan.id} 
              style={styles.planItem}
              onPress={() => navigation.navigate('SplitPlans')}
            >
              <View>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planRate}>{plan.rate}% 分佣</Text>
              </View>
              <View style={[
                styles.planStatus,
                plan.status === 'active' && styles.planActive,
              ]}>
                <Text style={styles.planStatusText}>
                  {plan.status === 'active' ? '启用' : '停用'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <PrimaryButton 
          title="管理计划" 
          onPress={() => navigation.navigate('SplitPlans')}
        />
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  // 概览卡片
  overviewCard: {
    backgroundColor: '#059669', // emerald
  },
  overviewHeader: {
    marginBottom: 8,
  },
  overviewLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  overviewValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  overviewStats: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 12,
  },
  overviewStat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // 通用
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  viewAll: {
    color: colors.primary,
    fontSize: 12,
  },
  badge: {
    backgroundColor: colors.primary,
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  // 快速收款
  quickPayForm: {
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: colors.text,
    fontSize: 24,
    fontWeight: '600',
    paddingVertical: 12,
  },
  planSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  planSelectorLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  planSelectorValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  // 订单列表
  orderList: {
    gap: 8,
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderAmount: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  orderTime: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  orderStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: colors.muted,
  },
  statusCompleted: {
    backgroundColor: '#059669',
  },
  statusProcessing: {
    backgroundColor: '#f59e0b',
  },
  orderStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  // 计划列表
  planList: {
    gap: 8,
    marginBottom: 12,
  },
  planItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  planRate: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  planStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: colors.muted,
  },
  planActive: {
    backgroundColor: '#059669',
  },
  planStatusText: {
    color: '#fff',
    fontSize: 12,
  },
});
