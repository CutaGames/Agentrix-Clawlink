import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme/colors';
import { setApiConfig, getApiConfig } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useI18n, Language } from '../stores/i18nStore';

export const SettingsScreen: React.FC = () => {
  const currentConfig = getApiConfig();
  const [baseUrl, setBaseUrl] = useState(currentConfig.baseUrl || 'http://localhost:3001/api');
  const [token, setToken] = useState('');
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { language, setLanguage } = useI18n();

  const save = () => {
    setApiConfig({ baseUrl, token: token || undefined });
    Alert.alert('Saved', 'API configuration updated');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
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
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Account</Text>
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
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>API Settings</Text>
        <Text style={{ color: colors.muted, marginTop: 6, fontSize: 12 }}>
          Configure API connection for development/testing.
        </Text>

        <View style={{ height: 12 }} />
        <Text style={{ color: colors.muted, marginBottom: 6 }}>API Base URL</Text>
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
        <Text style={{ color: colors.muted, marginBottom: 6 }}>Bearer Token (override)</Text>
        <TextInput
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          secureTextEntry
          placeholder="Leave empty to use current session"
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
        <PrimaryButton title="Save" onPress={save} />
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Language</Text>
        <Text style={{ color: colors.muted, marginTop: 6, fontSize: 12 }}>Choose your preferred language</Text>
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

      <TouchableOpacity
        style={settingsStyles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Text style={settingsStyles.logoutText}>Sign Out</Text>
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