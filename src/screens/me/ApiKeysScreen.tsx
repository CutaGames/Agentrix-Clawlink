import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert,
  ScrollView, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { colors } from '../../theme/colors';
import { useI18n } from '../../stores/i18nStore';
import { apiFetch } from '../../services/api';

// 鈹€鈹€鈹€ Types (mirrors backend catalog) 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

interface ModelDef {
  id: string;
  label: string;
  contextWindow: number;
  costTier: 'free' | 'low' | 'medium' | 'high';
  capabilities: string[];
  multimodal: boolean;
  inputPrice?: string;
  outputPrice?: string;
  positioning?: string;
  freeApi?: boolean;
  freeNote?: string;
  premiumMultiplier?: number;
}

interface ProviderDef {
  id: string;
  name: string;
  icon: string;
  region: 'international' | 'china';
  currency: string;
  billingType?: 'subscription' | 'api-key';
  requiredFields: string[];
  optionalFields: string[];
  placeholder: Record<string, string>;
  credentialLabel?: string;
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
  isDefault: boolean;
  lastTestedAt?: string;
  lastTestResult?: string;
  apiKeyPrefix?: string;
}

// 鈹€鈹€鈹€ Per-provider form state 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

interface ProviderForm {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  region: string;
  selectedModel: string;
}

const COST_BADGE: Record<string, { label: string; color: string }> = {
  free: { label: '馃啌 Free', color: '#22c55e' },
  low: { label: '$', color: '#3b82f6' },
  medium: { label: '$$', color: '#f59e0b' },
  high: { label: '$$$', color: '#ef4444' },
};

