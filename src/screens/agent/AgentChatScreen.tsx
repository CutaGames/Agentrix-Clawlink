import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, ScrollView, PanResponder,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../stores/i18nStore';
import { useSettingsStore, SUPPORTED_MODELS } from '../../stores/settingsStore';
import { streamProxyChatSSE, streamDirectClaude } from '../../services/realtime.service';
import { switchInstanceModel } from '../../services/openclaw.service';
import { DeviceBridgingService } from '../../services/deviceBridging.service';
import { API_BASE } from '../../config/env';
import { useTokenQuota } from '../../hooks/useTokenQuota';
import type { AgentStackParamList } from '../../navigation/types';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioQueuePlayer } from '../../services/AudioQueuePlayer';

// expo-av: graceful degrade if missing
let Audio: any = null;
try { Audio = require('expo-av').Audio; } catch (_) {}

const VOICE_CANCEL_THRESHOLD = 70;
const MIN_VOICE_RECORD_MS = 350;

function getLowLatencyRecordingOptions() {
  if (!Audio) return null;
  return {
    android: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 32000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MEDIUM,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 32000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/webm',
      bitsPerSecond: 32000,
    },
  };
}

type RouteT = RouteProp<AgentStackParamList, 'AgentChat'>;

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  streaming?: boolean;
  error?: boolean;
  createdAt: number;
  thoughts?: string[]; // Added for Thought Chain UI
}

interface VoiceMetrics {
  recordedMs: number;
  transcribeMs: number;
  stopToSendMs: number;
  transcriptLength: number;
  capturedAt: number;
}

// Strip basic markdown: **bold** -> bold, *italic* -> italic
function renderContent(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1');
}

