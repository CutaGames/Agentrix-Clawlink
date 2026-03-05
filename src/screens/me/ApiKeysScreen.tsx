import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { colors } from '../../theme/colors';

export function ApiKeysScreen() {
  const { customApiKeys, setCustomApiKey } = useSettingsStore();

  const [keys, setKeys] = useState({
    anthropic: customApiKeys.anthropic || '',
    openai: customApiKeys.openai || '',
    gemini: customApiKeys.gemini || '',
  });

  const handleSave = () => {
    setCustomApiKey('anthropic', keys.anthropic);
    setCustomApiKey('openai', keys.openai);
    setCustomApiKey('gemini', keys.gemini);
    Alert.alert('Success', 'API Keys saved successfully!');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Custom API Keys</Text>
      <Text style={styles.desc}>
        By default, we provide a generous free quota for most models. 
        If you want to use your own billing or run out of quota, you can configure your own API keys here.
        Your keys are strictly stored locally on your device and are only sent directly to the model providers.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Anthropic API Key</Text>
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
        <Text style={styles.label}>OpenAI API Key</Text>
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
        <Text style={styles.label}>Gemini API Key</Text>
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
        <Text style={styles.saveBtnText}>Save Keys</Text>
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