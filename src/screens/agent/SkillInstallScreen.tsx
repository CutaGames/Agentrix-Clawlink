import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
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
  const [installing, setInstalling] = useState(false);
  const [done, setDone] = useState(false);

  const handleInstall = async () => {
    if (!activeInstance) {
      Alert.alert(
        '未绑定 agent',
        '请先在「Agent」页面绑定或部署一个 OpenClaw 实例，然后再安装 Skill。',
        [{ text: '去绑定', onPress: () => navigation.navigate('AgentOnboarding' as any) }, { text: '取消', style: 'cancel' }]
      );
      return;
    }
    if (!skillId) return;
    setInstalling(true);
    try {
      await installSkillToInstance(activeInstance.id, skillId);
      setDone(true);
      setTimeout(() => navigation.goBack(), 1200);
    } catch (e: any) {
      Alert.alert('安装失败', e?.message || '请确认 Agent 实例在线后重试。');
    } finally {
      setInstalling(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{done ? '✅' : '⚡'}</Text>
      <Text style={styles.title}>{done ? '安装成功！' : `安装 ${skillName || 'Skill'}`}</Text>
      <Text style={styles.sub}>
        {activeInstance
          ? `将安装到：${activeInstance.name}`
          : '⚠️ 未绑定 Agent 实例'}
      </Text>
      {!done && (
        <TouchableOpacity
          style={[styles.btn, installing && styles.btnLoading]}
          onPress={handleInstall}
          disabled={installing}
        >
          {installing
            ? <ActivityIndicator color='#fff' />
            : <Text style={styles.btnText}>立即安装</Text>}
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.cancel}>{done ? '返回' : '取消'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  emoji: { fontSize: 56 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  sub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  btn: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, paddingHorizontal: 40, minWidth: 160, alignItems: 'center' },
  btnLoading: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancel: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
});
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
