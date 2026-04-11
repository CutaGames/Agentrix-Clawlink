import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet as RNStyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AgentStackParamList } from './types';
import { colors } from '../theme/colors';
import { AgentConsoleScreen } from '../screens/agent/AgentConsoleScreen';
import { AgentChatScreen } from '../screens/agent/AgentChatScreen';

/** Lightweight error boundary for the chat screen so voice-init crashes don't white-screen the app. */
class ChatScreenErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined as Error | undefined };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ChatScreenErrorBoundary]', error.message, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={ebStyles.container}>
          <Text style={ebStyles.icon}>鈿狅笍</Text>
          <Text style={ebStyles.title}>Chat failed to load</Text>
          <Text style={ebStyles.msg}>{this.state.error?.message ?? 'Unknown error'}</Text>
          <TouchableOpacity style={ebStyles.btn} onPress={() => this.setState({ hasError: false, error: undefined })}>
            <Text style={ebStyles.btnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
const ebStyles = RNStyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 },
  msg: { fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 16 },
  btn: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

function AgentChatScreenWithBoundary() {
  return (
    <ChatScreenErrorBoundary>
      <AgentChatScreen />
    </ChatScreenErrorBoundary>
  );
}
import { OpenClawBindScreen } from '../screens/agent/OpenClawBindScreen';
import { LocalConnectScreen } from '../screens/agent/LocalConnectScreen';
import { SkillInstallScreen } from '../screens/agent/SkillInstallScreen';
import { SkillPackScreen } from '../screens/agent/SkillPackScreen';
import { StoragePlanScreen } from '../screens/agent/StoragePlanScreen';
import { AgentLogsScreen } from '../screens/agent/AgentLogsScreen';
import { DesktopControlScreen } from '../screens/agent/DesktopControlScreen';
import { MemoryManagementScreen } from '../screens/agent/MemoryManagementScreen';
import AgentMemoryScreen from '../screens/agent/AgentMemoryScreen';
import AcpSessionsScreen from '../screens/agent/AcpSessionsScreen';
import { WorkflowListScreen } from '../screens/agent/WorkflowListScreen';
import { WorkflowDetailScreen } from '../screens/agent/WorkflowDetailScreen';
import { VoiceChatScreen } from '../screens/agent/VoiceChatScreen';
import { TeamSpaceScreen } from '../screens/agent/TeamSpaceScreen';
import { TeamInviteScreen } from '../screens/agent/TeamInviteScreen';
import { AgentAccountScreen } from '../screens/agent/AgentAccountScreen';
import { AgentBalanceScreen } from '../screens/agent/AgentBalanceScreen';
import { AgentPermissionsScreen } from '../screens/agent/AgentPermissionsScreen';
import { AgentToolsScreen } from '../screens/agent/AgentToolsScreen';
import { WearableHubScreen } from '../screens/agent/WearableHubScreen';
import { WearableMonitorScreen } from '../screens/agent/WearableMonitorScreen';
import { AgentSpaceScreen } from '../screens/agent/AgentSpaceScreen';
import { ScanScreen } from '../screens/me/ScanScreen';
// Deploy screens 鈥?reused from Onboarding in post-onboarding context
import { DeploySelectScreen } from '../screens/onboarding/DeploySelectScreen';
import { CloudDeployScreen } from '../screens/onboarding/CloudDeployScreen';
import { ConnectExistingScreen } from '../screens/onboarding/ConnectExistingScreen';
import { LocalDeployScreen } from '../screens/onboarding/LocalDeployScreen';
import { SocialBindScreen } from '../screens/onboarding/SocialBindScreen';
import { DreamingDashboardScreen } from '../screens/agent/DreamingDashboardScreen';
import { PluginHubScreen } from '../screens/agent/PluginHubScreen';
import { MemoryWikiScreen } from '../screens/agent/MemoryWikiScreen';
import { McpManagerScreen } from '../screens/agent/McpManagerScreen';
import { useI18n } from '../stores/i18nStore';
import { isVoiceUiE2EEnabled } from '../testing/e2e';

const Stack = createNativeStackNavigator<AgentStackParamList>();

