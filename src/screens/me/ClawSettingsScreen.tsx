import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { UiComplexity } from '../../stores/settingsStore';
import { useI18n, type Language } from '../../stores/i18nStore';
import { resolveMobileWakeWordConfig } from '../../config/wakeWord';
import { clearVoiceDiagnostics, getVoiceDiagnosticsCount, getVoiceDiagnosticsText } from '../../services/voiceDiagnostics';

export function ClawSettingsScreen() {
  const navigation = useNavigation();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const uiComplexity = useSettingsStore((s) => s.uiComplexity);
  const setUiComplexity = useSettingsStore((s) => s.setUiComplexity);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const toggleNotifications = useSettingsStore((s) => s.toggleNotifications);
  const wakeWordConfig = useSettingsStore((s) => s.wakeWordConfig);
  const setWakeWordConfig = useSettingsStore((s) => s.setWakeWordConfig);
  const resetWakeWordConfig = useSettingsStore((s) => s.resetWakeWordConfig);
  const { language, setLanguage, t } = useI18n();
  const effectiveWakeWordConfig = resolveMobileWakeWordConfig(wakeWordConfig);
  const diagnosticsCount = getVoiceDiagnosticsCount();

  const uiModes: { id: UiComplexity; icon: string; label: string; desc: string }[] = [
    { id: 'beginner', icon: '🌱', label: t({ en: 'Beginner', zh: '入门' }), desc: t({ en: 'Chat, basic skills, simple setup', zh: '聊天、基础技能、简化设置' }) },
    { id: 'advanced', icon: '🔧', label: t({ en: 'Advanced', zh: '进阶' }), desc: t({ en: '+ Workflows, Memory Hub, API Keys, Teams', zh: '+ 工作流、记忆中心、API 密钥、团队功能' }) },
    { id: 'professional', icon: '⚡', label: t({ en: 'Professional', zh: '专业' }), desc: t({ en: '+ Permissions Matrix, Custom LLM, MCP Tools', zh: '+ 权限矩阵、自定义 LLM、MCP 工具' }) },
  ];

  const settingGroups = [
    {
      title: t({ en: 'Agent', zh: '智能体' }),
      items: [
        { id: 'notify', icon: '🔔', label: t({ en: 'Notifications', zh: '通知' }), value: notificationsEnabled ? t({ en: 'On', zh: '开启' }) : t({ en: 'Off', zh: '关闭' }) },
        { id: 'theme', icon: '🎨', label: t({ en: 'Theme', zh: '主题' }), value: t({ en: 'Dark', zh: '深色' }) },
      ],
    },
    {
      title: t({ en: 'Developer', zh: '开发者' }),
      items: [
        { id: 'api', icon: '🤖', label: t({ en: 'AI Providers & Subscriptions', zh: 'AI 厂商与订阅' }), value: '' },
        { id: 'logs', icon: '📋', label: t({ en: 'Debug Logs', zh: '调试日志' }), value: diagnosticsCount > 0 ? `${diagnosticsCount}` : '' },
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

      <View style={styles.group}>
        <Text style={styles.groupTitle}>{t({ en: 'Wake Word', zh: '唤醒词' })}</Text>
        <View style={styles.modeCard}>
          <Text style={styles.modeDesc}>
            {t({ en: 'Out of the box the app uses system speech recognition to listen for your wake phrase. If you add a Picovoice access key later, the runtime can switch to Picovoice offline detection.', zh: '默认开箱即用时，App 会使用系统语音识别监听唤醒短语；如果后续补充 Picovoice AccessKey，则可切换为 Picovoice 离线检测。' })}
          </Text>

          <TouchableOpacity
            style={[styles.toggleRow, wakeWordConfig.enabled && styles.toggleRowActive]}
            onPress={() => setWakeWordConfig({ enabled: !wakeWordConfig.enabled })}
          >
            <Text style={styles.toggleLabel}>{t({ en: 'Enable wake word', zh: '开启唤醒词' })}</Text>
            <Text style={[styles.toggleValue, wakeWordConfig.enabled && styles.toggleValueActive]}>
              {wakeWordConfig.enabled ? t({ en: 'On', zh: '已开启' }) : t({ en: 'Off', zh: '已关闭' })}
            </Text>
          </TouchableOpacity>

          <TextInput
            value={wakeWordConfig.accessKey}
            onChangeText={(text) => setWakeWordConfig({ accessKey: text })}
            placeholder={t({ en: 'Optional Picovoice access key', zh: '可选的 Picovoice AccessKey' })}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            style={styles.textInput}
          />

          <TextInput
            value={wakeWordConfig.displayName}
            onChangeText={(text) => setWakeWordConfig({ displayName: text })}
            placeholder={t({ en: 'Primary wake phrase, e.g. Hey Agentrix', zh: '主唤醒短语，例如 Hey Agentrix' })}
            placeholderTextColor={colors.textMuted}
            style={styles.textInput}
          />

          <TextInput
            value={wakeWordConfig.fallbackPhrases.join(', ')}
            onChangeText={(text) => setWakeWordConfig({ fallbackPhrases: text.split(',').map((item) => item.trim()).filter(Boolean) })}
            placeholder={t({ en: 'System wake phrases, comma separated', zh: '系统唤醒短语，逗号分隔' })}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            style={styles.textInput}
          />

          <TextInput
            value={wakeWordConfig.builtInKeywords.join(', ')}
            onChangeText={(text) => setWakeWordConfig({ builtInKeywords: text.split(',').map((item) => item.trim()).filter(Boolean) })}
            placeholder={t({ en: 'Picovoice built-in keywords, comma separated', zh: 'Picovoice 内置唤醒词，逗号分隔' })}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            style={styles.textInput}
          />

          <TextInput
            value={wakeWordConfig.customKeywordPaths.join(', ')}
            onChangeText={(text) => setWakeWordConfig({ customKeywordPaths: text.split(',').map((item) => item.trim()).filter(Boolean) })}
            placeholder={t({ en: 'Custom .ppn path(s), comma separated', zh: '自定义 .ppn 路径，可填多个' })}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            style={styles.textInput}
          />

          <TextInput
            value={String(wakeWordConfig.sensitivity)}
            onChangeText={(text) => {
              const parsed = Number(text);
              if (!Number.isNaN(parsed)) {
                setWakeWordConfig({ sensitivity: parsed });
              }
              if (!text.trim()) {
                setWakeWordConfig({ sensitivity: 0.65 });
              }
            }}
            placeholder="0.65"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.textInput}
          />

          <Text style={styles.modeCurrentDesc}>
            {t({ en: 'Current runtime:', zh: '当前运行配置：' })}{' '}
            {effectiveWakeWordConfig.enabled
              ? `${effectiveWakeWordConfig.displayName} · ${effectiveWakeWordConfig.accessKey ? (effectiveWakeWordConfig.customKeywordPaths.length > 0 ? t({ en: 'Picovoice custom model', zh: 'Picovoice 自定义模型' }) : effectiveWakeWordConfig.builtInKeywords.join(', ')) : effectiveWakeWordConfig.fallbackPhrases.join(', ')}`
              : t({ en: 'disabled', zh: '已关闭' })}
          </Text>
          <Text style={styles.modeCurrentDesc}>
            {effectiveWakeWordConfig.accessKey
              ? t({ en: 'Picovoice key detected. Empty fields still fall back to app.json or EXPO_PUBLIC_* env vars.', zh: '已检测到 Picovoice key。空字段仍会回退到 app.json 或 EXPO_PUBLIC_* 环境变量。' })
              : t({ en: 'No Picovoice key required. The packaged build will fall back to system wake-phrase listening after permissions are granted.', zh: '无需 Picovoice key。授予权限后，打包版本会自动回退到系统唤醒短语监听。' })}
          </Text>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              resetWakeWordConfig();
              Alert.alert(t({ en: 'Reset complete', zh: '已重置' }), t({ en: 'Wake-word settings now fall back to packaged defaults.', zh: '唤醒词设置已回退到打包默认值。' }));
            }}
          >
            <Text style={styles.secondaryBtnText}>{t({ en: 'Reset to packaged defaults', zh: '重置为打包默认值' })}</Text>
          </TouchableOpacity>
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
                  if (item.id === 'notify') {
                    toggleNotifications(!notificationsEnabled);
                    return;
                  }
                  if (item.id === 'api') {
                    navigation.navigate('ApiKeys' as never);
                    return;
                  }
                  if (item.id === 'logs') {
                    const diagnosticsText = getVoiceDiagnosticsText();
                    Alert.alert(
                      t({ en: 'Debug Logs', zh: '调试日志' }),
                      diagnosticsCount > 0
                        ? t({ en: `${diagnosticsCount} diagnostic entries are stored locally. You can share them or clear them here.`, zh: `当前本地已保存 ${diagnosticsCount} 条诊断日志。你可以直接分享或清空。` })
                        : t({ en: 'No diagnostic entries captured yet.', zh: '当前还没有采集到诊断日志。' }),
                      [
                        {
                          text: t({ en: 'Share', zh: '分享' }),
                          onPress: () => {
                            void Share.share({ message: diagnosticsText });
                          },
                        },
                        {
                          text: t({ en: 'Clear', zh: '清空' }),
                          style: 'destructive',
                          onPress: () => {
                            clearVoiceDiagnostics();
                            Alert.alert(t({ en: 'Cleared', zh: '已清空' }), t({ en: 'Diagnostic logs were cleared.', zh: '诊断日志已清空。' }));
                          },
                        },
                        { text: t({ en: 'Cancel', zh: '取消' }), style: 'cancel' },
                      ],
                    );
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
  textInput: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.textPrimary,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bgSecondary,
  },
  toggleRowActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '12',
  },
  toggleLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  toggleValue: { color: colors.textMuted, fontSize: 12 },
  toggleValueActive: { color: colors.accent },
  secondaryBtn: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  secondaryBtnText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
});
