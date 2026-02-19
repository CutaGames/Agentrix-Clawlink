import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AgentStackParamList } from './types';
import { colors } from '../theme/colors';
import { AgentConsoleScreen } from '../screens/agent/AgentConsoleScreen';
import { AgentChatScreen } from '../screens/agent/AgentChatScreen';
import { OpenClawBindScreen } from '../screens/agent/OpenClawBindScreen';
import { SkillInstallScreen } from '../screens/agent/SkillInstallScreen';

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
    </Stack.Navigator>
  );
}
