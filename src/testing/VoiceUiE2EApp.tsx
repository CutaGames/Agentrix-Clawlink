import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AgentConsoleScreen } from '../screens/agent/AgentConsoleScreen';
import { AgentChatScreen } from '../screens/agent/AgentChatScreen';
import { GlobalFloatingBall } from '../components/GlobalFloatingBall';
import type { AgentStackParamList } from '../navigation/types';
import { useAuthStore } from '../stores/authStore';

const Stack = createNativeStackNavigator<AgentStackParamList>();

function AgentConsoleE2EScreen(props: any) {
  const activeInstance = useAuthStore((state) => state.activeInstance);

  return (
    <View style={styles.wrapper}>
      <AgentConsoleScreen {...props} />
      <GlobalFloatingBall
        onVoiceActivate={() => props.navigation.navigate('AgentChat', {
          instanceId: activeInstance?.id,
          instanceName: activeInstance?.name || 'Agent',
          voiceMode: true,
          duplexMode: true,
        })}
      />
    </View>
  );
}

function AgentChatE2EScreen(props: any) {
  return (
    <View style={styles.wrapper}>
      <AgentChatScreen {...props} />
      <GlobalFloatingBall />
    </View>
  );
}

export function VoiceUiE2EApp() {
  return (
    <Stack.Navigator id={undefined} initialRouteName="AgentConsole" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AgentConsole" component={AgentConsoleE2EScreen} />
      <Stack.Screen name="AgentChat" component={AgentChatE2EScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});