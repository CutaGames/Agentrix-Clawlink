import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Text,
  Platform,
} from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { colors } from '../theme/colors';
import * as Haptics from 'expo-haptics';

const BALL_SIZE = 56;
const EDGE_MARGIN = 12;
const LONG_PRESS_DURATION = 400;

type BallState = 'idle' | 'listening' | 'thinking' | 'speaking';

const STATE_COLORS: Record<BallState, string> = {
  idle: '#6C5CE7',
  listening: '#10B981',
  thinking: '#F59E0B',
  speaking: '#3b82f6',
};

interface Props {
  onVoiceActivate?: () => void;
}

export function GlobalFloatingBall({ onVoiceActivate }: Props) {
  const navigation = useNavigation<any>();
  const { width: screenW, height: screenH } = Dimensions.get('window');

  // Hide on chat screen (chat has its own voice controls)
  const currentRouteName = useNavigationState((state) => {
    if (!state) return '';
    const route = state.routes[state.index];
    // Check nested navigators
    if (route.state) {
      const nested = route.state as any;
      const nestedRoute = nested.routes?.[nested.index];
      if (nestedRoute?.state) {
        const deep = nestedRoute.state as any;
        return deep.routes?.[deep.index]?.name || nestedRoute.name;
      }
      return nestedRoute?.name || route.name;
    }
    return route.name;
  });

  const hideOnScreens = ['AgentChat', 'VoiceChat'];
  const shouldHide = hideOnScreens.includes(currentRouteName);

  const [ballState, setBallState] = useState<BallState>('idle');
  const pan = useRef(new Animated.ValueXY({ x: screenW - BALL_SIZE - EDGE_MARGIN, y: screenH - 200 })).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const lastTapTime = useRef(0);

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

  // Listen for voice state events from chat screen
  useEffect(() => {
    // These events are dispatched by useVoiceSession hook
    const handlers = {
      'agentrix:ball-state': (e: any) => {
        const state = (e as any)?.detail?.state;
        if (state && STATE_COLORS[state as BallState]) {
          setBallState(state as BallState);
        }
      },
    };

    // React Native doesn't have window events, we'll use a simple global emitter approach
    // For now, ballState stays idle when outside chat
    return () => {};
  }, []);

  const snapToEdge = useCallback((x: number, y: number) => {
    const snapX = x < screenW / 2 ? EDGE_MARGIN : screenW - BALL_SIZE - EDGE_MARGIN;
    const clampedY = Math.max(EDGE_MARGIN + 50, Math.min(y, screenH - BALL_SIZE - 100));
    Animated.spring(pan, {
      toValue: { x: snapX, y: clampedY },
      useNativeDriver: false,
      friction: 7,
    }).start();
  }, [pan, screenW, screenH]);

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

  const handleTap = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    const activeInstance = require('../stores/authStore').useAuthStore.getState().activeInstance;

    // Navigate to AgentChat
    navigation.navigate('Agent', {
      screen: 'AgentChat',
      params: {
        instanceId: activeInstance?.id,
        instanceName: activeInstance?.name || 'Agent',
      },
    });
  }, [navigation]);

  const handleVoiceActivate = useCallback(() => {
    const activeInstance = require('../stores/authStore').useAuthStore.getState().activeInstance;
    onVoiceActivate?.();

    // Navigate to AgentChat with voice mode
    navigation.navigate('Agent', {
      screen: 'AgentChat',
      params: {
        instanceId: activeInstance?.id,
        instanceName: activeInstance?.name || 'Agent',
        voiceMode: true,
      },
    });
  }, [navigation, onVoiceActivate]);

  if (shouldHide) return null;

  const ballColor = STATE_COLORS[ballState];
  const emoji = ballState === 'idle' ? '🤖' : ballState === 'listening' ? '🎙' : ballState === 'thinking' ? '💭' : '🔊';

  return (
    <Animated.View
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
      {...panResponder.panHandlers}
    >
      {/* Glow ring for non-idle state */}
      {ballState !== 'idle' && (
        <View style={[styles.glowRing, { borderColor: ballColor + '60' }]} />
      )}
      <View style={[styles.ball, { backgroundColor: ballColor }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
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
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  glowRing: {
    position: 'absolute',
    width: BALL_SIZE + 12,
    height: BALL_SIZE + 12,
    borderRadius: (BALL_SIZE + 12) / 2,
    borderWidth: 3,
    top: -6,
    left: -6,
  },
  emoji: {
    fontSize: 28,
  },
});

export default GlobalFloatingBall;
