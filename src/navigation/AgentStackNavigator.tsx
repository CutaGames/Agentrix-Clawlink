import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AgentStackParamList } from './types';
import { colors } from '../theme/colors';
import { AgentConsoleScreen } from '../screens/agent/AgentConsoleScreen';
import { AgentChatScreen } from '../screens/agent/AgentChatScreen';
import { OpenClawBindScreen } from '../screens/agent/OpenClawBindScreen';
import { LocalConnectScreen } from '../screens/agent/LocalConnectScreen';
import { SkillInstallScreen } from '../screens/agent/SkillInstallScreen';
import { StoragePlanScreen } from '../screens/agent/StoragePlanScreen';
import { AgentLogsScreen } from '../screens/agent/AgentLogsScreen';
import { MemoryManagementScreen } from '../screens/agent/MemoryManagementScreen';
import { WorkflowListScreen } from '../screens/agent/WorkflowListScreen';
import { WorkflowDetailScreen } from '../screens/agent/WorkflowDetailScreen';
import { VoiceChatScreen } from '../screens/agent/VoiceChatScreen';
import { TeamSpaceScreen } from '../screens/agent/TeamSpaceScreen';
import { TeamInviteScreen } from '../screens/agent/TeamInviteScreen';
import { AgentAccountScreen } from '../screens/agent/AgentAccountScreen';
import { AgentPermissionsScreen } from '../screens/agent/AgentPermissionsScreen';
// Deploy screens — reused from Onboarding in post-onboarding context
import { DeploySelectScreen } from '../screens/onboarding/DeploySelectScreen';
import { CloudDeployScreen } from '../screens/onboarding/CloudDeployScreen';
import { ConnectExistingScreen } from '../screens/onboarding/ConnectExistingScreen';
import { LocalDeployScreen } from '../screens/onboarding/LocalDeployScreen';
import { SocialBindScreen } from '../screens/onboarding/SocialBindScreen';
import { useI18n } from '../stores/i18nStore';

const Stack = createNativeStackNavigator<AgentStackParamList>();

export function AgentStackNavigator() {
  const { t } = useI18n();

  return (
    <Stack.Navigator id={undefined}
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgSecondary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.bgPrimary },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="AgentConsole" component={AgentConsoleScreen} options={{ title: t({ en: 'My Agent', zh: '我的智能体' }) }} />
      <Stack.Screen name="AgentChat" component={AgentChatScreen} options={{ title: t({ en: 'Chat', zh: '对话' }) }} />
      <Stack.Screen name="OpenClawBind" component={OpenClawBindScreen} options={{ title: t({ en: 'Connect OpenClaw', zh: '连接 OpenClaw' }) }} />
      <Stack.Screen name="LocalConnect" component={LocalConnectScreen} options={{ title: t({ en: 'Link Local Agent', zh: '关联本地智能体' }) }} />
      <Stack.Screen name="SkillInstall" component={SkillInstallScreen} options={{ title: t({ en: 'Install Skill', zh: '安装技能' }) }} />
      <Stack.Screen name="StoragePlan" component={StoragePlanScreen} options={{ title: t({ en: 'Storage Plans', zh: '存储方案' }) }} />
      <Stack.Screen name="AgentLogs" component={AgentLogsScreen} options={{ title: t({ en: 'Activity Logs', zh: '活动日志' }) }} />
      <Stack.Screen name="MemoryManagement" component={MemoryManagementScreen} options={{ title: t({ en: 'Memory Hub', zh: '记忆中心' }) }} />
      <Stack.Screen name="WorkflowList" component={WorkflowListScreen} options={{ title: t({ en: 'Workflows', zh: '工作流' }) }} />
      <Stack.Screen name="WorkflowDetail" component={WorkflowDetailScreen} options={{ title: t({ en: 'Workflow', zh: '工作流' }) }} />
      {/* Deploy screens — accessible post-onboarding */}
      <Stack.Screen name="DeploySelect" component={DeploySelectScreen} options={{ title: t({ en: 'Connect Agent', zh: '连接智能体' }), headerShown: false }} />
      <Stack.Screen name="CloudDeploy" component={CloudDeployScreen} options={{ title: t({ en: 'Cloud Deploy', zh: '云端部署' }), headerShown: false }} />
      <Stack.Screen name="ConnectExisting" component={ConnectExistingScreen} options={{ title: t({ en: 'Connect Existing', zh: '连接已有实例' }), headerShown: false }} />
      <Stack.Screen name="LocalDeploy" component={LocalDeployScreen} options={{ title: t({ en: 'Local Deploy', zh: '本地部署' }), headerShown: false }} />
      <Stack.Screen name="SocialBind" component={SocialBindScreen} options={{ title: t({ en: 'Link Social', zh: '绑定社交平台' }), headerShown: false }} />
      {/* Layer 2 */}
      <Stack.Screen name="VoiceChat" component={VoiceChatScreen} options={{ title: t({ en: 'Voice Chat', zh: '语音对话' }), headerShown: false }} />
      <Stack.Screen name="TeamSpace" component={TeamSpaceScreen} options={{ title: t({ en: 'Team Spaces', zh: '团队空间' }), headerShown: false }} />
      <Stack.Screen name="TeamInvite" component={TeamInviteScreen} options={{ title: t({ en: 'Invite Members', zh: '邀请成员' }), headerShown: false }} />
      <Stack.Screen name="AgentAccount" component={AgentAccountScreen} options={{ title: t({ en: 'Agent Accounts', zh: '智能体账户' }) }} />
      <Stack.Screen name="AgentPermissions" component={AgentPermissionsScreen} options={{ title: t({ en: 'Permissions & Security', zh: '权限与安全' }) }} />
    </Stack.Navigator>
  );
}
