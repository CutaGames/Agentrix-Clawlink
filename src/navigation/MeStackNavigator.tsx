import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MeStackParamList } from './types';
import { colors } from '../theme/colors';
import { ProfileScreen } from '../screens/me/ProfileScreen';
import { ReferralDashboardScreen } from '../screens/me/ReferralDashboardScreen';
import { ClawSettingsScreen } from '../screens/me/ClawSettingsScreen';
import { ApiKeysScreen } from '../screens/me/ApiKeysScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { MySkillsScreen } from '../screens/me/MySkillsScreen';
import { MyOrdersScreen } from '../screens/me/MyOrdersScreen';
import { NotificationCenterScreen } from '../screens/notifications/NotificationCenterScreen';
import { ShareCardScreen } from '../screens/ShareCardScreen';
import { WalletConnectScreen } from '../screens/WalletConnectScreen';
import { WalletBackupScreen } from '../screens/me/WalletBackupScreen';
import { SocialListenerScreen } from '../screens/social/SocialListenerScreen';
import { useI18n } from '../stores/i18nStore';

const Stack = createNativeStackNavigator<MeStackParamList>();

export function MeStackNavigator() {
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
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: t({ en: 'Me', zh: '我的' }) }} />
      <Stack.Screen name="ReferralDashboard" component={ReferralDashboardScreen} options={{ title: t({ en: 'Referrals & Earnings', zh: '推广与收益' }) }} />
      <Stack.Screen name="Settings" component={ClawSettingsScreen} options={{ title: t({ en: 'Settings', zh: '设置' }) }} />
      <Stack.Screen name="ApiKeys" component={ApiKeysScreen} options={{ title: t({ en: 'Custom API Keys', zh: '自定义 API 密钥' }) }} />
      <Stack.Screen name="Account" component={AccountScreen} options={{ title: t({ en: 'Account', zh: '账户' }) }} />
      <Stack.Screen name="MySkills" component={MySkillsScreen} options={{ title: t({ en: 'My Skills', zh: '我的技能' }) }} />
      <Stack.Screen name="MyOrders" component={MyOrdersScreen} options={{ title: t({ en: 'My Orders', zh: '我的订单' }) }} />
      <Stack.Screen name="WalletConnect" component={WalletConnectScreen} options={{ title: t({ en: 'Wallet', zh: '钱包' }) }} />
      <Stack.Screen name="WalletBackup" component={WalletBackupScreen} options={{ title: t({ en: 'Wallet Backup', zh: '钱包备份' }) }} />
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} options={{ title: t({ en: 'Notifications', zh: '通知' }) }} />
      <Stack.Screen name="ShareCard" component={ShareCardScreen} options={{ title: t({ en: 'Share', zh: '分享' }) }} />
      <Stack.Screen name="SocialListener" component={SocialListenerScreen} options={{ title: t({ en: 'Social Listener', zh: '社交监听' }) }} />
    </Stack.Navigator>
  );
}
