import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  RefreshControl, ActivityIndicator, Alert, Modal,
  TextInput, ScrollView, Platform, StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { useI18n } from '../../stores/i18nStore';
import { apiFetch } from '../../services/api';

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Types
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
interface MerchantTask {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  budget: number;
  currency: string;
  progress?: number;
  agentId?: string;
  agentName?: string;
  requirements?: {
    deadline?: string;
    deliverables?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface TeamAgent {
  id: string;
  codename: string;
  name: string;
  agentUniqueId: string;
  status: string;
}

interface MyTeam {
  templateSlug: string;
  templateName: string;
  agents: TeamAgent[];
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Agent icons
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
const AGENT_ICONS: Record<string, string> = {
  ceo: '馃憫', dev: '馃捇', 'qa-ops': '馃敡', growth: '馃搱',
  ops: '馃搳', media: '馃摫', ecosystem: '馃寪', community: '馃懃',
  brand: '馃帹', hunter: '馃攳', treasury: '馃挵',
};

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// API
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
async function fetchMyTasks(): Promise<MerchantTask[]> {
  const res = await apiFetch<MerchantTask[] | { data: MerchantTask[] }>('/merchant-tasks/my-tasks');
  return Array.isArray(res) ? res : (res as any).data || [];
}

async function fetchMyTeams(): Promise<MyTeam[]> {
  try {
    const res = await apiFetch<any>('/agent-teams/my-teams');
    return Array.isArray(res) ? res : (res?.data ?? []);
  } catch { return []; }
}

async function createTask(dto: {
  title: string;
  description: string;
  type: string;
  budget: number;
  agentId?: string;
}): Promise<MerchantTask> {
  const res = await apiFetch<MerchantTask | { data: MerchantTask }>('/merchant-tasks', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return (res as any).data || res;
}

async function completeTask(taskId: string): Promise<void> {
  await apiFetch(`/merchant-tasks/${taskId}/complete`, { method: 'PUT' });
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Status metadata
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
const STATUS_META: Record<string, { label: { en: string; zh: string }; color: string; icon: string }> = {
  pending:     { label: { en: 'Pending', zh: '寰呭鐞? },     color: '#6366f1', icon: '馃搵' },
  accepted:    { label: { en: 'Accepted', zh: '宸叉帴鍙? },    color: '#3b82f6', icon: '鉁? },
  open:        { label: { en: 'Open', zh: '寰呭紑濮? },        color: '#6366f1', icon: '馃搵' },
  in_progress: { label: { en: 'In Progress', zh: '杩涜涓? }, color: '#f59e0b', icon: '鈿欙笍' },
  delivered:   { label: { en: 'Delivered', zh: '宸蹭氦浠? },   color: '#8b5cf6', icon: '馃摝' },
  completed:   { label: { en: 'Completed', zh: '宸插畬鎴? },   color: '#22c55e', icon: '鉁? },
  cancelled:   { label: { en: 'Cancelled', zh: '宸插彇娑? },   color: '#ef4444', icon: '鉂? },
};

const TASK_TYPES = [
  { key: 'custom_service', en: 'Custom', zh: '瀹氬埗' },
  { key: 'research', en: 'Research', zh: '璋冪爺' },
  { key: 'content', en: 'Content', zh: '鍐呭' },
  { key: 'development', en: 'Dev', zh: '寮€鍙? },
  { key: 'data_analysis', en: 'Analysis', zh: '鍒嗘瀽' },
  { key: 'consultation', en: 'Consult', zh: '鍜ㄨ' },
];

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Assign Task Modal
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function AssignTaskModal({
  visible, agents, t, onClose, onCreated,
}: {
  visible: boolean;
  agents: TeamAgent[];
  t: (p: { en: string; zh: string }) => string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [taskType, setTaskType] = useState('custom_service');
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert(t({ en: 'Required', zh: '蹇呭～' }), t({ en: 'Title is required', zh: '鏍囬涓嶈兘涓虹┖' }));
      return;
    }
    setSaving(true);
    try {
      await createTask({
        title: title.trim(),
        description: desc.trim(),
        type: taskType,
        budget: 0,
        agentId: selectedAgent,
      });
      setTitle(''); setDesc(''); setSelectedAgent(undefined);
      onCreated();
      onClose();
      Alert.alert('鉁?, t({ en: 'Task assigned!', zh: '浠诲姟宸插垎閰嶏紒' }));
    } catch (e: any) {
      Alert.alert(t({ en: 'Error', zh: '澶辫触' }), e?.message ?? 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={modalS.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={modalS.container}>
          <View style={modalS.header}>
            <Text style={modalS.title}>{t({ en: 'Assign Task', zh: '鍒嗛厤浠诲姟' })}</Text>
            <TouchableOpacity onPress={onClose}><Text style={modalS.close}>鉁?/Text></TouchableOpacity>
          </View>

          {/* Agent Picker */}
          <Text style={modalS.label}>{t({ en: 'Assign to', zh: '鍒嗛厤缁? })}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <View style={modalS.agentRow}>
              <TouchableOpacity
                style={[modalS.agentPill, !selectedAgent && modalS.agentPillActive]}
                onPress={() => setSelectedAgent(undefined)}
              >
                <Text style={[modalS.agentPillText, !selectedAgent && modalS.agentPillTextActive]}>
                  {t({ en: 'Unassigned', zh: '鏈寚娲? })}
                </Text>
              </TouchableOpacity>
              {agents.map(a => {
                const icon = AGENT_ICONS[a.codename] ?? '馃';
                const active = selectedAgent === a.id;
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[modalS.agentPill, active && modalS.agentPillActive]}
                    onPress={() => setSelectedAgent(a.id)}
                  >
                    <Text style={[modalS.agentPillText, active && modalS.agentPillTextActive]}>
                      {icon} @{a.codename}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <TextInput
            style={modalS.input}
            placeholder={t({ en: 'Task title', zh: '浠诲姟鏍囬' })}
            placeholderTextColor={colors.textMuted}
            value={title} onChangeText={setTitle}
          />
          <TextInput
            style={[modalS.input, { minHeight: 70, textAlignVertical: 'top' }]}
            placeholder={t({ en: 'Description / instructions', zh: '鎻忚堪 / 璇︾粏鎸囦护' })}
            placeholderTextColor={colors.textMuted}
            value={desc} onChangeText={setDesc} multiline
          />

          <View style={modalS.typeRow}>
            {TASK_TYPES.map(tt => (
              <TouchableOpacity
                key={tt.key}
                style={[modalS.typePill, taskType === tt.key && modalS.typePillActive]}
                onPress={() => setTaskType(tt.key)}
              >
                <Text style={[modalS.typeText, taskType === tt.key && modalS.typeTextActive]}>
                  {t({ en: tt.en, zh: tt.zh })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={modalS.createBtn} onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <Text style={modalS.createBtnText}>{t({ en: 'Assign Task', zh: '鍒嗛厤浠诲姟' })}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// View tabs
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
type BoardTab = 'by-agent' | 'all';

export function TaskBoardScreen() {
  const { t } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<BoardTab>('by-agent');
  const [showCreate, setShowCreate] = useState(false);

  const { data: myTasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: fetchMyTasks,
    retry: false,
  });

  const { data: myTeams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['my-teams'],
    queryFn: fetchMyTeams,
    retry: false,
  });

  const allAgents = useMemo(() => myTeams.flatMap(t => t.agents), [myTeams]);

  // Group tasks by agent
  const tasksByAgent = useMemo(() => {
    const map: Record<string, { agent: TeamAgent; tasks: MerchantTask[] }> = {};
    // Initialize all agents (even with no tasks)
    for (const a of allAgents) {
      map[a.id] = { agent: a, tasks: [] };
    }
    // Assign tasks to agents
    for (const task of myTasks) {
      if (task.agentId && map[task.agentId]) {
        map[task.agentId].tasks.push(task);
      }
    }
    return Object.values(map);
  }, [allAgents, myTasks]);

  const unassignedTasks = useMemo(() =>
    myTasks.filter(t => !t.agentId || !allAgents.some(a => a.id === t.agentId)),
    [myTasks, allAgents],
  );

  // Stats
  const totalActive = myTasks.filter(t => t.status === 'in_progress' || t.status === 'accepted').length;
  const totalOpen = myTasks.filter(t => t.status === 'open' || t.status === 'pending').length;
  const totalDone = myTasks.filter(t => t.status === 'completed' || t.status === 'delivered').length;

  const loading = tasksLoading || teamsLoading;

  const handleComplete = (task: MerchantTask) => {
    Alert.alert(
      t({ en: 'Complete Task', zh: '瀹屾垚浠诲姟' }),
      t({ en: `Complete "${task.title}"?`, zh: `瀹屾垚"${task.title}"锛焋 }),
      [
        { text: t({ en: 'Cancel', zh: '鍙栨秷' }), style: 'cancel' },
        {
          text: t({ en: 'Complete', zh: '瀹屾垚' }),
          onPress: async () => {
            try {
              await completeTask(task.id);
              queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed');
            }
          },
        },
      ],
    );
  };

  const renderTaskCard = (task: MerchantTask) => {
    const meta = STATUS_META[task.status] ?? STATUS_META.open;
    return (
      <TouchableOpacity
        key={task.id}
        style={s.taskCard}
        onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
        activeOpacity={0.7}
      >
        <View style={s.taskRow}>
          <Text style={s.taskIcon}>{meta.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.taskTitle} numberOfLines={1}>{task.title}</Text>
            {task.description ? <Text style={s.taskDesc} numberOfLines={1}>{task.description}</Text> : null}
          </View>
          <View style={[s.taskBadge, { backgroundColor: meta.color + '18' }]}>
            <Text style={[s.taskBadgeText, { color: meta.color }]}>{t(meta.label)}</Text>
          </View>
        </View>
        {task.status === 'in_progress' && task.progress != null && (
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${Math.min(task.progress, 100)}%` }]} />
          </View>
        )}
        {task.status === 'in_progress' && (
          <TouchableOpacity style={s.completeBtn} onPress={() => handleComplete(task)}>
            <Text style={s.completeBtnText}>鉁?{t({ en: 'Complete', zh: '瀹屾垚' })}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderAgentSection = (item: { agent: TeamAgent; tasks: MerchantTask[] }) => {
    const { agent, tasks } = item;
    const icon = AGENT_ICONS[agent.codename] ?? '馃';
    const activeCount = tasks.filter(t => t.status === 'in_progress').length;
    const statusColor = agent.status === 'active' ? '#22c55e' : '#f59e0b';

    return (
      <View key={agent.id} style={s.agentSection}>
        <TouchableOpacity
          style={s.agentHeader}
          onPress={() => navigation.navigate('AgentProfile', {
            agentId: agent.id, codename: agent.codename,
            name: agent.name, status: agent.status, modelTier: '',
          })}
          activeOpacity={0.7}
        >
          <Text style={s.agentIcon}>{icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.agentName}>{agent.name}</Text>
            <Text style={s.agentCode}>@{agent.codename}</Text>
          </View>
          <View style={[s.agentDot, { backgroundColor: statusColor }]} />
          {activeCount > 0 ? (
            <View style={s.activeBadge}>
              <Text style={s.activeText}>{activeCount} {t({ en: 'active', zh: '杩涜涓? })}</Text>
            </View>
          ) : (
            <Text style={s.idleText}>{t({ en: 'Idle', zh: '绌洪棽' })}</Text>
          )}
          <Text style={s.chevron}>鈥?/Text>
        </TouchableOpacity>
        {tasks.length > 0 ? (
          tasks.map(renderTaskCard)
        ) : (
          <Text style={s.noTasks}>{t({ en: 'No tasks assigned', zh: '鏆傛棤浠诲姟' })}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* Summary */}
      <View style={s.summary}>
        <View style={s.summaryItem}>
          <Text style={[s.summaryNum, { color: '#f59e0b' }]}>{totalActive}</Text>
          <Text style={s.summaryLabel}>{t({ en: 'Active', zh: '杩涜涓? })}</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryNum, { color: '#3b82f6' }]}>{totalOpen}</Text>
          <Text style={s.summaryLabel}>{t({ en: 'Open', zh: '寰呭垎閰? })}</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryNum, { color: '#22c55e' }]}>{totalDone}</Text>
          <Text style={s.summaryLabel}>{t({ en: 'Done', zh: '宸插畬鎴? })}</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryNum, { color: colors.accent }]}>{allAgents.length}</Text>
          <Text style={s.summaryLabel}>{t({ en: 'Agents', zh: 'Agent' })}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'by-agent' && s.tabActive]}
          onPress={() => setTab('by-agent')}
        >
          <Text style={[s.tabText, tab === 'by-agent' && s.tabTextActive]}>
            馃懃 {t({ en: 'By Agent', zh: '鎸堿gent' })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'all' && s.tabActive]}
          onPress={() => setTab('all')}
        >
          <Text style={[s.tabText, tab === 'all' && s.tabTextActive]}>
            馃搵 {t({ en: 'All Tasks', zh: '鍏ㄩ儴浠诲姟' })}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          style={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refetchTasks}
              tintColor={colors.accent}
            />
          }
        >
          {tab === 'by-agent' ? (
            <>
              {tasksByAgent.length === 0 && allAgents.length === 0 ? (
                <View style={s.empty}>
                  <Text style={{ fontSize: 40 }}>馃彈锔?/Text>
                  <Text style={s.emptyTitle}>{t({ en: 'No team yet', zh: '杩樻病鏈夊洟闃? })}</Text>
                  <Text style={s.emptySub}>
                    {t({ en: 'Create an agent team first from the Team tab', zh: '璇峰厛鍦ㄥ洟闃熼〉鍒涘缓Agent鍥㈤槦' })}
                  </Text>
                </View>
              ) : (
                <>
                  {tasksByAgent.map(renderAgentSection)}
                  {unassignedTasks.length > 0 && (
                    <View style={s.agentSection}>
                      <View style={s.agentHeader}>
                        <Text style={s.agentIcon}>馃摝</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={s.agentName}>{t({ en: 'Unassigned', zh: '鏈寚娲? })}</Text>
                          <Text style={s.agentCode}>{unassignedTasks.length} {t({ en: 'tasks', zh: '涓换鍔? })}</Text>
                        </View>
                      </View>
                      {unassignedTasks.map(renderTaskCard)}
                    </View>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {myTasks.length === 0 ? (
                <View style={s.empty}>
                  <Text style={{ fontSize: 40 }}>馃搵</Text>
                  <Text style={s.emptyTitle}>{t({ en: 'No tasks', zh: '鏆傛棤浠诲姟' })}</Text>
                  <Text style={s.emptySub}>
                    {t({ en: 'Assign tasks to your agents to get started', zh: '缁橝gent鍒嗛厤浠诲姟寮€濮嬪伐浣? })}
                  </Text>
                </View>
              ) : (
                myTasks.map(renderTaskCard)
              )}
            </>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => setShowCreate(true)}>
        <Text style={s.fabText}>锛?{t({ en: 'Assign Task', zh: '鍒嗛厤浠诲姟' })}</Text>
      </TouchableOpacity>

      <AssignTaskModal
        visible={showCreate}
        agents={allAgents}
        t={t}
        onClose={() => setShowCreate(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['my-tasks'] })}
      />
    </View>
  );
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Styles
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flex: 1 },
  // Summary
  summary: {
    flexDirection: 'row', margin: 16, marginBottom: 8,
    backgroundColor: colors.bgCard, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryNum: { fontSize: 20, fontWeight: '800' },
  summaryLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  summaryDivider: { width: 1, height: 30, backgroundColor: colors.border, alignSelf: 'center' },
  // Tabs
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tabBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.accent + '1A', borderColor: colors.accent },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.accent },
  // Agent section
  agentSection: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.bgCard, borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: colors.border,
  },
  agentHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
    paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  agentIcon: { fontSize: 20 },
  agentName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  agentCode: { fontSize: 11, color: colors.accent, fontWeight: '600' },
  agentDot: { width: 8, height: 8, borderRadius: 4 },
  activeBadge: {
    backgroundColor: '#f59e0b22', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  activeText: { fontSize: 10, fontWeight: '700', color: '#f59e0b' },
  idleText: { fontSize: 11, color: colors.textMuted },
  chevron: { fontSize: 18, color: colors.textMuted, fontWeight: '300' },
  noTasks: { fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: 8 },
  // Task card
  taskCard: {
    backgroundColor: colors.bgSecondary, borderRadius: 10,
    padding: 10, marginBottom: 6, borderWidth: 1, borderColor: colors.border,
    gap: 6,
  },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taskIcon: { fontSize: 14 },
  taskTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  taskDesc: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  taskBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  taskBadgeText: { fontSize: 10, fontWeight: '700' },
  progressBar: { height: 3, backgroundColor: colors.bgPrimary, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: '#f59e0b', borderRadius: 2 },
  completeBtn: {
    alignItems: 'center', paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#22c55e14', borderWidth: 1, borderColor: '#22c55e33',
  },
  completeBtnText: { fontSize: 11, fontWeight: '600', color: '#22c55e' },
  // Empty
  empty: { alignItems: 'center', padding: 40, gap: 8, marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    backgroundColor: colors.accent, borderRadius: 28,
    paddingHorizontal: 20, paddingVertical: 14,
    shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

const modalS = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' },
  container: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  close: { fontSize: 18, color: colors.textMuted, padding: 4 },
  label: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  agentRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  agentPill: {
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
  },
  agentPillActive: { backgroundColor: colors.accent + '22', borderColor: colors.accent },
  agentPillText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  agentPillTextActive: { color: colors.accent },
  input: {
    backgroundColor: colors.bgSecondary, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.border,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typePill: {
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
  },
  typePillActive: { backgroundColor: colors.accent + '22', borderColor: colors.accent },
  typeText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  typeTextActive: { color: colors.accent },
  createBtn: {
    backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
  },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});