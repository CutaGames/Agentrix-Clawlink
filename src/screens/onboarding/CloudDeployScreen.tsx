import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import { provisionCloudAgent } from '../../services/openclaw.service';
import type { OnboardingStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'CloudDeploy'>;

const PERSONALITIES = [
  { id: 'helper', label: 'Helpful Assistant', emoji: '🤝' },
  { id: 'coder', label: 'Code Expert', emoji: '💻' },
  { id: 'researcher', label: 'Researcher', emoji: '🔬' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
];

export function CloudDeployScreen() {
  const navigation = useNavigation<Nav>();
  const { addInstance, setActiveInstance, setOnboardingComplete } = useAuthStore.getState();
  const [agentName, setAgentName] = useState('');
  const [personality, setPersonality] = useState('helper');
  const [step, setStep] = useState<'config' | 'deploying' | 'done'>('config');
  const [progress, setProgress] = useState(0);
  const [instanceUrl, setInstanceUrl] = useState('');

  const handleDeploy = async () => {
    const name = agentName.trim() || 'My Agent';
    setStep('deploying');
    setProgress(0);

    // Simulate progress bar during provisioning
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 600);

    try {
      const result = await provisionCloudAgent({ name, personality });
      clearInterval(interval);
      setProgress(100);

      const instance = {
        id: result.instanceId,
        name,
        instanceUrl: result.instanceUrl,
        status: 'active' as const,
        deployType: 'cloud' as const,
      };
      addInstance(instance);
      setActiveInstance(instance.id);
      setInstanceUrl(result.instanceUrl);
      setStep('done');
    } catch (err: any) {
      clearInterval(interval);
      setStep('config');
      Alert.alert('Deploy Failed', err?.message || 'Could not provision cloud agent. Try again.');
    }
  };

  const handleFinish = () => {
    setOnboardingComplete();
  };

  if (step === 'deploying') {
    return (
      <View style={styles.centered}>
        <Text style={styles.deployTitle}>Setting up your agent...</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        <Text style={styles.deployStep}>
          {progress < 30 ? '📦 Allocating container...' :
           progress < 60 ? '⚙️ Configuring OpenClaw...' :
           progress < 85 ? '🔗 Setting up API access...' : '✅ Almost ready...'}
        </Text>
      </View>
    );
  }

  if (step === 'done') {
    return (
      <View style={styles.centered}>
        <Text style={styles.celebrateEmoji}>🎉</Text>
        <Text style={styles.celebrateTitle}>Your agent is live!</Text>
        <Text style={styles.celebrateSubtitle}>
          {agentName || 'Your agent'} is running at:
        </Text>
        <View style={styles.urlBox}>
          <Text style={styles.urlText} numberOfLines={1}>{instanceUrl}</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish}>
          <Text style={styles.primaryBtnText}>Start Chatting →</Text>
        </TouchableOpacity>
        <Text style={styles.shareHint}>🦀 Share your agent with friends to earn commissions!</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Name your agent</Text>
      <Text style={styles.subtitle}>Your cloud agent will be ready in ~30 seconds. It's free!</Text>

      <Text style={styles.label}>Agent Name</Text>
      <TextInput
        style={styles.input}
        placeholder="My Awesome Agent"
        placeholderTextColor={colors.textMuted}
        value={agentName}
        onChangeText={setAgentName}
        maxLength={32}
      />

      <Text style={styles.label}>Personality</Text>
      <View style={styles.personalityGrid}>
        {PERSONALITIES.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.personalityCard, personality === p.id && styles.personalityCardActive]}
            onPress={() => setPersonality(p.id)}
          >
            <Text style={styles.personalityEmoji}>{p.emoji}</Text>
            <Text style={[styles.personalityLabel, personality === p.id && { color: colors.accent }]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={handleDeploy}>
        <Text style={styles.primaryBtnText}>🚀 Launch Cloud Agent (Free)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>← Back to options</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 24, paddingTop: 48, paddingBottom: 40, gap: 16 },
  centered: { flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  personalityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  personalityCard: {
    width: '47%',
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  personalityCardActive: { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
  personalityEmoji: { fontSize: 26 },
  personalityLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 17,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backBtn: { alignItems: 'center', padding: 12 },
  backBtnText: { color: colors.textMuted, fontSize: 14 },
  deployTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  progressBar: { width: '100%', height: 8, backgroundColor: colors.bgCard, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
  progressText: { fontSize: 18, fontWeight: '700', color: colors.accent },
  deployStep: { fontSize: 14, color: colors.textSecondary },
  celebrateEmoji: { fontSize: 64 },
  celebrateTitle: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  celebrateSubtitle: { fontSize: 15, color: colors.textSecondary },
  urlBox: {
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    padding: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  urlText: { color: colors.accent, fontSize: 13, fontFamily: 'monospace' },
  shareHint: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
});
