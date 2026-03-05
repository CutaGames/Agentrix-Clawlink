import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import {
  validateInvitationCode,
  redeemInvitationCode,
  checkInvitationStatus,
} from '../../services/invitation.service';

export function InvitationGateScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const setInvitationValid = useAuthStore((s) => s.setInvitationValid);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // On mount, check if the user already has a valid invitation
  useEffect(() => {
    checkExistingInvitation();
  }, []);

  async function checkExistingInvitation() {
    try {
      const { hasInvitation } = await checkInvitationStatus();
      if (hasInvitation) {
        setInvitationValid();
      }
    } catch {
      // Not yet invited — show the gate
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit() {
    const trimmed = code.trim();
    if (trimmed.length < 3) {
      Alert.alert('Invalid Code', 'Please enter a valid invitation code.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Validate
      const validation = await validateInvitationCode(trimmed);
      if (!validation.valid) {
        Alert.alert('Invalid Code', validation.message);
        return;
      }

      // Step 2: Redeem
      const result = await redeemInvitationCode(trimmed);
      if (result.success) {
        setInvitationValid();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to redeem invitation code');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearAuth();
  }

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.checkingText}>Checking invitation status...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo area */}
        <Text style={styles.logo}>🤖</Text>
        <Text style={styles.title}>Welcome to ClawLink</Text>
        <Text style={styles.subtitle}>
          ClawLink is currently in private beta.{'\n'}
          Enter your invitation code to get started.
        </Text>

        {/* Code input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="AX-XXXXXX"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            editable={!loading}
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Activate</Text>
          )}
        </TouchableOpacity>

        {/* Info */}
        <Text style={styles.info}>
          Don't have a code? Follow us on social media for{'\n'}
          invitation code giveaways.
        </Text>

        {/* Logout link */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkingText: {
    color: colors.textMuted,
    marginTop: 16,
    fontSize: 14,
  },
  content: {
    width: '85%',
    maxWidth: 360,
    alignItems: 'center',
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    letterSpacing: 2,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  info: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  logoutBtn: {
    paddingVertical: 8,
  },
  logoutText: {
    color: colors.textMuted,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
