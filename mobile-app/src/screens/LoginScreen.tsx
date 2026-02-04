import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../theme/colors';

export const LoginScreen: React.FC = () => {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <Text style={{ color: colors.text, fontSize: 18 }}>Login (Coming Soon)</Text>
    </View>
  );
};