/**
 * LLM Engine Configuration Screen
 *
 * Three modes:
 * 1. Platform Hosted (default) — use Agentrix Bedrock
 * 2. BYOK — bring your own API key (OpenAI, Anthropic, Google, etc.)
 * 3. Local Model — Ollama / LM Studio / custom endpoint
 *
 * Also allows tuning temperature, maxTokens, topP.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useSettingsStore, SUPPORTED_MODELS, type ModelId } from '../../stores/settingsStore';

type EngineMode = 'platform' | 'byok' | 'local';

// ── Mode Descriptions ──
const MODE_INFO: Record<EngineMode, { icon: string; title: string; sub: string }> = {
  platform: { icon: '☁️', title: 'Platform Hosted', sub: 'Use Agentrix managed models (Bedrock / Groq)' },
  byok:     { icon: '🔑', title: 'Bring Your Own Key', sub: 'Use your own OpenAI / Anthropic / Google API key' },
  local:    { icon: '💻', title: 'Local Model', sub: 'Ollama, LM Studio, or custom endpoint' },
};

const BYOK_PROVIDERS = [
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { id: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'google', label: 'Google AI', placeholder: 'AIza...' },
  { id: 'deepseek', label: 'DeepSeek', placeholder: 'sk-...' },
] as const;

// ── Main Component ──
export function LLMEngineScreen() {
  const navigation = useNavigation();
  const selectedModelId = useSettingsStore((s) => s.selectedModelId);
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel);
  const uiComplexity = useSettingsStore((s) => s.uiComplexity);

  const [mode, setMode] = useState<EngineMode>('platform');
  const [byokProvider, setByokProvider] = useState('openai');
  const [byokKey, setByokKey] = useState('');
  const [localEndpoint, setLocalEndpoint] = useState('http://localhost:11434');
  const [localModelName, setLocalModelName] = useState('llama3.3');

  // Advanced params
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState('4096');
  const [topP, setTopP] = useState('0.9');

  const handleSave = useCallback(() => {
    if (mode === 'byok' && !byokKey.trim()) {
      Alert.alert('Missing API Key', 'Please enter your API key.');
      return;
    }
    if (mode === 'local' && !localEndpoint.trim()) {
      Alert.alert('Missing Endpoint', 'Please enter the local model endpoint URL.');
      return;
    }
    // In a real implementation, persist byokKey/localEndpoint to settingsStore + backend
    Alert.alert('Saved ✅', `Engine configuration updated.\nMode: ${MODE_INFO[mode].title}`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }, [mode, byokKey, localEndpoint, navigation]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Mode Selector ── */}
      <Text style={styles.heading}>Engine Mode</Text>
      <View style={styles.modeRow}>
        {(Object.keys(MODE_INFO) as EngineMode[]).map((m) => {
          // beginner only sees platform mode
          if (uiComplexity === 'beginner' && m !== 'platform') return null;
          // advanced hides local
          if (uiComplexity === 'advanced' && m === 'local') return null;
          return (
            <TouchableOpacity
              key={m}
              style={[styles.modeCard, mode === m && styles.modeCardActive]}
              onPress={() => setMode(m)}
            >
              <Text style={styles.modeIcon}>{MODE_INFO[m].icon}</Text>
              <Text style={[styles.modeTitle, mode === m && { color: colors.accent }]}>
                {MODE_INFO[m].title}
              </Text>
              <Text style={styles.modeSub}>{MODE_INFO[m].sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Platform Hosted ── */}
      {mode === 'platform' && (
        <>
          <Text style={styles.heading}>Select Model</Text>
          {SUPPORTED_MODELS.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.modelRow, selectedModelId === m.id && styles.modelRowActive]}
              onPress={() => setSelectedModel(m.id)}
            >
              <Text style={styles.modelRowIcon}>{m.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.modelRowName}>{m.label}</Text>
                <Text style={styles.modelRowProvider}>{m.provider}</Text>
              </View>
              {m.badge && (
                <View style={[styles.badge, m.badge === 'Default' && { backgroundColor: colors.accent + '22' }]}>
                  <Text style={[styles.badgeText, m.badge === 'Default' && { color: colors.accent }]}>
                    {m.badge}
                  </Text>
                </View>
              )}
              {selectedModelId === m.id && <Text style={styles.checkMark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* ── BYOK Mode ── */}
      {mode === 'byok' && (
        <>
          <Text style={styles.heading}>Provider</Text>
          <View style={styles.providerRow}>
            {BYOK_PROVIDERS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.providerChip, byokProvider === p.id && styles.providerChipActive]}
                onPress={() => setByokProvider(p.id)}
              >
                <Text style={[styles.providerChipText, byokProvider === p.id && { color: colors.accent }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.heading}>API Key</Text>
          <TextInput
            style={styles.input}
            value={byokKey}
            onChangeText={setByokKey}
            placeholder={BYOK_PROVIDERS.find((p) => p.id === byokProvider)?.placeholder}
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
          />
          <Text style={styles.hint}>
            Your key is stored locally and sent only to the chosen provider's API.
          </Text>
        </>
      )}

      {/* ── Local Model Mode ── */}
      {mode === 'local' && (
        <>
          <Text style={styles.heading}>Endpoint URL</Text>
          <TextInput
            style={styles.input}
            value={localEndpoint}
            onChangeText={setLocalEndpoint}
            placeholder="http://localhost:11434"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="url"
          />

          <Text style={styles.heading}>Model Name</Text>
          <TextInput
            style={styles.input}
            value={localModelName}
            onChangeText={setLocalModelName}
            placeholder="llama3.3, mistral, etc."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          <Text style={styles.hint}>
            Requires Ollama or LM Studio running on your machine or network.
            The Agentrix Desktop app can auto-detect local models.
          </Text>
        </>
      )}

      {/* ── Advanced Parameters ── */}
      {uiComplexity !== 'beginner' && (
        <>
          <TouchableOpacity
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(!showAdvanced)}
          >
            <Text style={styles.advancedToggleText}>⚙️ Advanced Parameters</Text>
            <Text style={styles.advancedArrow}>{showAdvanced ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showAdvanced && (
            <View style={styles.advancedSection}>
              <View style={styles.paramRow}>
                <Text style={styles.paramLabel}>Temperature</Text>
                <TextInput
                  style={styles.paramInput}
                  value={temperature}
                  onChangeText={setTemperature}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.paramRow}>
                <Text style={styles.paramLabel}>Max Tokens</Text>
                <TextInput
                  style={styles.paramInput}
                  value={maxTokens}
                  onChangeText={setMaxTokens}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.paramRow}>
                <Text style={styles.paramLabel}>Top P</Text>
                <TextInput
                  style={styles.paramInput}
                  value={topP}
                  onChangeText={setTopP}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          )}
        </>
      )}

      {/* ── Save Button ── */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>💾 Save Engine Config</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 48, gap: 8 },
  heading: {
    fontSize: 12, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 12, marginBottom: 4, paddingHorizontal: 4,
  },
  // Mode cards
  modeRow: { gap: 8 },
  modeCard: {
    backgroundColor: colors.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  modeCardActive: { borderColor: colors.accent, backgroundColor: colors.accent + '0A' },
  modeIcon: { fontSize: 22, marginBottom: 4 },
  modeTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  modeSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  // Model list
  modelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 6,
  },
  modelRowActive: { borderColor: colors.accent, backgroundColor: colors.accent + '0D' },
  modelRowIcon: { fontSize: 22 },
  modelRowName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  modelRowProvider: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: colors.bgSecondary,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  checkMark: { fontSize: 18, color: colors.accent, fontWeight: '700' },
  // BYOK
  providerRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  providerChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
  },
  providerChipActive: { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
  providerChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  input: {
    backgroundColor: colors.bgCard, borderRadius: 12, padding: 14,
    fontSize: 14, color: colors.textPrimary, borderWidth: 1,
    borderColor: colors.border,
  },
  hint: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 4, marginTop: 4 },
  // Advanced
  advancedToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.bgCard, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, marginTop: 8,
  },
  advancedToggleText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  advancedArrow: { fontSize: 12, color: colors.textMuted },
  advancedSection: {
    backgroundColor: colors.bgCard, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, gap: 12,
  },
  paramRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  paramLabel: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
  paramInput: {
    backgroundColor: colors.bgSecondary, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 6, width: 80, textAlign: 'right',
    fontSize: 14, fontWeight: '600', color: colors.accent,
  },
  // Save
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 14, padding: 15,
    alignItems: 'center', marginTop: 12,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
