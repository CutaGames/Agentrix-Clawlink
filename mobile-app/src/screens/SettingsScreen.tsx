import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme/colors';
import { setApiConfig } from '../services/api';

export const SettingsScreen: React.FC = () => {
  const [baseUrl, setBaseUrl] = useState('http://localhost:3001/api');
  const [token, setToken] = useState('');

  const save = () => {
    setApiConfig({ baseUrl, token });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Settings</Text>
        <Text style={{ color: colors.muted, marginTop: 6 }}>
          Configure API connection and auth token.
        </Text>
      </Card>

      <Card>
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
        <Text style={{ color: colors.muted, marginBottom: 6 }}>Bearer Token</Text>
        <TextInput
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          secureTextEntry
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
    </ScrollView>
  );
};