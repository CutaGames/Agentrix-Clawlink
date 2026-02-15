import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text, View, ActivityIndicator } from 'react-native';
import { colors } from './src/theme/colors';
import { useAuthStore } from './src/stores/authStore';
import { setApiConfig, loadTokenFromStorage } from './src/services/api';
import { fetchCurrentUser } from './src/services/auth';

// MVP Tab Screens
import { MarketplaceScreen } from './src/screens/MarketplaceScreen';
import { PromoteScreen } from './src/screens/PromoteScreen';
import { MvpProfileScreen } from './src/screens/MvpProfileScreen';

// Detail Screens
import { SkillDetailScreen } from './src/screens/SkillDetailScreen';
import { MySkillsScreen } from './src/screens/MySkillsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ReviewsScreen } from './src/screens/ReviewsScreen';
import { WriteReviewScreen } from './src/screens/WriteReviewScreen';
import { CreateLinkScreen } from './src/screens/CreateLinkScreen';
import { MyLinksScreen } from './src/screens/MyLinksScreen';
import { CommissionRulesScreen } from './src/screens/CommissionRulesScreen';
import { CommissionEarningsScreen } from './src/screens/CommissionEarningsScreen';
import { WalletConnectScreen } from './src/screens/WalletConnectScreen';
import { MyOrdersScreen } from './src/screens/MyOrdersScreen';
import { MyFavoritesScreen } from './src/screens/MyFavoritesScreen';
import { IdentityActivationScreen } from './src/screens/IdentityActivationScreen';
import { TaskDetailScreen } from './src/screens/TaskDetailScreen';
import { PostTaskScreen } from './src/screens/PostTaskScreen';
import TaskMarketScreen from './src/screens/TaskMarketScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import AllianceScreen from './src/screens/AllianceScreen';

// Types
export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Settings: undefined;
  SkillDetail: { skillId: string; skillName: string };
  CreateLink: { skillId: string; skillName: string; skillPrice: number; skillPriceUnit: string };
  MyLinks: undefined;
  CommissionRules: undefined;
  CommissionEarnings: undefined;
  WalletConnect: undefined;
  MyOrders: undefined;
  MyFavorites: undefined;
  MySkills: undefined;
  Reviews: { skillId: string };
  WriteReview: { skillId: string };
  IdentityActivation: { identity: 'merchant' | 'developer' };
  TaskMarket: undefined;
  TaskDetail: { taskId: string };
  PostTask: undefined;
  Account: undefined;
  Checkout: { skillId: string; skillName?: string };
  Alliance: undefined;
};

export type TabParamList = {
  Market: undefined;
  Promote: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

// Tab 图标
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.6 }}>{name}</Text>
);

// MVP 3-Tab 底部导航: 市场 / 推广 / 我的
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Market"
        component={MarketplaceScreen}
        options={{
          title: 'Market',
          headerTitle: 'Agentrix Marketplace',
          tabBarIcon: ({ focused }) => <TabIcon name="\uD83D\uDED2" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Promote"
        component={PromoteScreen}
        options={{
          title: 'Promote',
          headerTitle: 'Promote Center',
          tabBarIcon: ({ focused }) => <TabIcon name="\uD83D\uDCE2" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={MvpProfileScreen}
        options={{
          title: 'Me',
          headerTitle: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// 启动画面
function SplashScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ color: colors.muted, marginTop: 16, fontSize: 14 }}>Loading...</Text>
    </View>
  );
}

// 认证状态管理的内部组件
function AppNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const { setAuth, setInitialized, clearAuth } = useAuthStore.getState();

  useEffect(() => {
    const restoreSession = async () => {
      try {
        // 1. 从 SecureStore 恢复 token
        const token = await loadTokenFromStorage();
        if (!token) {
          setInitialized(true);
          return;
        }

        // 2. 设置 token 到 API config
        setApiConfig({ token });

        // 3. 先从 AsyncStorage 恢复缓存的用户信息（立即显示主界面）
        //    Zustand persist 会自动恢复 user 和 isAuthenticated
        const cachedState = useAuthStore.getState();
        if (cachedState.user && !cachedState.isAuthenticated) {
          // 有缓存用户但未标记认证，手动恢复
          cachedState.setAuth(cachedState.user, token);
        } else if (!cachedState.user) {
          // 没有缓存用户，先用 token 标记为已认证
          useAuthStore.setState({ token, isAuthenticated: true });
        }

        // 4. 后台验证 token 是否有效，获取最新用户信息
        try {
          const user = await fetchCurrentUser();
          if (user) {
            await useAuthStore.getState().setAuth(user, token);
          } else {
            // 后端明确返回无用户 → token 无效
            await clearAuth();
          }
        } catch (e: any) {
          // 网络错误不清除登录状态，只有 401 才清除
          const msg = e?.message || '';
          if (msg.includes('401') || msg.includes('Unauthorized')) {
            console.warn('Token expired, clearing auth');
            await clearAuth();
          } else {
            console.warn('Network error during session verify, keeping cached auth:', msg);
          }
        }
      } catch (e) {
        console.warn('Session restore failed:', e);
        // 不清除 auth，保留缓存状态
      } finally {
        setInitialized(true);
      }
    };

    restoreSession();
  }, []);

  if (!isInitialized) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      {!isAuthenticated ? (
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false, animationTypeForReplace: 'pop' }} 
          />
          <Stack.Screen 
            name="WalletConnect" 
            component={WalletConnectScreen} 
            options={{ title: 'Connect Wallet', headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text }} 
          />
        </>
      ) : (
        <>
          <Stack.Screen 
            name="Main" 
            component={MainTabs} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="SkillDetail" 
            component={SkillDetailScreen} 
            options={({ route }) => ({ title: route.params.skillName })} 
          />
          <Stack.Screen 
            name="MySkills" 
            component={MySkillsScreen} 
            options={{ title: 'My Skills' }} 
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={{ title: 'Settings' }} 
          />
          <Stack.Screen name="MyLinks" component={MyLinksScreen} options={{ title: 'My Links' }} />
          <Stack.Screen name="CommissionRules" component={CommissionRulesScreen} options={{ title: 'Commission Rules' }} />
          <Stack.Screen name="CommissionEarnings" component={CommissionEarningsScreen} options={{ title: 'Commission Earnings' }} />
          <Stack.Screen name="MyOrders" component={MyOrdersScreen} options={{ title: 'My Orders' }} />
          <Stack.Screen name="MyFavorites" component={MyFavoritesScreen} options={{ title: 'Favorites' }} />
          <Stack.Screen 
            name="CreateLink" 
            component={CreateLinkScreen} 
            options={{ title: 'Create Referral Link' }} 
          />
          <Stack.Screen name="Reviews" component={ReviewsScreen} options={{ title: 'All Reviews' }} />
          <Stack.Screen name="WriteReview" component={WriteReviewScreen} options={{ title: 'Write Review' }} />
          <Stack.Screen name="IdentityActivation" component={IdentityActivationScreen} options={{ title: 'Activate Identity' }} />
          <Stack.Screen name="TaskMarket" component={TaskMarketScreen} options={{ title: 'Bounty Board' }} />
          <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task Detail' }} />
          <Stack.Screen name="PostTask" component={PostTaskScreen} options={{ title: 'Post Bounty Task' }} />
          <Stack.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
          <Stack.Screen name="Alliance" component={AllianceScreen} options={{ title: 'Agentrix Alliance' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </QueryClientProvider>
  );
}