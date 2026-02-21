import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { installSkillToInstance } from '../../services/openclaw.service';
import { useAuthStore } from '../../stores/authStore';
import type { AgentStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AgentStackParamList, 'SkillInstall'>;
type RouteT = RouteProp<AgentStackParamList, 'SkillInstall'>;

export function SkillInstallScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const activeInstance = useAuthStore((s) => s.activeInstance);
  const { skillId, skillName } = route.params;

  const handleInstall = async () => {
    if (!activeInstance || !skillId) return;
    try {
      await installSkillToInstance(activeInstance.id, skillId);
      navigation.goBack();
    } catch (e: any) {
      // Silent fail — handled by parent
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>⚡</Text>
      <Text style={styles.title}>Install {skillName || 'Skill'}</Text>
      <Text style={styles.sub}>
        This skill will be installed to: {activeInstance?.name || 'Active Instance'}
      </Text>
      <TouchableOpacity style={styles.btn} onPress={handleInstall}>
        <Text style={styles.btnText}>Install Now</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.cancel}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  emoji: { fontSize: 56 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  sub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  btn: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, paddingHorizontal: 40 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancel: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
});
