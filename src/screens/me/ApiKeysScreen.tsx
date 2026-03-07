import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { colors } from '../../theme/colors';
import { useI18n } from '../../stores/i18nStore';

export function ApiKeysScreen() {
  const { customApiKeys, setCustomApiKey } = useSettingsStore();
  const { t } = useI18n();

  const [keys, setKeys] = useState({
    anthropic: customApiKeys.anthropic || '',
    openai: customApiKeys.openai || '',
    gemini: customApiKeys.gemini || '',
  });

  const handleSave = () => {
    setCustomApiKey('anthropic', keys.anthropic);
    setCustomApiKey('openai', keys.openai);
    setCustomApiKey('gemini', keys.gemini);
    Alert.alert(t({ en: 'Success', zh: '保存成功' }), t({ en: 'API keys saved successfully!', zh: 'API 密钥已保存成功！' }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t({ en: 'Custom API Keys', zh: '自定义 API 密钥' })}</Text>
      <Text style={styles.desc}>
        {t({
          en: 'By default, Agentrix provides a generous free quota for most models. If you want to use your own billing or you run out of quota, you can configure your own API keys here. Your keys stay on your device and are sent directly to the model providers only when needed.',
          zh: '默认情况下，Agentrix 会为大多数模型提供较充足的免费额度。如果你想使用自己的计费账户，或者免费额度用完了，可以在这里配置自己的 API 密钥。密钥只会保存在你的设备上，并在需要时直接发送给模型提供方。',
        })}
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t({ en: 'Anthropic API Key', zh: 'Anthropic API 密钥' })}</Text>
        <TextInput
          style={styles.input}
          placeholder="sk-ant-..."
          placeholderTextColor={colors.textMuted}
          value={keys.anthropic}
          onChangeText={(v) => setKeys(prev => ({ ...prev, anthropic: v }))}
          secureTextEntry
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t({ en: 'OpenAI API Key', zh: 'OpenAI API 密钥' })}</Text>
        <TextInput
          style={styles.input}
          placeholder="sk-proj-..."
          placeholderTextColor={colors.textMuted}
          value={keys.openai}
          onChangeText={(v) => setKeys(prev => ({ ...prev, openai: v }))}
          secureTextEntry
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t({ en: 'Gemini API Key', zh: 'Gemini API 密钥' })}</Text>
        <TextInput
          style={styles.input}
          placeholder="AIzaSy..."
          placeholderTextColor={colors.textMuted}
          value={keys.gemini}
          onChangeText={(v) => setKeys(prev => ({ ...prev, gemini: v }))}
          secureTextEntry
        />
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>{t({ en: 'Save Keys', zh: '保存密钥' })}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  desc: { fontSize: 14, color: colors.textSecondary, marginBottom: 30, lineHeight: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  input: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});