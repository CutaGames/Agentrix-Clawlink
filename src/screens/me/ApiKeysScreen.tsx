import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert,
  ScrollView, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { colors } from '../../theme/colors';
import { useI18n } from '../../stores/i18nStore';
import { apiFetch } from '../../services/api';

// ─── Types (mirrors backend catalog) ────────────────────────────

interface ModelDef {
  id: string;
  label: string;
  contextWindow: number;
  costTier: 'free' | 'low' | 'medium' | 'high';
  capabilities: string[];
}

interface ProviderDef {
  id: string;
  name: string;
  icon: string;
  region: 'international' | 'china';
  requiredFields: string[];
  optionalFields: string[];
  placeholder: Record<string, string>;
  baseUrl?: string;
  models: ModelDef[];
}

interface SavedConfig {
  id: string;
  providerId: string;
  selectedModel: string;
  baseUrl?: string;
  region?: string;
  isActive: boolean;
  lastTestedAt?: string;
  lastTestResult?: string;
  apiKeyPrefix?: string;
}

// ─── Per-provider form state ────────────────────────────────────

interface ProviderForm {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  region: string;
  selectedModel: string;
}

const COST_BADGE: Record<string, { label: string; color: string }> = {
  free: { label: 'Free', color: '#22c55e' },
  low: { label: '$', color: '#3b82f6' },
  medium: { label: '$$', color: '#f59e0b' },
  high: { label: '$$$', color: '#ef4444' },
};

// ─── Component ──────────────────────────────────────────────────

