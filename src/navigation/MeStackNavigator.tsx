import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MeStackParamList } from './types';
import { colors } from '../theme/colors';
import { ProfileScreen } from '../screens/me/ProfileScreen';
import { ReferralDashboardScreen } from '../screens/me/ReferralDashboardScreen';
import { ClawSettingsScreen } from '../screens/me/ClawSettingsScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { MySkillsScreen } from '../screens/me/MySkillsScreen';
import { MyOrdersScreen } from '../screens/me/MyOrdersScreen';
import { NotificationCenterScreen } from '../screens/notifications/NotificationCenterScreen';
import { ShareCardScreen } from '../screens/ShareCardScreen';
import { WalletConnectScreen } from '../screens/WalletConnectScreen';
import { WalletBackupScreen } from '../screens/me/WalletBackupScreen';
import { SocialListenerScreen } from '../screens/social/SocialListenerScreen';

import { AirdropScreen } from '../screens/AirdropScreen';
import { AssetsScreen } from '../screens/AssetsScreen';
import { AutoEarnScreen } from '../screens/AutoEarnScreen';
import { BudgetPoolsScreen } from '../screens/BudgetPoolsScreen';
import { SettlementsScreen } from '../screens/SettlementsScreen';
import { SplitPlansScreen } from '../screens/SplitPlansScreen';
import { QuickPayScreen } from '../screens/QuickPayScreen';

const Stack = createNativeStackNavigator<MeStackParamList>();

export function MeStackNavigator() {
  return (
    <Stack.Navigator id={undefined}
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgSecondary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.bgPrimary },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Me' }} />
      <Stack.Screen name="ReferralDashboard" component={ReferralDashboardScreen} options={{ title: 'Referrals & Earnings' }} />
      <Stack.Screen name="Settings" component={ClawSettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
      <Stack.Screen name="MySkills" component={MySkillsScreen} options={{ title: 'My Skills' }} />
      <Stack.Screen name="MyOrders" component={MyOrdersScreen} options={{ title: 'My Orders' }} />
      <Stack.Screen name="WalletConnect" component={WalletConnectScreen} options={{ title: 'Wallet' }} />
      <Stack.Screen name="WalletBackup" component={WalletBackupScreen} options={{ title: 'Wallet Backup' }} />
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="ShareCard" component={ShareCardScreen} options={{ title: 'Share' }} />
      <Stack.Screen name="SocialListener" component={SocialListenerScreen} options={{ title: 'Social Listener' }} />
      <Stack.Screen name="Airdrop" component={AirdropScreen} options={{ title: 'Airdrop' }} />
      <Stack.Screen name="Assets" component={AssetsScreen} options={{ title: 'Assets' }} />
      <Stack.Screen name="AutoEarn" component={AutoEarnScreen} options={{ title: 'Auto Earn' }} />
      <Stack.Screen name="BudgetPools" component={BudgetPoolsScreen} options={{ title: 'Budget Pools' }} />
      <Stack.Screen name="Settlements" component={SettlementsScreen} options={{ title: 'Settlements' }} />
      <Stack.Screen name="SplitPlans" component={SplitPlansScreen} options={{ title: 'Split Plans' }} />
      <Stack.Screen name="QuickPay" component={QuickPayScreen} options={{ title: 'Quick Pay' }} />
    </Stack.Navigator>
  );
}
