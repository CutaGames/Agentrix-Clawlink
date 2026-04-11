import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { watchColors } from '../theme/watchColors';
import { watchLayout } from '../theme/watchLayout';

type SyncInterval = 30 | 60 | 300;

export function WatchSettingsScreen() {
  const [syncInterval, setSyncInterval] = useState<SyncInterval>(60);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [isLoggedIn] = useState(false); // MVP: placeholder

  const intervalOptions: { value: SyncInterval; label: string }[] = [
    { value: 30, label: '30绉? },
    { value: 60, label: '1鍒嗛挓' },
    { value: 300, label: '5鍒嗛挓' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>璁剧疆</Text>

      {/* Login Status */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>璐︽埛</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>鐘舵€?/Text>
          <Text style={[styles.rowValue, { color: isLoggedIn ? watchColors.success : watchColors.warning }]}>
            {isLoggedIn ? '宸茬櫥褰? : '鏈櫥褰?}
          </Text>
        </View>
        {!isLoggedIn && (
          <TouchableOpacity style={styles.loginBtn}>
            <Text style={styles.loginBtnText}>鎵爜鐧诲綍</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sync Interval */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>鍚屾闂撮殧</Text>
        <View style={styles.chips}>
          {intervalOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.chip,
                syncInterval === opt.value && styles.chipActive,
              ]}
              onPress={() => setSyncInterval(opt.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  syncInterval === opt.value && styles.chipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>閫氱煡</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.rowLabel}>鍛婅閫氱煡</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: watchColors.textMuted, true: watchColors.primary }}
            thumbColor={watchColors.text}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.rowLabel}>闇囧姩鍙嶉</Text>
          <Switch
            value={hapticEnabled}
            onValueChange={setHapticEnabled}
            trackColor={{ false: watchColors.textMuted, true: watchColors.primary }}
            thumbColor={watchColors.text}
          />
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>鍏充簬</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>鐗堟湰</Text>
          <Text style={styles.rowValue}>v0.1.0-watch</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>骞冲彴</Text>
          <Text style={styles.rowValue}>Wear OS</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: watchColors.bg,
  },
  content: {
    padding: watchLayout.safePadding,
    minHeight: watchLayout.screenHeight,
  },
  title: {
    color: watchColors.textSecondary,
    fontSize: watchLayout.fontCaption,
    textAlign: 'center',
    marginBottom: watchLayout.gapLg,
  },
  section: {
    marginBottom: watchLayout.gapLg,
  },
  sectionLabel: {
    color: watchColors.accent,
    fontSize: watchLayout.fontMicro,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: watchLayout.gap,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowLabel: {
    color: watchColors.text,
    fontSize: watchLayout.fontCaption,
  },
  rowValue: {
    color: watchColors.textSecondary,
    fontSize: watchLayout.fontCaption,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  loginBtn: {
    backgroundColor: watchColors.primary,
    borderRadius: watchLayout.radiusFull,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: watchLayout.gap,
  },
  loginBtnText: {
    color: watchColors.text,
    fontSize: watchLayout.fontCaption,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    flex: 1,
    backgroundColor: watchColors.surface,
    borderRadius: watchLayout.radiusFull,
    paddingVertical: 8,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: watchColors.primary,
  },
  chipText: {
    color: watchColors.textSecondary,
    fontSize: watchLayout.fontMicro,
  },
  chipTextActive: {
    color: watchColors.text,
    fontWeight: '600',
  },
});