const MessageBubble = ({ item }: { item: Message }) => {
  const isUser = item.role === 'user';
  const hasThoughts = item.thoughts && item.thoughts.length > 0;
  const [isThoughtsExpanded, setIsThoughtsExpanded] = useState(true);

  return (
    <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
      {!isUser && (
        <View style={styles.avatarBot}>
          <Text style={styles.avatarBotText}>🤖</Text>
        </View>
      )}
      <View style={{ flex: 1, maxWidth: '100%' }}>
        {/* Thought Chain UI */}
        {!isUser && hasThoughts && (
          <View style={styles.thoughtContainer}>
            <TouchableOpacity 
              style={styles.thoughtHeader} 
              onPress={() => setIsThoughtsExpanded(!isThoughtsExpanded)}
              activeOpacity={0.7}
            >
              {item.streaming ? (
                <ActivityIndicator size="small" color={colors.textMuted} style={{ transform: [{ scale: 0.7 }] }} />
              ) : (
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{isThoughtsExpanded ? '▼' : '▶'}</Text>
              )}
              <Text style={styles.thoughtHeaderText}>
                {item.streaming ? 'Agent is executing workflow...' : `Execution Log (${item.thoughts?.length} steps)`}
              </Text>
            </TouchableOpacity>
            
            {isThoughtsExpanded && (
              <View style={styles.thoughtList}>
                {item.thoughts?.map((thought, idx) => {
                  // Try to parse structured tool calls or steps
                  const isTool = thought.includes('[Tool Call]') || thought.includes('Using skill:') || thought.includes('Searching');
                  const isError = thought.includes('Error') || thought.includes('Failed');
                  
                  return (
                    <View key={idx} style={styles.thoughtItemRow}>
                      <Text style={[styles.thoughtIcon, isTool && {color: colors.primary}, isError && {color: colors.error}]}>
                        {isError ? '❌' : isTool ? '⚡' : '›'}
                      </Text>
                      <Text style={[styles.thoughtItemText, isError && {color: colors.error}]}>
                        {thought.replace('[Tool Call]', '').trim()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Main Message Bubble */}
        {(item.content || item.streaming) && (
          <View
            style={[
              styles.bubble,
              isUser ? styles.bubbleUser : styles.bubbleBot,
              item.error && styles.bubbleError,
            ]}
          >
            <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
              {renderContent(item.content) || (item.streaming && !hasThoughts ? ' ' : '')}
            </Text>
            {item.streaming && (
              <ActivityIndicator size="small" color={colors.accent} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
            )}
          </View>
        )}
      </View>
    </View>
  );
};

export function AgentChatScreen() {
  const route = useRoute<RouteT>();
  const activeInstance = useAuthStore((s) => s.activeInstance);
  const { language, t } = useI18n();
  const instanceId = route.params?.instanceId || activeInstance?.id || '';
  const instanceName = route.params?.instanceName || activeInstance?.name || 'Agent';
  const token = useAuthStore.getState().token || '';
  const selectedModelId = useSettingsStore((s) => s.selectedModelId);
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel);

  const sessionIdRef = useRef<string>(`session-${Date.now()}`);
  const storageKey = `chat_hist_${instanceId}`;
  const streamAbortRef = useRef<AbortController | null>(null);
  const recordingRef = useRef<any>(null);
  const isRecordingRef = useRef(false);  // stable ref for press hold logic
  const recordingStartedAtRef = useRef(0);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hi! I'm **${instanceName}**. How can I help you today?`,
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [willCancelVoice, setWillCancelVoice] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);   // WeChat-style toggle
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);  // Auto TTS for agent replies
  const [lastVoiceMetrics, setLastVoiceMetrics] = useState<VoiceMetrics | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const audioPlayerRef = useRef<AudioQueuePlayer | null>(null);

  const voiceButtonLabel = isVoiceProcessing
    ? t({ en: '⏳  Transcribing...', zh: '⏳  转写中...' })
    : isRecording
      ? willCancelVoice
        ? t({ en: '❌  Release to Cancel', zh: '❌  松开取消' })
        : t({ en: '🔴  Release to Send', zh: '🔴  松开发送' })
      : t({ en: '🎙  Hold to Talk', zh: '🎙  按住说话' });

  const voiceHintText = willCancelVoice
    ? t({ en: 'Release now to cancel this recording', zh: '现在松开将取消本次录音' })
    : t({ en: 'Hold to record · slide up to cancel', zh: '按住录音 · 上滑取消' });

  const voiceMetricsText = lastVoiceMetrics
    ? t(
        {
          en: `Last voice: ${lastVoiceMetrics.recordedMs}ms rec · ${lastVoiceMetrics.transcribeMs}ms ASR · ${lastVoiceMetrics.stopToSendMs}ms stop→send`,
          zh: `上次语音：录音 ${lastVoiceMetrics.recordedMs}ms · 转写 ${lastVoiceMetrics.transcribeMs}ms · 停止到发送 ${lastVoiceMetrics.stopToSendMs}ms`,
        },
      )
    : null;

  // Init TTS audio queue player
  useEffect(() => {
    audioPlayerRef.current = new AudioQueuePlayer(() => setIsSpeaking(false));
    return () => { audioPlayerRef.current?.stopAll(); };
  }, []);

  // TTS helper — speaks text via backend /voice/tts endpoint
  const speakText = useCallback((text: string) => {
    if (!text || text.startsWith('⚠️') || text.startsWith('Error:')) return;
    setIsSpeaking(true);
    // Split sentences for streaming playback
    const sentences = text.match(/[^。！？.!?\n]+[。！？.!?\n]*/g) || [text];
    for (const s of sentences) {
      const trimmed = s.trim();
      if (!trimmed || trimmed.length < 2) continue;
      const encoded = encodeURIComponent(trimmed);
      audioPlayerRef.current?.enqueue(`${API_BASE}/voice/tts?text=${encoded}&lang=${language === 'zh' ? 'zh' : 'en'}`);
    }
  }, [language]);

  // Token quota for energy bar
  const { data: quota } = useTokenQuota();
  const used = quota?.usedTokens ?? 0;
  const total = quota?.totalQuota ?? 100000;
  const tokenPct = quota?.energyLevel ?? (total > 0 ? Math.min(100, (used / total) * 100) : 0);
  const tokenBarColor = tokenPct > 80 ? '#ef4444' : tokenPct > 50 ? '#f59e0b' : '#22c55e';

  // Load chat history on mount — first from local storage (instant), then try API
  useEffect(() => {
    if (!instanceId) return;
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (raw) {
        try {
          const saved: Message[] = JSON.parse(raw);
          if (Array.isArray(saved) && saved.length > 0) setMessages(saved);
        } catch {}
      }
    });
    loadHistory();
    return () => {
      // Cancel any in-flight stream on unmount
      streamAbortRef.current?.abort();
    };
  }, [instanceId]);

  // Persist messages to local storage whenever they change
  useEffect(() => {
    if (messages.length > 1) {
      const toSave = messages.filter((m) => !m.streaming).slice(-80);
      AsyncStorage.setItem(storageKey, JSON.stringify(toSave)).catch(() => {});
    }
  }, [messages]);

  const loadHistory = async () => {
    if (!instanceId || !token) return;
    try {
      setLoadingHistory(true);
      const _acH = new AbortController();
      const _tH = setTimeout(() => _acH.abort(), 6000);
      let resp: Response;
      try {
        resp = await fetch(
          `${API_BASE}/openclaw/proxy/${instanceId}/history?sessionId=${sessionIdRef.current}`,
          { headers: { Authorization: `Bearer ${token}` }, signal: _acH.signal },
        );
      } finally {
        clearTimeout(_tH);
      }
      if (!resp.ok) return;
      const data = await resp.json();
      const historyItems: any[] = Array.isArray(data) ? data : data.messages ?? [];
      if (historyItems.length > 0) {
        const historyMessages: Message[] = historyItems.map((m: any) => ({
          id: m.id || `hist-${Math.random()}`,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
        }));
        setMessages(historyMessages);
      }
    } catch {
      // Silently ignore — instance may not support history endpoint
    } finally {
      setLoadingHistory(false);
    }
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const appendToStreamingMessage = (msgId: string, chunk: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        
        // Simple heuristic to detect "thought" blocks (e.g., <thought>...</thought> or [Tool Call])
        // In a real app, this would be parsed from structured SSE events
        let newContent = m.content + chunk;
        let newThoughts = m.thoughts || [];
        
        if (chunk.includes('[Tool Call]') || chunk.includes('Thinking...')) {
           newThoughts = [...newThoughts, chunk.trim()];
           return { ...m, thoughts: newThoughts };
        }
        
        return { ...m, content: newContent };
      })
    );
  };

  // Build conversation history for Claude direct fallback
  const buildHistory = (msgs: Message[], newText: string) =>
    [
      ...msgs
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content.trim())
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: newText },
    ];

  const handleSend = async (overrideText?: string | any) => {
    const text = (typeof overrideText === 'string' ? overrideText : input).trim();
    if (!text || sending) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };

    const assistantMsgId = `assistant-${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      streaming: true,
      createdAt: Date.now(),
    };

    // Capture current messages before state update for history
    const currentMsgs = messages;
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setSending(true);
    streamAbortRef.current?.abort();

    try {
      await Haptics.selectionAsync();

      let streamSucceeded = false;

      // Try OpenClaw proxy first (requires active instance)
      if (instanceId) {
        await new Promise<void>((resolve) => {
          const ac = streamProxyChatSSE({
            instanceId,
            message: text,
            sessionId: sessionIdRef.current,
            token,
            model: selectedModelId,
            onChunk: (chunk) => {
              streamSucceeded = true;
              appendToStreamingMessage(assistantMsgId, chunk);
            },
            onDone: () => resolve(),
            onError: (_err) => resolve(), // silently fall through to direct Claude
          });
          streamAbortRef.current = ac;
        });
      }

      if (!streamSucceeded) {
        // Fallback: direct Claude via backend Bedrock key (always available)
        const history = buildHistory(currentMsgs, text);
        await new Promise<void>((resolve) => {
          const ac = streamDirectClaude({
            messages: history,
            token,
            model: selectedModelId,
            sessionId: sessionIdRef.current,
            onChunk: (chunk) => { streamSucceeded = true; appendToStreamingMessage(assistantMsgId, chunk); },
            onDone: () => resolve(),
            onError: (err) => {
              appendToStreamingMessage(assistantMsgId, `⚠️ ${err || 'Could not reach AI service. Check your connection.'}`);
              resolve();
            },
          });
          streamAbortRef.current = ac;
        });
      }

      // If stream ran but produced no content, show a friendly error
      setMessages((prev) => {
        let finalContent = '';
        const updated = prev.map((m) => {
          if (m.id !== assistantMsgId) return m;
          if (!m.content && !m.thoughts?.length) {
            return { ...m, content: '⚠️ No response received. Please check your connection or try again.', streaming: false, error: true };
          }
          finalContent = m.content;
          return { ...m, streaming: false };
        });
        // Auto-speak agent reply (if voice mode enabled or autoSpeak is on)
        if (finalContent && (voiceMode || autoSpeak) && !finalContent.startsWith('⚠️')) {
          setTimeout(() => speakText(finalContent), 200);
        }
        return updated;
      });
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: `Error: ${err?.message || 'Something went wrong'}`, streaming: false, error: true }
            : m
        )
      );
    } finally {
      setSending(false);
      streamAbortRef.current = null;
    }
  };

  const startVoiceRecording = useCallback(async () => {
    if (!Audio) {
      Alert.alert(
        t({ en: 'Voice Unavailable', zh: '语音不可用' }),
        t({ en: 'Audio module not available. Please type your message instead.', zh: '当前设备无法使用录音模块，请先改用文字输入。' }),
      );
      return;
    }
    if (isVoiceProcessing || isRecordingRef.current) return;
    try {
      isRecordingRef.current = true;
      const permResult = await Audio.requestPermissionsAsync();
      if (!permResult.granted) {
        isRecordingRef.current = false;
        Alert.alert(
          t({ en: 'Microphone Permission', zh: '需要麦克风权限' }),
          t({ en: 'Please enable microphone access in your device settings to use voice input.', zh: '请在系统设置中开启麦克风权限后再使用语音输入。' }),
        );
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      if (recordingRef.current) {
        try { await recordingRef.current.stopAndUnloadAsync(); } catch (_) {}
        recordingRef.current = null;
      }
      const options = getLowLatencyRecordingOptions() || Audio.RecordingOptionsPresets.HIGH_QUALITY;
      const { recording } = await Audio.Recording.createAsync(options);
      recordingRef.current = recording;
      recordingStartedAtRef.current = Date.now();
      setWillCancelVoice(false);
      setIsRecording(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e: any) {
      isRecordingRef.current = false;
      setIsRecording(false);
      setWillCancelVoice(false);
      const msg = e?.message || 'Unknown error';
      if (msg.includes('permission') || msg.includes('Permission')) {
        Alert.alert(
          t({ en: 'Microphone Permission', zh: '需要麦克风权限' }),
          t({ en: 'Please enable microphone access in Settings to use voice input.', zh: '请在设置中开启麦克风权限后再使用语音输入。' }),
        );
      } else {
        Alert.alert(
          t({ en: 'Voice Error', zh: '语音错误' }),
          t({ en: `Could not start recording: ${msg}\n\nTry typing your message instead.`, zh: `无法开始录音：${msg}\n\n你可以先改用文字输入。` }),
        );
      }
    }
  }, [isVoiceProcessing, t]);

  const finishVoiceRecording = useCallback(async (cancelled: boolean) => {
    if (!Audio || !recordingRef.current) {
      isRecordingRef.current = false;
      setIsRecording(false);
      setWillCancelVoice(false);
      return;
    }

    const recording = recordingRef.current;
    recordingRef.current = null;
    isRecordingRef.current = false;
    setIsRecording(false);
    setWillCancelVoice(false);

    try {
      await recording.stopAndUnloadAsync();
      const durationMs = Date.now() - recordingStartedAtRef.current;
      const stopAt = Date.now();
      const uri = recording.getURI();

      if (cancelled) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      if (durationMs < MIN_VOICE_RECORD_MS) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (uri) {
        setIsVoiceProcessing(true);
        try {
          const formData = new FormData();
          formData.append('audio', { uri, name: 'voice.m4a', type: 'audio/m4a' } as any);
          const ac = new AbortController();
          const timeout = setTimeout(() => ac.abort(), 20000);
          const resp = await fetch(`${API_BASE}/voice/transcribe?lang=${language === 'zh' ? 'zh' : 'en'}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
            signal: ac.signal,
          });
          clearTimeout(timeout);
          if (resp.ok) {
            const data = await resp.json();
            const transcript = (data?.text || data?.transcript || '').trim();
            if (transcript) {
              const transcribeMs = Date.now() - stopAt;
              const stopToSendMs = Date.now() - stopAt;
              setLastVoiceMetrics({
                recordedMs: durationMs,
                transcribeMs,
                stopToSendMs,
                transcriptLength: transcript.length,
                capturedAt: Date.now(),
              });
              await handleSend(transcript);
            } else {
              Alert.alert(
                t({ en: 'No Speech Detected', zh: '未检测到语音' }),
                t({ en: 'Could not detect any speech. Please try again or type your message.', zh: '没有识别到语音内容，请重试或改用文字输入。' }),
              );
            }
          } else {
            const errText = await resp.text().catch(() => '');
            Alert.alert(
              t({ en: 'Transcription Failed', zh: '转写失败' }),
              t({ en: `Server returned ${resp.status}. ${errText ? errText.slice(0, 100) : 'Try typing instead.'}`, zh: `服务返回 ${resp.status}。${errText ? errText.slice(0, 100) : '请先改用文字输入。'}` }),
            );
          }
        } catch (fetchErr: any) {
          const msg = fetchErr?.name === 'AbortError'
            ? t({ en: 'Transcription timed out. Try again or type your message.', zh: '语音转写超时，请重试或改用文字输入。' })
            : t({ en: `Could not reach voice service: ${fetchErr?.message || 'Network error'}`, zh: `无法连接语音服务：${fetchErr?.message || '网络错误'}` });
          Alert.alert(t({ en: 'Voice Error', zh: '语音错误' }), msg);
        } finally {
          setIsVoiceProcessing(false);
        }
      }
    } catch (e: any) {
      Alert.alert(
        t({ en: 'Voice Error', zh: '语音错误' }),
        e?.message || t({ en: 'Unknown error stopping recording', zh: '停止录音时发生未知错误' }),
      );
    } finally {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
      } catch (_) {}
    }
  }, [language, token, handleSend, t]);

  const voicePanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => voiceMode,
    onMoveShouldSetPanResponder: () => voiceMode,
    onPanResponderGrant: () => {
      void startVoiceRecording();
    },
    onPanResponderMove: (_evt, gestureState) => {
      if (!isRecordingRef.current) return;
      const shouldCancel = gestureState.dy < -VOICE_CANCEL_THRESHOLD;
      setWillCancelVoice((prev) => (prev === shouldCancel ? prev : shouldCancel));
    },
    onPanResponderRelease: (_evt, gestureState) => {
      void finishVoiceRecording(gestureState.dy < -VOICE_CANCEL_THRESHOLD);
    },
    onPanResponderTerminate: () => {
      void finishVoiceRecording(true);
    },
  }), [voiceMode, startVoiceRecording, finishVoiceRecording]);

  const openModelPicker = () => setShowModelPicker(true);

  const handleDeviceAction = () => {
    Alert.alert('Device Tools', 'Provide local device data to the Agent', [
      {
        text: '📍 Send GPS Location',
        onPress: async () => {
          try {
            const loc = await DeviceBridgingService.getCurrentLocation();
            handleSend(`[System] Current GPS Location:\nLatitude: ${loc.latitude}\nLongitude: ${loc.longitude}\nAccuracy: ${loc.accuracy}m`);
          } catch (e: any) {
            Alert.alert('Location Error', e.message);
          }
        }
      },
      {
        text: '📋 Paste Clipboard',
        onPress: async () => {
          try {
            const text = await DeviceBridgingService.readClipboard();
            if (!text) return Alert.alert('Clipboard Empty', 'Nothing to paste.');
            setInput((prev) => prev ? `${prev}\n${text}` : text);
          } catch (e: any) {
            Alert.alert('Clipboard Error', e.message);
          }
        }
      },
      {
        text: '🖼️ Analyze Photo',
        onPress: async () => {
          try {
            const base64 = await DeviceBridgingService.pickImageAsBase64();
            if (base64) {
              // Note: Sending base64 directly might be too large for typical chat prompts.
              // For a production app, you might upload it first and send a URL.
              handleSend(`[System: User attached an image]\n${base64.substring(0, 50)}... (base64 truncated)`);
              Alert.alert('Image Attached', 'Image data prepared for the agent.');
            }
          } catch (e: any) {
            Alert.alert('Photo Error', e.message);
          }
        }
      },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const handleClearChat = () => {
    Alert.alert('Start new session?', 'Chat history will be cleared.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'New Session',
        style: 'destructive',
        onPress: () => {
          streamAbortRef.current?.abort();
          sessionIdRef.current = `session-${Date.now()}`;
          AsyncStorage.removeItem(storageKey).catch(() => {});
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: `Hi! I\'m **${instanceName}**. How can I help you today?`,
            createdAt: Date.now(),
          }]);
        },
      },
    ]);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    return <MessageBubble item={item} />;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={88}
    >
      {/* Chat toolbar */}
      <View style={styles.chatBar}>
        <Text style={styles.chatBarTitle}>🤖 {instanceName}</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => {
              setAutoSpeak(!autoSpeak);
              if (isSpeaking) { audioPlayerRef.current?.stopAll(); setIsSpeaking(false); }
            }}
            style={[styles.chatBarBtn, autoSpeak && { backgroundColor: colors.primary + '30' }]}
          >
            <Text style={styles.chatBarBtnText}>{isSpeaking ? '🔊' : autoSpeak ? '🔈' : '🔇'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openModelPicker} style={styles.modelBtn}>
            <Text style={styles.modelBtnText} numberOfLines={1}>
              {SUPPORTED_MODELS.find((m) => m.id === selectedModelId)?.label ?? selectedModelId}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearChat} style={styles.chatBarBtn}>
            <Text style={styles.chatBarBtnText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Compact token energy bar */}
      <View style={styles.tokenBar}>
        <View style={[styles.tokenBarFill, { width: `${tokenPct}%` as any, backgroundColor: tokenBarColor }]} />
        <Text style={styles.tokenBarLabel}>{used.toLocaleString()} / {total.toLocaleString()} tokens</Text>
      </View>

      {loadingHistory && (
        <View style={styles.historyLoader}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.historyLoaderText}>Loading history…</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      />

      {/* Input bar — WeChat / Doubao style */}
      <View style={styles.inputRow}>
        {/* Left: voice/keyboard toggle */}
        <TouchableOpacity
          style={styles.modeToggleBtn}
          onPress={() => {
            setVoiceMode(!voiceMode);
            setIsRecording(false);
            setWillCancelVoice(false);
          }}
        >
          <Text style={styles.modeToggleIcon}>{voiceMode ? '⌨️' : '🎤'}</Text>
        </TouchableOpacity>

        {voiceMode ? (
          /* Voice mode: hold-to-talk button */
          <View style={styles.voiceComposerWrap}>
            <View
              {...voicePanResponder.panHandlers}
              style={[
                styles.holdTalkBtn,
                isRecording && styles.holdTalkBtnActive,
                willCancelVoice && styles.holdTalkBtnCancel,
                isVoiceProcessing && styles.holdTalkBtnProcessing,
              ]}
            >
              <Text style={[styles.holdTalkText, isVoiceProcessing && styles.holdTalkTextProcessing]}>
                {voiceButtonLabel}
              </Text>
            </View>
            <Text style={styles.voiceHintText}>{voiceHintText}</Text>
            {voiceMetricsText ? <Text style={styles.voiceMetricsText}>{voiceMetricsText}</Text> : null}
          </View>
        ) : (
          /* Text mode */
          <TextInput
            style={styles.input}
            placeholder={`Message ${instanceName}...`}
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
          />
        )}

        {/* Right: Device Action or Send */}
        {input.trim().length > 0 && !voiceMode ? (
          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendIcon}>⬆</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.deviceBtn} onPress={handleDeviceAction}>
            <Text style={styles.deviceIcon}>⊕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Model picker modal — enhanced with availability & backend sync */}
      <Modal visible={showModelPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowModelPicker(false)} activeOpacity={1}>
          <View style={styles.modelSheet}>
            <Text style={styles.modelSheetTitle}>Switch Model</Text>
            <Text style={styles.modelSheetSubtitle}>Applies to this agent (cloud & local)</Text>
            <ScrollView>
              {SUPPORTED_MODELS.map((m) => {
                const isActive = m.id === selectedModelId;
                const isAvailable = m.availability === 'available';
                const isComingSoon = m.availability === 'coming_soon';
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.modelOption,
                      isActive && styles.modelOptionActive,
                      !isAvailable && styles.modelOptionDisabled,
                    ]}
                    onPress={async () => {
                      if (!isAvailable) {
                        Alert.alert(m.label, isComingSoon ? 'This model is coming soon!' : 'Requires API key configuration.');
                        return;
                      }
                      setSelectedModel(m.id);
                      setShowModelPicker(false);
                      // Sync to backend for the active instance
                      if (instanceId) {
                        try {
                          const result = await switchInstanceModel(instanceId, m.id);
                          // Subtle toast-like feedback — don't block the UI
                          if (result.message) {
                            // Optional: show brief notification
                          }
                        } catch (err: any) {
                          // Model still set locally — backend sync is best-effort
                        }
                      }
                    }}
                  >
                    <View style={styles.modelOptionRow}>
                      <Text style={styles.modelOptionIcon}>{m.icon}</Text>
                      <View style={styles.modelOptionInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.modelOptionLabel, !isAvailable && { color: colors.textMuted }]}>{m.label}</Text>
                          {m.badge && (
                            <View style={[styles.modelBadge, isComingSoon && { backgroundColor: colors.textMuted + '30' }]}>
                              <Text style={[styles.modelBadgeText, isComingSoon && { color: colors.textMuted }]}>
                                {isComingSoon ? 'Soon' : m.badge}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.modelOptionProvider}>{m.provider}</Text>
                      </View>
                      {isActive && <Text style={styles.modelOptionCheck}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  chatBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatBarTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  chatBarBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.bgSecondary },
  chatBarBtnText: { color: colors.textMuted, fontSize: 12 },
  historyLoader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, justifyContent: 'center' },
  historyLoaderText: { color: colors.textMuted, fontSize: 13 },
  messageList: { padding: 16, paddingBottom: 8, gap: 12 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '85%' },
  msgRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  avatarBot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  avatarBotText: { fontSize: 16 },
  bubble: {
    flexDirection: 'column',
    borderRadius: 18,
    padding: 12,
    maxWidth: '100%',
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleError: { borderColor: colors.error, backgroundColor: colors.error + '15' },
  bubbleText: { color: colors.textPrimary, fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: colors.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },
  deviceBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceIcon: { color: colors.textPrimary, fontSize: 22, fontWeight: '400', marginTop: -2 },
  modeToggleBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  modeToggleIcon: { fontSize: 18 },
  voiceComposerWrap: {
    flex: 1,
    gap: 4,
  },
  holdTalkBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  holdTalkBtnActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  holdTalkBtnCancel: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  holdTalkBtnProcessing: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
  },
  holdTalkText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  holdTalkTextProcessing: { color: colors.textPrimary },
  voiceHintText: {
    color: colors.textMuted,
    fontSize: 11,
    paddingHorizontal: 6,
  },
  voiceMetricsText: {
    color: colors.accent,
    fontSize: 11,
    paddingHorizontal: 6,
  },
  tokenBar: {
    height: 18, backgroundColor: colors.bgSecondary,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden', position: 'relative',
  },
  tokenBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.35 },
  tokenBarLabel: { fontSize: 10, color: colors.textMuted, paddingHorizontal: 8, zIndex: 1 },
  modelBtn: {
    paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8,
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
    maxWidth: 140,
  },
  modelBtnText: { color: colors.accent, fontSize: 11, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000077' },
  modelSheet: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingTop: 16, paddingBottom: 32, maxHeight: '60%',
  },
  modelSheetTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 16, textAlign: 'center', marginBottom: 4 },
  modelSheetSubtitle: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 12 },
  modelOption: {
    paddingVertical: 12, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modelOptionActive: { backgroundColor: colors.bgSecondary },
  modelOptionDisabled: { opacity: 0.5 },
  modelOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modelOptionIcon: { fontSize: 22 },
  modelOptionInfo: { flex: 1 },
  modelOptionLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: '500' },
  modelOptionProvider: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  modelOptionCheck: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  modelBadge: { backgroundColor: colors.accent + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  modelBadgeText: { color: colors.accent, fontSize: 10, fontWeight: '700' },
  thoughtContainer: { backgroundColor: colors.bg, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  thoughtHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  thoughtHeaderText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  thoughtList: { marginTop: 6, gap: 4 },
  thoughtItemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  thoughtIcon: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  thoughtItemText: { fontSize: 12, color: colors.textMuted, flex: 1, lineHeight: 16 },
});
