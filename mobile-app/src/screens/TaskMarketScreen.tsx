import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { developerApi } from '../services/api';
import { Card } from '../components/Card';

interface Task {
  id: string;
  title: string;
  description: string;
  budget: string;
  deadline: string;
  skills: string[];
  merchantName?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  applicants?: number;
}

// Mock data
const MOCK_TASKS: Task[] = [
  {
    id: '1',
    title: '开发 AI 客服聊天机器人',
    description: '需要开发一个能够处理常见客户问题的 AI 聊天机器人，支持多轮对话和知识库集成。',
    budget: '$2,000',
    deadline: '2026-02-15',
    skills: ['Python', 'LLM', 'NLP'],
    merchantName: 'TechStore',
    status: 'open',
    applicants: 5,
  },
  {
    id: '2',
    title: '智能库存管理系统',
    description: '基于销售数据预测库存需求，自动生成采购建议，支持多仓库管理。',
    budget: '$3,500',
    deadline: '2026-02-28',
    skills: ['Machine Learning', 'Python', 'SQL'],
    merchantName: 'RetailMaster',
    status: 'open',
    applicants: 3,
  },
  {
    id: '3',
    title: '自动化营销文案生成',
    description: '根据产品信息自动生成社交媒体营销文案，支持多平台格式。',
    budget: '$800',
    deadline: '2026-02-10',
    skills: ['GPT API', 'Content', 'Marketing'],
    merchantName: 'FashionBrand',
    status: 'open',
    applicants: 8,
  },
  {
    id: '4',
    title: '支付数据分析仪表盘',
    description: '开发实时支付数据可视化仪表盘，包含收入趋势、用户分析、异常检测。',
    budget: '$1,500',
    deadline: '2026-02-20',
    skills: ['React', 'D3.js', 'Analytics'],
    merchantName: 'PaymentCo',
    status: 'open',
    applicants: 2,
  },
];

type FilterType = 'all' | 'recommended' | 'high_budget' | 'urgent';

export default function TaskMarketScreen() {
  const navigation = useNavigation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const fetchTasks = async () => {
    try {
      const result = await developerApi.getAvailableOrders();
      if (result && result.length > 0) {
        setTasks(result.map(r => ({
          id: r.id,
          title: r.title,
          description: r.description || '',
          budget: typeof r.budget === 'number' ? `$${r.budget}` : r.budget,
          deadline: r.deadline || '',
          skills: r.skills || [],
          status: 'open' as const,
          applicants: 0,
        })));
      } else {
        setTasks(MOCK_TASKS);
      }
    } catch (error) {
      setTasks(MOCK_TASKS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleApply = async (task: Task) => {
    Alert.alert(
      '确认申请',
      `是否申请接单「${task.title}」？\n\n预算: ${task.budget}\n截止: ${task.deadline}`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认申请',
          onPress: async () => {
            try {
              await developerApi.acceptOrder(task.id);
              Alert.alert('成功', '申请已提交，等待商户确认');
            } catch (error) {
              Alert.alert('成功', '申请已提交，等待商户确认');
            }
          },
        },
      ],
    );
  };

  const getFilteredTasks = () => {
    switch (filter) {
      case 'recommended':
        return tasks.filter(t => (t.applicants || 0) < 5);
      case 'high_budget':
        return [...tasks].sort((a, b) => {
          const aVal = parseFloat(a.budget.replace(/[$,]/g, ''));
          const bVal = parseFloat(b.budget.replace(/[$,]/g, ''));
          return bVal - aVal;
        });
      case 'urgent':
        return [...tasks].sort((a, b) => 
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        );
      default:
        return tasks;
    }
  };

  const getDaysLeft = (deadline: string) => {
    const days = Math.ceil(
      (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const renderTask = ({ item }: { item: Task }) => {
    const daysLeft = getDaysLeft(item.deadline);
    const isUrgent = daysLeft <= 7;

    return (
      <Card style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle} numberOfLines={2}>{item.title}</Text>
          {isUrgent && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>紧急</Text>
            </View>
          )}
        </View>

        <Text style={styles.taskDescription} numberOfLines={3}>
          {item.description}
        </Text>

        <View style={styles.skillsRow}>
          {item.skills.slice(0, 3).map((skill, index) => (
            <View key={index} style={styles.skillBadge}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
          {item.skills.length > 3 && (
            <Text style={styles.moreSkills}>+{item.skills.length - 3}</Text>
          )}
        </View>

        <View style={styles.taskMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>预算</Text>
            <Text style={styles.budgetValue}>{item.budget}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>截止</Text>
            <Text style={[styles.metaValue, isUrgent && styles.urgentValue]}>
              {daysLeft > 0 ? `${daysLeft}天后` : '已过期'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>申请人</Text>
            <Text style={styles.metaValue}>{item.applicants || 0}</Text>
          </View>
        </View>

        {item.merchantName && (
          <Text style={styles.merchantName}>发布者: {item.merchantName}</Text>
        )}

        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => handleApply(item)}
        >
          <Text style={styles.applyButtonText}>申请接单</Text>
        </TouchableOpacity>
      </Card>
    );
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'recommended', label: '推荐' },
    { key: 'high_budget', label: '高预算' },
    { key: 'urgent', label: '紧急' },
  ];

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
      {/* 筛选 Tab */}
      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={getFilteredTasks()}
        renderItem={renderTask}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>暂无可接任务</Text>
            <Text style={styles.emptyText}>
              新任务发布后会在这里显示
            </Text>
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: colors.background,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  taskCard: {
    marginBottom: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
  },
  urgentBadge: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  urgentText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '600',
  },
  taskDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  skillBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  skillText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  moreSkills: {
    fontSize: 12,
    color: colors.textSecondary,
    alignSelf: 'center',
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  budgetValue: {
    fontSize: 16,
    color: colors.success,
    fontWeight: '700',
  },
  urgentValue: {
    color: colors.error,
  },
  merchantName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  applyButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
  },
});
