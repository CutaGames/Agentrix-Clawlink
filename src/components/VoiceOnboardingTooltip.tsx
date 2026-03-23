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
      title: t({ en: 'Hold to Talk', zh: '按住说话' }),
      body: t({ en: 'Press and hold the mic button, then release to send your voice message.', zh: '按住麦克风按钮说话，松开即发送语音消息。' }),
    },
    {
      title: t({ en: 'Tap Mode', zh: '点触模式' }),
      body: t({ en: 'Switch to Tap mode: tap once to start recording, tap again to stop and send.', zh: '切换到点触模式：点一下开始录音，再点一下停止并发送。' }),
    },
    {
      title: t({ en: 'Live Conversation', zh: '实时对话' }),
      body: t({ en: 'Enable Live mode in settings for hands-free, duplex voice chat — the agent listens and responds automatically.', zh: '在设置中开启实时模式，享受免手动操作的双向语音对话——智能体自动聆听与回复。' }),
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