export function ApiKeysScreen() {
  const { t } = useI18n();

  const [catalog, setCatalog] = useState<ProviderDef[]>([]);
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, ProviderForm>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Model picker modal
  const [modelPickerProvider, setModelPickerProvider] = useState<ProviderDef | null>(null);

  // ─── Load catalog + user configs ──────

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [cat, configs] = await Promise.all([
        apiFetch<ProviderDef[]>('/ai-providers/catalog'),
        apiFetch<SavedConfig[]>('/ai-providers/configs'),
      ]);
      setCatalog(cat);
      setSavedConfigs(configs);

      // Pre-populate forms from saved configs
      const initForms: Record<string, ProviderForm> = {};
      for (const p of cat) {
        const saved = configs.find(c => c.providerId === p.id);
        initForms[p.id] = {
          apiKey: '',
          secretKey: '',
          baseUrl: saved?.baseUrl || p.baseUrl || '',
          region: saved?.region || '',
          selectedModel: saved?.selectedModel || p.models[0]?.id || '',
        };
      }
      setForms(initForms);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Helpers ──────

  const updateForm = (providerId: string, patch: Partial<ProviderForm>) => {
    setForms(prev => ({ ...prev, [providerId]: { ...prev[providerId], ...patch } }));
  };

  const getSaved = (providerId: string) => savedConfigs.find(c => c.providerId === providerId);

  // ─── Test connectivity ──────

  const handleTest = async (provider: ProviderDef) => {
    const form = forms[provider.id];
    if (!form?.apiKey && !getSaved(provider.id)) {
      Alert.alert(t({ en: 'Missing', zh: '缺少信息' }), t({ en: 'Please enter an API key first', zh: '请先输入 API Key' }));
      return;
    }
    setTesting(provider.id);
    try {
      const res = await apiFetch<{ ok: boolean; latencyMs?: number; error?: string }>('/ai-providers/test', {
        method: 'POST',
        body: JSON.stringify({
          providerId: provider.id,
          apiKey: form.apiKey || '__saved__',
          secretKey: form.secretKey || undefined,
          baseUrl: form.baseUrl || undefined,
          region: form.region || undefined,
          model: form.selectedModel,
        }),
      });
      if (res.ok) {
        Alert.alert('✅ ' + t({ en: 'Connected', zh: '连接成功' }),
          t({ en: `Latency: ${res.latencyMs}ms`, zh: `延迟: ${res.latencyMs}ms` }));
      } else {
        Alert.alert('❌ ' + t({ en: 'Failed', zh: '连接失败' }), res.error || 'Unknown error');
      }
    } catch (err: any) {
      Alert.alert('❌ Error', err.message);
    } finally {
      setTesting(null);
    }
  };

  // ─── Save config ──────

  const handleSave = async (provider: ProviderDef) => {
    const form = forms[provider.id];
    if (!form.apiKey && !getSaved(provider.id)) {
      Alert.alert(t({ en: 'Missing', zh: '缺少信息' }), t({ en: 'Please enter an API key', zh: '请先输入 API Key' }));
      return;
    }
    // Validate required fields
    for (const field of provider.requiredFields) {
      if (field === 'apiKey' && !form.apiKey && !getSaved(provider.id)) {
        Alert.alert(t({ en: 'Missing', zh: '缺少信息' }), `${field} is required`);
        return;
      }
      if (field === 'secretKey' && !form.secretKey && !getSaved(provider.id)) {
        Alert.alert(t({ en: 'Missing', zh: '缺少信息' }), `${field} is required`);
        return;
      }
      if (field === 'region' && !form.region) {
        Alert.alert(t({ en: 'Missing', zh: '缺少信息' }), `${field} is required`);
        return;
      }
    }
    setSaving(provider.id);
    try {
      await apiFetch('/ai-providers/configs', {
        method: 'POST',
        body: JSON.stringify({
          providerId: provider.id,
          apiKey: form.apiKey || '__saved__',
          secretKey: form.secretKey || undefined,
          baseUrl: form.baseUrl || undefined,
          region: form.region || undefined,
          selectedModel: form.selectedModel,
        }),
      });
      Alert.alert('✅', t({ en: 'Provider saved!', zh: '厂商配置已保存！' }));
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(null);
    }
  };

  // ─── Delete config ──────

  const handleDelete = (provider: ProviderDef) => {
    Alert.alert(
      t({ en: 'Remove Provider', zh: '移除厂商' }),
      t({ en: `Remove ${provider.name} configuration?`, zh: `确定移除 ${provider.name}？` }),
      [
        { text: t({ en: 'Cancel', zh: '取消'}), style: 'cancel' },
        {
          text: t({ en: 'Remove', zh: '移除'}), style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/ai-providers/configs/${provider.id}`, { method: 'DELETE' });
              await loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ],
    );
  };

  // ─── Model picker ──────

  const getModelLabel = (providerId: string) => {
    const p = catalog.find(c => c.id === providerId);
    const modelId = forms[providerId]?.selectedModel;
    const m = p?.models.find(mm => mm.id === modelId);
    return m?.label || modelId || '—';
  };

  // ─── Render provider card ──────

  const renderProvider = (provider: ProviderDef) => {
    const saved = getSaved(provider.id);
    const isExpanded = expandedId === provider.id;
    const form = forms[provider.id];

    return (
      <View key={provider.id} style={[styles.card, saved && styles.cardActive]}>
        {/* Header row */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpandedId(isExpanded ? null : provider.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.providerIcon}>{provider.icon}</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.providerName}>{provider.name}</Text>
            {saved && (
              <Text style={styles.keyHint}>
                {t({ en: 'Key: ', zh: '密钥: ' })}{saved.apiKeyPrefix || '••••'}
                {saved.lastTestResult === 'ok' ? '  ✅' : ''}
              </Text>
            )}
          </View>
          <Text style={styles.chevron}>{isExpanded ? '▾' : '▸'}</Text>
        </TouchableOpacity>

        {/* Expanded form */}
        {isExpanded && form && (
          <View style={styles.cardBody}>
            {/* API Key */}
            <Text style={styles.fieldLabel}>API Key *</Text>
            <TextInput
              style={styles.input}
              placeholder={saved ? `${saved.apiKeyPrefix || '••••'}  (leave blank to keep)` : provider.placeholder.apiKey || 'Enter API key'}
              placeholderTextColor={colors.textMuted}
              value={form.apiKey}
              onChangeText={v => updateForm(provider.id, { apiKey: v })}
              secureTextEntry
              autoCapitalize="none"
            />

            {/* Secret Key (Bedrock, Baidu) */}
            {provider.requiredFields.includes('secretKey') && (
              <>
                <Text style={styles.fieldLabel}>Secret Key *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={saved ? '(leave blank to keep)' : provider.placeholder.secretKey || 'Enter secret key'}
                  placeholderTextColor={colors.textMuted}
                  value={form.secretKey}
                  onChangeText={v => updateForm(provider.id, { secretKey: v })}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </>
            )}

            {/* Region (Bedrock) */}
            {provider.requiredFields.includes('region') && (
              <>
                <Text style={styles.fieldLabel}>Region *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={provider.placeholder.region || 'us-east-1'}
                  placeholderTextColor={colors.textMuted}
                  value={form.region}
                  onChangeText={v => updateForm(provider.id, { region: v })}
                  autoCapitalize="none"
                />
              </>
            )}

            {/* Base URL (optional override) */}
            {provider.optionalFields.includes('baseUrl') && (
              <>
                <Text style={styles.fieldLabel}>Base URL ({t({ en: 'optional', zh: '可选' })})</Text>
                <TextInput
                  style={styles.input}
                  placeholder={provider.baseUrl || 'https://...'}
                  placeholderTextColor={colors.textMuted}
                  value={form.baseUrl}
                  onChangeText={v => updateForm(provider.id, { baseUrl: v })}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </>
            )}

            {/* Model selector */}
            <Text style={styles.fieldLabel}>{t({ en: 'Model', zh: '模型' })}</Text>
            <TouchableOpacity
              style={styles.modelSelector}
              onPress={() => setModelPickerProvider(provider)}
            >
              <Text style={styles.modelSelectorText}>{getModelLabel(provider.id)}</Text>
              <Text style={styles.chevronSmall}>▸</Text>
            </TouchableOpacity>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnTest]}
                onPress={() => handleTest(provider)}
                disabled={testing === provider.id}
              >
                {testing === provider.id
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.btnText}>{t({ en: '🔌 Test', zh: '🔌 测试' })}</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnSave]}
                onPress={() => handleSave(provider)}
                disabled={saving === provider.id}
              >
                {saving === provider.id
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.btnText}>{t({ en: '💾 Save', zh: '💾 保存' })}</Text>}
              </TouchableOpacity>

              {saved && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnDelete]}
                  onPress={() => handleDelete(provider)}
                >
                  <Text style={styles.btnText}>{t({ en: '🗑 Remove', zh: '🗑 移除' })}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  // ─── Main render ──────

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const intlProviders = catalog.filter(p => p.region === 'international');
  const chinaProviders = catalog.filter(p => p.region === 'china');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t({ en: 'AI Provider Management', zh: 'AI 厂商管理' })}</Text>
        <Text style={styles.desc}>
          {t({
            en: 'Configure your own API keys for different AI providers. Keys are encrypted and stored securely on the server. Test connectivity before saving.',
            zh: '为不同 AI 厂商配置您自己的 API 密钥。密钥以加密方式安全存储在服务器端。保存前可先测试连通性。',
          })}
        </Text>

        {/* International providers */}
        <Text style={styles.sectionTitle}>{t({ en: '🌍 International', zh: '🌍 国际厂商' })}</Text>
        {intlProviders.map(renderProvider)}

        {/* China providers */}
        <Text style={styles.sectionTitle}>{t({ en: '🇨🇳 China', zh: '🇨🇳 国内厂商' })}</Text>
        {chinaProviders.map(renderProvider)}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Model picker modal */}
      <Modal visible={!!modelPickerProvider} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t({ en: 'Select Model', zh: '选择模型' })}
                {modelPickerProvider ? ` — ${modelPickerProvider.name}` : ''}
              </Text>
              <TouchableOpacity onPress={() => setModelPickerProvider(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={modelPickerProvider?.models || []}
              keyExtractor={m => m.id}
              renderItem={({ item: m }) => {
                const badge = COST_BADGE[m.costTier];
                const isSelected = forms[modelPickerProvider!.id]?.selectedModel === m.id;
                return (
                  <TouchableOpacity
                    style={[styles.modelRow, isSelected && styles.modelRowSelected]}
                    onPress={() => {
                      updateForm(modelPickerProvider!.id, { selectedModel: m.id });
                      setModelPickerProvider(null);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modelLabel, isSelected && { color: colors.primary }]}>
                        {m.label}
                      </Text>
                      <Text style={styles.modelCaps}>
                        {m.capabilities.join(' · ')}  •  {(m.contextWindow / 1000).toFixed(0)}K ctx
                      </Text>
                    </View>
                    <View style={[styles.costBadge, { backgroundColor: badge.color + '22' }]}>
                      <Text style={[styles.costBadgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                    {isSelected && <Text style={{ marginLeft: 8, color: colors.primary }}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  desc: { fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 19 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: 20, marginBottom: 10 },

  // Card
  card: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, marginBottom: 10, overflow: 'hidden',
  },
  cardActive: { borderColor: colors.primary, borderWidth: 1.5 },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
  },
  providerIcon: { fontSize: 24 },
  providerName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  keyHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 14, color: colors.textMuted },

  // Card body
  cardBody: { paddingHorizontal: 14, paddingBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: colors.bgPrimary,
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    color: colors.textPrimary, fontSize: 14,
  },

  // Model selector
  modelSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.bgPrimary,
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 11,
  },
  modelSelectorText: { fontSize: 14, color: colors.textPrimary },
  chevronSmall: { fontSize: 12, color: colors.textMuted },

  // Action row
  actionRow: { flexDirection: 'row', marginTop: 14, gap: 8 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnTest: { backgroundColor: '#6366f1' },
  btnSave: { backgroundColor: colors.primary },
  btnDelete: { backgroundColor: '#ef4444', flex: 0.6 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bgPrimary,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '65%', paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  modalClose: { fontSize: 18, color: colors.textMuted, padding: 4 },

  // Model row
  modelRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  modelRowSelected: { backgroundColor: colors.primary + '10' },
  modelLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  modelCaps: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  costBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  costBadgeText: { fontSize: 11, fontWeight: '700' },
});