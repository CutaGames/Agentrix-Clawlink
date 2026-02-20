import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import type { OnboardingStackParamList } from '../../navigation/types';

import { useAuthStore } from '../../stores/authStore';

const { width } = Dimensions.get('window');
type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'DeploySelect'>;

const OPTIONS = [
  {
    id: 'cloud',
    emoji: '☁️',
    title: 'Agentrix Cloud',
    subtitle: 'Fastest way. No setup, ready in 5 seconds.',
    badge: 'FREE',
    badgeColor: colors.success,
    action: 'CloudDeploy' as const,
    highlight: true,
  },
  {
    id: 'local',
    emoji: '💻',
    title: 'Connect Local / Hub',
    subtitle: 'Scan QR to connect your PC, NAS or Agentrix Hub.',
    badge: 'PRIVATE',
    badgeColor: colors.primary,
    action: 'LocalDeploy' as const,
    highlight: false,
  },
  {
    id: 'existing',
    emoji: '⚙️',
    title: 'Advanced Setup',
    subtitle: 'I have my own OpenClaw instance or API Key.',
    badge: 'GEEK',
    badgeColor: colors.textMuted,
    action: 'ConnectExisting' as const,
    highlight: false,
  },
];

export function DeploySelectScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Set up your AI Agent</Text>
      <Text style={styles.subtitle}>
        ClawLink connects you to an OpenClaw instance—your personal AI agent server. Choose how to get started:
      </Text>

      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.card, opt.highlight && styles.cardHighlight]}
            activeOpacity={0.8}
            onPress={() => {
              if (opt.action) {
                navigation.navigate(opt.action);
              }
            }}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.cardEmoji}>{opt.emoji}</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.cardTitle, opt.highlight && styles.cardTitleHighlight]}>
                  {opt.title}
                </Text>
                {opt.badge && (
                  <View style={[styles.badge, { backgroundColor: opt.badgeColor + '22' }]}>
                    <Text style={[styles.badgeText, { color: opt.badgeColor! }]}>{opt.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardSubtitle}>{opt.subtitle}</Text>
            </View>
            <Text style={styles.cardArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.note}>
        💡 Cloud instances are hosted by Agentrix. Your data is private and only you can access your agent.
      </Text>

      <TouchableOpacity 
        style={styles.skipButton} 
        onPress={() => useAuthStore.getState().setOnboardingComplete()}
      >
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 24, paddingTop: 56, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 },
  subtitle: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: 32 },
  options: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  cardHighlight: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '11',
  },
  cardLeft: { width: 44, alignItems: 'center' },
  cardEmoji: { fontSize: 28 },
  cardBody: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  cardTitleHighlight: { color: colors.accent },
  cardSubtitle: { fontSize: 13, color: colors.textSecondary },
  cardArrow: { fontSize: 22, color: colors.textMuted },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  note: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  skipButton: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
