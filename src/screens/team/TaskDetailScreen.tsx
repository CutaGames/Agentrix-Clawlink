import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Alert, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
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
  progress?: number | { percentage?: number; currentStep?: string; updates?: any[] };
  agentId?: string;
  agentName?: string;
  merchantId?: string;
  requirements?: {
    deadline?: string;
    deliverables?: string[];
    specifications?: Record<string, any>;
  };
  bids?: TaskBid[];
  milestones?: Milestone[];
  createdAt: string;
  updatedAt: string;
}

interface TaskBid {
  id: string;
  agentId: string;
  agentName?: string;
  amount: number;
  proposal: string;
  status: string;
  createdAt: string;
}

interface Milestone {
  id: string;
  title: string;
  amount: number;
  status: string;
  dueDate?: string;
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// API
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
async function fetchTaskDetail(taskId: string): Promise<MerchantTask> {
  const res = await apiFetch<MerchantTask | { data: MerchantTask }>(`/merchant-tasks/${taskId}`);
  return (res as any).data || res;
}

async function acceptTask(taskId: string): Promise<void> {
  await apiFetch(`/merchant-tasks/${taskId}/accept`, { method: 'PUT' });
}

async function updateProgress(taskId: string, dto: { percentage?: number; message?: string }): Promise<void> {
  await apiFetch(`/merchant-tasks/${taskId}/progress`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

async function completeTask(taskId: string): Promise<void> {
  await apiFetch(`/merchant-tasks/${taskId}/complete`, { method: 'PUT' });
}

async function cancelTask(taskId: string, reason?: string): Promise<void> {
  await apiFetch(`/merchant-tasks/${taskId}/cancel`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  });
}

async function chatWithAgent(agentCodename: string, message: string): Promise<string> {
  const res = await apiFetch<{ response?: string; message?: string }>('/openclaw/proxy/chat', {
    method: 'POST',
    body: JSON.stringify({ message, agentName: agentCodename, context: 'task-execution' }),
  });
  return (res as any).response || (res as any).message || JSON.stringify(res);
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Status mapping (aligned with backend TaskStatus enum)
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
const STATUS_META: Record<string, { label: { en: string; zh: string }; color: string; icon: string }> = {
  pending:     { label: { en: 'Pending', zh: '寰呭鐞? },     color: '#6366f1', icon: '馃搵' },
  accepted:    { label: { en: 'Accepted', zh: '宸叉帴鍙? },    color: '#3b82f6', icon: '鉁? },
  in_progress: { label: { en: 'In Progress', zh: '杩涜涓? }, color: '#f59e0b', icon: '鈿欙笍' },
  delivered:   { label: { en: 'Delivered', zh: '宸蹭氦浠? },   color: '#8b5cf6', icon: '馃摝' },
  completed:   { label: { en: 'Completed', zh: '宸插畬鎴? },   color: '#22c55e', icon: '鉁? },
  cancelled:   { label: { en: 'Cancelled', zh: '宸插彇娑? },   color: '#ef4444', icon: '鉂? },
  disputed:    { label: { en: 'Disputed', zh: '浜夎涓? },    color: '#ef4444', icon: '鈿狅笍' },
  // Legacy / frontend aliases
  open:        { label: { en: 'Open', zh: '寰呭紑濮? },        color: '#6366f1', icon: '馃搵' },
};

// Map agent codenames to icons
const AGENT_ICONS: Record<string, string> = {
  ceo: '馃憫', dev: '馃捇', 'qa-ops': '馃敡', growth: '馃搱',
  ops: '馃搳', media: '馃摫', ecosystem: '馃寪', community: '馃懃',
  brand: '馃帹', hunter: '馃攳', treasury: '馃挵',
};

function getProgressPercent(progress: MerchantTask['progress']): number {
  if (progress == null) return 0;
  if (typeof progress === 'number') return progress;
  return progress?.percentage ?? 0;
}

function getProgressStep(progress: MerchantTask['progress']): string | undefined {
  if (progress == null || typeof progress === 'number') return undefined;
  return progress?.currentStep;
}

export function TaskDetailScreen() {
  const { t } = useI18n();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  // 鈹€鈹€ Safe params extraction 鈹€鈹€
  const taskId = route.params?.taskId;
  const [progressVal, setProgressVal] = useState('');
  const [agentMsg, setAgentMsg] = useState('');
  const [agentReply, setAgentReply] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: task, isLoading, refetch } = useQuery({
    queryKey: ['task-detail', taskId],
    queryFn: () => fetchTaskDetail(taskId!),
    enabled: !!taskId,
    retry: false,
  });

  // 鈹€鈹€ No taskId = navigation error 鈹€鈹€
  if (!taskId) {
    return (
      <View style={s.container}>
        <View style={s.errorBox}>
          <Text style={s.errorIcon}>鈿狅笍</Text>
          <Text style={s.errorText}>{t({ en: 'Task not found', zh: '浠诲姟鏈壘鍒? })}</Text>
          <TouchableOpacity style={s.errorBtn} onPress={() => navigation.goBack()}>
            <Text style={s.errorBtnText}>{t({ en: 'Go Back', zh: '杩斿洖' })}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 鈹€鈹€ Actions 鈹€鈹€
  const handleStartTask = async () => {
    setActionLoading('start');
    try {
      // Try to accept the task via API first
      await acceptTask(taskId);
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      Alert.alert('鉁?, t({ en: 'Task started!', zh: '浠诲姟宸插惎鍔紒' }));
    } catch {
      // If accept fails (merchantId mismatch), update progress to trigger status change
      try {
        await updateProgress(taskId, { message: 'Task started by team member', percentage: 5 });
        queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
        queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
        Alert.alert('鉁?, t({ en: 'Task started!', zh: '浠诲姟宸插惎鍔紒' }));
      } catch (e2: any) {
        Alert.alert(t({ en: 'Error', zh: '閿欒' }), e2?.message || t({ en: 'Failed to start task', zh: '鍚姩浠诲姟澶辫触' }));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendToAgent = async () => {
    if (!task?.agentId && !task?.agentName) {
      Alert.alert(t({ en: 'No Agent', zh: '鏈垎閰岮gent' }), t({ en: 'Assign an agent to this task first.', zh: '璇峰厛涓烘浠诲姟鍒嗛厤涓€涓狝gent銆? }));
      return;
    }
    const codename = task?.agentName?.toLowerCase() || 'ceo';
    const message = agentMsg.trim() || `Please start working on task: "${task?.title}". Description: ${task?.description || 'N/A'}`;
    setActionLoading('chat');
    setAgentReply('');
    try {
      const reply = await chatWithAgent(codename, message);
      setAgentReply(reply);
      setAgentMsg('');
      // Also try to update task status
      try {
        await updateProgress(taskId, { message: `Agent @${codename} engaged`, percentage: 5 });
        queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
        queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      } catch { /* non-critical */ }
    } catch (err: any) {
      Alert.alert(t({ en: 'Error', zh: '閿欒' }), err?.message || t({ en: 'Failed to contact agent', zh: '鑱旂郴Agent澶辫触' }));
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateProgress = async () => {
    const p = parseInt(progressVal, 10);
    if (isNaN(p) || p < 0 || p > 100) {
      Alert.alert(t({ en: 'Invalid', zh: '鏃犳晥' }), t({ en: 'Enter 0-100', zh: '璇疯緭鍏?0-100' }));
      return;
    }
    setActionLoading('progress');
    try {
      await updateProgress(taskId, { percentage: p });
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      setProgressVal('');
      Alert.alert('鉁?, t({ en: 'Progress updated!', zh: '杩涘害宸叉洿鏂帮紒' }));
    } catch (err: any) {
      Alert.alert(t({ en: 'Error', zh: '閿欒' }), err?.message || '');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = () => {
    Alert.alert(
      t({ en: 'Complete Task', zh: '瀹屾垚浠诲姟' }),
      t({ en: 'Mark this task as completed?', zh: '灏嗘浠诲姟鏍囪涓哄凡瀹屾垚锛? }),
      [
        { text: t({ en: 'Cancel', zh: '鍙栨秷' }), style: 'cancel' },
        {
          text: t({ en: 'Complete', zh: '瀹屾垚' }),
          onPress: async () => {
            setActionLoading('complete');
            try {
              await completeTask(taskId);
              queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
              queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
              Alert.alert('鉁?, t({ en: 'Task completed!', zh: '浠诲姟宸插畬鎴愶紒' }));
            } catch (err: any) {
              Alert.alert(t({ en: 'Error', zh: '閿欒' }), err?.message || '');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    Alert.alert(
      t({ en: 'Cancel Task', zh: '鍙栨秷浠诲姟' }),
      t({ en: 'Are you sure you want to cancel this task?', zh: '纭畾瑕佸彇娑堟浠诲姟鍚楋紵' }),
      [
        { text: t({ en: 'No', zh: '鍚? }), style: 'cancel' },
        {
          text: t({ en: 'Yes, Cancel', zh: '纭鍙栨秷' }),
          style: 'destructive',
          onPress: async () => {
            setActionLoading('cancel');
            try {
              await cancelTask(taskId);
              queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
              queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
              Alert.alert('鉁?, t({ en: 'Task cancelled.', zh: '浠诲姟宸插彇娑堛€? }));
            } catch (err: any) {
              Alert.alert(t({ en: 'Error', zh: '閿欒' }), err?.message || '');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  if (isLoading || !task) {
    return (
      <View style={s.container}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      </View>
    );
  }

  const meta = STATUS_META[task.status] || STATUS_META.pending;
  const pct = getProgressPercent(task.progress);
  const step = getProgressStep(task.progress);
  const agentIcon = task.agentName ? (AGENT_ICONS[task.agentName.toLowerCase()] ?? '馃') : '馃';
  const canStart = task.status === 'pending' || task.status === 'open';
  const canProgress = task.status === 'accepted' || task.status === 'in_progress';
  const canComplete = task.status === 'in_progress' || task.status === 'delivered';
  const canCancel = task.status !== 'completed' && task.status !== 'cancelled';

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.accent} />}
      >
        {/* Hero */}
        <View style={s.heroCard}>
          <View style={s.heroHeader}>
            <Text style={s.heroIcon}>{meta.icon}</Text>
            <View style={[s.heroBadge, { backgroundColor: meta.color + '22' }]}>
              <Text style={[s.heroBadgeText, { color: meta.color }]}>{t(meta.label)}</Text>
            </View>
          </View>
          <Text style={s.heroTitle}>{task.title}</Text>
          <Text style={s.heroType}>{task.type?.replace(/_/g, ' ')}</Text>
          {task.description ? <Text style={s.heroDesc}>{task.description}</Text> : null}
        </View>

        {/* Agent Assignment */}
        {(task.agentName || task.agentId) && (
          <View style={s.agentCard}>
            <Text style={{ fontSize: 22 }}>{agentIcon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.agentLabel}>{t({ en: 'Assigned Agent', zh: '璐熻矗Agent' })}</Text>
              <Text style={s.agentName}>@{task.agentName || task.agentId}</Text>
            </View>
            {(canStart || canProgress) && (
              <View style={[s.agentDot, { backgroundColor: task.status === 'in_progress' ? '#f59e0b' : '#6366f1' }]} />
            )}
          </View>
        )}

        {/* Progress */}
        <View style={s.progressCard}>
          <View style={s.progressHeader}>
            <Text style={s.progressLabel}>{t({ en: 'Progress', zh: '杩涘害' })}</Text>
            <Text style={s.progressPct}>{pct}%</Text>
          </View>
          <View style={s.progressBarOuter}>
            <View style={[s.progressBarFill, { width: `${Math.min(pct, 100)}%` }]} />
          </View>
          {step && <Text style={s.progressStep}>馃搷 {step}</Text>}
        </View>

        {/* Budget & Info */}
        <View style={s.infoRow}>
          <View style={s.infoChip}>
            <Text style={s.infoLabel}>{t({ en: 'Budget', zh: '棰勭畻' })}</Text>
            <Text style={s.infoValue}>馃挵 ${task.budget} {task.currency || 'USD'}</Text>
          </View>
          <View style={s.infoChip}>
            <Text style={s.infoLabel}>{t({ en: 'Type', zh: '绫诲瀷' })}</Text>
            <Text style={s.infoValue}>{task.type?.replace(/_/g, ' ') || '-'}</Text>
          </View>
        </View>

        {/* 鈺愨晲鈺愨晲鈺愨晲鈺?START TASK 鈺愨晲鈺愨晲鈺愨晲鈺?*/}
        {canStart && (
          <View style={s.actionSection}>
            <Text style={s.actionTitle}>馃殌 {t({ en: 'Start This Task', zh: '鍚姩浠诲姟' })}</Text>
            <Text style={s.actionDesc}>
              {t({
                en: 'Start the task and instruct the assigned agent to begin working.',
                zh: '鍚姩浠诲姟锛屾寚绀鸿礋璐ｇ殑Agent寮€濮嬪伐浣溿€?,
              })}
            </Text>
            <TouchableOpacity
              style={s.startBtn}
              onPress={handleStartTask}
              disabled={actionLoading === 'start'}
            >
              {actionLoading === 'start' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.startBtnText}>鈻?{t({ en: 'Start Task', zh: '鍚姩浠诲姟' })}</Text>
              )}
            </TouchableOpacity>

            {/* Direct agent message */}
            {(task.agentName || task.agentId) && (
              <>
                <Text style={s.chatLabel}>馃挰 {t({ en: 'Or send instructions to agent:', zh: '鎴栫洿鎺ョ粰Agent涓嬭揪鎸囦护锛? })}</Text>
                <View style={s.chatRow}>
                  <TextInput
                    style={s.chatInput}
                    placeholder={t({ en: `Message @${task.agentName || 'agent'}...`, zh: `缁?@${task.agentName || 'agent'} 鍙戞秷鎭?..` })}
                    placeholderTextColor={colors.textMuted}
                    value={agentMsg}
                    onChangeText={setAgentMsg}
                    multiline
                  />
                  <TouchableOpacity
                    style={s.chatSendBtn}
                    onPress={handleSendToAgent}
                    disabled={actionLoading === 'chat'}
                  >
                    {actionLoading === 'chat' ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={s.chatSendText}>鈫?/Text>
                    )}
                  </TouchableOpacity>
                </View>
                {agentReply ? (
                  <View style={s.replyBox}>
                    <Text style={s.replyLabel}>馃 @{task.agentName || 'agent'}</Text>
                    <Text style={s.replyText}>{agentReply}</Text>
                  </View>
                ) : null}
              </>
            )}
          </View>
        )}

        {/* 鈺愨晲鈺愨晲鈺愨晲鈺?IN PROGRESS ACTIONS 鈺愨晲鈺愨晲鈺愨晲鈺?*/}
        {canProgress && (
          <View style={s.actionSection}>
            <Text style={s.actionTitle}>鈿欙笍 {t({ en: 'Task In Progress', zh: '浠诲姟杩涜涓? })}</Text>

            {/* Chat with agent */}
            {(task.agentName || task.agentId) && (
              <>
                <Text style={s.chatLabel}>馃挰 {t({ en: 'Send follow-up to agent:', zh: '缁橝gent鍙戦€佽窡杩涙秷鎭細' })}</Text>
                <View style={s.chatRow}>
                  <TextInput
                    style={s.chatInput}
                    placeholder={t({ en: `Message @${task.agentName || 'agent'}...`, zh: `缁?@${task.agentName || 'agent'} 鍙戞秷鎭?..` })}
                    placeholderTextColor={colors.textMuted}
                    value={agentMsg}
                    onChangeText={setAgentMsg}
                    multiline
                  />
                  <TouchableOpacity
                    style={s.chatSendBtn}
                    onPress={handleSendToAgent}
                    disabled={actionLoading === 'chat'}
                  >
                    {actionLoading === 'chat' ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={s.chatSendText}>鈫?/Text>
                    )}
                  </TouchableOpacity>
                </View>
                {agentReply ? (
                  <View style={s.replyBox}>
                    <Text style={s.replyLabel}>馃 @{task.agentName || 'agent'}</Text>
                    <Text style={s.replyText}>{agentReply}</Text>
                  </View>
                ) : null}
              </>
            )}

            {/* Update progress */}
            <Text style={s.chatLabel}>馃搳 {t({ en: 'Update Progress', zh: '鏇存柊杩涘害' })}</Text>
            <View style={s.progressInputRow}>
              <TextInput
                style={s.progressInput}
                value={progressVal}
                onChangeText={setProgressVal}
                keyboardType="number-pad"
                placeholder="0-100"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                style={s.progressSubmit}
                onPress={handleUpdateProgress}
                disabled={actionLoading === 'progress'}
              >
                {actionLoading === 'progress' ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.progressSubmitText}>{t({ en: 'Update', zh: '鏇存柊' })}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 鈺愨晲鈺愨晲鈺愨晲鈺?COMPLETE BUTTON 鈺愨晲鈺愨晲鈺愨晲鈺?*/}
        {canComplete && (
          <TouchableOpacity style={s.completeBtn} onPress={handleComplete} disabled={actionLoading === 'complete'}>
            {actionLoading === 'complete' ? (
              <ActivityIndicator color="#22c55e" />
            ) : (
              <Text style={s.completeBtnText}>鉁?{t({ en: 'Mark Complete', zh: '鏍囪瀹屾垚' })}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Requirements */}
        {task.requirements && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t({ en: 'Requirements', zh: '闇€姹? })}</Text>
            {task.requirements.deadline && (
              <Text style={s.reqText}>馃搮 {t({ en: 'Deadline', zh: '鎴鏃ユ湡' })}: {new Date(task.requirements.deadline).toLocaleDateString()}</Text>
            )}
            {task.requirements.deliverables?.map((d, i) => (
              <Text key={i} style={s.reqText}>鈥?{d}</Text>
            ))}
          </View>
        )}

        {/* Cancel */}
        {canCancel && (
          <TouchableOpacity style={s.cancelBtn} onPress={handleCancel} disabled={actionLoading === 'cancel'}>
            <Text style={s.cancelBtnText}>鉂?{t({ en: 'Cancel Task', zh: '鍙栨秷浠诲姟' })}</Text>
          </TouchableOpacity>
        )}

        {/* Metadata */}
        <View style={s.metaCard}>
          <Text style={s.metaRow}>馃搮 {t({ en: 'Created', zh: '鍒涘缓鏃堕棿' })}: {new Date(task.createdAt).toLocaleString()}</Text>
          <Text style={s.metaRow}>馃攧 {t({ en: 'Updated', zh: '鏇存柊鏃堕棿' })}: {new Date(task.updatedAt).toLocaleString()}</Text>
          <Text style={s.metaRow}>馃啍 {task.id}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Styles
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  // Error
  errorBox: { alignItems: 'center', padding: 40, gap: 12, marginTop: 60 },
  errorIcon: { fontSize: 48 },
  errorText: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  errorBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  errorBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Hero
  heroCard: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, gap: 6, borderWidth: 1, borderColor: colors.border },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIcon: { fontSize: 28 },
  heroBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  heroBadgeText: { fontSize: 12, fontWeight: '700' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginTop: 4 },
  heroType: { fontSize: 12, color: colors.textMuted, textTransform: 'capitalize' },
  heroDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginTop: 4 },
  // Agent card
  agentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bgCard, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  agentLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  agentName: { fontSize: 14, fontWeight: '700', color: colors.accent },
  agentDot: { width: 8, height: 8, borderRadius: 4 },
  // Progress card
  progressCard: {
    backgroundColor: colors.bgCard, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: colors.border, gap: 6,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  progressPct: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  progressStep: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  // Info row
  infoRow: { flexDirection: 'row', gap: 8 },
  infoChip: {
    flex: 1, alignItems: 'center', padding: 10, borderRadius: 12,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, gap: 2,
  },
  infoLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  infoValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  // Progress bar
  progressBarOuter: { height: 6, borderRadius: 3, backgroundColor: colors.bgSecondary },
  progressBarFill: { height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  // Action section
  actionSection: {
    backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, gap: 10,
    borderWidth: 1, borderColor: colors.accent + '44',
  },
  actionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  actionDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  startBtn: {
    alignItems: 'center', paddingVertical: 14, borderRadius: 12,
    backgroundColor: colors.accent,
  },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  // Chat with agent
  chatLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 4 },
  chatRow: { flexDirection: 'row', gap: 8 },
  chatInput: {
    flex: 1, backgroundColor: colors.bgSecondary, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
    maxHeight: 80,
  },
  chatSendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  chatSendText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  replyBox: {
    backgroundColor: colors.accent + '0D', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: colors.accent + '22', gap: 4,
  },
  replyLabel: { fontSize: 11, fontWeight: '700', color: colors.accent },
  replyText: { fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
  // Progress input
  progressInputRow: { flexDirection: 'row', gap: 8 },
  progressInput: {
    flex: 1, backgroundColor: colors.bgSecondary, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, padding: 10, fontSize: 14, color: colors.textPrimary, textAlign: 'center',
  },
  progressSubmit: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.accent },
  progressSubmitText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  // Complete
  completeBtn: {
    alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#22c55e22', borderWidth: 1, borderColor: '#22c55e44',
  },
  completeBtnText: { fontSize: 14, fontWeight: '700', color: '#22c55e' },
  // Cancel
  cancelBtn: {
    alignItems: 'center', paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#ef444411', borderWidth: 1, borderColor: '#ef444433',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },
  // Section
  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
  reqText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  // Meta
  metaCard: {
    backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, gap: 4,
    borderWidth: 1, borderColor: colors.border, marginTop: 4,
  },
  metaRow: { fontSize: 11, color: colors.textMuted },
});