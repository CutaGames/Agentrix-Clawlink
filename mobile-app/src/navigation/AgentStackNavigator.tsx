import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AgentStackParamList } from './types';
import { colors } from '../theme/colors';
import { AgentConsoleScreen } from '../screens/agent/AgentConsoleScreen';
import { AgentChatScreen } from '../screens/agent/AgentChatScreen';
import { OpenClawBindScreen } from '../screens/agent/OpenClawBindScreen';
import { SkillInstallScreen } from '../screens/agent/SkillInstallScreen';
import { StoragePlanScreen } from '../screens/agent/StoragePlanScreen';
import { AgentLogsScreen } from '../screens/agent/AgentLogsScreen';
import { MemoryManagementScreen } from '../screens/agent/MemoryManagementScreen';
import { WorkflowListScreen } from '../screens/agent/WorkflowListScreen';
import { WorkflowDetailScreen } from '../screens/agent/WorkflowDetailScreen';
import { VoiceChatScreen } from '../screens/agent/VoiceChatScreen';
import { TeamSpaceScreen } from '../screens/agent/TeamSpaceScreen';
import { TeamInviteScreen } from '../screens/agent/TeamInviteScreen';

const Stack = createNativeStackNavigator<AgentStackParamList>();

export function AgentStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgSecondary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.bgPrimary },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="AgentConsole" component={AgentConsoleScreen} options={{ title: 'My Agent' }} />
      <Stack.Screen name="AgentChat" component={AgentChatScreen} options={{ title: 'Chat' }} />
      <Stack.Screen name="OpenClawBind" component={OpenClawBindScreen} options={{ title: 'Connect OpenClaw' }} />
      <Stack.Screen name="SkillInstall" component={SkillInstallScreen} options={{ title: 'Install Skill' }} />
      <Stack.Screen name="StoragePlan" component={StoragePlanScreen} options={{ title: 'Storage Plans' }} />
      <Stack.Screen name="AgentLogs" component={AgentLogsScreen} options={{ title: 'Activity Logs' }} />
      <Stack.Screen name="MemoryManagement" component={MemoryManagementScreen} options={{ title: 'Memory Hub' }} />
      <Stack.Screen name="WorkflowList" component={WorkflowListScreen} options={{ title: 'Workflows' }} />
      <Stack.Screen name="WorkflowDetail" component={WorkflowDetailScreen} options={{ title: 'Workflow' }} />
      {/* Layer 2 */}
      <Stack.Screen name="VoiceChat" component={VoiceChatScreen} options={{ title: 'Voice Chat', headerShown: false }} />
      <Stack.Screen name="TeamSpace" component={TeamSpaceScreen} options={{ title: 'Team Spaces', headerShown: false }} />
      <Stack.Screen name="TeamInvite" component={TeamInviteScreen} options={{ title: 'Invite Members', headerShown: false }} />
    </Stack.Navigator>
  );
}


const Stack = createNativeStackNavigator<AgentStackParamList>();

export function AgentStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgSecondary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.bgPrimary },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="AgentConsole" component={AgentConsoleScreen} options={{ title: 'My Agent' }} />
      <Stack.Screen name="AgentChat" component={AgentChatScreen} options={{ title: 'Chat' }} />
      <Stack.Screen name="OpenClawBind" component={OpenClawBindScreen} options={{ title: 'Connect OpenClaw' }} />
      <Stack.Screen name="SkillInstall" component={SkillInstallScreen} options={{ title: 'Install Skill' }} />
      <Stack.Screen name="StoragePlan" component={StoragePlanScreen} options={{ title: 'Storage Plans' }} />
      <Stack.Screen name="AgentLogs" component={AgentLogsScreen} options={{ title: 'Activity Logs' }} />
      <Stack.Screen name="MemoryManagement" component={MemoryManagementScreen} options={{ title: 'Memory Hub' }} />
      <Stack.Screen name="WorkflowList" component={WorkflowListScreen} options={{ title: 'Workflows' }} />
      <Stack.Screen name="WorkflowDetail" component={WorkflowDetailScreen} options={{ title: 'Workflow' }} />
    </Stack.Navigator>
  );
}
