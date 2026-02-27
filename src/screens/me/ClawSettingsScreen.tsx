import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { UiComplexity } from '../../stores/settingsStore';

const UI_MODES: { id: UiComplexity; icon: string; label: string; desc: string }[] = [
  { id: 'beginner', icon: '🌱', label: 'Beginner', desc: 'Chat, basic skills, simple setup' },
  { id: 'advanced', icon: '🔧', label: 'Advanced', desc: '+ Workflows, Memory Hub, API Keys, Teams' },
  { id: 'professional', icon: '⚡', label: 'Professional', desc: '+ Permissions Matrix, Custom LLM, MCP Tools' },
];

const SETTING_GROUPS = [
  {
    title: 'Agent',
    items: [
      { id: 'lang', icon: '🌐', label: 'Language', value: 'English' },
      { id: 'notify', icon: '🔔', label: 'Notifications', value: 'On' },
      { id: 'theme', icon: '🎨', label: 'Theme', value: 'Dark' },
    ],
  },
  {
    title: 'Developer',
    items: [
      { id: 'api', icon: '🔑', label: 'API Keys', value: '' },
      { id: 'logs', icon: '📋', label: 'Debug Logs', value: '' },
    ],
  },
  {
    title: 'About',
    items: [
      { id: 'version', icon: 'ℹ️', label: 'App Version', value: '1.0.0' },
      { id: 'terms', icon: '📜', label: 'Terms of Service', value: '' },
      { id: 'privacy', icon: '🔒', label: 'Privacy Policy', value: '' },
    ],
  },
];

export function ClawSettingsScreen() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const uiComplexity = useSettingsStore((s) => s.uiComplexity);
  const setUiComplexity = useSettingsStore((s) => s.setUiComplexity);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* UI Complexity Selector */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Interface Mode</Text>
        <View style={styles.modeCard}>
          <Text style={styles.modeDesc}>Choose how much of the app is visible</Text>
          <View style={styles.modeRow}>
            {UI_MODES.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[styles.modeBtn, uiComplexity === mode.id && styles.modeBtnActive]}
                onPress={() => setUiComplexity(mode.id)}
              >
                <Text style={styles.modeIcon}>{mode.icon}</Text>
                <Text style={[styles.modeLabel, uiComplexity === mode.id && styles.modeLabelActive]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {UI_MODES.find((m) => m.id === uiComplexity) && (
            <Text style={styles.modeCurrentDesc}>
              {UI_MODES.find((m) => m.id === uiComplexity)!.icon} {' '}
              {UI_MODES.find((m) => m.id === uiComplexity)!.desc}
            </Text>
          )}
        </View>
      </View>

      {SETTING_GROUPS.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <View style={styles.groupItems}>
            {group.items.map((item, i) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.item, i < group.items.length - 1 && styles.itemBorder]}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <Text style={styles.itemLabel}>{item.label}</Text>
                {item.value ? <Text style={styles.itemValue}>{item.value}</Text> : null}
                <Text style={styles.itemArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={styles.dangerBtn}
        onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: clearAuth },
        ])}
      >
        <Text style={styles.dangerBtnText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  group: { gap: 8 },
  groupTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, paddingLeft: 4 },
  groupItems: { backgroundColor: colors.bgCard, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  itemIcon: { fontSize: 18, width: 26 },
  itemLabel: { flex: 1, fontSize: 15, color: colors.textPrimary },
  itemValue: { fontSize: 13, color: colors.textMuted },
  itemArrow: { fontSize: 20, color: colors.textMuted },
  dangerBtn: { alignItems: 'center', padding: 14, backgroundColor: colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: colors.error + '55' },
  dangerBtnText: { color: colors.error, fontWeight: '700', fontSize: 15 },
  // ── UI Mode ──
  modeCard: {
    backgroundColor: colors.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border, gap: 10,
  },
  modeDesc: { fontSize: 13, color: colors.textMuted },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, gap: 4,
  },
  modeBtnActive: { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
  modeIcon: { fontSize: 22 },
  modeLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  modeLabelActive: { color: colors.accent },
  modeCurrentDesc: { fontSize: 12, color: colors.textSecondary, paddingTop: 2 },
});
