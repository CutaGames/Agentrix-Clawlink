import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MarketStackParamList } from './types';
import { colors } from '../theme/colors';
import { ClawMarketplaceScreen } from '../screens/market/ClawMarketplaceScreen';
import { ClawSkillDetailScreen } from '../screens/market/ClawSkillDetailScreen';
import { CheckoutScreen } from '../screens/market/CheckoutScreen';

const Stack = createNativeStackNavigator<MarketStackParamList>();

export function MarketStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgSecondary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.bgPrimary },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Marketplace" component={ClawMarketplaceScreen} options={{ title: 'Skill Market' }} />
      <Stack.Screen name="SkillDetail" component={ClawSkillDetailScreen} options={({ route }) => ({ title: route.params.skillName })} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
    </Stack.Navigator>
  );
}
