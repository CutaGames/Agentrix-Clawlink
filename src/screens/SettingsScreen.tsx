import React, { useState, useCallback } from 'react';
import { ScrollView, Text, TextInput, View, Alert, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme/colors';
import { setApiConfig, getApiConfig, apiFetch } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useI18n, Language } from '../stores/i18nStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ─── API Key Types ─────────────────────────────────────────────
interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  mode: string;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
}

const fetchApiKeys = () => apiFetch<ApiKey[]>('/api-keys');
const createApiKey = (name: string) =>
  apiFetch<{ data: { apiKey: string; id: string; name: string; keyPrefix: string } }>('/api-keys', {
    method: 'POST',
    body: JSON.stringify({ name, expiresInDays: 365 }),
  });
const deleteApiKey = (id: string) =>
  apiFetch<void>(`/api-keys/${id}`, { method: 'DELETE' });

export const SettingsScreen: React.FC = () => {
  const currentConfig = getApiConfig();
  const [baseUrl, setBaseUrl] = useState(currentConfig.baseUrl || 'http://localhost:3001/api');
  const [token, setToken] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { language, setLanguage, t } = useI18n();
  const queryClient = useQueryClient();

  // ── API Keys ──
  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: fetchApiKeys,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: () => createApiKey(newKeyName.trim() || 'My Key'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setNewKeyName('');
      Alert.alert(
        '🔑 API Key Created',
        `Save this key — it will only be shown once:\n\n${res.data.apiKey}`,
        [{ text: 'Copy & Close', onPress: () => {} }],
      );
    },
    onError: (e: any) => Alert.alert('Error', e.message || 'Failed to create key'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const confirmDelete = (key: ApiKey) => {
    Alert.alert(t({ en: 'Delete API Key', zh: '删除 API 密鑅' }), `${t({ en: 'Delete', zh: '删除' })} "${key.name}" (${key.keyPrefix}...)?`, [
      { text: t({ en: 'Cancel', zh: '取消' }), style: 'cancel' },
      { text: t({ en: 'Delete', zh: '删除' }), style: 'destructive', onPress: () => deleteMutation.mutate(key.id) },
    ]);
  };

  const save = () => {
    setApiConfig({ baseUrl, token: token || undefined });
    Alert.alert(t({ en: 'Saved', zh: '已保存' }), t({ en: 'API configuration updated', zh: 'API 配置已更新' }));
  };

  const handleLogout = () => {
    Alert.alert(
      t({ en: 'Logout', zh: '退出登录' }),
      t({ en: 'Are you sure you want to sign out?', zh: '确定要退出登录吗？' }),
      [
        { text: t({ en: 'Cancel', zh: '取消' }), style: 'cancel' },
        {
          text: t({ en: 'Sign Out', zh: '退出登录' }),
          style: 'destructive',
          onPress: async () => {
            await clearAuth();
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {user && (
        <Card>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{t({ en: 'Account', zh: '账号' })}</Text>
          <View style={{ marginTop: 12, gap: 6 }}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              Agentrix ID: <Text style={{ color: colors.text }}>{user.agentrixId || '-'}</Text>
            </Text>
            {user.email && (
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                Email: <Text style={{ color: colors.text }}>{user.email}</Text>
              </Text>
            )}
            {user.walletAddress && (
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                Wallet: <Text style={{ color: colors.text }}>{user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}</Text>
              </Text>
            )}
            {user.provider && (
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                Login via: <Text style={{ color: colors.text }}>{user.provider}</Text>
              </Text>
            )}
          </View>
        </Card>
      )}

      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{t({ en: 'API Settings', zh: 'API 设置' })}</Text>
        <Text style={{ color: colors.muted, marginTop: 6, fontSize: 12 }}>
          {t({ en: 'Configure API connection for development/testing.', zh: '配置开发/测试环境的 API 连接。' })}
        </Text>

        <View style={{ height: 12 }} />
        <Text style={{ color: colors.muted, marginBottom: 6 }}>{t({ en: 'API Base URL', zh: 'API 基础地址' })}</Text>
        <TextInput
          value={baseUrl}
          onChangeText={setBaseUrl}
          autoCapitalize="none"
          style={{
            backgroundColor: colors.cardAlt,
            color: colors.text,
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        />

        <View style={{ height: 10 }} />
        <Text style={{ color: colors.muted, marginBottom: 6 }}>{t({ en: 'Bearer Token (override)', zh: 'Bearer Token（覆盖）' })}</Text>
        <TextInput
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          secureTextEntry
          placeholder={t({ en: 'Leave empty to use current session', zh: '留空则使用当前会话' })}
          placeholderTextColor={colors.muted}
          style={{
            backgroundColor: colors.cardAlt,
            color: colors.text,
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        />

        <View style={{ height: 12 }} />
        <PrimaryButton title={t({ en: 'Save', zh: '保存' })} onPress={save} />
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{t({ en: 'Language', zh: '语言' })}</Text>
        <Text style={{ color: colors.muted, marginTop: 6, fontSize: 12 }}>{t({ en: 'Choose your preferred language', zh: '选择你的偏好语言' })}</Text>
        <View style={settingsStyles.langRow}>
          {([{ code: 'en' as Language, label: 'English', flag: '🇺🇸' }, { code: 'zh' as Language, label: '中文', flag: '🇨🇳' }]).map(lang => (
            <TouchableOpacity
              key={lang.code}
              style={[settingsStyles.langBtn, language === lang.code && settingsStyles.langBtnActive]}
              onPress={() => setLanguage(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={settingsStyles.langFlag}>{lang.flag}</Text>
              <Text style={[settingsStyles.langLabel, language === lang.code && settingsStyles.langLabelActive]}>{lang.label}</Text>
              {language === lang.code && <Text style={settingsStyles.langCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Developer API Keys (BYOK) */}
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>🔑 {t({ en: 'API Keys', zh: 'API 密鑅' })}</Text>
        <Text style={{ color: colors.muted, marginTop: 4, fontSize: 12 }}>
          {t({ en: 'Create API keys to integrate Agentrix into your own apps.', zh: '创建 API 密鑅以将 Agentrix 集成到你的应用中。' })}
        </Text>

        {/* Create new key */}
        <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={newKeyName}
            onChangeText={setNewKeyName}
            placeholder={t({ en: 'Key name (e.g. My App)', zh: '密鑅名称（如：我的应用）' })}
            placeholderTextColor={colors.muted}
            style={{
              flex: 1,
              backgroundColor: colors.cardAlt,
              color: colors.text,
              padding: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              fontSize: 13,
            }}
          />
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              borderRadius: 10,
              paddingHorizontal: 16,
              justifyContent: 'center',
              opacity: createMutation.isPending ? 0.6 : 1,
            }}
            onPress={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t({ en: '+ Create', zh: '+ 创建' })}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Keys list */}
        {keysLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
        ) : (apiKeys && apiKeys.length > 0) ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            {apiKeys.map((key) => (
              <View key={key.id} style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: colors.cardAlt, borderRadius: 10,
                padding: 10, borderWidth: 1, borderColor: colors.border,
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{key.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>{key.keyPrefix}•••••••• · {key.mode}</Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(key)} style={{ padding: 4 }}>
                  <Text style={{ color: '#ef4444', fontSize: 18 }}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 10 }}>{t({ en: 'No API keys yet.', zh: '暂无 API 密鑅。' })}</Text>
        )}
      </Card>

      <TouchableOpacity
        style={settingsStyles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Text style={settingsStyles.logoutText}>{t({ en: 'Sign Out', zh: '退出登录' })}</Text>
      </TouchableOpacity>

      <View style={{ height: 20 }} />
      <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center' }}>
        Agentrix v2.0.0
      </Text>
    </ScrollView>
  );
};

const settingsStyles = StyleSheet.create({
  langRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  langBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  langBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  langFlag: {
    fontSize: 20,
  },
  langLabel: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  langLabelActive: {
    color: colors.text,
  },
  langCheck: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: '#EF444415',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF444440',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
});