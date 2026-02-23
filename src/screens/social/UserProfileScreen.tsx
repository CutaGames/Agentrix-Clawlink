import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import type { SocialStackParamList } from '../../navigation/types';

type RouteT = RouteProp<SocialStackParamList, 'UserProfile'>;
type Nav = NativeStackNavigationProp<SocialStackParamList>;

export function UserProfileScreen() {
  const route = useRoute<RouteT>();
  const navigation = useNavigation<Nav>();
  const userId = route.params?.userId;
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>👤</Text>
      <Text style={styles.text}>User Profile</Text>
      <Text style={styles.sub}>ID: {userId}</Text>
      <Text style={styles.note}>Full user profile — coming in Phase 2</Text>
      <TouchableOpacity
        style={styles.dmBtn}
        onPress={() => navigation.navigate('DMChat', { userId, userName: userId })}
      >
        <Text style={styles.dmBtnText}>✉️ Send Message</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emoji: { fontSize: 48 },
  text: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  sub: { fontSize: 13, color: colors.textMuted },
  note: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  dmBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 12 },
  dmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

