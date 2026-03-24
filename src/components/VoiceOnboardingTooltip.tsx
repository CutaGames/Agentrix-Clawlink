/**
 * VoiceOnboardingTooltip — 3-step progressive voice guide
 *
 * Shows a tooltip sequence on first voice interaction:
 *   Step 1: "Hold to record, release to send" (hold mode)
 *   Step 2: "Tap the mic to start/stop" (tap mode)
 *   Step 3: "Enable Live mode for hands-free duplex conversation"
 *
 * Persisted via MMKV so it only shows once per device.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { mmkv } from '../stores/mmkvStorage';

const MMKV_KEY = 'voice_onboarding_completed';
const TOTAL_STEPS = 3;

interface Props {
  /** Whether the voice panel is currently visible */
  visible: boolean;
  /** Current voice interaction mode */
  voiceInteractionMode: 'hold' | 'tap';
  /** Whether duplex (live) mode is active */
  duplexMode: boolean;
  /** i18n helper */
  t: (opts: { en: string; zh: string }) => string;
}

export function VoiceOnboardingTooltip({ visible, voiceInteractionMode, duplexMode, t }: Props) {
  const [step, setStep] = useState(0); // 0 = not showing, 1-3 = active step
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const completed = mmkv.getBoolean(MMKV_KEY);
    if (completed) return;
    setStep(1);
  }, [visible]);

  useEffect(() => {
    if (step > 0) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }
  }, [step, fadeAnim]);

  const advance = useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      if (step >= TOTAL_STEPS) {
        mmkv.set(MMKV_KEY, true);
        setStep(0);
      } else {
        setStep((s) => s + 1);
      }
    });
  }, [step, fadeAnim]);

  const dismiss = useCallback(() => {
    mmkv.set(MMKV_KEY, true);
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(0);
    });
  }, [fadeAnim]);

  if (step === 0) return null;

  const stepContent = [
    null, // 0 index unused
    {
      title: t({ en: 'Wake or Tap to Enter', zh: '唤醒或点按进入' }),
      body: t({ en: 'From a cold start, say your wake phrase or tap the floating ball once to jump straight into voice chat.', zh: '冷启动后，你可以直接说唤醒词，或点一次悬浮球，立即进入语音对话。' }),
    },
    {
      title: t({ en: 'Hands-Free Live Call', zh: '免按住实时通话' }),
      body: t({ en: 'In live mode the mic starts automatically. You do not need to hold the button again to keep talking.', zh: '进入实时模式后会自动开始聆听，不需要再按住按钮才能继续对话。' }),
    },
    {
      title: t({ en: 'Interrupt Anytime', zh: '随时打断' }),
      body: t({ en: 'While the agent is speaking, just start talking naturally and the reply will be interrupted immediately.', zh: '当智能体正在说话时，你直接开口即可立即打断，并继续下一轮对话。' }),
    },
  ];

  const content = stepContent[step];
  if (!content) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.bubble}>
        <View style={styles.header}>
          <Text style={styles.stepIndicator}>{step}/{TOTAL_STEPS}</Text>
          <TouchableOpacity onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.dismissText}>{t({ en: 'Skip', zh: '跳过' })}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.body}>{content.body}</Text>
        <TouchableOpacity style={styles.nextBtn} onPress={advance}>
          <Text style={styles.nextBtnText}>
            {step >= TOTAL_STEPS
              ? t({ en: 'Got it!', zh: '知道了！' })
              : t({ en: 'Next', zh: '下一步' })}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.arrow} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  bubble: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    width: 280,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepIndicator: {
    fontSize: 11,
    color: colors.textMuted,
  },
  dismissText: {
    fontSize: 12,
    color: colors.accent,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  nextBtn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  nextBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.bgCard,
  },
});
