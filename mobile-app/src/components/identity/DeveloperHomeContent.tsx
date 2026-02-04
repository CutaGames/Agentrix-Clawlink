// 开发者身份首页内容
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../Card';
import { PrimaryButton } from '../PrimaryButton';
import { colors } from '../../theme/colors';

// Mock 数据
const mockDeveloperData = {
  pendingSettlement: 2500,
  availableBalance: 1800,
  weekEarned: 800,
};

const mockPendingTasks = [
  { id: '1', title: '里程碑 "API对接"', type: 'milestone', status: '待提交', dueDate: '明天' },
  { id: '2', title: '里程碑 "UI设计"', type: 'milestone', status: '审批中', dueDate: null },
  { id: '3', title: '新订单 "小程序开发"', type: 'order', status: '待接单', dueDate: null },
];

const mockBudgetPools = [
  { id: '1', name: 'Agentrix SDK 开发', budget: 5000, status: 'active' },
  { id: '2', name: '商城小程序', budget: 3000, status: 'active' },
];

const mockMarketOrders = 8;

export const DeveloperHomeContent: React.FC = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      {/* 收益概览 */}
      <Card style={styles.overviewCard}>
        <View style={styles.overviewHeader}>
          <Text style={styles.overviewLabel}>💰 开发者收益</Text>
        </View>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>待结算</Text>
            <Text style={styles.balanceValue}>${mockDeveloperData.pendingSettlement.toLocaleString()}</Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>可提现</Text>
            <Text style={styles.balanceValue}>${mockDeveloperData.availableBalance.toLocaleString()}</Text>
          </View>
        </View>
        <View style={styles.weekEarned}>
          <Text style={styles.weekEarnedText}>本周 +${mockDeveloperData.weekEarned}</Text>
        </View>
      </Card>

      {/* 待处理任务 */}
      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⚡ 待处理任务</Text>
          <Text style={styles.badge}>{mockPendingTasks.length} 项</Text>
        </View>
        <View style={styles.taskList}>
          {mockPendingTasks.map((task) => (
            <View key={task.id} style={styles.taskItem}>
              <View style={styles.taskInfo}>
                <Text style={styles.taskIcon}>
                  {task.type === 'milestone' ? '📋' : '📦'}
                </Text>
                <View style={styles.taskDetails}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <View style={styles.taskMeta}>
                    <Text style={[
                      styles.taskStatus,
                      task.status === '待提交' && styles.statusWarning,
                      task.status === '审批中' && styles.statusInfo,
                      task.status === '待接单' && styles.statusPrimary,
                    ]}>
                      {task.status}
                    </Text>
                    {task.dueDate && (
                      <Text style={styles.taskDue}>({task.dueDate})</Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* 我的预算池 */}
      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📦 我的预算池</Text>
          <Text style={styles.badge}>{mockBudgetPools.length} 个活跃</Text>
        </View>
        <View style={styles.poolList}>
          {mockBudgetPools.map((pool) => (
            <TouchableOpacity 
              key={pool.id} 
              style={styles.poolItem}
              onPress={() => navigation.navigate('BudgetPools')}
            >
              <Text style={styles.poolName}>{pool.name}</Text>
              <Text style={styles.poolBudget}>${pool.budget.toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <PrimaryButton 
          title="查看全部" 
          onPress={() => navigation.navigate('BudgetPools')}
        />
      </Card>

      {/* 任务市场入口 */}
      <Card>
        <View style={styles.marketHeader}>
          <Text style={styles.sectionTitle}>🎯 任务市场</Text>
          <View style={styles.matchBadge}>
            <Text style={styles.matchText}>{mockMarketOrders} 个匹配</Text>
          </View>
        </View>
        <Text style={styles.marketDesc}>
          发现适合你技能的新订单机会
        </Text>
        <PrimaryButton 
          title="浏览市场" 
          onPress={() => {/* TODO: 任务市场页面 */}}
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
    backgroundColor: '#7c3aed', // violet
  },
  overviewHeader: {
    marginBottom: 12,
  },
  overviewLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  balanceRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 12,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 4,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  weekEarned: {
    marginTop: 12,
    alignItems: 'center',
  },
  weekEarnedText: {
    color: '#4ade80',
    fontSize: 14,
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
  },
  badge: {
    backgroundColor: colors.primary,
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  // 任务列表
  taskList: {
    gap: 8,
  },
  taskItem: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  taskDetails: {
    flex: 1,
  },
  taskTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  taskStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusWarning: {
    color: '#f59e0b',
  },
  statusInfo: {
    color: '#3b82f6',
  },
  statusPrimary: {
    color: colors.primary,
  },
  taskDue: {
    color: colors.muted,
    fontSize: 12,
  },
  // 预算池列表
  poolList: {
    gap: 8,
    marginBottom: 12,
  },
  poolItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  poolName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  poolBudget: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  // 任务市场
  marketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchBadge: {
    backgroundColor: '#4ade80',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  marketDesc: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 12,
  },
});
