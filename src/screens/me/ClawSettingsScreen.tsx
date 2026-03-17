import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { UiComplexity } from '../../stores/settingsStore';
import { useI18n, type Language } from '../../stores/i18nStore';

export function ClawSettingsScreen() {
  const navigation = useNavigation();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const uiComplexity = useSettingsStore((s) => s.uiComplexity);
  const setUiComplexity = useSettingsStore((s) => s.setUiComplexity);
  const { language, setLanguage, t } = useI18n();

  const uiModes: { id: UiComplexity; icon: string; label: string; desc: string }[] = [
    { id: 'beginner', icon: '🌱', label: t({ en: 'Beginner', zh: '入门' }), desc: t({ en: 'Chat, basic skills, simple setup', zh: '聊天、基础技能、简化设置' }) },
    { id: 'advanced', icon: '🔧', label: t({ en: 'Advanced', zh: '进阶' }), desc: t({ en: '+ Workflows, Memory Hub, API Keys, Teams', zh: '+ 工作流、记忆中心、API 密钥、团队功能' }) },
    { id: 'professional', icon: '⚡', label: t({ en: 'Professional', zh: '专业' }), desc: t({ en: '+ Permissions Matrix, Custom LLM, MCP Tools', zh: '+ 权限矩阵、自定义 LLM、MCP 工具' }) },
  ];

  const settingGroups = [
    {
      title: t({ en: 'Agent', zh: '智能体' }),
      items: [
        { id: 'notify', icon: '🔔', label: t({ en: 'Notifications', zh: '通知' }), value: t({ en: 'On', zh: '开启' }) },
        { id: 'theme', icon: '🎨', label: t({ en: 'Theme', zh: '主题' }), value: t({ en: 'Dark', zh: '深色' }) },
      ],
    },
    {
      title: t({ en: 'Developer', zh: '开发者' }),
      items: [
        { id: 'api', icon: '🤖', label: t({ en: 'AI Providers & Subscriptions', zh: 'AI 厂商与订阅' }), value: '' },
        { id: 'logs', icon: '📋', label: t({ en: 'Debug Logs', zh: '调试日志' }), value: '' },
      ],
    },
    {
      title: t({ en: 'About', zh: '关于' }),
      items: [
        { id: 'version', icon: 'ℹ️', label: t({ en: 'App Version', zh: '应用版本' }), value: '1.0.0' },
        { id: 'terms', icon: '📜', label: t({ en: 'Terms of Service', zh: '服务条款' }), value: '' },
        { id: 'privacy', icon: '🔒', label: t({ en: 'Privacy Policy', zh: '隐私政策' }), value: '' },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* UI Complexity Selector */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{t({ en: 'Interface Mode', zh: '界面模式' })}</Text>
        <View style={styles.modeCard}>
          <Text style={styles.modeDesc}>{t({ en: 'Choose how much of the app is visible', zh: '选择你想看到的功能复杂度' })}</Text>
          <View style={styles.modeRow}>
            {uiModes.map((mode) => (
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
          {uiModes.find((m) => m.id === uiComplexity) && (
            <Text style={styles.modeCurrentDesc}>
              {uiModes.find((m) => m.id === uiComplexity)!.icon} {' '}
              {uiModes.find((m) => m.id === uiComplexity)!.desc}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>{t({ en: 'Language', zh: '语言' })}</Text>
        <View style={styles.modeCard}>
          <Text style={styles.modeDesc}>{t({ en: 'Switch the entire app language here', zh: '在这里切换整个 App 的显示语言' })}</Text>
          <View style={styles.modeRow}>
            {([
              { code: 'en' as Language, icon: '🇺🇸', label: 'English' },
              { code: 'zh' as Language, icon: '🇨🇳', label: '中文' },
            ]).map((item) => (
              <TouchableOpacity
                key={item.code}
                style={[styles.modeBtn, language === item.code && styles.modeBtnActive]}
                onPress={() => setLanguage(item.code)}
              >
                <Text style={styles.modeIcon}>{item.icon}</Text>
                <Text style={[styles.modeLabel, language === item.code && styles.modeLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.modeCurrentDesc}>
            {language === 'zh'
              ? t({ en: 'Current language: Chinese', zh: '当前语言：中文' })
              : t({ en: 'Current language: English', zh: '当前语言：English' })}
          </Text>
        </View>
      </View>

      {settingGroups.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <View style={styles.groupItems}>
            {group.items.map((item, i) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.item, i < group.items.length - 1 && styles.itemBorder]}
                onPress={() => {
                  if (item.id === 'api') {
                    navigation.navigate('ApiKeys' as never);
                  }
                }}
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
        onPress={() => Alert.alert(t({ en: 'Sign Out', zh: '退出登录' }), t({ en: 'Are you sure?', zh: '确定要退出登录吗？' }), [
          { text: t({ en: 'Cancel', zh: '取消' }), style: 'cancel' },
          { text: t({ en: 'Sign Out', zh: '退出登录' }), style: 'destructive', onPress: clearAuth },
        ])}
      >
        <Text style={styles.dangerBtnText}>{t({ en: 'Sign Out', zh: '退出登录' })}</Text>
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
