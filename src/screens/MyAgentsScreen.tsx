import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { agentApi } from '../services/api';
import { Card } from '../components/Card';

interface Agent {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  category: string;
  status: 'active' | 'idle' | 'offline';
  lastActiveAt?: string;
}

// Mock data for development
const MOCK_AGENTS: Agent[] = [
  {
    id: '1',
    name: '个人助理 Agent',
    description: '帮你管理日常任务、发现空投、执行 AutoEarn 策略',
    category: 'personal',
    status: 'active',
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: '交易 Agent',
    description: '自动执行交易策略、监控价格、管理投资组合',
    category: 'trading',
    status: 'idle',
    lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    name: '空投猎手',
    description: '24/7 监控空投机会，自动完成任务并领取',
    category: 'airdrop',
    status: 'active',
    lastActiveAt: new Date().toISOString(),
  },
];

export default function MyAgentsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAgents = async () => {
    try {
      const result = await agentApi.getMyAgents();
      if (result && result.length > 0) {
        setAgents(result);
      } else {
        // 使用 mock 数据
        setAgents(MOCK_AGENTS);
      }
    } catch (error) {
      // 使用 mock 数据
      setAgents(MOCK_AGENTS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAgents();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'idle':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '运行中';
      case 'idle':
        return '空闲';
      default:
        return '离线';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'personal':
        return '👤';
      case 'trading':
        return '📈';
      case 'airdrop':
        return '🎁';
      case 'merchant':
        return '🏪';
      case 'developer':
        return '💻';
      default:
        return '🤖';
    }
  };

  const renderAgent = ({ item }: { item: Agent }) => (
    <TouchableOpacity
      style={styles.agentCard}
      onPress={() => navigation.navigate('AgentChat', { 
        agentId: item.id, 
        agentName: item.name 
      })}
    >
      <View style={styles.agentIcon}>
        <Text style={styles.agentIconText}>{getCategoryIcon(item.category)}</Text>
      </View>
      <View style={styles.agentInfo}>
        <View style={styles.agentHeader}>
          <Text style={styles.agentName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.agentDescription} numberOfLines={2}>
          {item.description}
        </Text>
        {item.lastActiveAt && (
          <Text style={styles.lastActive}>
            最后活动: {new Date(item.lastActiveAt).toLocaleString()}
          </Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={agents}
        renderItem={renderAgent}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>我的 Agent</Text>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{agents.length}</Text>
                <Text style={styles.statLabel}>总数</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {agents.filter(a => a.status === 'active').length}
                </Text>
                <Text style={styles.statLabel}>运行中</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {agents.filter(a => a.status === 'idle').length}
                </Text>
                <Text style={styles.statLabel}>空闲</Text>
              </View>
            </View>
          </Card>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🤖</Text>
            <Text style={styles.emptyTitle}>还没有 Agent</Text>
            <Text style={styles.emptyText}>
              创建你的第一个 Agent，让 AI 帮你自动完成任务
            </Text>
            <TouchableOpacity style={styles.createButton}>
              <Text style={styles.createButtonText}>创建 Agent</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  agentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agentIconText: {
    fontSize: 24,
  },
  agentInfo: {
    flex: 1,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  agentDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  lastActive: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: 20,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
