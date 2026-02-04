import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native';
import { colors } from './src/theme/colors';

// Screens
import { HomeScreen } from './src/screens/HomeScreen';
import { AssetsScreen } from './src/screens/AssetsScreen';
import { ActivityScreen } from './src/screens/ActivityScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { LoginScreen } from './src/screens/LoginScreen';

// Detail Screens
import { SplitPlansScreen } from './src/screens/SplitPlansScreen';
import { BudgetPoolsScreen } from './src/screens/BudgetPoolsScreen';
import { SettlementsScreen } from './src/screens/SettlementsScreen';
import { CommissionPreviewScreen } from './src/screens/CommissionPreviewScreen';
import { AirdropScreen } from './src/screens/AirdropScreen';
import { AutoEarnScreen } from './src/screens/AutoEarnScreen';
import { QuickPayScreen } from './src/screens/QuickPayScreen';
import { IdentityActivationScreen } from './src/screens/IdentityActivationScreen';

// Phase 2 & 3 Screens
import AgentChatScreen from './src/screens/AgentChatScreen';
import MyAgentsScreen from './src/screens/MyAgentsScreen';
import StrategyDetailScreen from './src/screens/StrategyDetailScreen';
import TaskMarketScreen from './src/screens/TaskMarketScreen';

// Types
export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  SplitPlans: undefined;
  BudgetPools: undefined;
  Settlements: undefined;
  Preview: undefined;
  Settings: undefined;
  Airdrop: undefined;
  AutoEarn: undefined;
  QuickPay: undefined;
  IdentityActivation: { identity: 'merchant' | 'developer' };
  // Phase 2 & 3
  AgentChat: { agentId: string; agentName: string };
  MyAgents: undefined;
  StrategyDetail: {
    strategyId: string;
    strategyName: string;
    apy: string;
    riskLevel: string;
    description?: string;
    minDeposit?: number;
    totalDeposited?: number;
  };
  TaskMarket: undefined;
};

export type TabParamList = {
  Home: undefined;
  Assets: undefined;
  Activity: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

// Tab 图标
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{name}</Text>
);

// 底部 Tab 导航
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '首页',
          headerTitle: 'Agentrix',
          tabBarIcon: ({ focused }) => <TabIcon name="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Assets"
        component={AssetsScreen}
        options={{
          title: '资产',
          tabBarIcon: ({ focused }) => <TabIcon name="💰" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityScreen}
        options={{
          title: '活动',
          tabBarIcon: ({ focused }) => <TabIcon name="📊" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: '我的',
          tabBarIcon: ({ focused }) => <TabIcon name="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="Main"
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen 
            name="Main" 
            component={MainTabs} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ title: '登录', headerShown: false }} 
          />
          <Stack.Screen 
            name="SplitPlans" 
            component={SplitPlansScreen} 
            options={{ title: '分佣计划' }} 
          />
          <Stack.Screen 
            name="BudgetPools" 
            component={BudgetPoolsScreen} 
            options={{ title: '预算池' }} 
          />
          <Stack.Screen 
            name="Settlements" 
            component={SettlementsScreen} 
            options={{ title: '结算账本' }} 
          />
          <Stack.Screen 
            name="Preview" 
            component={CommissionPreviewScreen} 
            options={{ title: '分佣预览' }} 
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={{ title: '设置' }} 
          />
          <Stack.Screen 
            name="Airdrop" 
            component={AirdropScreen} 
            options={{ title: '发现空投' }} 
          />
          <Stack.Screen 
            name="AutoEarn" 
            component={AutoEarnScreen} 
            options={{ title: 'AutoEarn' }} 
          />
          <Stack.Screen 
            name="QuickPay" 
            component={QuickPayScreen} 
            options={{ title: '快速收款' }} 
          />
          <Stack.Screen 
            name="IdentityActivation" 
            component={IdentityActivationScreen} 
            options={{ title: '身份激活' }} 
          />
          {/* Phase 2 & 3 Screens */}
          <Stack.Screen 
            name="MyAgents" 
            component={MyAgentsScreen} 
            options={{ title: '我的 Agent' }} 
          />
          <Stack.Screen 
            name="AgentChat" 
            component={AgentChatScreen} 
            options={({ route }) => ({ title: route.params.agentName })} 
          />
          <Stack.Screen 
            name="StrategyDetail" 
            component={StrategyDetailScreen} 
            options={({ route }) => ({ title: route.params.strategyName })} 
          />
          <Stack.Screen 
            name="TaskMarket" 
            component={TaskMarketScreen} 
            options={{ title: '任务市场' }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}