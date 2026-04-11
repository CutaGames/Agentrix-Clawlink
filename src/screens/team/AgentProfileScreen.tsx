import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput,
  Platform, StatusBar, RefreshControl, KeyboardAvoidingView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TeamStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { useI18n } from '../../stores/i18nStore';
import { apiFetch } from '../../services/api';

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Agent Role Definitions (from PRD)
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
const AGENT_ROLES: Record<string, {
  icon: string;
  titleEn: string;
  titleZh: string;
  descEn: string;
  descZh: string;
  tier: string;
  tierColor: string;
  capabilities: string[];
}> = {
  ceo: {
    icon: '馃憫', titleEn: 'CEO / Architect', titleZh: 'CEO / 鏋舵瀯甯?,
    descEn: 'Strategy, architecture design, team coordination, bundled multi-task processing',
    descZh: '鎴樼暐瑙勫垝銆佹灦鏋勮璁°€佸洟闃熷崗璋冦€佹崋缁戝浠诲姟澶勭悊',
    tier: '馃拵 Opus', tierColor: '#a855f7',
    capabilities: ['Strategic planning', 'Architecture design', 'Task delegation', 'Financial review', 'Resource evaluation'],
  },
  dev: {
    icon: '馃捇', titleEn: 'Full-Stack Developer', titleZh: '鍏ㄦ爤寮€鍙?,
    descEn: 'All code: backend + frontend + mobile + desktop + testing',
    descZh: '鍏ㄩ儴浠ｇ爜锛氬悗绔?鍓嶇+绉诲姩绔?妗岄潰绔?娴嬭瘯',
    tier: '馃敟 Sonnet', tierColor: '#f97316',
    capabilities: ['NestJS backend', 'Next.js frontend', 'React Native mobile', 'Tauri desktop', 'Testing'],
  },
  'qa-ops': {
    icon: '馃敡', titleEn: 'QA / DevOps', titleZh: 'QA / 杩愮淮',
    descEn: 'Testing, CI/CD, deployment, monitoring, database operations',
    descZh: '娴嬭瘯銆丆I/CD銆侀儴缃层€佺洃鎺с€佹暟鎹簱杩愮淮',
    tier: '馃啌 Free', tierColor: '#22c55e',
    capabilities: ['Test execution', 'CI/CD pipeline', 'Deployment', 'Server monitoring', 'DB operations'],
  },
  growth: {
    icon: '馃搱', titleEn: 'Growth Officer', titleZh: '澧為暱瀹?,
    descEn: 'User acquisition, A/B testing, conversion optimization, pricing',
    descZh: '鐢ㄦ埛澧為暱绛栫暐銆丄/B娴嬭瘯銆佽浆鍖栦紭鍖栥€佸畾浠风瓥鐣?,
    tier: '馃敟 Sonnet', tierColor: '#f97316',
    capabilities: ['Growth strategy', 'A/B experiments', 'Channel analysis', 'Pricing', 'Campaign planning'],
  },
  ops: {
    icon: '馃搳', titleEn: 'Operations', titleZh: '杩愯惀瀹?,
    descEn: 'OKR tracking, data analysis, cost tracking, process optimization',
    descZh: 'OKR杩借釜銆佹暟鎹垎鏋愩€佹垚鏈拷韪€佹祦绋嬩紭鍖?,
    tier: '馃啌 Free', tierColor: '#22c55e',
    capabilities: ['OKR tracking', 'Data reporting', 'Cost analysis', 'User feedback', 'Sprint planning'],
  },
  media: {
    icon: '馃摫', titleEn: 'Social Media', titleZh: '鑷獟浣撹繍钀?,
    descEn: 'Twitter/X, tech blog, newsletter, SEO, bilingual content',
    descZh: 'Twitter/X銆佹妧鏈崥瀹€丯ewsletter銆丼EO銆佷腑鑻卞弻璇唴瀹?,
    tier: '馃啌 Free', tierColor: '#22c55e',
    capabilities: ['Twitter/X posts', 'Blog articles', 'Newsletter', 'SEO', 'Video scripts'],
  },
  ecosystem: {
    icon: '馃寪', titleEn: 'Ecosystem', titleZh: '鐢熸€佸畼',
    descEn: 'Developer relations, skill marketplace, MCP protocol',
    descZh: '寮€鍙戣€呭叧绯汇€佹妧鑳藉競鍦恒€丮CP鍗忚鎺ㄥ箍',
    tier: '鈿?Budget', tierColor: '#06b6d4',
    capabilities: ['Developer relations', 'SDK docs', 'Partnership', 'Marketplace', 'Protocol advocacy'],
  },
  community: {
    icon: '馃懃', titleEn: 'Community', titleZh: '绀惧尯绠＄悊',
    descEn: 'Discord/Telegram community, GitHub issues, events',
    descZh: 'Discord/Telegram绀惧尯銆丟itHub闂绠＄悊銆佹椿鍔ㄧ瓥鍒?,
    tier: '馃啌 Free', tierColor: '#22c55e',
    capabilities: ['Discord/Telegram', 'GitHub triage', 'Events', 'User stories', 'FAQ'],
  },
  brand: {
    icon: '馃帹', titleEn: 'Brand & Content', titleZh: '鍝佺墝涓庡唴瀹?,
    descEn: 'Brand voice, landing pages, pitch materials, design direction',
    descZh: '鍝佺墝鏂囨銆佽惤鍦伴〉銆佹紨绀烘潗鏂欍€佽璁℃柟鍚?,
    tier: '馃啌 Free', tierColor: '#22c55e',
    capabilities: ['Brand copywriting', 'Landing pages', 'Pitch decks', 'Visual identity', 'ASO/SEO'],
  },
  hunter: {
    icon: '馃攳', titleEn: 'Resource Hunter', titleZh: '璧勬簮鐚庢墜',
    descEn: 'Find free resources: cloud credits, accelerators, grants, hackathons',
    descZh: '鍏ㄧ綉鎼滃埉鍏嶈垂璧勬簮锛氫簯鏈嶅姟銆佸姞閫熷櫒銆丟rants銆侀粦瀹㈡澗',
    tier: '馃啌 Free', tierColor: '#22c55e',
    capabilities: ['Cloud credits', 'GPU compute', 'LLM API credits', 'Accelerators', 'Grants & hackathons'],
  },
  treasury: {
    icon: '馃挵', titleEn: 'Treasury', titleZh: '璐㈠姟瀹?,
    descEn: 'Wallet management, DeFi yield, bounty hunting, earnings optimization',
    descZh: '閽卞寘绠＄悊銆丏eFi鏀剁泭銆佽祻閲戜换鍔°€佹敹鍏ヤ紭鍖?,
    tier: '馃啌 Free', tierColor: '#22c55e',
    capabilities: ['Wallet management', 'DeFi yield', 'Bounty tasks', 'Staking', 'Airdrop farming'],
  },
};