export function AgentStackNavigator() {
  const { t } = useI18n();
  const initialRouteName = 'AgentChat';

  return (
    <Stack.Navigator id={undefined}
      initialRouteName={initialRouteName}
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgSecondary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.bgPrimary },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="AgentChat" component={AgentChatScreenWithBoundary} options={{ title: t({ en: 'Chat', zh: '瀵硅瘽' }), headerShown: false }} />
      <Stack.Screen name="AgentConsole" component={AgentConsoleScreen} options={{ title: t({ en: 'Agent Settings', zh: '鏅鸿兘浣撶鐞? }) }} />
      <Stack.Screen name="WearableHub" component={WearableHubScreen} options={{ title: t({ en: 'Wearable Devices', zh: '鍙┛鎴磋澶? }) }} />
      <Stack.Screen name="WearableMonitor" component={WearableMonitorScreen} options={{ title: t({ en: 'Wearable Monitor', zh: '绌挎埓璁惧鐩戞帶' }) }} />
      <Stack.Screen name="OpenClawBind" component={OpenClawBindScreen} options={{ title: t({ en: 'Connect OpenClaw', zh: '杩炴帴 OpenClaw' }) }} />
      <Stack.Screen name="LocalConnect" component={LocalConnectScreen} options={{ title: t({ en: 'Link Local Agent', zh: '鍏宠仈鏈湴鏅鸿兘浣? }) }} />
      <Stack.Screen name="Scan" component={ScanScreen} options={{ title: t({ en: 'Scan QR', zh: '鎵竴鎵? }) }} />
      <Stack.Screen name="SkillInstall" component={SkillInstallScreen} options={{ title: t({ en: 'Install Skill', zh: '瀹夎鎶€鑳? }) }} />
      <Stack.Screen name="SkillPack" component={SkillPackScreen} options={{ title: t({ en: 'Skill Pack', zh: '鎶€鑳藉揩鍏? }), headerShown: false }} />
      <Stack.Screen name="StoragePlan" component={StoragePlanScreen} options={{ title: t({ en: 'Storage Plans', zh: '瀛樺偍鏂规' }) }} />
      <Stack.Screen name="AgentLogs" component={AgentLogsScreen} options={{ title: t({ en: 'Activity Logs', zh: '娲诲姩鏃ュ織' }) }} />
      <Stack.Screen name="DesktopControl" component={DesktopControlScreen} options={{ title: t({ en: 'Desktop Control', zh: '妗岄潰鎺у埗' }) }} />
      <Stack.Screen name="MemoryManagement" component={MemoryManagementScreen} options={{ title: t({ en: 'Memory Hub', zh: '璁板繂涓績' }) }} />
      <Stack.Screen name="AgentMemory" component={AgentMemoryScreen} options={{ title: t({ en: 'Memory Slots', zh: '璁板繂妲? }) }} />
      <Stack.Screen name="AcpSessions" component={AcpSessionsScreen} options={{ title: t({ en: 'ACP Sessions', zh: 'ACP 浼氳瘽' }) }} />
      <Stack.Screen name="WorkflowList" component={WorkflowListScreen} options={{ title: t({ en: 'Workflows', zh: '宸ヤ綔娴? }) }} />
      <Stack.Screen name="WorkflowDetail" component={WorkflowDetailScreen} options={{ title: t({ en: 'Workflow', zh: '宸ヤ綔娴? }) }} />
      {/* Deploy screens 鈥?accessible post-onboarding */}
      <Stack.Screen name="DeploySelect" component={DeploySelectScreen} options={{ title: t({ en: 'Connect Agent', zh: '杩炴帴鏅鸿兘浣? }), headerShown: false }} />
      <Stack.Screen name="CloudDeploy" component={CloudDeployScreen} options={{ title: t({ en: 'Cloud Deploy', zh: '浜戠閮ㄧ讲' }), headerShown: false }} />
      <Stack.Screen name="ConnectExisting" component={ConnectExistingScreen} options={{ title: t({ en: 'Connect Existing', zh: '杩炴帴宸叉湁瀹炰緥' }), headerShown: false }} />
      <Stack.Screen name="LocalDeploy" component={LocalDeployScreen} options={{ title: t({ en: 'Local Deploy', zh: '鏈湴閮ㄧ讲' }), headerShown: false }} />
      <Stack.Screen name="SocialBind" component={SocialBindScreen} options={{ title: t({ en: 'Link Social', zh: '缁戝畾绀句氦骞冲彴' }), headerShown: false }} />
      {/* Layer 2 */}
      <Stack.Screen name="VoiceChat" component={VoiceChatScreen} options={{ title: t({ en: 'Voice Chat', zh: '璇煶瀵硅瘽' }), headerShown: false }} />
      <Stack.Screen name="TeamSpace" component={TeamSpaceScreen} options={{ title: t({ en: 'Team Spaces', zh: '鍥㈤槦绌洪棿' }), headerShown: false }} />
      <Stack.Screen name="TeamInvite" component={TeamInviteScreen} options={{ title: t({ en: 'Invite Members', zh: '閭€璇锋垚鍛? }), headerShown: false }} />
      <Stack.Screen name="AgentAccount" component={AgentAccountScreen} options={{ title: t({ en: 'Agent Accounts', zh: '鏅鸿兘浣撹处鎴? }) }} />
      <Stack.Screen name="AgentBalance" component={AgentBalanceScreen} options={{ title: t({ en: 'Balance & Transactions', zh: '浣欓涓庝氦鏄? }) }} />
      <Stack.Screen name="AgentPermissions" component={AgentPermissionsScreen} options={{ title: t({ en: 'Permissions & Security', zh: '鏉冮檺涓庡畨鍏? }) }} />
      <Stack.Screen name="AgentTools" component={AgentToolsScreen} options={{ title: t({ en: 'Agent Tools', zh: '绯荤粺宸ュ叿' }) }} />
      <Stack.Screen name="AgentSpace" component={AgentSpaceScreen} options={{ title: t({ en: 'Agent Space', zh: 'Agent 鍗忎綔绌洪棿' }) }} />
      {/* OpenClaw 4.5 features */}
      <Stack.Screen name="DreamingDashboard" component={DreamingDashboardScreen} options={{ title: t({ en: 'Dreaming Engine', zh: '姊﹀寮曟搸' }) }} />
      <Stack.Screen name="PluginHub" component={PluginHubScreen} options={{ title: t({ en: 'Plugin Hub', zh: '鎻掍欢涓績' }) }} />
      <Stack.Screen name="MemoryWiki" component={MemoryWikiScreen} options={{ title: t({ en: 'Memory Wiki', zh: '璁板繂缁村熀' }) }} />
      <Stack.Screen name="McpManager" component={McpManagerScreen} options={{ title: t({ en: 'MCP Manager', zh: 'MCP 绠＄悊' }) }} />
    </Stack.Navigator>
  );
}