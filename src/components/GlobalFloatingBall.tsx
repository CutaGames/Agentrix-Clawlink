import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Text,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { colors } from '../theme/colors';
import * as Haptics from 'expo-haptics';
import { useI18n } from '../stores/i18nStore';
import { useSettingsStore } from '../stores/settingsStore';
import { resolveMobileWakeWordConfig } from '../config/wakeWord';
import { SpeechWakeWordService } from '../services/speechWakeWord.service';
import { LocalWakeWordService, hasLocalWakeWordModel, thresholdFromSensitivity } from '../services/localWakeWord.service';
import { addVoiceDiagnostic } from '../services/voiceDiagnostics';
import { isVoiceUiE2EEnabled } from '../testing/e2e';

const BALL_SIZE = 48;
const EDGE_MARGIN = 12;
const LONG_PRESS_DURATION = 400;

const PILL_WIDTH = 260;
const PILL_HEIGHT = 120;

type BallState = 'idle' | 'listening' | 'thinking' | 'speaking';

const STATE_COLORS: Record<BallState, string> = {
  idle: '#1a1a2e',
  listening: '#10B981',
  thinking: '#F59E0B',
  speaking: '#3b82f6',
};

const STATE_BORDER_COLORS: Record<BallState, string> = {
  idle: '#6C5CE7',
  listening: '#10B981',
  thinking: '#F59E0B',
  speaking: '#3b82f6',
};

interface Props {
  onVoiceActivate?: () => void;
  /** Transcript text to show in the voice pill */
  pillTranscript?: string;
  /** Send the current transcript from the pill */
  onPillSend?: (text: string) => void;
  /** Volume level (0-1) for waveform visualization */
  pillVolume?: number;
}