function getAgentRole(codename: string) {
  return AGENT_ROLES[codename] ?? {
    icon: '馃', titleEn: codename, titleZh: codename,
    descEn: 'Custom agent', descZh: '鑷畾涔?Agent',
    tier: '馃啌 Free', tierColor: '#6b7280',
    capabilities: [],
  };
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Types
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
interface AgentTask {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  budget: number;
  currency: string;
  progress?: number;
  createdAt: string;
  updatedAt: string;
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// API helpers
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
async function fetchAgentTasks(agentId: string): Promise<AgentTask[]> {
  try {
    const res = await apiFetch<any>('/merchant-tasks/my-tasks');
    const tasks = Array.isArray(res) ? res : (res?.data ?? []);
    // Filter tasks assigned to this agent
    return tasks.filter((t: any) => t.agentId === agentId);
  } catch {
    return [];
  }
}

async function createTaskForAgent(dto: {
  title: string;
  description: string;
  type: string;
  budget: number;
  agentId: string;
}): Promise<any> {
  return apiFetch('/merchant-tasks', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

async function chatWithAgent(agentName: string, message: string): Promise<string> {
  try {
    const res = await apiFetch<any>('/openclaw/proxy/chat', {
      method: 'POST',
      body: JSON.stringify({ message, agentName, context: 'team-profile' }),
    });
    return res?.response ?? res?.message ?? res?.content ?? JSON.stringify(res);
  } catch (e: any) {
    return `Error: ${e?.message ?? 'Failed to communicate'}`;
  }
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Task Status
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
const TASK_STATUS: Record<string, { label: string; labelZh: string; color: string; icon: string }> = {
  pending:     { label: 'Pending',     labelZh: '寰呭鐞?, color: '#6366f1', icon: '馃搵' },
  accepted:    { label: 'Accepted',    labelZh: '宸叉帴鍙?, color: '#3b82f6', icon: '鉁? },
  open:        { label: 'Open',        labelZh: '寰呭紑濮?, color: '#6366f1', icon: '馃搵' },
  in_progress: { label: 'In Progress', labelZh: '杩涜涓?, color: '#f59e0b', icon: '鈿欙笍' },
  delivered:   { label: 'Delivered',   labelZh: '宸蹭氦浠?, color: '#8b5cf6', icon: '馃摝' },
  completed:   { label: 'Completed',   labelZh: '宸插畬鎴?, color: '#22c55e', icon: '鉁? },
  cancelled:   { label: 'Cancelled',   labelZh: '宸插彇娑?, color: '#ef4444', icon: '鉂? },
};

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Assign Task Modal
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function AssignTaskModal({
  visible, agentId, agentName, t, onClose, onCreated,
}: {
  visible: boolean;
  agentId: string;
  agentName: string;
  t: (p: { en: string; zh: string }) => string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [taskType, setTaskType] = useState('custom_service');
  const [saving, setSaving] = useState(false);

  const TASK_TYPES = [
    { key: 'custom_service', en: 'Custom', zh: '瀹氬埗' },
    { key: 'research', en: 'Research', zh: '璋冪爺' },
    { key: 'content', en: 'Content', zh: '鍐呭' },
    { key: 'development', en: 'Dev', zh: '寮€鍙? },
    { key: 'data_analysis', en: 'Analysis', zh: '鍒嗘瀽' },
    { key: 'consultation', en: 'Consult', zh: '鍜ㄨ' },
  ];

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert(t({ en: 'Required', zh: '蹇呭～' }), t({ en: 'Task title is required', zh: '浠诲姟鏍囬涓嶈兘涓虹┖' }));
      return;
    }
    setSaving(true);
    try {
      await createTaskForAgent({
        title: title.trim(),
        description: desc.trim(),
        type: taskType,
        budget: 0,
        agentId,
      });
      setTitle(''); setDesc(''); setTaskType('custom_service');
      onCreated();
      onClose();
      Alert.alert(
        t({ en: 'Task Assigned', zh: '浠诲姟宸插垎閰? }),
        t({ en: `Task assigned to ${agentName}`, zh: `浠诲姟宸插垎閰嶇粰 ${agentName}` }),
      );
    } catch (e: any) {
      Alert.alert(t({ en: 'Error', zh: '澶辫触' }), e?.message ?? 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={modal.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={modal.container}>
          <View style={modal.header}>
            <Text style={modal.title}>
              {t({ en: `Assign Task to ${agentName}`, zh: `缁?${agentName} 鍒嗛厤浠诲姟` })}
            </Text>
            <TouchableOpacity onPress={onClose}><Text style={modal.close}>鉁?/Text></TouchableOpacity>
          </View>

          <TextInput
            style={modal.input}
            placeholder={t({ en: 'Task title', zh: '浠诲姟鏍囬' })}
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={[modal.input, modal.multiline]}
            placeholder={t({ en: 'Description (detailed instructions)', zh: '鎻忚堪锛堣缁嗘寚浠わ級' })}
            placeholderTextColor={colors.textMuted}
            value={desc}
            onChangeText={setDesc}
            multiline
            numberOfLines={4}
          />

          <View style={modal.typeRow}>
            {TASK_TYPES.map(tt => (
              <TouchableOpacity
                key={tt.key}
                style={[modal.typePill, taskType === tt.key && modal.typePillActive]}
                onPress={() => setTaskType(tt.key)}
              >
                <Text style={[modal.typeText, taskType === tt.key && modal.typeTextActive]}>
                  {t({ en: tt.en, zh: tt.zh })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={modal.createBtn} onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <Text style={modal.createBtnText}>
                {t({ en: 'Assign Task', zh: '鍒嗛厤浠诲姟' })}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Quick Chat Section
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
function QuickChat({
  codename, t,
}: {
  codename: string;
  t: (p: { en: string; zh: string }) => string;
}) {
  const [msg, setMsg] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!msg.trim()) return;
    setSending(true);
    setReply('');
    try {
      const resp = await chatWithAgent(codename, msg.trim());
      setReply(resp);
      setMsg('');
    } catch {
      setReply('Failed to communicate with agent.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={chat.container}>
      <Text style={chat.label}>馃挰 {t({ en: 'Quick Chat', zh: '蹇€熷璇? })}</Text>
      {reply ? (
        <View style={chat.replyBox}>
          <Text style={chat.replyLabel}>馃 @{codename}</Text>
          <Text style={chat.replyText}>{reply}</Text>
        </View>
      ) : null}
      <View style={chat.inputRow}>
        <TextInput
          style={chat.input}
          placeholder={t({ en: `Message @${codename}...`, zh: `缁?@${codename} 鍙戞秷鎭?..` })}
          placeholderTextColor={colors.textMuted}
          value={msg}
          onChangeText={setMsg}
          editable={!sending}
        />
        <TouchableOpacity style={chat.sendBtn} onPress={handleSend} disabled={sending || !msg.trim()}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : (
            <Text style={chat.sendText}>鈫?/Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Main Screen
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
type Props = NativeStackScreenProps<TeamStackParamList, 'AgentProfile'>;

export function AgentProfileScreen({ route, navigation }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { agentId, codename, name, status, modelTier } = route.params;
  const role = getAgentRole(codename);
  const [showAssign, setShowAssign] = useState(false);

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['agent-tasks', agentId],
    queryFn: () => fetchAgentTasks(agentId),
    retry: false,
  });

  const activeTasks = tasks.filter(t => t.status === 'in_progress');
  const openTasks = tasks.filter(t => t.status === 'open');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const statusColor = status === 'active' ? '#22c55e' : status === 'suspended' ? '#f59e0b' : '#ef4444';

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.accent} />}
      >
        {/* Hero Card */}
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            <View style={s.heroIcon}>
              <Text style={{ fontSize: 32 }}>{role.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroName}>{name}</Text>
              <Text style={s.heroRole}>{t({ en: role.titleEn, zh: role.titleZh })}</Text>
              <Text style={s.heroCodename}>@{codename}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={[s.statusBadge, { backgroundColor: statusColor + '22' }]}>
                <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[s.statusText, { color: statusColor }]}>
                  {t({ en: status, zh: status === 'active' ? '娲昏穬' : status === 'suspended' ? '鏆傚仠' : '寮傚父' })}
                </Text>
              </View>
              <View style={[s.tierBadge, { borderColor: role.tierColor + '55', backgroundColor: role.tierColor + '15' }]}>
                <Text style={[s.tierText, { color: role.tierColor }]}>{role.tier}</Text>
              </View>
            </View>
          </View>
          <Text style={s.heroDesc}>{t({ en: role.descEn, zh: role.descZh })}</Text>
        </View>

        {/* Capabilities */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>馃洜 {t({ en: 'Capabilities', zh: '鑳藉姏鑼冨洿' })}</Text>
          <View style={s.capabilityRow}>
            {role.capabilities.map((cap, i) => (
              <View key={i} style={s.capPill}>
                <Text style={s.capText}>{cap}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Task Summary */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>馃搵 {t({ en: 'Tasks', zh: '浠诲姟' })}</Text>
            <TouchableOpacity style={s.assignBtn} onPress={() => setShowAssign(true)}>
              <Text style={s.assignBtnText}>锛?{t({ en: 'Assign Task', zh: '鍒嗛厤浠诲姟' })}</Text>
            </TouchableOpacity>
          </View>

          {/* Summary numbers */}
          <View style={s.taskSummary}>
            <View style={[s.taskStat, { borderColor: '#f59e0b33' }]}>
              <Text style={[s.taskStatNum, { color: '#f59e0b' }]}>{activeTasks.length}</Text>
              <Text style={s.taskStatLabel}>{t({ en: 'Active', zh: '杩涜涓? })}</Text>
            </View>
            <View style={[s.taskStat, { borderColor: '#3b82f633' }]}>
              <Text style={[s.taskStatNum, { color: '#3b82f6' }]}>{openTasks.length}</Text>
              <Text style={s.taskStatLabel}>{t({ en: 'Open', zh: '寰呭紑濮? })}</Text>
            </View>
            <View style={[s.taskStat, { borderColor: '#22c55e33' }]}>
              <Text style={[s.taskStatNum, { color: '#22c55e' }]}>{completedTasks.length}</Text>
              <Text style={s.taskStatLabel}>{t({ en: 'Done', zh: '宸插畬鎴? })}</Text>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />
          ) : tasks.length === 0 ? (
            <View style={s.emptyTasks}>
              <Text style={s.emptyIcon}>馃摥</Text>
              <Text style={s.emptyText}>
                {t({ en: 'No tasks assigned yet', zh: '鏆傛棤浠诲姟' })}
              </Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowAssign(true)}>
                <Text style={s.emptyBtnText}>{t({ en: 'Assign First Task', zh: '鍒嗛厤绗竴涓换鍔? })}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            [...activeTasks, ...openTasks, ...completedTasks].map(task => {
              const st = TASK_STATUS[task.status] ?? TASK_STATUS.open;
              return (
                <TouchableOpacity
                  key={task.id}
                  style={s.taskCard}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                  activeOpacity={0.7}
                >
                  <View style={s.taskCardTop}>
                    <Text style={s.taskIcon}>{st.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.taskTitle} numberOfLines={1}>{task.title}</Text>
                      <Text style={s.taskDesc} numberOfLines={2}>{task.description}</Text>
                    </View>
                    <View style={[s.taskStatusBadge, { backgroundColor: st.color + '18' }]}>
                      <Text style={[s.taskStatusText, { color: st.color }]}>
                        {t({ en: st.label, zh: st.labelZh })}
                      </Text>
                    </View>
                  </View>
                  {task.status === 'in_progress' && task.progress != null && (
                    <View style={s.progressBar}>
                      <View style={[s.progressFill, { width: `${Math.min(task.progress, 100)}%` }]} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Quick Chat */}
        <QuickChat codename={codename} t={t} />

        <View style={{ height: 30 }} />
      </ScrollView>

      <AssignTaskModal
        visible={showAssign}
        agentId={agentId}
        agentName={name}
        t={t}
        onClose={() => setShowAssign(false)}
        onCreated={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
        }}
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
  heroCard: {
    margin: 16,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  heroTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  heroIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  heroName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  heroRole: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  heroCodename: { fontSize: 12, color: colors.accent, fontWeight: '600', marginTop: 2 },
  heroDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  tierBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  tierText: { fontSize: 11, fontWeight: '700' },
  section: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: colors.bgCard, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: colors.border,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 10 },
  capabilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  capPill: {
    backgroundColor: colors.bgSecondary, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: colors.border,
  },
  capText: { fontSize: 12, color: colors.textPrimary, fontWeight: '500' },
  assignBtn: {
    backgroundColor: colors.accent, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, marginBottom: 10,
  },
  assignBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  taskSummary: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  taskStat: {
    flex: 1, backgroundColor: colors.bgSecondary, borderRadius: 10,
    padding: 10, alignItems: 'center', borderWidth: 1,
  },
  taskStatNum: { fontSize: 20, fontWeight: '800' },
  taskStatLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  emptyTasks: { alignItems: 'center', padding: 16, gap: 6 },
  emptyIcon: { fontSize: 28 },
  emptyText: { fontSize: 13, color: colors.textMuted },
  emptyBtn: {
    backgroundColor: colors.accent, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8, marginTop: 8,
  },
  emptyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  taskCard: {
    backgroundColor: colors.bgSecondary, borderRadius: 12,
    padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border,
    gap: 8,
  },
  taskCardTop: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  taskIcon: { fontSize: 16, marginTop: 2 },
  taskTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  taskDesc: { fontSize: 11, color: colors.textMuted, marginTop: 2, lineHeight: 15 },
  taskStatusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  taskStatusText: { fontSize: 10, fontWeight: '700' },
  progressBar: {
    height: 4, backgroundColor: colors.bgPrimary, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: '#f59e0b', borderRadius: 2 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' },
  container: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  close: { fontSize: 18, color: colors.textMuted, padding: 4 },
  input: {
    backgroundColor: colors.bgSecondary, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 14, color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.border,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
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
    alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

const chat = StyleSheet.create({
  container: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: colors.bgCard, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: colors.border,
  },
  label: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 10 },
  replyBox: {
    backgroundColor: colors.accent + '0D', borderRadius: 12,
    padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.accent + '22',
  },
  replyLabel: { fontSize: 11, fontWeight: '700', color: colors.accent, marginBottom: 4 },
  replyText: { fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, backgroundColor: colors.bgSecondary, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  sendText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});