import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, ActivityIndicator, Text, AppState, AppStateStatus } from 'react-native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from './src/stores/authStore';
import { setApiConfig, loadTokenFromStorage } from './src/services/api';
import { fetchCurrentUser } from './src/services/auth';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme/colors';
import { useNotificationStore } from './src/stores/notificationStore';
import { startNotificationPolling, stopNotificationPolling } from './src/services/realtime.service';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';

// Configure how incoming notifications are handled while app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});


const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 2 },
  },
});

function SplashScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={{ color: colors.textMuted, marginTop: 16, fontSize: 14 }}>ClawLink</Text>
    </View>
  );
}

async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '96a641e0-ce03-45ff-9de7-2cd89c488236',
    });
    return tokenData.data;
  } catch (e) {
    console.warn('Push token registration failed:', e);
    return null;
  }
}

function AppNavigator() {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const { setAuth, setInitialized, clearAuth } = useAuthStore.getState();
  const notifSubRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Foreground notification listener â€?adds to in-app notification store
    notifSubRef.current = Notifications.addNotificationReceivedListener((notification) => {
      const { addNotification } = useNotificationStore.getState();
      addNotification({
        type: (notification.request.content.data?.type ?? 'system') as any,
        title: notification.request.content.title ?? 'Notification',
        body: notification.request.content.body ?? '',
        data: (notification.request.content.data as Record<string, any>) ?? {},
      });
    });

    const restoreSession = async () => {
      try {
        // Load token from SecureStore (key: 'clawlink_token')
        const token = await loadTokenFromStorage();
        if (!token) {
          // No stored token â€?check if Zustand persist says user is authenticated
          // (edge case: SecureStore was cleared but AsyncStorage persist wasn't)
          const cachedStore = useAuthStore.getState();
          if (!cachedStore.isAuthenticated) {
            setInitialized(true);
            return;
          }
          // isAuthenticated persisted but token gone â†?force re-login
          await clearAuth();
          setInitialized(true);
          return;
        }
        setApiConfig({ token });
        const cachedState = useAuthStore.getState();
        if (cachedState.user && !cachedState.isAuthenticated) {
          cachedState.setAuth(cachedState.user, token);
        } else if (!cachedState.user) {
          useAuthStore.setState({ token, isAuthenticated: true });
        }
        try {
          const user = await fetchCurrentUser();
          if (user) {
            await setAuth(user, token);
            // Start notification polling and register push token after successful auth
            startNotificationPolling(token);
            const pushToken = await registerForPushNotifications();
            if (pushToken) {
              useNotificationStore.getState().setPushToken(pushToken);
            }
          } else {
            await clearAuth();
            stopNotificationPolling();
          }
        } catch (e: any) {
          const msg = e?.message || '';
          if (msg.includes('401') || msg.includes('Unauthorized')) {
            // Token expired or revoked â€?force re-login
            await clearAuth();
            stopNotificationPolling();
          } else {
            // Network error or 5xx â€?keep user logged in with last cached session
            console.warn('Session validation network error (using cached session):', msg);
            if (cachedState.isAuthenticated && cachedState.user) {
              startNotificationPolling(token);
            }
          }
        }
      } catch (e) {
        console.warn('Session restore failed:', e);
      } finally {
        setInitialized(true);
      }
    };
    restoreSession();

    return () => {
      notifSubRef.current?.remove();
      stopNotificationPolling();
    };
  }, []);

  if (!isInitialized) return <SplashScreen />;
  return <RootNavigator />;
}

// Deep link config
const linking = {
  prefixes: [Linking.createURL('/'), 'clawlink://', 'https://clawlink.app'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          AuthCallback: 'auth/callback',
        },
      },
      Onboarding: {
        screens: {
          DeploySelect: 'onboarding/deploy',
          CloudDeploy: 'onboarding/cloud',
          ConnectExisting: 'onboarding/connect',
        },
      },
      Main: {
        screens: {
          Agent: { screens: { AgentConsole: 'agent', AgentChat: 'agent/chat', OpenClawBind: 'agent/bind' } },
          Market: { screens: { Marketplace: 'market', SkillDetail: 'market/skill/:skillId' } },
          Social: { screens: { Feed: 'social' } },
          Me: { screens: { Profile: 'me', ReferralDashboard: 'me/referral', Settings: 'me/settings' } },
        },
      },
    },
  },
};

export default function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer linking={linking as any}>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </GestureHandlerRootView>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