export function GlobalFloatingBall({ onVoiceActivate, pillTranscript, onPillSend, pillVolume = 0 }: Props) {
  const navigation = useNavigation<any>();
  const { language } = useI18n();
  const wakeWordSettings = useSettingsStore((state) => state.wakeWordConfig);
  const { width: screenW, height: screenH } = Dimensions.get('window');
  const wakeWordConfig = useMemo(() => resolveMobileWakeWordConfig(wakeWordSettings), [wakeWordSettings]);

  // Hide on chat screen (chat has its own voice controls).
  // On native, initial route state may not be populated (route.state === undefined)
  // until the first navigation event, so we also check for shallow container names.
  const currentRouteName = useNavigationState((state) => {
    if (!state) return '';
    // Traverse up to 4 levels deep: Root → Drawer → Tab → Stack → Screen
    let route = state.routes[state.index];
    for (let depth = 0; depth < 4; depth++) {
      if (!route.state) break;
      const nested = route.state as any;
      if (!nested?.routes || nested.index == null) break;
      route = nested.routes[nested.index];
    }
    return route.name || '';
  });

  // The deepest resolved route name may be 'Main' or 'MainTabs' when
  // the nested navigator hasn't fired any navigation event yet.
  // In that case, the active screen IS the initial route: AgentChat.
  const hideOnScreens = ['AgentChat', 'VoiceChat', 'ClawSettings'];
  const resolvedToShallow = ['Main', 'MainTabs', 'Agent'].includes(currentRouteName);
  const shouldHide = hideOnScreens.includes(currentRouteName) || resolvedToShallow;
  const useDirectPressHandlers = Platform.OS === 'web' || isVoiceUiE2EEnabled();

  const [ballState, setBallState] = useState<BallState>('idle');
  const pan = useRef(new Animated.ValueXY({ x: screenW - BALL_SIZE - EDGE_MARGIN, y: screenH - 200 })).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const wakeListenerRef = useRef<SpeechWakeWordService | LocalWakeWordService | null>(null);
  const navigatingToChatRef = useRef(false);
  const activateVoiceExperienceRef = useRef<() => void>(() => {});
  const lastWakeWordAlertRef = useRef<{ message: string; shownAt: number }>({ message: '', shownAt: 0 });

  // Voice pill expansion state
  const [pillExpanded, setPillExpanded] = useState(false);
  const pillExpandAnim = useRef(new Animated.Value(0)).current;
  const waveformAnims = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(0.3))
  ).current;

  // Pulse animation for non-idle states
  useEffect(() => {
    if (ballState !== 'idle') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [ballState, pulseAnim]);

  useEffect(() => {
    if (!shouldHide) {
      setBallState('idle');
      navigatingToChatRef.current = false;
    }
  }, [shouldHide]);

  // Pill expand/collapse animation
  useEffect(() => {
    Animated.spring(pillExpandAnim, {
      toValue: pillExpanded ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
    }).start();
  }, [pillExpanded, pillExpandAnim]);

  // Waveform animation driven by volume
  useEffect(() => {
    if (!pillExpanded || ballState !== 'listening') return;
    waveformAnims.forEach((anim, i) => {
      const base = Math.min(1, 0.2 + pillVolume * 0.8);
      const jitter = Math.random() * 0.3;
      Animated.timing(anim, {
        toValue: Math.min(1, base + jitter * (i % 2 === 0 ? 1 : 0.6)),
        duration: 120,
        useNativeDriver: false,
      }).start();
    });
  }, [pillExpanded, ballState, pillVolume, waveformAnims]);

  // Collapse pill when leaving listening state
  useEffect(() => {
    if (ballState !== 'listening' && pillExpanded) {
      setPillExpanded(false);
    }
  }, [ballState, pillExpanded]);

  const snapToEdge = useCallback((x: number, y: number) => {
    const snapX = x < screenW / 2 ? EDGE_MARGIN : screenW - BALL_SIZE - EDGE_MARGIN;
    const clampedY = Math.max(EDGE_MARGIN + 50, Math.min(y, screenH - BALL_SIZE - 100));
    Animated.spring(pan, {
      toValue: { x: snapX, y: clampedY },
      useNativeDriver: false,
      friction: 7,
    }).start();
  }, [pan, screenW, screenH]);

  const showWakeWordGuidance = useCallback((message: string) => {
    const now = Date.now();
    if (
      lastWakeWordAlertRef.current.message === message
      && now - lastWakeWordAlertRef.current.shownAt < 15000
    ) {
      return;
    }
    lastWakeWordAlertRef.current = { message, shownAt: now };
    addVoiceDiagnostic('floating-ball', 'wake-word-guidance-shown', { message });

    const title = language === 'zh' ? '语音唤醒需要设置' : 'Wake word needs setup';
    const openSettingsLabel = language === 'zh' ? '打开系统设置' : 'Open Settings';
    const laterLabel = language === 'zh' ? '稍后' : 'Later';

    Alert.alert(title, message, [
      {
        text: openSettingsLabel,
        onPress: () => {
          Linking.openSettings().catch(() => {});
        },
      },
      { text: laterLabel, style: 'cancel' },
    ]);
  }, [language]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5,
      onPanResponderGrant: () => {
        // Start long press timer
        longPressTimer.current = setTimeout(() => {
          if (!isDragging.current) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            // Long press → voice activation
            handleVoiceActivate();
          }
        }, LONG_PRESS_DURATION);

        pan.extractOffset();
      },
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5) {
          isDragging.current = true;
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }
        Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(_, gesture);
      },
      onPanResponderRelease: (_, gesture) => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        pan.flattenOffset();

        // Get current position
        const currentX = (pan.x as any)._value ?? screenW - BALL_SIZE - EDGE_MARGIN;
        const currentY = (pan.y as any)._value ?? screenH - 200;

        if (!isDragging.current) {
          // It was a tap, not a drag
          handleTap();
        }

        isDragging.current = false;
        snapToEdge(currentX, currentY);
      },
    })
  ).current;

  const activateVoiceExperience = useCallback(async () => {
    // Guard against double-tap while already navigating
    if (navigatingToChatRef.current) return;
    navigatingToChatRef.current = true;
    setBallState('listening');
    onVoiceActivate?.();

    // Safety: auto-reset guard after 3s in case navigation silently fails
    // (shouldHide effect normally resets this, but navigation might not trigger it)
    setTimeout(() => {
      navigatingToChatRef.current = false;
    }, 3000);

    if (isVoiceUiE2EEnabled() && onVoiceActivate) {
      return;
    }

    // GlobalFloatingBall sits beside MainTabNavigator inside the Root screen,
    // so it gets the Root navigator. Resolve the target instance up front.
    const authStore = require('../stores/authStore').useAuthStore.getState();
    const targetInstance = authStore.activeInstance ?? authStore.user?.openClawInstances?.[0] ?? null;
    addVoiceDiagnostic('floating-ball', 'activate-start', {
      currentRouteName,
      hasActiveInstance: !!authStore.activeInstance,
      targetInstanceId: targetInstance?.id || null,
      targetInstanceName: targetInstance?.name || null,
    });
    if (!authStore.activeInstance && targetInstance?.id) {
      authStore.setActiveInstance(targetInstance.id);
      addVoiceDiagnostic('floating-ball', 'set-active-instance', { instanceId: targetInstance.id });
    }

    // Release wake word listener BEFORE navigation so the mic is fully freed
    // before the chat screen's duplex mode tries to acquire it.
    const listener = wakeListenerRef.current;
    if (listener) {
      wakeListenerRef.current = null;
      try {
        await listener.release();
        addVoiceDiagnostic('floating-ball', 'listener-released');
      } catch (releaseErr) {
        addVoiceDiagnostic('floating-ball', 'listener-release-failed', releaseErr);
      }
    }

    // Navigate to Agent tab → AgentChat, preserving navigation stacks.
    const chatParams = {
      instanceId: targetInstance?.id,
      instanceName: targetInstance?.name || 'Agent',
      voiceMode: true,
      duplexMode: true,
    };

    try {
      if (isVoiceUiE2EEnabled()) {
        navigation.navigate('AgentChat', chatParams);
      } else {
        // Use fully-qualified nested path from Root to ensure reliable resolution
        // on native: Root(Main) → Drawer(MainTabs) → Tab(Agent) → Stack(AgentChat)
        (navigation as any).navigate('MainTabs', {
          screen: 'Agent',
          params: {
            screen: 'AgentChat',
            params: chatParams,
          },
        });
      }
      addVoiceDiagnostic('floating-ball', 'navigate-agent-chat', {
        instanceId: chatParams.instanceId || null,
        instanceName: chatParams.instanceName,
      });
    } catch (navErr) {
      addVoiceDiagnostic('floating-ball', 'navigate-failed', navErr);
      console.warn('[FloatingBall] Navigation failed:', navErr);
      navigatingToChatRef.current = false;
      setBallState('idle');
    }
  }, [navigation, onVoiceActivate, currentRouteName]);

  // Keep ref in sync so wake word callbacks don't need activateVoiceExperience in deps
  activateVoiceExperienceRef.current = activateVoiceExperience;

  const handleTap = useCallback(() => {
    addVoiceDiagnostic('floating-ball', 'tap');
    Haptics.selectionAsync().catch(() => {});
    void activateVoiceExperience();
  }, [activateVoiceExperience]);

  const handleVoiceActivate = useCallback(() => {
    addVoiceDiagnostic('floating-ball', 'long-press-activate');
    // Long press → expand voice pill panel (or navigate if no pill handler)
    if (onPillSend) {
      setPillExpanded(true);
      setBallState('listening');
      onVoiceActivate?.();
    } else {
      void activateVoiceExperience();
    }
  }, [activateVoiceExperience, onPillSend, onVoiceActivate]);

  useEffect(() => {
    if (!isVoiceUiE2EEnabled() || Platform.OS !== 'web') {
      return;
    }

    const handleE2EWakeWord = () => {
      addVoiceDiagnostic('floating-ball', 'e2e-wake-word-triggered');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      activateVoiceExperienceRef.current();
    };

    const handleE2ELocalWakeWord = () => {
      addVoiceDiagnostic('floating-ball', 'e2e-local-wake-word-triggered');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      activateVoiceExperienceRef.current();
    };

    window.addEventListener('agentrix:e2e-wake-word', handleE2EWakeWord);
    window.addEventListener('agentrix:e2e-local-wake-word', handleE2ELocalWakeWord);
    return () => {
      window.removeEventListener('agentrix:e2e-wake-word', handleE2EWakeWord);
      window.removeEventListener('agentrix:e2e-local-wake-word', handleE2ELocalWakeWord);
    };
  }, []);

  useEffect(() => {
    if (!wakeWordConfig.enabled || shouldHide || navigatingToChatRef.current) {
      const listener = wakeListenerRef.current;
      if (listener) {
        void listener.release();
        wakeListenerRef.current = null;
      }
      return;
    }

    const preferredEngine = wakeWordConfig.engine ?? 'auto';
    const localModelAvailable = hasLocalWakeWordModel(wakeWordConfig.localModel);
    const shouldUseLocalTemplate =
      (preferredEngine === 'local-template' || preferredEngine === 'auto')
      && localModelAvailable
      && LocalWakeWordService.isAvailable();

    const listener = shouldUseLocalTemplate
      ? new LocalWakeWordService()
      : SpeechWakeWordService.isAvailable()
        ? new SpeechWakeWordService()
        : null;

    if (!listener) {
      return;
    }

    wakeListenerRef.current = listener;
    let cancelled = false;

    void (async () => {
      try {
      if (listener instanceof LocalWakeWordService) {
        await listener.init({
          model: wakeWordConfig.localModel!,
          threshold: thresholdFromSensitivity(wakeWordConfig.sensitivity),
          onWakeWord: () => {
            if (!cancelled) {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              activateVoiceExperienceRef.current();
            }
          },
          onError: (err) => {
            addVoiceDiagnostic('floating-ball', 'local-wake-word-error', { message: err?.message });
            const rawMessage = err?.message || '';
            if (/permission denied|permission/i.test(rawMessage)) {
              showWakeWordGuidance(language === 'zh'
                ? '本地唤醒词需要麦克风权限。请先到系统设置里授权。'
                : 'Local wake word needs microphone permission. Enable it in system settings first.');
            }
          },
        });
      } else {
        await listener.init({
          phrases: wakeWordConfig.fallbackPhrases,
          language,
          onWakeWord: () => {
            if (!cancelled) {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              activateVoiceExperienceRef.current();
            }
          },
          onError: (err) => {
            addVoiceDiagnostic('floating-ball', 'wake-word-error', { message: err?.message });
            const rawMessage = err?.message || '';
            if (/permission denied|permission/i.test(rawMessage)) {
              showWakeWordGuidance(language === 'zh'
                ? '唤醒词需要麦克风和语音识别权限。请到系统设置里开启权限，然后再试一次。'
                : 'Wake word needs microphone and speech permissions. Enable them in system settings, then try again.');
              return;
            }
            if (/unavailable/i.test(rawMessage)) {
              showWakeWordGuidance(language === 'zh'
                ? '当前设备没有可用的系统语音唤醒能力。你仍然可以直接点悬浮球进入实时语音。'
                : 'This device does not expose wake-word speech recognition. You can still tap the floating ball to jump straight into live voice.');
            }
          },
        });
      }

      if (!cancelled) {
        await listener.start();
      }
      } catch (err) {
        addVoiceDiagnostic('floating-ball', 'wake-word-init-failed', err);
        console.warn('[FloatingBall] Wake word init failed:', err);
      }
    })();

    return () => {
      cancelled = true;
      void listener.release();
      if (wakeListenerRef.current === listener) {
        wakeListenerRef.current = null;
      }
    };
  }, [
    language,
    shouldHide,
    wakeWordConfig.enabled,
    wakeWordConfig.engine,
    wakeWordConfig.fallbackPhrases,
    wakeWordConfig.localModel,
    wakeWordConfig.sensitivity,
    showWakeWordGuidance,
  ]);

  const handlePillSend = useCallback(() => {
    if (pillTranscript && onPillSend) {
      onPillSend(pillTranscript);
      setPillExpanded(false);
      setBallState('thinking');
    }
  }, [pillTranscript, onPillSend]);

  const handlePillClose = useCallback(() => {
    setPillExpanded(false);
    setBallState('idle');
  }, []);

  if (shouldHide) return null;

  const ballColor = STATE_COLORS[ballState];
  const borderColor = STATE_BORDER_COLORS[ballState];
  const stateIndicator = ballState === 'listening' ? '🎙' : ballState === 'thinking' ? '·​·​·' : ballState === 'speaking' ? '🔊' : null;

  return (
    <Animated.View
      testID="voice-floating-ball"
      accessibilityLabel="voice-floating-ball"
      style={[
        styles.container,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: pulseAnim },
          ],
        },
      ]}
      {...(useDirectPressHandlers ? {} : panResponder.panHandlers)}
    >
      {/* Voice Pill panel — expands on long press */}
      {pillExpanded && (
        <Animated.View
          style={[
            styles.pillPanel,
            {
              opacity: pillExpandAnim,
              transform: [{
                scale: pillExpandAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 1],
                }),
              }],
            },
          ]}
        >
          <View style={styles.pillHeader}>
            <Text style={styles.pillTitle}>
              {ballState === 'listening' ? '🎙 Listening...' : ballState === 'thinking' ? '💭 Thinking...' : '🔊 Speaking'}
            </Text>
            <TouchableOpacity onPress={handlePillClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.pillCloseBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Waveform bars */}
          <View style={styles.waveformRow}>
            {waveformAnims.map((anim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveformBar,
                  {
                    height: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [4, 28],
                    }),
                    backgroundColor: ballState === 'listening' ? '#10B981' : '#6C5CE7',
                  },
                ]}
              />
            ))}
          </View>

          {/* Transcript preview */}
          {!!pillTranscript && (
            <Text style={styles.pillTranscript} numberOfLines={2}>
              {pillTranscript}
            </Text>
          )}

          {/* Send button */}
          {!!pillTranscript && (
            <TouchableOpacity style={styles.pillSendBtn} onPress={handlePillSend}>
              <Text style={styles.pillSendText}>⬆ Send</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Glow ring for non-idle state */}
      {ballState !== 'idle' && (
        <View style={[styles.glowRing, { borderColor: borderColor + '60' }]} />
      )}
      <TouchableOpacity
        testID="voice-floating-ball-core"
        accessibilityLabel={`voice-floating-ball-core:${ballState}`}
        activeOpacity={0.9}
        disabled={!useDirectPressHandlers}
        onPress={useDirectPressHandlers ? handleTap : undefined}
        onLongPress={useDirectPressHandlers ? handleVoiceActivate : undefined}
        delayLongPress={LONG_PRESS_DURATION}
        style={[styles.ball, { backgroundColor: ballColor, borderColor: borderColor + '80' }]}
      >
        <Text style={styles.brandMark}>AX</Text>
        {stateIndicator && (
          <View style={[styles.stateIndicatorDot, { backgroundColor: borderColor }]}>
            <Text style={styles.stateIndicatorText}>{stateIndicator}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    zIndex: 9999,
    elevation: 10,
  },
  ball: {
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  glowRing: {
    position: 'absolute',
    width: BALL_SIZE + 12,
    height: BALL_SIZE + 12,
    borderRadius: (BALL_SIZE + 12) / 2,
    borderWidth: 2.5,
    top: -6,
    left: -6,
  },
  brandMark: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  stateIndicatorDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1a1a2e',
  },
  stateIndicatorText: {
    fontSize: 9,
    color: '#fff',
  },
  // Voice Pill panel styles
  pillPanel: {
    position: 'absolute',
    bottom: BALL_SIZE + 10,
    right: 0,
    width: PILL_WIDTH,
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  pillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pillTitle: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
  },
  pillCloseBtn: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 32,
    marginBottom: 6,
  },
  waveformBar: {
    width: 4,
    borderRadius: 2,
  },
  pillTranscript: {
    color: '#D1D5DB',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  pillSendBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#6C5CE7',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillSendText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default GlobalFloatingBall;