const formatCtx = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`;
  return `${(n / 1000).toFixed(0)}K`;
};

// 鈹€鈹€鈹€ Component 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

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

  // 鈹€鈹€鈹€ Load catalog + user configs 鈹€鈹€鈹€鈹€鈹€鈹€

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

  // 鈹€鈹€鈹€ Helpers 鈹€鈹€鈹€鈹€鈹€鈹€

  const updateForm = (providerId: string, patch: Partial<ProviderForm>) => {
    setForms(prev => ({ ...prev, [providerId]: { ...prev[providerId], ...patch } }));
  };

  const getSaved = (providerId: string) => savedConfigs.find(c => c.providerId === providerId);
  const configuredCount = savedConfigs.length;
  const defaultConfig = savedConfigs.find(c => c.isDefault);
  const defaultProvider = defaultConfig ? catalog.find(p => p.id === defaultConfig.providerId) : null;

  // 鈹€鈹€鈹€ Set default provider 鈹€鈹€鈹€鈹€鈹€鈹€

  const handleSetDefault = async (providerId: string) => {
    try {
      await apiFetch('/ai-providers/default', {
        method: 'POST',
        body: JSON.stringify({ providerId }),
      });
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // 鈹€鈹€鈹€ Test connectivity 鈹€鈹€鈹€鈹€鈹€鈹€

  const handleTest = async (provider: ProviderDef) => {
    const form = forms[provider.id];
    const credentialLabel = provider.credentialLabel || 'API Key';
    if (!form?.apiKey && !getSaved(provider.id)) {
      Alert.alert(t({ en: 'Missing', zh: '缂哄皯淇℃伅' }), t({ en: `Please enter a ${credentialLabel} first`, zh: `璇峰厛杈撳叆${credentialLabel}` }));
      return;
    }
    setTesting(provider.id);
    try {
      const res = await apiFetch<{ success: boolean; latencyMs?: number; error?: string }>('/ai-providers/test', {
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
      if (res.success) {
        Alert.alert('鉁?' + t({ en: 'Connected', zh: '杩炴帴鎴愬姛' }),
          t({ en: `Latency: ${res.latencyMs}ms`, zh: `寤惰繜: ${res.latencyMs}ms` }));
      } else {
        Alert.alert('鉂?' + t({ en: 'Failed', zh: '杩炴帴澶辫触' }), res.error || 'Unknown error');
      }
    } catch (err: any) {
      Alert.alert('鉂?Error', err.message);
    } finally {
      setTesting(null);
    }
  };

  // 鈹€鈹€鈹€ Save config 鈹€鈹€鈹€鈹€鈹€鈹€

  const handleSave = async (provider: ProviderDef) => {
    const form = forms[provider.id];
    const credentialLabel = provider.credentialLabel || 'API Key';
    if (!form.apiKey && !getSaved(provider.id)) {
      Alert.alert(t({ en: 'Missing', zh: '缂哄皯淇℃伅' }), t({ en: `Please enter a ${credentialLabel}`, zh: `璇峰厛杈撳叆${credentialLabel}` }));
      return;
    }
    for (const field of provider.requiredFields) {
      if (field === 'apiKey' && !form.apiKey && !getSaved(provider.id)) {
        Alert.alert(t({ en: 'Missing', zh: '缂哄皯淇℃伅' }), `${field} is required`);
        return;
      }
      if (field === 'secretKey' && !form.secretKey && !getSaved(provider.id)) {
        Alert.alert(t({ en: 'Missing', zh: '缂哄皯淇℃伅' }), `${field} is required`);
        return;
      }
      if (field === 'region' && !form.region) {
        Alert.alert(t({ en: 'Missing', zh: '缂哄皯淇℃伅' }), `${field} is required`);
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
      Alert.alert('鉁?, t({ en: 'Provider saved!', zh: '鍘傚晢閰嶇疆宸蹭繚瀛橈紒' }));
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(null);
    }
  };

  // 鈹€鈹€鈹€ Delete config 鈹€鈹€鈹€鈹€鈹€鈹€

  const handleDelete = (provider: ProviderDef) => {
    Alert.alert(
      t({ en: 'Remove Provider', zh: '绉婚櫎鍘傚晢' }),
      t({ en: `Remove ${provider.name} configuration?`, zh: `纭畾绉婚櫎 ${provider.name}锛焋 }),
      [
        { text: t({ en: 'Cancel', zh: '鍙栨秷' }), style: 'cancel' },
        {
          text: t({ en: 'Remove', zh: '绉婚櫎' }), style: 'destructive',
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

  // 鈹€鈹€鈹€ Model picker 鈹€鈹€鈹€鈹€鈹€鈹€

  const getModelLabel = (providerId: string) => {
    const p = catalog.find(c => c.id === providerId);
    const modelId = forms[providerId]?.selectedModel;
    const m = p?.models.find(mm => mm.id === modelId);
    return m?.label || modelId || '鈥?;
  };

  // 鈹€鈹€鈹€ Render provider card 鈹€鈹€鈹€鈹€鈹€鈹€

  const renderProvider = (provider: ProviderDef) => {
    const saved = getSaved(provider.id);
    const isExpanded = expandedId === provider.id;
    const form = forms[provider.id];
    const isDefault = saved?.isDefault === true;
    const selectedModel = provider.models.find(m => m.id === form?.selectedModel);

    return (
      <View key={provider.id} style={[styles.card, saved && styles.cardActive, isDefault && styles.cardDefault]}>
        {/* Header row */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpandedId(isExpanded ? null : provider.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.providerIcon}>{provider.icon}</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.providerName}>{provider.name}</Text>
              {isDefault && <Text style={styles.defaultBadge}>猸?{t({ en: 'Default', zh: '榛樿' })}</Text>}
            </View>
            {saved && (
              <Text style={styles.keyHint}>
                {t({ en: 'Key: ', zh: '瀵嗛挜: ' })}{saved.apiKeyPrefix || '鈥⑩€⑩€⑩€?}
                {saved.lastTestResult === 'success' ? '  鉁? : ''}
                {selectedModel ? `  路  ${selectedModel.label}` : ''}
              </Text>
            )}
            {!saved && provider.models.some(m => m.freeApi) && (
              <Text style={styles.freeBadge}>
                馃啌 {t({ en: 'Free API available', zh: '鏈夊厤璐笰PI' })}
              </Text>
            )}
          </View>
          <Text style={styles.chevron}>{isExpanded ? '鈻? : '鈻?}</Text>
        </TouchableOpacity>

        {/* Expanded form */}
        {isExpanded && form && (
          <View style={styles.cardBody}>
            {/* API Key */}
            <Text style={styles.fieldLabel}>{provider.credentialLabel || 'API Key'} *</Text>
            <TextInput
              style={styles.input}
              placeholder={saved ? `${saved.apiKeyPrefix || '鈥⑩€⑩€⑩€?}  (leave blank to keep)` : provider.placeholder.apiKey || 'Enter API key'}
              placeholderTextColor={colors.textMuted}
              value={form.apiKey}
              onChangeText={v => updateForm(provider.id, { apiKey: v })}
              secureTextEntry
              autoCapitalize="none"
            />

            {(provider.id === 'bedrock' || provider.id === 'bedrock-cn') && (
              <Text style={styles.fieldHint}>
                {t({
                  en: 'Use AWS IAM Access Key ID + Secret Access Key + Region. Do not paste a Bedrock API Key or Bearer token here.',
                  zh: '杩欓噷蹇呴』濉啓 AWS IAM Access Key ID銆丼ecret Access Key 鍜?Region锛屼笉瑕佸～鍐?Bedrock API Key 鎴?Bearer token銆?,
                })}
              </Text>
            )}

            {provider.id === 'copilot-subscription' && (
              <View style={styles.tokenGuide}>
                <Text style={styles.tokenGuideTitle}>
                  {t({ en: '馃攽 How to get your Copilot Token', zh: '馃攽 濡備綍鑾峰彇 Copilot Token' })}
                </Text>
                <Text style={styles.tokenGuideStep}>
                  {t({
                    en: '鈶?Open VS Code 鈫?Press Ctrl+Shift+P 鈫?Type "GitHub Copilot: Sign In" 鈫?Complete GitHub login in the browser',
                    zh: '鈶?鎵撳紑 VS Code 鈫?鎸?Ctrl+Shift+P 鈫?杈撳叆 "GitHub Copilot: Sign In" 鈫?鍦ㄦ祻瑙堝櫒涓畬鎴?GitHub 鐧诲綍',
                  })}
                </Text>
                <Text style={styles.tokenGuideStep}>
                  {t({
                    en: '鈶?After login, press Ctrl+Shift+P 鈫?"Developer: Open Runtime Status" 鈫?Find "GitHub Copilot" section 鈫?Copy the token value',
                    zh: '鈶?鐧诲綍鎴愬姛鍚庯紝鎸?Ctrl+Shift+P 鈫?鎼滅储 "Developer: Open Runtime Status" 鈫?鎵惧埌 "GitHub Copilot" 閮ㄥ垎 鈫?澶嶅埗 token 鍊?,
                  })}
                </Text>
                <Text style={styles.tokenGuideStep}>
                  {t({
                    en: '鈶?Alternative: Use an OpenClaw-compatible relay service. Enter your relay URL in the Base URL field below, and use the relay\'s access token.',
                    zh: '鈶?鎴栬€咃細浣跨敤 OpenClaw 鍏煎鐨勪腑缁ф湇鍔°€傚湪涓嬫柟 Base URL 涓～鍏ヤ腑缁у湴鍧€锛孴oken 濉啓涓户鏈嶅姟鐨?access token銆?,
                  })}
                </Text>
                <Text style={[styles.tokenGuideStep, { color: colors.textMuted, marginTop: 4 }]}>
                  {t({
                    en: '馃挕 Copilot Pro/Business/Enterprise subscribers get free access to 20+ models including GPT-5, Claude 4.6, Gemini 3.',
                    zh: '馃挕 Copilot Pro/Business/Enterprise 璁㈤槄鐢ㄦ埛鍙厤璐逛娇鐢?20+ 妯″瀷锛屽寘鎷?GPT-5銆丆laude 4.6銆丟emini 3銆?,
                  })}
                </Text>
              </View>
            )}

            {provider.id === 'chatgpt-subscription' && (
              <View style={styles.tokenGuide}>
                <Text style={styles.tokenGuideTitle}>
                  {t({ en: '馃攽 How to get your ChatGPT Token', zh: '馃攽 濡備綍鑾峰彇 ChatGPT Token' })}
                </Text>
                <Text style={styles.tokenGuideStep}>
                  {t({
                    en: '鈶?Log in to chat.openai.com in your browser',
                    zh: '鈶?鍦ㄦ祻瑙堝櫒涓櫥褰?chat.openai.com',
                  })}
                </Text>
                <Text style={styles.tokenGuideStep}>
                  {t({
                    en: '鈶?Press F12 鈫?Application tab 鈫?Cookies 鈫?Find "__Secure-next-auth.session-token" 鈫?Copy the value',
                    zh: '鈶?鎸?F12 鈫?Application 鏍囩 鈫?Cookies 鈫?鎵惧埌 "__Secure-next-auth.session-token" 鈫?澶嶅埗鍊?,
                  })}
                </Text>
                <Text style={styles.tokenGuideStep}>
                  {t({
                    en: '鈶?Alternative: Use an OpenAI-compatible relay. Enter your relay URL in Base URL and use the relay\'s access token.',
                    zh: '鈶?鎴栬€咃細浣跨敤 OpenAI 鍏煎鐨勪腑缁с€傚湪 Base URL 涓～鍏ヤ腑缁у湴鍧€锛宼oken 濉啓涓户鐨?access token銆?,
                  })}
                </Text>
                <Text style={[styles.tokenGuideStep, { color: colors.textMuted, marginTop: 4 }]}>
                  {t({
                    en: '馃挕 ChatGPT Plus/Pro subscribers get access to GPT-4o, GPT-5, o3 and more.',
                    zh: '馃挕 ChatGPT Plus/Pro 璁㈤槄鐢ㄦ埛鍙娇鐢?GPT-4o銆丟PT-5銆乷3 绛夋ā鍨嬨€?,
                  })}
                </Text>
              </View>
            )}

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
                <Text style={styles.fieldLabel}>Base URL ({t({ en: 'optional', zh: '鍙€? })})</Text>
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
            <Text style={styles.fieldLabel}>{t({ en: 'Model', zh: '妯″瀷' })}</Text>
            <TouchableOpacity
              style={styles.modelSelector}
              onPress={() => setModelPickerProvider(provider)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.modelSelectorText}>{getModelLabel(provider.id)}</Text>
                {selectedModel?.positioning && (
                  <Text style={styles.modelSelectorSub}>{selectedModel.positioning}</Text>
                )}
              </View>
              <Text style={styles.chevronSmall}>鈻?/Text>
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
                  : <Text style={styles.btnText}>{t({ en: '馃攲 Test', zh: '馃攲 娴嬭瘯' })}</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnSave]}
                onPress={() => handleSave(provider)}
                disabled={saving === provider.id}
              >
                {saving === provider.id
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.btnText}>{t({ en: '馃捑 Save', zh: '馃捑 淇濆瓨' })}</Text>}
              </TouchableOpacity>

              {saved && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnDelete]}
                  onPress={() => handleDelete(provider)}
                >
                  <Text style={styles.btnText}>{t({ en: '馃棏', zh: '馃棏' })}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Set as default / Default indicator */}
            {saved && !isDefault && (
              <TouchableOpacity
                style={styles.setDefaultBtn}
                onPress={() => handleSetDefault(provider.id)}
              >
                <Text style={styles.setDefaultText}>
                  猸?{t({ en: 'Set as Default for All Agents', zh: '璁句负鎵€鏈?Agent 鐨勯粯璁? })}
                </Text>
              </TouchableOpacity>
            )}
            {isDefault && (
              <View style={styles.defaultIndicator}>
                <Text style={styles.defaultIndicatorText}>
                  猸?{t({ en: 'Default provider 鈥?used by all agents unless overridden per-agent', zh: '榛樿鍘傚晢 鈥?鎵€鏈?Agent 浣跨敤姝PI锛岄櫎闈炲崟鐙厤缃? })}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // 鈹€鈹€鈹€ Main render 鈹€鈹€鈹€鈹€鈹€鈹€

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const subProviders = catalog.filter(p => p.billingType === 'subscription');
  const apiIntlProviders = catalog.filter(p => p.billingType !== 'subscription' && p.region === 'international');
  const apiChinaProviders = catalog.filter(p => p.billingType !== 'subscription' && p.region === 'china');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t({ en: 'AI Provider Management', zh: 'AI 鍘傚晢绠＄悊' })}</Text>
        <Text style={styles.desc}>
          {t({
            en: 'Configure API providers and subscription relays here. The default provider applies to all agents; override per-agent in Agent Permissions.',
            zh: '鍦ㄨ繖閲岀粺涓€閰嶇疆 AI 鍘傚晢涓庤闃呬腑缁с€傞粯璁ゅ巶鍟嗛€傜敤浜庢墍鏈?Agent锛涘彲鍦?Agent 鏉冮檺涓负涓嶅悓 Agent 鍗曠嫭瑕嗙洊銆?,
          })}
        </Text>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLine}>
            馃搳 {t({ en: `${configuredCount} provider(s) configured`, zh: `宸查厤缃?${configuredCount} 涓巶鍟哷 })}
          </Text>
          <Text style={[styles.summaryLine, { color: colors.textMuted }]}> 
            {t({ en: 'Subscriptions (ChatGPT, Copilot, CN savings plans) and API-key providers all managed here.', zh: '璁㈤槄鐩磋繛锛圕hatGPT / Copilot / 鍥藉唴鑺傜渷璁″垝锛変笌 API 鎸夐噺鍘傚晢缁熶竴绠＄悊銆? })}
          </Text>
          {defaultProvider ? (
            <Text style={styles.summaryLine}>
              猸?{t({ en: 'Default: ', zh: '榛樿: ' })}{defaultProvider.icon} {defaultProvider.name}
              {defaultConfig ? ` 路 ${catalog.find(p => p.id === defaultConfig.providerId)?.models.find(m => m.id === defaultConfig.selectedModel)?.label || defaultConfig.selectedModel}` : ''}
            </Text>
          ) : (
            <Text style={[styles.summaryLine, { color: colors.textMuted }]}>
              {t({ en: '馃挕 Save a provider to set a default for all agents', zh: '馃挕 淇濆瓨涓€涓巶鍟嗗嵆鍙涓烘墍鏈?Agent 鐨勯粯璁? })}
            </Text>
          )}
        </View>

        {/* Subscription providers 鈥?flat monthly fee */}
        {subProviders.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t({ en: '馃攧 Subscription (monthly plan)', zh: '馃攧 璁㈤槄鐩磋繛锛堝寘鏈?鍖呭勾锛? })}</Text>
            <Text style={styles.sectionHint}>
              {t({
                en: 'Flat monthly fee or resource package 鈥?not charged per token. Includes ChatGPT, Copilot Pro+, and CN savings plans (Volcengine, Bailian, MiniMax, DeepSeek, Zhipu).',
                zh: '鍖呮湀/璧勬簮鍖咃紝涓嶆寜 token 璁￠噺銆傚寘鍚?ChatGPT銆丆opilot Pro+銆佷互鍙婂浗鍐呰妭鐪佽鍒掞紙鐏北寮曟搸銆佺櫨鐐笺€丮iniMax銆丏eepSeek銆佹櫤璋憋級銆?,
              })}
            </Text>
            {subProviders.map(renderProvider)}
          </>
        )}

        {/* API Key providers 鈥?pay-per-use, international */}
        <Text style={styles.sectionTitle}>{t({ en: '馃實 API Key 鈥?International', zh: '馃攽 API Key 鎸夐噺 鈥?鍥介檯鍘傚晢' })}</Text>
        <Text style={styles.sectionHint}>
          {t({
            en: 'Pay-per-token. Get an API key from the provider and pay based on usage.',
            zh: '鎸?token 閲忚璐广€傚悜鍘傚晢鐢宠 API Key锛屾寜瀹為檯浣跨敤閲忔墸璐广€?,
          })}
        </Text>
        {apiIntlProviders.map(renderProvider)}

        {/* API Key providers 鈥?pay-per-use, China */}
        <Text style={styles.sectionTitle}>{t({ en: '馃嚚馃嚦 API Key 鈥?China', zh: '馃攽 API Key 鎸夐噺 鈥?鍥藉唴鍘傚晢' })}</Text>
        {apiChinaProviders.map(renderProvider)}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Model picker modal */}
      <Modal visible={!!modelPickerProvider} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t({ en: 'Select Model', zh: '閫夋嫨妯″瀷' })}
                {modelPickerProvider ? ` 鈥?${modelPickerProvider.name}` : ''}
              </Text>
              <TouchableOpacity onPress={() => setModelPickerProvider(null)}>
                <Text style={styles.modalClose}>鉁?/Text>
              </TouchableOpacity>
            </View>
            {modelPickerProvider && (
              <Text style={styles.modalCurrencyHint}>
                {t({ en: 'Prices per million tokens', zh: '浠锋牸涓烘瘡鐧句竾 token' })}
                {modelPickerProvider.currency === 'CNY' ? ' (楼 CNY)' : ' ($ USD)'}
              </Text>
            )}
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                        <Text style={[styles.modelLabel, isSelected && { color: colors.primary }]}>
                          {m.label}
                        </Text>
                        {m.freeApi && (
                          <View style={[styles.freeBadgePill, { marginLeft: 6 }]}>
                            <Text style={styles.freeBadgePillText}>馃啌 {m.freeNote || 'Free'}</Text>
                          </View>
                        )}
                      </View>
                      {/* Pricing */}
                      {m.inputPrice || m.outputPrice ? (
                        <Text style={styles.modelPricing}>
                          馃摜 {m.inputPrice}  馃摛 {m.outputPrice}
                        </Text>
                      ) : m.premiumMultiplier != null && m.premiumMultiplier === 0 ? (
                        <Text style={[styles.modelPricing, { color: '#22c55e' }]}>
                          馃帿 {t({ en: '0x 鈥?no premium request used', zh: '0x 鈥?涓嶆秷鑰楅珮绾ц姹傞搴? })}
                        </Text>
                      ) : m.premiumMultiplier != null && m.premiumMultiplier > 0 ? (
                        <Text style={[styles.modelPricing, { color: m.premiumMultiplier >= 3 ? '#ef4444' : '#f59e0b' }]}>
                          馃帿 {m.premiumMultiplier}x {t({ en: 'premium request', zh: '楂樼骇璇锋眰棰濆害' })}
                        </Text>
                      ) : m.costTier === 'free' ? (
                        <Text style={[styles.modelPricing, { color: '#22c55e' }]}>
                          {t({ en: 'Free', zh: '鍏嶈垂' })}
                        </Text>
                      ) : null}
                      {/* Positioning & context */}
                      <Text style={styles.modelCaps}>
                        {formatCtx(m.contextWindow)} ctx
                        {m.multimodal ? '  路  馃柤 澶氭ā鎬? : ''}
                        {m.positioning ? `  路  ${m.positioning}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={[styles.costBadge, { backgroundColor: badge.color + '22' }]}>
                        <Text style={[styles.costBadgeText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                      {isSelected && <Text style={{ marginTop: 4, color: colors.primary, fontWeight: '700' }}>鉁?/Text>}
                    </View>
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

// 鈹€鈹€鈹€ Styles 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  desc: { fontSize: 13, color: colors.textSecondary, marginBottom: 16, lineHeight: 19 },

  // Summary
  summaryCard: {
    backgroundColor: colors.bgSecondary, borderRadius: 12,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  summaryLine: { fontSize: 13, color: colors.textPrimary, marginBottom: 4, lineHeight: 20 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: 16, marginBottom: 4 },
  sectionHint: { fontSize: 12, color: colors.textMuted, marginBottom: 10, lineHeight: 17 },

  // Card
  card: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, marginBottom: 10, overflow: 'hidden',
  },
  cardActive: { borderColor: colors.primary, borderWidth: 1.5 },
  cardDefault: { borderColor: '#f59e0b', borderWidth: 2 },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
  },
  providerIcon: { fontSize: 24 },
  providerName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  keyHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  defaultBadge: { fontSize: 11, color: '#f59e0b', fontWeight: '600', marginLeft: 8 },
  freeBadge: { fontSize: 11, color: '#22c55e', marginTop: 2 },
  chevron: { fontSize: 14, color: colors.textMuted },

  // Card body
  cardBody: { paddingHorizontal: 14, paddingBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 10, marginBottom: 4 },
  fieldHint: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginBottom: 2 },
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
  modelSelectorSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  chevronSmall: { fontSize: 12, color: colors.textMuted },

  // Action row
  actionRow: { flexDirection: 'row', marginTop: 14, gap: 8 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnTest: { backgroundColor: '#6366f1' },
  btnSave: { backgroundColor: colors.primary },
  btnDelete: { backgroundColor: '#ef4444', flex: 0.4 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Default
  setDefaultBtn: {
    marginTop: 10, paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1, borderColor: '#f59e0b',
    alignItems: 'center',
  },
  setDefaultText: { fontSize: 13, color: '#f59e0b', fontWeight: '600' },
  defaultIndicator: {
    marginTop: 10, paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 8, backgroundColor: '#f59e0b15',
  },
  defaultIndicatorText: { fontSize: 12, color: '#f59e0b', lineHeight: 18 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bgPrimary,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '75%', paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  modalClose: { fontSize: 18, color: colors.textMuted, padding: 4 },
  modalCurrencyHint: { fontSize: 11, color: colors.textMuted, paddingHorizontal: 16, paddingTop: 8 },

  // Model row
  modelRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  modelRowSelected: { backgroundColor: colors.primary + '10' },
  modelLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  modelPricing: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  modelCaps: { fontSize: 11, color: colors.textMuted },
  costBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  costBadgeText: { fontSize: 11, fontWeight: '700' },
  freeBadgePill: { backgroundColor: '#22c55e18', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  freeBadgePillText: { fontSize: 10, color: '#22c55e', fontWeight: '600' },

  // Token acquisition guide
  tokenGuide: {
    backgroundColor: '#6366f110', borderRadius: 10, padding: 12,
    marginTop: 8, borderWidth: 1, borderColor: '#6366f130',
  },
  tokenGuideTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  tokenGuideStep: { fontSize: 12, color: colors.textSecondary, lineHeight: 20, marginBottom: 4 },
});