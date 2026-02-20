import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import type { SocialStackParamList } from '../../navigation/types';

type RouteT = RouteProp<SocialStackParamList, 'PostDetail'>;

export function PostDetailScreen() {
  const route = useRoute<RouteT>();
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💬</Text>
      <Text style={styles.text}>Post Detail</Text>
      <Text style={styles.sub}>postId: {route.params?.postId}</Text>
      <Text style={styles.note}>Full post detail view — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emoji: { fontSize: 48 },
  text: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  sub: { fontSize: 13, color: colors.textMuted },
  note: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
});
