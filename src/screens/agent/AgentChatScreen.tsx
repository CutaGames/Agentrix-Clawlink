import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, ScrollView, Linking,
  Dimensions,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore, SUPPORTED_MODELS, type ModelOption } from '../../stores/settingsStore';
import { streamProxyChatSSE, streamDirectClaude } from '../../services/realtime.service';
import { sendAgentMessage, switchInstanceModel } from '../../services/openclaw.service';
import { DeviceBridgingService } from '../../services/deviceBridging.service';
import { API_BASE } from '../../config/env';
import { useTokenQuota } from '../../hooks/useTokenQuota';
import type { AgentStackParamList } from '../../navigation/types';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioQueuePlayer } from '../../services/AudioQueuePlayer';
import {
  isLiveSpeechRecognitionAvailable,
  requestLiveSpeechPermissions,
  startLiveSpeechRecognition,
  type LiveSpeechController,
} from '../../services/liveSpeech.service';
import { useI18n } from '../../stores/i18nStore';
import { uploadChatAttachment, apiFetch, type UploadedChatAttachment } from '../../services/api';
import { CameraView, useCameraPermissions } from 'expo-camera';

// expo-av: graceful degrade if missing
let Audio: any = null;
try { Audio = require('expo-av').Audio; } catch (_) {}

type RouteT = RouteProp<AgentStackParamList, 'AgentChat'>;

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: UploadedChatAttachment[];
  streaming?: boolean;
  error?: boolean;
  createdAt: number;
  thoughts?: string[]; // Added for Thought Chain UI
}

function formatAttachmentSize(size?: number | null) {
  if (!size) return 'Unknown size';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function buildOutgoingMessageContent(text: string, attachments: UploadedChatAttachment[]) {
  const trimmed = text.trim();
  if (attachments.length === 0) return trimmed;

  const multimodalContent: any[] = [];
  if (trimmed) {
    multimodalContent.push({ type: 'text', text: trimmed });
  }

  attachments.forEach((attachment, index) => {
    if (attachment.kind === 'image') {
      multimodalContent.push({
        type: 'image',
        source: { type: 'url', url: attachment.publicUrl },
      });
    } else if (attachment.mimetype?.startsWith('audio/') || attachment.originalName.match(/\.(mp3|wav|m4a|ogg)$/i)) {
      multimodalContent.push({
        type: 'input_audio',
        input_audio: { url: attachment.publicUrl }
      });
    } else {
      multimodalContent.push({
        type: 'text',
        text: `[Attachment ${index + 1}: ${attachment.originalName}] URL: ${attachment.publicUrl}`
      });
    }
  });

  return multimodalContent;
}

function serializeMessageForModel(message: Message) {
  const content = buildOutgoingMessageContent(message.content, message.attachments || []);
  if (typeof content === 'string') return content;
  // If array (multimodal), we try to format as text for direct claude fallback
  // The SSE proxy can handle the array directly.
  return typeof message.content === 'string' ? message.content 
    + (message.attachments ? '\n' + message.attachments.map(a => `[Attachment: ${a.publicUrl}]`).join('\n') : '')
    : '[Multimodal Message]';
}

function dedupeUrls(urls: string[]) {
  return [...new Set(urls)];
}

function extractUrlsFromMessage(content: string) {
  const markdownImageUrls = Array.from(content.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)).map((match) => match[1]);
  const plainUrls = Array.from(content.matchAll(/https?:\/\/[^\s)]+/g)).map((match) => match[0].replace(/[),.;]+$/, ''));
  const allUrls = dedupeUrls([...markdownImageUrls, ...plainUrls]);
  const imageUrls = allUrls.filter((url) => /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(url));
  const audioUrls = allUrls.filter((url) => /\.(mp3|wav|m4a|ogg|aac|flac|opus|wma)(\?.*)?$/i.test(url));
  const fileUrls = allUrls.filter((url) => !imageUrls.includes(url) && !audioUrls.includes(url) && /(\/api\/uploads\/|\.(pdf|txt|md|csv|json|docx?|xlsx?|pptx?))(\?.*)?$/i.test(url));
  return { imageUrls, audioUrls, fileUrls };
}

function getCopyableMessageText(message: Message) {
  const attachmentLines = (message.attachments || []).map((attachment) => `${attachment.originalName}: ${attachment.publicUrl}`);
  return [message.content.trim(), ...attachmentLines].filter(Boolean).join('\n');
}

function buildDisplayMessageText(content: string) {
  if (!content) return '';

  const { imageUrls, audioUrls, fileUrls } = extractUrlsFromMessage(content);
  let display = content
    .replace(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g, '')
    .replace(/\[User Attachments\][\s\S]*$/g, '')
    .trim();

  for (const url of [...imageUrls, ...audioUrls, ...fileUrls]) {
    display = display.replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
  }

  return renderContent(display)
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// Strip basic markdown: **bold** -> bold, *italic* -> italic
function renderContent(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1');
}

// Inline audio player for audio URLs in messages
const InlineAudioPlayer = ({ uri }: { uri: string }) => {
  const { t } = useI18n();
  const [playing, setPlaying] = useState(false);
  const soundRef = useRef<any>(null);

  const togglePlay = useCallback(async () => {
    if (!Audio) {
      Alert.alert(t({ en: 'Audio Unavailable', zh: '音频不可用' }));
      return;
    }
    try {
      if (playing && soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setPlaying(false);
        return;
      }
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      soundRef.current = sound;
      setPlaying(true);
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
          setPlaying(false);
        }
      });
    } catch (e: any) {
      setPlaying(false);
      Alert.alert(t({ en: 'Playback Error', zh: '播放错误' }), e?.message || '');
    }
  }, [playing, uri, t]);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  return (
    <TouchableOpacity style={styles.audioPlayerCard} onPress={togglePlay} activeOpacity={0.7}>
      <Text style={styles.audioPlayerIcon}>{playing ? '⏹️' : '▶️'}</Text>
      <View style={styles.audioPlayerMeta}>
        <Text style={styles.audioPlayerLabel}>{playing ? t({ en: 'Playing...', zh: '播放中…' }) : t({ en: 'Audio message', zh: '音频消息' })}</Text>
        <Text style={styles.audioPlayerUrl} numberOfLines={1}>{uri}</Text>
      </View>
    </TouchableOpacity>
  );
};

const MessageBubble = ({
  item,
  onSpeak,
  onStopSpeaking,
  speakingMessageId,
  onPreviewImage,
}: {
  item: Message;
  onSpeak: (message: Message) => void;
  onStopSpeaking: () => void;
  speakingMessageId: string | null;
  onPreviewImage: (uri: string) => void;
}) => {
  const { t } = useI18n();
  const isUser = item.role === 'user';
  const hasThoughts = item.thoughts && item.thoughts.length > 0;
  const [isThoughtsExpanded, setIsThoughtsExpanded] = useState(true);
  const bubbleText = buildDisplayMessageText(item.content) || (item.streaming ? '...' : '');
  const { imageUrls, audioUrls, fileUrls } = extractUrlsFromMessage(item.content || '');
  const canSpeak = !isUser && !!bubbleText && !item.streaming && !item.error;
  const isThisMessageSpeaking = speakingMessageId === item.id;

  const handleCopy = useCallback(async () => {
    const text = getCopyableMessageText(item);
    if (!text) return;
    await DeviceBridgingService.writeClipboard(text);
    Haptics.selectionAsync().catch(() => {});
    Alert.alert(t({ en: 'Copied', zh: '已复制' }), t({ en: 'Message copied to clipboard.', zh: '消息已复制到剪贴板。' }));
  }, [item, t]);

  const openExternalUrl = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t({ en: 'Open Failed', zh: '打开失败' }), url);
    }
  }, [t]);

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
                {item.streaming ? t({ en: 'Agent is executing workflow...', zh: '智能体正在执行工作流…' }) : t({ en: `Execution Log (${item.thoughts?.length} steps)`, zh: `执行日志（${item.thoughts?.length} 步）` })}
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
        {(bubbleText || item.streaming) && (
          <View
            style={[
              styles.bubble,
              isUser ? styles.bubbleUser : styles.bubbleBot,
              item.error && styles.bubbleError,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                isUser && styles.bubbleTextUser,
                item.streaming && !item.content && styles.bubbleTextPending,
              ]}
              selectable
            >
              {bubbleText}
            </Text>
            {item.streaming && (
              <ActivityIndicator size="small" color={colors.accent} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
            )}
            {!item.streaming && (canSpeak || !!getCopyableMessageText(item)) && (
              <View style={styles.bubbleActions}>
                {canSpeak && (
                  <TouchableOpacity style={styles.copyBtn} onPress={() => (isThisMessageSpeaking ? onStopSpeaking() : onSpeak(item))}>
                    <Text style={styles.copyBtnText}>
                      {isThisMessageSpeaking ? t({ en: 'Stop Audio', zh: '停止朗读' }) : t({ en: 'Play Audio', zh: '朗读' })}
                    </Text>
                  </TouchableOpacity>
                )}
                {!!getCopyableMessageText(item) && (
                  <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                    <Text style={styles.copyBtnText}>{t({ en: 'Copy', zh: '复制' })}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
        {!!item.attachments?.length && (
          <View style={styles.attachmentList}>
            {item.attachments.map((attachment) => (
              <TouchableOpacity
                key={`${item.id}-${attachment.fileName}`}
                style={styles.attachmentCard}
                activeOpacity={0.8}
                onPress={() => attachment.isImage ? onPreviewImage(attachment.publicUrl) : openExternalUrl(attachment.publicUrl)}
              >
                {attachment.isImage ? (
                  <Image source={{ uri: attachment.publicUrl }} style={styles.attachmentImage} resizeMode="cover" />
                ) : (
                  <View style={styles.attachmentFileIconWrap}>
                    <Text style={styles.attachmentFileIcon}>📎</Text>
                  </View>
                )}
                <View style={styles.attachmentMeta}>
                  <Text style={styles.attachmentName} numberOfLines={1}>{attachment.originalName}</Text>
                  <Text style={styles.attachmentSub} numberOfLines={1}>
                    {attachment.mimetype} · {formatAttachmentSize(attachment.size)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {!!imageUrls.length && (
          <View style={styles.attachmentList}>
            {imageUrls.map((url) => (
              <TouchableOpacity key={`${item.id}-${url}`} style={styles.attachmentCard} activeOpacity={0.8} onPress={() => onPreviewImage(url)}>
                <Image source={{ uri: url }} style={styles.attachmentImage} resizeMode="cover" />
                <View style={styles.attachmentMeta}>
                  <Text style={styles.attachmentName} numberOfLines={1}>{t({ en: 'Generated image', zh: '生成图片' })}</Text>
                  <Text style={styles.attachmentSub} numberOfLines={1}>{url}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {!!audioUrls.length && (
          <View style={styles.attachmentList}>
            {audioUrls.map((url) => (
              <InlineAudioPlayer key={`${item.id}-audio-${url}`} uri={url} />
            ))}
          </View>
        )}
        {!!fileUrls.length && (
          <View style={styles.attachmentList}>
            {fileUrls.map((url) => (
              <TouchableOpacity key={`${item.id}-${url}`} style={styles.attachmentCard} activeOpacity={0.8} onPress={() => openExternalUrl(url)}>
                <View style={styles.attachmentFileIconWrap}>
                  <Text style={styles.attachmentFileIcon}>📎</Text>
                </View>
                <View style={styles.attachmentMeta}>
                  <Text style={styles.attachmentName} numberOfLines={1}>{t({ en: 'Generated file', zh: '生成文件' })}</Text>
                  <Text style={styles.attachmentSub} numberOfLines={1}>{url}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

export function AgentChatScreen() {
  const route = useRoute<RouteT>();
  const { t, language } = useI18n();
  const activeInstance = useAuthStore((s) => s.activeInstance);
  const instanceId = route.params?.instanceId || activeInstance?.id || '';
  const instanceName = route.params?.instanceName || activeInstance?.name || 'Agent';
  const voiceModeRequested = !!route.params?.voiceMode;
  const token = useAuthStore.getState().token || '';
  const selectedModelId = useSettingsStore((s) => s.selectedModelId);
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel);

  // Dynamic model list from backend (platform default + user's configured providers)
  const [availableModels, setAvailableModels] = useState<ModelOption[]>(SUPPORTED_MODELS);
  // The ACTUAL model this agent is running on (resolved by backend)
  const [resolvedModelLabel, setResolvedModelLabel] = useState<string | null>(null);
  // Per-agent preferred model (from agent account)
  const [agentPreferredModel, setAgentPreferredModel] = useState<string | null>(null);
  const [agentVoiceId, setAgentVoiceId] = useState<string | null>(null);
  // The effective model ID to display and send
  const effectiveModelId = agentPreferredModel || selectedModelId;

  const sessionIdRef = useRef<string>(`session-${Date.now()}`);
  const storageKey = `chat_hist_${instanceId}`;
  const draftStorageKey = `chat_draft_${instanceId}`;
  const streamAbortRef = useRef<AbortController | null>(null);
  const recordingRef = useRef<any>(null);
  const isRecordingRef = useRef(false);  // stable ref for press hold logic

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: t({ en: `Hi! I'm **${instanceName}**, your personal AI agent. What would you like to do next?`, zh: `你好！我是 **${instanceName}**，你的个人智能体。接下来想让我帮你做什么？` }),
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceMode, setVoiceMode] = useState(voiceModeRequested);   // WeChat-style toggle
  const [voiceInteractionMode, setVoiceInteractionMode] = useState<'hold' | 'tap'>('hold');
  const [duplexMode, setDuplexMode] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<UploadedChatAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [showAttachToolbar, setShowAttachToolbar] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);  // Auto TTS for agent replies
  const [voicePhase, setVoicePhase] = useState<'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking'>('idle');
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const [liveVoiceAvailable, setLiveVoiceAvailable] = useState(false);
  const [liveListening, setLiveListening] = useState(false);
  const [liveVoiceVolume, setLiveVoiceVolume] = useState(-2);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const cameraRef = useRef<any>(null);
  const audioPlayerRef = useRef<AudioQueuePlayer | null>(null);
  const isNearBottomRef = useRef(true);
  const activeAssistantMessageIdRef = useRef<string | null>(null);
  const responseInterruptedRef = useRef(false);
  const pendingTtsSentenceRef = useRef('');
  const streamedTtsStartedRef = useRef(false);
  const liveSpeechRef = useRef<LiveSpeechController | null>(null);
  const liveSpeechManualStopRef = useRef(false);
  const lastLiveFinalTranscriptRef = useRef('');
  const duplexModeRef = useRef(duplexMode);
  const sendingRef = useRef(false);
  const handleSendRef = useRef<(overrideText?: string | any, overrideAttachments?: UploadedChatAttachment[]) => Promise<void>>(async () => {});
  const resumeLiveSpeechRef = useRef<() => void>(() => {});
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const voiceRecordingOptions = Audio ? {
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
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 32000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {},
  } : null;

  const voiceLanguageHint = language === 'zh' ? 'zh' : 'en';

  useEffect(() => {
    duplexModeRef.current = duplexMode;
  }, [duplexMode]);

  useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);

  useEffect(() => {
    setLiveVoiceAvailable(isLiveSpeechRecognitionAvailable());
  }, []);

  const stopLiveSpeech = useCallback((abort = false, manual = false) => {
    liveSpeechManualStopRef.current = manual;
    const liveSpeech = liveSpeechRef.current;
    liveSpeechRef.current = null;
    setLiveListening(false);
    setLiveVoiceVolume(-2);
    if (!liveSpeech) return;
    try {
      if (abort) {
        liveSpeech.abort();
      } else {
        liveSpeech.stop();
      }
    } catch {}
  }, []);

  // Init TTS audio queue player
  useEffect(() => {
    audioPlayerRef.current = new AudioQueuePlayer(() => {
      setIsSpeaking(false);
      setVoicePhase((prev) => (prev === 'speaking' ? 'idle' : prev));
      activeAssistantMessageIdRef.current = null;
      resumeLiveSpeechRef.current();
    });
    return () => {
      audioPlayerRef.current?.stopAll();
      stopLiveSpeech(true, true);
    };
  }, [stopLiveSpeech]);

  useEffect(() => {
    if (voiceModeRequested) {
      setVoiceMode(true);
    }
  }, [voiceModeRequested]);

  useEffect(() => {
    if (!voiceMode) {
      setVoicePhase('idle');
      setIsRecording(false);
      isRecordingRef.current = false;
      stopLiveSpeech(true, true);
    }
  }, [stopLiveSpeech, voiceMode]);

  useEffect(() => {
    if (duplexMode) {
      setVoiceMode(true);
      setAutoSpeak(true);
      setVoiceInteractionMode('tap');
    } else if (voiceInteractionMode === 'tap') {
      setVoiceInteractionMode('hold');
    }
  }, [duplexMode, voiceInteractionMode]);

  // TTS helper — speaks text via backend /voice/tts endpoint
  const speakText = useCallback((text: string) => {
    if (!text || text.startsWith('⚠️') || text.startsWith('Error:')) return;
    if (duplexModeRef.current) {
      stopLiveSpeech(true, false);
    }
    setIsSpeaking(true);
    setVoicePhase((prev) => (prev === 'recording' || prev === 'transcribing' ? prev : 'speaking'));
    // Split sentences for streaming playback
    const sentences = text.match(/[^。！？.!?\n]+[。！？.!?\n]*/g) || [text];
    for (const s of sentences) {
      const trimmed = s.trim();
      if (!trimmed || trimmed.length < 2) continue;
      const encoded = encodeURIComponent(trimmed);
      const url = `${API_BASE}/voice/tts?text=${encoded}${agentVoiceId ? `&voice=${agentVoiceId}` : ''}`;
      audioPlayerRef.current?.enqueue(url, trimmed, voiceLanguageHint === 'zh' ? 'zh-CN' : 'en-US');
    }
  }, [agentVoiceId, stopLiveSpeech, voiceLanguageHint]);

  const stopSpeaking = useCallback(() => {
    audioPlayerRef.current?.stopAll();
    setIsSpeaking(false);
    setVoicePhase((prev) => (prev === 'speaking' ? 'idle' : prev));
    activeAssistantMessageIdRef.current = null;
  }, []);

  const handleSpeakMessage = useCallback((message: Message) => {
    const text = buildDisplayMessageText(message.content);
    if (!text) return;
    activeAssistantMessageIdRef.current = message.id;
    speakText(text);
  }, [speakText]);

  const enqueueStreamedSpeech = useCallback((chunk: string, flush = false) => {
    if (!(voiceMode || autoSpeak)) return;

    if (duplexModeRef.current) {
      stopLiveSpeech(true, false);
    }

    if (chunk) {
      pendingTtsSentenceRef.current += chunk;
    }

    const sentenceRegex = /[^。！？.!?\n]+[。！？.!?\n]+/g;
    const matches = pendingTtsSentenceRef.current.match(sentenceRegex) || [];
    const shouldEarlyFlush =
      !matches.length &&
      pendingTtsSentenceRef.current.trim().length >= 36 &&
      /[，,、:;； ]/.test(pendingTtsSentenceRef.current);

    let segmentsToSpeak = matches.map((sentence) => sentence.trim()).filter(Boolean);

    if (shouldEarlyFlush) {
      const earlySegment = pendingTtsSentenceRef.current.trim();
      if (earlySegment) {
        segmentsToSpeak = [earlySegment];
        pendingTtsSentenceRef.current = '';
      }
    }

    if (segmentsToSpeak.length > 0) {
      setIsSpeaking(true);
      setVoicePhase((prev) => (prev === 'recording' || prev === 'transcribing' ? prev : 'speaking'));
      streamedTtsStartedRef.current = true;
      for (const sentence of segmentsToSpeak) {
        const url = `${API_BASE}/voice/tts?text=${encodeURIComponent(sentence)}${agentVoiceId ? `&voice=${agentVoiceId}` : ''}`;
          audioPlayerRef.current?.enqueue(url, sentence, voiceLanguageHint === 'zh' ? 'zh-CN' : 'en-US');
      }
      if (!shouldEarlyFlush) {
        pendingTtsSentenceRef.current = pendingTtsSentenceRef.current.slice(matches.join('').length);
      }
    }

    if (flush) {
      const remainder = pendingTtsSentenceRef.current.trim();
      if (remainder) {
        setIsSpeaking(true);
        setVoicePhase((prev) => (prev === 'recording' || prev === 'transcribing' ? prev : 'speaking'));
        streamedTtsStartedRef.current = true;
        const url = `${API_BASE}/voice/tts?text=${encodeURIComponent(remainder)}${agentVoiceId ? `&voice=${agentVoiceId}` : ''}`;
        audioPlayerRef.current?.enqueue(url, remainder, voiceLanguageHint === 'zh' ? 'zh-CN' : 'en-US');
      }
      pendingTtsSentenceRef.current = '';
    }
  }, [autoSpeak, voiceMode, agentVoiceId, stopLiveSpeech, voiceLanguageHint]);

  // Token quota for energy bar
  const { data: quota } = useTokenQuota();
  const used = quota?.usedTokens ?? 0;
  const total = quota?.totalQuota ?? 100000;
  const tokenPct = quota?.energyLevel ?? (total > 0 ? Math.min(100, (used / total) * 100) : 0);
  const tokenBarColor = tokenPct > 80 ? '#ef4444' : tokenPct > 50 ? '#f59e0b' : '#22c55e';

  // Fetch dynamic model list from backend and per-agent model
  useEffect(() => {
    (async () => {
      try {
        const models = await apiFetch<Array<{ id: string; label: string; provider: string; providerId: string; costTier: string; positioning?: string; isDefault?: boolean }>>('/ai-providers/available-models');
        if (Array.isArray(models) && models.length > 0) {
          setAvailableModels(models.map((m) => ({
            id: m.id,
            label: m.label,
            provider: m.provider,
            icon: m.isDefault ? '🤖' : '💎',
            availability: 'available' as const,
            costTier: m.costTier,
          })));
        }
      } catch {}
      // Load per-agent preferred model from the bound agent account
      try {
        const agentAccountId = activeInstance?.metadata?.agentAccountId;
        if (agentAccountId) {
          const { getAgentPresenceAccount } = await import('../../services/agentPresenceAccount');
          const agent = await getAgentPresenceAccount(agentAccountId);
          if (agent.preferredModel) {
            setAgentPreferredModel(agent.preferredModel);
          }
          if (agent.metadata?.voice_id) {
            setAgentVoiceId(agent.metadata.voice_id);
          }
        }
      } catch {}
    })();
  }, [instanceId, activeInstance?.metadata?.agentAccountId]);

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
    AsyncStorage.getItem(draftStorageKey).then((rawDraft) => {
      if (typeof rawDraft === 'string') {
        setInput(rawDraft);
      }
    });
    loadHistory();
    return () => {
      // Cancel any in-flight stream on unmount
      streamAbortRef.current?.abort();
    };
  }, [draftStorageKey, instanceId, storageKey]);

  // Persist messages to local storage whenever they change
  useEffect(() => {
    if (messages.length > 1) {
      const toSave = messages.filter((m) => !m.streaming).slice(-80);
      AsyncStorage.setItem(storageKey, JSON.stringify(toSave)).catch(() => {});
    }
  }, [messages]);

  useEffect(() => {
    AsyncStorage.setItem(draftStorageKey, input).catch(() => {});
  }, [draftStorageKey, input]);

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
          attachments: Array.isArray(m.attachments) ? m.attachments : undefined,
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

  const scrollToBottom = useCallback((force = false) => {
    if (!force && !isNearBottomRef.current) return;
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;
    scrollToBottom(lastMessage.role === 'user');
  }, [messages.length, scrollToBottom]);

  const resetVoicePhaseAfterResponse = useCallback(() => {
    setVoicePhase((prev) => (prev === 'recording' || prev === 'transcribing' ? prev : 'idle'));
  }, []);

  const resetAudioModeAfterRecording = useCallback(async () => {
    if (!Audio) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    } catch {}
  }, [Audio]);

  const stopCurrentResponse = useCallback((showInterruptedHint = false) => {
    responseInterruptedRef.current = true;
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    pendingTtsSentenceRef.current = '';
    streamedTtsStartedRef.current = false;
    setSending(false);
    const activeMessageId = activeAssistantMessageIdRef.current;
    if (!activeMessageId) return;

    setMessages((prev) => prev.map((m) => {
      if (m.id !== activeMessageId || !m.streaming) return m;
      if (m.content || m.thoughts?.length) {
        return { ...m, streaming: false };
      }
      return {
        ...m,
        content: showInterruptedHint
          ? t({ en: 'Reply stopped. You can continue speaking.', zh: '当前回复已停止，你可以继续说话。' })
          : m.content,
        streaming: false,
      };
    }));

    activeAssistantMessageIdRef.current = null;
  }, [t]);

  const startLiveSpeech = useCallback(async () => {
    if (!duplexModeRef.current || liveSpeechRef.current || !liveVoiceAvailable || !voiceMode) {
      return;
    }

    const permission = await requestLiveSpeechPermissions();
    if (!permission?.granted) {
      Alert.alert(
        t({ en: 'Speech Permission', zh: '语音权限' }),
        t({ en: 'Realtime voice needs microphone and speech recognition permissions.', zh: '实时语音需要麦克风和语音识别权限。' }),
      );
      return;
    }

    liveSpeechManualStopRef.current = false;
    lastLiveFinalTranscriptRef.current = '';
    liveSpeechRef.current = startLiveSpeechRecognition(
      voiceLanguageHint,
      {
        onStart: () => {
          setLiveListening(true);
          setVoicePhase('recording');
          setTranscriptPreview('');
        },
        onEnd: () => {
          liveSpeechRef.current = null;
          setLiveListening(false);
          setLiveVoiceVolume(-2);
          if (!duplexModeRef.current || liveSpeechManualStopRef.current) {
            setVoicePhase((prev) => (prev === 'recording' ? 'idle' : prev));
            return;
          }
          if (sendingRef.current || isSpeaking) {
            return;
          }
          setTimeout(() => {
            void startLiveSpeech();
          }, 300);
        },
        onSpeechStart: () => {
          if (isSpeaking) {
            stopSpeaking();
          }
        },
        onInterimResult: (transcript) => {
          setTranscriptPreview(transcript);
          setVoicePhase('recording');
        },
        onFinalResult: (transcript) => {
          const normalized = transcript.trim();
          if (!normalized || normalized === lastLiveFinalTranscriptRef.current) {
            return;
          }
          lastLiveFinalTranscriptRef.current = normalized;
          setTranscriptPreview(normalized);
          stopLiveSpeech(true, false);
          if (isSpeaking) {
            stopSpeaking();
          }
          stopCurrentResponse(true);
          setVoicePhase('thinking');
          setTimeout(() => {
            void handleSendRef.current(normalized);
          }, 60);
        },
        onError: (error) => {
          if (error?.error === 'aborted' || error?.error === 'no-speech') {
            return;
          }
          setLiveListening(false);
          setVoicePhase('idle');
          setTranscriptPreview('');
        },
        onVolumeChange: (value) => {
          setLiveVoiceVolume(value);
        },
      },
      [instanceName, agentVoiceId || '', 'Agentrix', 'OpenClaw'],
    );
  }, [agentVoiceId, instanceName, isSpeaking, liveVoiceAvailable, stopCurrentResponse, stopLiveSpeech, stopSpeaking, t, voiceLanguageHint, voiceMode]);

  resumeLiveSpeechRef.current = () => {
    if (!duplexModeRef.current || sendingRef.current || isSpeaking || !voiceMode) {
      return;
    }
    void startLiveSpeech();
  };

  useEffect(() => {
    if (duplexMode) {
      void startLiveSpeech();
      return;
    }
    stopLiveSpeech(true, true);
  }, [duplexMode, startLiveSpeech, stopLiveSpeech]);

  useEffect(() => {
    if (duplexMode && voiceMode && !sending && !isSpeaking) {
      void startLiveSpeech();
    }
  }, [duplexMode, isSpeaking, sending, startLiveSpeech, voiceMode]);

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
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: serializeMessageForModel(m) })),
      { role: 'user' as const, content: newText },
    ];

  const enqueueAttachment = useCallback(async (localAttachment: {
    uri: string;
    fileName: string;
    mimeType: string;
  }) => {
    try {
      setUploadingAttachment(true);
      const uploaded = await uploadChatAttachment({
        uri: localAttachment.uri,
        name: localAttachment.fileName,
        type: localAttachment.mimeType,
      });
      setPendingAttachments((prev) => [...prev, uploaded]);
      await Haptics.selectionAsync();
    } catch (error: any) {
      Alert.alert(t({ en: 'Attachment Error', zh: '附件错误' }), error?.message || t({ en: 'Failed to upload attachment.', zh: '上传附件失败。' }));
    } finally {
      setUploadingAttachment(false);
    }
  }, [t]);

  const removePendingAttachment = useCallback((fileName: string) => {
    setPendingAttachments((prev) => prev.filter((attachment) => attachment.fileName !== fileName));
  }, []);

  const handleSend = async (overrideText?: string | any, overrideAttachments?: UploadedChatAttachment[]) => {
    const rawText = typeof overrideText === 'string' ? overrideText : input;
    const text = rawText.trim();
    const attachments = overrideAttachments ?? pendingAttachments;
    if ((!text && attachments.length === 0) || sending || uploadingAttachment) return;

    const outgoingText = buildOutgoingMessageContent(text, attachments);

    if (voiceMode || voicePhase !== 'idle') {
      setVoicePhase('thinking');
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      attachments,
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
    responseInterruptedRef.current = false;
    pendingTtsSentenceRef.current = '';
    streamedTtsStartedRef.current = false;
    activeAssistantMessageIdRef.current = assistantMsgId;
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setPendingAttachments([]);
    AsyncStorage.removeItem(draftStorageKey).catch(() => {});
    setTranscriptPreview('');
    setSending(true);
    streamAbortRef.current?.abort();

    try {
      await Haptics.selectionAsync();

      let streamSucceeded = false;
      let proxyFailureMessage: string | null = null;

      // Try OpenClaw proxy first (requires active instance)
      if (instanceId) {
        await new Promise<void>((resolve) => {
          const ac = streamProxyChatSSE({
            instanceId,
            message: outgoingText,
            sessionId: sessionIdRef.current,
            token,
            model: effectiveModelId,
            voiceId: agentVoiceId || undefined,
            onMeta: (meta) => {
              if (meta.resolvedModelLabel) setResolvedModelLabel(meta.resolvedModelLabel);
            },
            onChunk: (chunk) => {
              streamSucceeded = true;
              resetVoicePhaseAfterResponse();
              appendToStreamingMessage(assistantMsgId, chunk);
              enqueueStreamedSpeech(chunk);
            },
            onDone: () => resolve(),
            onError: (err) => {
              proxyFailureMessage = err || t({ en: 'OpenClaw agent connection failed.', zh: 'OpenClaw 智能体连接失败。' });
              resolve();
            },
          });
          streamAbortRef.current = ac;
        });
      }

      if (responseInterruptedRef.current) return;

      if (!streamSucceeded) {
        if (instanceId) {
          try {
            const proxyResult = await sendAgentMessage(instanceId, outgoingText, sessionIdRef.current, effectiveModelId);
            const proxyReply = typeof proxyResult?.reply === 'string'
              ? proxyResult.reply
              : proxyResult?.reply?.content || '';

            if (proxyReply) {
              streamSucceeded = true;
              resetVoicePhaseAfterResponse();
              appendToStreamingMessage(assistantMsgId, proxyReply);
              enqueueStreamedSpeech(proxyReply, true);
            }
          } catch (error: any) {
            proxyFailureMessage = error?.message || proxyFailureMessage || t({ en: 'OpenClaw agent is unavailable right now.', zh: 'OpenClaw 智能体当前不可用。' });
          }
        }
      }

      if (!streamSucceeded) {
        if (instanceId) {
          const message = proxyFailureMessage || t({ en: 'OpenClaw agent is offline. Reconnect the agent or try again shortly.', zh: 'OpenClaw 智能体当前离线，请重新连接后再试。' });
          resetVoicePhaseAfterResponse();
          appendToStreamingMessage(assistantMsgId, `⚠️ ${message}`);
        } else {
          const history = buildHistory(currentMsgs, outgoingText);
          await new Promise<void>((resolve) => {
            const ac = streamDirectClaude({
              messages: history,
              token,
              model: effectiveModelId,
              sessionId: sessionIdRef.current,
              onChunk: (chunk) => {
                streamSucceeded = true;
                resetVoicePhaseAfterResponse();
                appendToStreamingMessage(assistantMsgId, chunk);
                enqueueStreamedSpeech(chunk);
              },
              onDone: () => resolve(),
              onError: (err) => {
                resetVoicePhaseAfterResponse();
                appendToStreamingMessage(assistantMsgId, `⚠️ ${err || t({ en: 'Could not reach AI service. Check your connection.', zh: '无法连接 AI 服务，请检查网络后重试。' })}`);
                resolve();
              },
            });
            streamAbortRef.current = ac;
          });
        }
      }

      if (responseInterruptedRef.current) return;

      // If stream ran but produced no content, show a friendly error
      setMessages((prev) => {
        let finalContent = '';
        const updated = prev.map((m) => {
          if (m.id !== assistantMsgId) return m;
          if (!m.streaming) {
            finalContent = m.content;
            return m;
          }
          if (!m.content && !m.thoughts?.length) {
            return { ...m, content: t({ en: '⚠️ No response received. Please check your connection or try again.', zh: '⚠️ 暂未收到回复，请检查网络或稍后重试。' }), streaming: false, error: true };
          }
          finalContent = m.content;
          return { ...m, streaming: false };
        });
        if (finalContent && !finalContent.startsWith('⚠️')) {
          enqueueStreamedSpeech('', true);
        }
        // Auto-speak agent reply only when the stream did not already start sentence playback.
        if (finalContent && (voiceMode || autoSpeak) && !finalContent.startsWith('⚠️') && !streamedTtsStartedRef.current) {
          setTimeout(() => speakText(finalContent), 200);
        }
        return updated;
      });
    } catch (err: any) {
      resetVoicePhaseAfterResponse();
      if (responseInterruptedRef.current) {
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: `${t({ en: 'Error', zh: '错误' })}: ${err?.message || t({ en: 'Something went wrong', zh: '发生了一些问题' })}`, streaming: false, error: true }
            : m
        )
      );
    } finally {
      if (activeAssistantMessageIdRef.current === assistantMsgId) {
        activeAssistantMessageIdRef.current = null;
      }
      resetVoicePhaseAfterResponse();
      setSending(false);
      streamAbortRef.current = null;
      if (!streamedTtsStartedRef.current) {
        resumeLiveSpeechRef.current();
      }
    }
  };

  handleSendRef.current = handleSend;

  const startVoiceRecording = useCallback(async () => {
    if (!Audio) {
      Alert.alert(t({ en: 'Voice Unavailable', zh: '语音不可用' }), t({ en: 'Audio module not available. Please type your message instead.', zh: '当前音频模块不可用，请改用文字输入。' }));
      return;
    }
    if (voicePhase === 'transcribing') {
      Alert.alert(
        t({ en: 'Voice Busy', zh: '语音处理中' }),
        t({ en: 'The previous recording is still being transcribed. Please wait a moment.', zh: '上一段录音还在转写中，请稍等一下。' }),
      );
      return;
    }
    try {
      if (!isRecordingRef.current) {
        // START recording
        isRecordingRef.current = true;
        if (isSpeaking) {
          await audioPlayerRef.current?.stopAll();
          setIsSpeaking(false);
        }
        stopCurrentResponse(true);
        setVoicePhase('recording');
        setTranscriptPreview('');
        const permResult = await Audio.requestPermissionsAsync();
        if (!permResult.granted) {
          isRecordingRef.current = false;
          setVoicePhase('idle');
          Alert.alert(t({ en: 'Microphone Permission', zh: '麦克风权限' }), t({ en: 'Please enable microphone access in your device settings to use voice input.', zh: '请在设备设置中开启麦克风权限后再使用语音输入。' }));
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
        const { recording } = await Audio.Recording.createAsync(
          voiceRecordingOptions || Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;
        setIsRecording(true);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (e: any) {
      isRecordingRef.current = false;
      setIsRecording(false);
      setVoicePhase('idle');
      const msg = e?.message || 'Unknown error';
      if (msg.includes('permission') || msg.includes('Permission')) {
        Alert.alert(t({ en: 'Microphone Permission', zh: '麦克风权限' }), t({ en: 'Please enable microphone access in Settings to use voice input.', zh: '请在设置中开启麦克风权限后再使用语音输入。' }));
      } else {
        Alert.alert(t({ en: 'Voice Error', zh: '语音错误' }), t({ en: `Could not start recording: ${msg}\n\nTry typing your message instead.`, zh: `无法开始录音：${msg}\n\n请改用文字输入。` }));
      }
    }
  }, [Audio, isSpeaking, stopCurrentResponse, t, voicePhase, voiceRecordingOptions]);

  const stopVoiceRecording = useCallback(async () => {
    if (!Audio || !isRecordingRef.current) return;
    try {
      // STOP and transcribe
      isRecordingRef.current = false;
      setIsRecording(false);
      setVoicePhase('transcribing');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        if (uri) {
          let transcript = '';
          const formData = new FormData();
          formData.append('audio', { uri, name: 'voice.m4a', type: 'audio/m4a' } as any);
          const ac = new AbortController();
          const timeout = setTimeout(() => ac.abort(), 35_000);
          try {
            const resp = await fetch(`${API_BASE}/voice/transcribe?lang=${voiceLanguageHint}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
              signal: ac.signal,
            });
            if (resp.ok) {
              const data = await resp.json();
              transcript = data?.text || data?.transcript || '';
            }
          } catch (err) {
             console.warn("Transcription failed", err);
          } finally {
            clearTimeout(timeout);
          }

          let uploadedAudio = null;
          if (!transcript) {
            try {
              uploadedAudio = await uploadChatAttachment({
                uri,
                name: `voice-${Date.now()}.m4a`,
                type: 'audio/m4a'
              });
            } catch (upErr) {
              console.warn("Audio upload failed", upErr);
            }
          }

          if (transcript || uploadedAudio) {
            setTranscriptPreview(transcript || '[Voice Message]');
            setVoicePhase('thinking');
            const attachList = uploadedAudio ? [uploadedAudio as UploadedChatAttachment] : undefined;
            setTimeout(() => handleSend(transcript, attachList), 80);
          } else {
            setVoicePhase('idle');
            Alert.alert(t({ en: 'No Speech Detected', zh: '未检测到有效语音' }), t({ en: 'Could not detect any speech or upload audio.', zh: '无法识别语音且上传失败。' }));
          }
        } else {
          setVoicePhase('idle');
        }
      }
    } catch (e: any) {
      isRecordingRef.current = false;
      setIsRecording(false);
      setVoicePhase('idle');
      Alert.alert(t({ en: 'Voice Error', zh: '语音错误' }), e?.message || t({ en: 'Unknown error stopping recording', zh: '停止录音时发生未知错误' }));
    } finally {
      await resetAudioModeAfterRecording();
    }
  }, [Audio, handleSend, resetAudioModeAfterRecording, t, token, voiceLanguageHint]);

  // Voice recording — hold mode wrappers
  const handleVoicePressIn = async () => {
    if (voiceInteractionMode !== 'hold') return;
    await startVoiceRecording();
  };

  const handleVoicePressOut = async () => {
    if (voiceInteractionMode !== 'hold') return;
    await stopVoiceRecording();
  };

  const handleVoiceTapToggle = useCallback(async () => {
    if (duplexMode) {
      if (liveSpeechRef.current) {
        stopLiveSpeech(true, true);
        setVoicePhase('idle');
        setTranscriptPreview('');
        return;
      }
      if (isSpeaking) {
        stopSpeaking();
      }
      stopCurrentResponse(true);
      await startLiveSpeech();
      return;
    }
    if (isRecordingRef.current) {
      await stopVoiceRecording();
      return;
    }
    await startVoiceRecording();
  }, [duplexMode, isSpeaking, startLiveSpeech, startVoiceRecording, stopCurrentResponse, stopLiveSpeech, stopSpeaking, stopVoiceRecording]);

  const openModelPicker = () => setShowModelPicker(true);

  const handleDeviceGPS = async () => {
    setShowAttachToolbar(false);
    try {
      const loc = await DeviceBridgingService.getCurrentLocation();
      handleSend(`[System] Current GPS Location:\nLatitude: ${loc.latitude}\nLongitude: ${loc.longitude}\nAccuracy: ${loc.accuracy}m`);
    } catch (e: any) {
      Alert.alert(t({ en: 'Location Error', zh: '定位错误' }), e.message);
    }
  };

  const handleAttachmentAction = () => {
    setShowAttachToolbar((prev) => !prev);
  };

  const openInAppCamera = useCallback(async () => {
    setShowAttachToolbar(false);
    try {
      const permission = cameraPermission?.granted
        ? cameraPermission
        : await requestCameraPermission();

      if (!permission?.granted) {
        Alert.alert(
          t({ en: 'Camera Permission Required', zh: '需要相机权限' }),
          t({ en: 'Allow camera access to take a photo.', zh: '请先授予相机权限后再拍照。' }),
        );
        return;
      }

      setShowCameraModal(true);
    } catch (error: any) {
      Alert.alert(t({ en: 'Camera Error', zh: '拍照错误' }), error?.message || t({ en: 'Failed to open camera.', zh: '打开相机失败。' }));
    }
  }, [cameraPermission, requestCameraPermission, t]);

  const handleCaptureCameraPhoto = useCallback(async () => {
    if (capturingPhoto || !cameraRef.current) return;

    try {
      setCapturingPhoto(true);
      const captured = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        exif: false,
        skipProcessing: false,
      });

      if (!captured?.uri) {
        return;
      }

      await enqueueAttachment({
        uri: captured.uri,
        fileName: `photo-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
      });
      Haptics.selectionAsync().catch(() => {});
      setShowCameraModal(false);
    } catch (error: any) {
      Alert.alert(t({ en: 'Camera Error', zh: '拍照错误' }), error?.message || t({ en: 'Failed to capture photo.', zh: '拍照失败。' }));
    } finally {
      setCapturingPhoto(false);
    }
  }, [capturingPhoto, enqueueAttachment, t]);

  const handleAttachCamera = async () => {
    await openInAppCamera();
  };

  const handleAttachAlbum = async () => {
    setShowAttachToolbar(false);
    setShowCameraModal(false);
    try {
      const image = await DeviceBridgingService.pickImageAttachment();
      if (image?.uri) {
        await enqueueAttachment({
          uri: image.uri,
          fileName: image.fileName || `image-${Date.now()}.jpg`,
          mimeType: image.mimeType || 'image/jpeg',
        });
      }
    } catch (e: any) {
      Alert.alert(t({ en: 'Photo Error', zh: '图片错误' }), e.message);
    }
  };

  const handleAttachFile = async () => {
    setShowAttachToolbar(false);
    try {
      const file = await DeviceBridgingService.pickFileAttachment();
      if (file?.uri) {
        await enqueueAttachment({
          uri: file.uri,
          fileName: file.fileName,
          mimeType: file.mimeType,
        });
      }
    } catch (e: any) {
      Alert.alert(t({ en: 'File Error', zh: '文件错误' }), e.message);
    }
  };

  const handleCopyDraft = useCallback(async () => {
    if (!input) return;
    try {
      await DeviceBridgingService.writeClipboard(input);
      Haptics.selectionAsync().catch(() => {});
      Alert.alert(t({ en: 'Copied', zh: '已复制' }), t({ en: 'Draft copied to clipboard.', zh: '未发送内容已复制到剪贴板。' }));
    } catch (error: any) {
      Alert.alert(t({ en: 'Copy Failed', zh: '复制失败' }), error?.message || t({ en: 'Failed to copy draft.', zh: '复制草稿失败。' }));
    }
  }, [input, t]);

  const handleClearChat = () => {
    Alert.alert(t({ en: 'Start new session?', zh: '开始新会话？' }), t({ en: 'Chat history will be cleared.', zh: '当前聊天记录将被清空。' }), [
      { text: t({ en: 'Cancel', zh: '取消' }), style: 'cancel' },
      {
        text: t({ en: 'New Session', zh: '新会话' }),
        style: 'destructive',
        onPress: () => {
          streamAbortRef.current?.abort();
          sessionIdRef.current = `session-${Date.now()}`;
          AsyncStorage.removeItem(storageKey).catch(() => {});
          AsyncStorage.removeItem(draftStorageKey).catch(() => {});
          setInput('');
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: t({ en: `Hi! I'm **${instanceName}**, your personal AI agent. What would you like to do next?`, zh: `你好！我是 **${instanceName}**，你的个人智能体。接下来想让我帮你做什么？` }),
            createdAt: Date.now(),
          }]);
        },
      },
    ]);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    return (
      <MessageBubble
        item={item}
        onSpeak={handleSpeakMessage}
        onStopSpeaking={stopSpeaking}
        speakingMessageId={activeAssistantMessageIdRef.current}
        onPreviewImage={(uri) => setPreviewImageUri(uri)}
      />
    );
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
              if (!liveVoiceAvailable && !duplexMode) {
                Alert.alert(
                  t({ en: 'Realtime Voice Unavailable', zh: '实时语音不可用' }),
                  t({ en: 'This build does not have native live speech recognition available yet.', zh: '当前构建暂未提供原生实时语音识别能力。' }),
                );
                return;
              }
              setDuplexMode((prev) => !prev);
            }}
            style={[styles.chatBarBtn, duplexMode && { backgroundColor: colors.accent + '30' }]}
          >
            <Text style={[styles.chatBarBtnText, duplexMode && { color: colors.accent }]}>
              {duplexMode ? t({ en: 'Live', zh: '实时' }) : t({ en: 'Basic', zh: '基础' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setAutoSpeak(!autoSpeak);
              if (isSpeaking) { stopSpeaking(); }
            }}
            style={[styles.chatBarBtn, autoSpeak && { backgroundColor: colors.primary + '30' }]}
          >
            <Text style={styles.chatBarBtnText}>{isSpeaking ? '🔊' : autoSpeak ? '🔈' : '🔇'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openModelPicker} style={styles.modelBtn}>
            <Text style={styles.modelBtnText} numberOfLines={1}>
              {resolvedModelLabel || availableModels.find((m) => m.id === effectiveModelId)?.label || effectiveModelId}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearChat} style={styles.chatBarBtn}>
            <Text style={styles.chatBarBtnText}>{t({ en: 'New', zh: '新建' })}</Text>
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
          <Text style={styles.historyLoaderText}>{t({ en: 'Loading history…', zh: '正在加载历史记录…' })}</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollToBottom()}
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
          isNearBottomRef.current = distanceFromBottom < 120;
        }}
        scrollEventThrottle={16}
      />

      {voiceMode && voicePhase !== 'idle' && (
        <View style={styles.voiceStatusBar}>
          <Text style={styles.voiceStatusDots}>...</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.voiceStatusText}>
                {voicePhase === 'recording' && (voiceInteractionMode === 'tap'
                  ? duplexMode
                    ? t({ en: 'Realtime listening… pause briefly to send', zh: '实时聆听中… 稍停即发送' })
                    : t({ en: 'Listening… tap again to send', zh: '正在聆听… 再点一次发送' })
                  : t({ en: 'Listening… release to send', zh: '正在聆听… 松开发送' }))}
              {voicePhase === 'transcribing' && t({ en: 'Transcribing your voice…', zh: '正在转写你的语音…' })}
              {voicePhase === 'thinking' && t({ en: 'Agent is preparing a reply…', zh: '智能体正在准备回复…' })}
                {voicePhase === 'speaking' && (voiceInteractionMode === 'tap'
                  ? t({ en: 'Agent is speaking… tap mic anytime to interrupt', zh: '智能体正在播报… 随时点麦克风即可打断' })
                  : t({ en: 'Agent is speaking… press and hold to interrupt', zh: '智能体正在播报… 按住即可打断' }))}
            </Text>
            {!!transcriptPreview && (voicePhase === 'transcribing' || voicePhase === 'thinking') && (
              <Text style={styles.voiceTranscriptPreview} numberOfLines={2}>
                {transcriptPreview}
              </Text>
            )}
            {duplexMode && liveListening && (
              <Text style={styles.voiceTranscriptPreview} numberOfLines={1}>
                {t({ en: `Input level ${Math.max(0, liveVoiceVolume).toFixed(1)}`, zh: `输入音量 ${Math.max(0, liveVoiceVolume).toFixed(1)}` })}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Input bar — WeChat / Doubao style */}
      <View style={styles.inputArea}>
        {!!pendingAttachments.length && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pendingAttachmentRow}>
            {pendingAttachments.map((attachment) => (
              <View key={attachment.fileName} style={styles.pendingAttachmentChip}>
                {attachment.isImage ? (
                  <Image source={{ uri: attachment.publicUrl }} style={styles.pendingAttachmentThumb} resizeMode="cover" />
                ) : (
                  <Text style={styles.pendingAttachmentIcon}>📎</Text>
                )}
                <View style={styles.pendingAttachmentMeta}>
                  <Text style={styles.pendingAttachmentName} numberOfLines={1}>{attachment.originalName}</Text>
                  <Text style={styles.pendingAttachmentSub}>{formatAttachmentSize(attachment.size)}</Text>
                </View>
                <TouchableOpacity onPress={() => removePendingAttachment(attachment.fileName)}>
                  <Text style={styles.pendingAttachmentRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      {/* Attachment toolbar — slides above input */}
      {showAttachToolbar && (
        <View style={styles.attachToolbar}>
          <TouchableOpacity style={styles.attachToolbarItem} onPress={handleAttachCamera}>
            <Text style={styles.attachToolbarIcon}>📷</Text>
            <Text style={styles.attachToolbarLabel}>{t({ en: 'Camera', zh: '拍照' })}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachToolbarItem} onPress={handleAttachAlbum}>
            <Text style={styles.attachToolbarIcon}>🖼️</Text>
            <Text style={styles.attachToolbarLabel}>{t({ en: 'Album', zh: '相册' })}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachToolbarItem} onPress={handleAttachFile}>
            <Text style={styles.attachToolbarIcon}>📎</Text>
            <Text style={styles.attachToolbarLabel}>{t({ en: 'File', zh: '文件' })}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachToolbarItem} onPress={handleDeviceGPS}>
            <Text style={styles.attachToolbarIcon}>📍</Text>
            <Text style={styles.attachToolbarLabel}>{t({ en: 'GPS', zh: '位置' })}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        {/* Left: voice/keyboard toggle */}
        <TouchableOpacity
          style={styles.modeToggleBtn}
          onPress={() => { setVoiceMode(!voiceMode); setIsRecording(false); setShowAttachToolbar(false); }}
        >
          <Text style={styles.modeToggleIcon}>{voiceMode ? '⌨️' : '🎤'}</Text>
        </TouchableOpacity>

        {voiceMode ? (
          voiceInteractionMode === 'tap' ? (
            <TouchableOpacity
              style={[styles.holdTalkBtn, isRecording && styles.holdTalkBtnActive]}
              onPress={handleVoiceTapToggle}
              activeOpacity={0.85}
            >
              <Text style={styles.holdTalkText}>
                {duplexMode
                  ? liveListening
                    ? t({ en: '🛑  Stop Live Voice', zh: '🛑  停止实时语音' })
                    : t({ en: '🎙  Start Live Voice', zh: '🎙  开始实时语音' })
                  : isRecording
                  ? t({ en: '🔴  Tap to Send', zh: '🔴  点击发送' })
                  : t({ en: '🎙  Tap to Talk', zh: '🎙  点击说话' })}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.holdTalkBtn, isRecording && styles.holdTalkBtnActive]}
              onPressIn={handleVoicePressIn}
              onPressOut={handleVoicePressOut}
              activeOpacity={0.85}
            >
              <Text style={styles.holdTalkText}>
                {isRecording ? t({ en: '🔴  Release to Send', zh: '🔴  松开发送' }) : t({ en: '🎙  按住说话', zh: '🎙  按住说话' })}
              </Text>
            </TouchableOpacity>
          )
        ) : (
          /* Text mode */
          <TextInput
            style={styles.input}
            placeholder={t({ en: `Message ${instanceName}...`, zh: `给 ${instanceName} 发消息…` })}
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onFocus={() => setShowAttachToolbar(false)}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
          />
        )}

        {/* Attach button — always visible (both voice & text mode) */}
        <TouchableOpacity
          style={[styles.attachBtn, (sending || uploadingAttachment) && styles.sendBtnDisabled]}
          onPress={handleAttachmentAction}
          disabled={sending || uploadingAttachment}
        >
          {uploadingAttachment ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <Text style={styles.attachBtnIcon}>{showAttachToolbar ? '✕' : '+'}</Text>
          )}
        </TouchableOpacity>

        {!voiceMode && !!input.length && (
          <TouchableOpacity
            style={styles.utilityBtn}
            onPress={handleCopyDraft}
          >
            <Text style={styles.utilityBtnText}>{t({ en: 'Copy', zh: '复制' })}</Text>
          </TouchableOpacity>
        )}

        {/* Right: Send or voice mode toggle */}
        {(input.trim().length > 0 || pendingAttachments.length > 0) && !voiceMode ? (
          <TouchableOpacity
            style={[styles.sendBtn, (sending || uploadingAttachment) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={sending || uploadingAttachment}
          >
            {sending || uploadingAttachment ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendIcon}>⬆</Text>
            )}
          </TouchableOpacity>
        ) : (
          voiceMode ? (
            <TouchableOpacity
              style={[styles.deviceBtn, duplexMode && { borderColor: colors.accent }]}
              onPress={() => setVoiceInteractionMode((prev) => prev === 'hold' ? 'tap' : 'hold')}
            >
              <Text style={[styles.deviceIcon, duplexMode && { color: colors.accent }]}>
                {voiceInteractionMode === 'tap' ? '◉' : '◎'}
              </Text>
            </TouchableOpacity>
          ) : null
        )}
      </View>
      </View>

      <Modal visible={showCameraModal} animationType="fade" onRequestClose={() => !capturingPhoto && setShowCameraModal(false)}>
        <View style={styles.cameraModalRoot}>
          {cameraPermission?.granted ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              mode="picture"
            />
          ) : (
            <View style={styles.cameraPermissionState}>
              <Text style={styles.cameraPermissionTitle}>{t({ en: 'Camera Permission Required', zh: '需要相机权限' })}</Text>
              <Text style={styles.cameraPermissionText}>{t({ en: 'Enable camera access, then try again.', zh: '开启相机权限后再重试。' })}</Text>
            </View>
          )}

          <View style={styles.cameraTopBar}>
            <TouchableOpacity
              style={styles.cameraCloseBtn}
              onPress={() => !capturingPhoto && setShowCameraModal(false)}
              disabled={capturingPhoto}
            >
              <Text style={styles.cameraCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cameraBottomBar}>
            <TouchableOpacity style={styles.cameraAuxBtn} onPress={handleAttachAlbum} disabled={capturingPhoto}>
              <Text style={styles.cameraAuxBtnText}>{t({ en: 'Album', zh: '相册' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cameraCaptureBtn, capturingPhoto && styles.cameraCaptureBtnDisabled]}
              onPress={handleCaptureCameraPhoto}
              disabled={capturingPhoto || !cameraPermission?.granted}
            >
              {capturingPhoto ? <ActivityIndicator color="#111827" /> : <View style={styles.cameraCaptureBtnInner} />}
            </TouchableOpacity>
            <View style={styles.cameraAuxSpacer} />
          </View>
        </View>
      </Modal>

      {/* Image preview modal */}
      <Modal visible={!!previewImageUri} transparent animationType="fade" onRequestClose={() => setPreviewImageUri(null)}>
        <TouchableOpacity style={styles.imagePreviewOverlay} activeOpacity={1} onPress={() => setPreviewImageUri(null)}>
          <View style={styles.imagePreviewContainer}>
            {previewImageUri && (
              <Image source={{ uri: previewImageUri }} style={styles.imagePreviewImage} resizeMode="contain" />
            )}
          </View>
          <TouchableOpacity style={styles.imagePreviewClose} onPress={() => setPreviewImageUri(null)}>
            <Text style={styles.imagePreviewCloseText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Model picker modal — dynamic models from user's configured providers */}
      <Modal visible={showModelPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowModelPicker(false)} activeOpacity={1}>
          <View style={styles.modelSheet}>
            <Text style={styles.modelSheetTitle}>{t({ en: 'Switch Model', zh: '切换模型' })}</Text>
            <Text style={styles.modelSheetSubtitle}>{t({ en: 'Applies to this agent only', zh: '仅应用到当前智能体' })}</Text>
            <ScrollView>
              {availableModels.map((m) => {
                const isActive = m.id === effectiveModelId;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.modelOption,
                      isActive && styles.modelOptionActive,
                    ]}
                    onPress={async () => {
                      setAgentPreferredModel(m.id);
                      setResolvedModelLabel(m.label);
                      setShowModelPicker(false);
                      // Save per-agent model to backend
                      const agentAccountId = activeInstance?.metadata?.agentAccountId;
                      if (agentAccountId) {
                        try {
                          const { updateAgentPresenceAccount } = await import('../../services/agentPresenceAccount');
                          await updateAgentPresenceAccount(agentAccountId, { preferredModel: m.id });
                        } catch {}
                      }
                      // Also sync to instance
                      if (instanceId) {
                        try { await switchInstanceModel(instanceId, m.id); } catch {}
                      }
                    }}
                  >
                    <View style={styles.modelOptionRow}>
                      <Text style={styles.modelOptionIcon}>{m.icon}</Text>
                      <View style={styles.modelOptionInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.modelOptionLabel}>{m.label}</Text>
                          {m.badge && (
                            <View style={styles.modelBadge}>
                              <Text style={styles.modelBadgeText}>{m.badge}</Text>
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
              {availableModels.length <= 1 && (
                <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 16, fontSize: 13 }}>
                  {t({ en: 'Configure API keys in Settings → API Keys to unlock more models', zh: '前往 设置 → API密钥 配置厂商密钥以解锁更多模型' })}
                </Text>
              )}
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
  bubbleTextPending: { opacity: 0.72 },
  bubbleActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  copyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.bgSecondary,
  },
  copyBtnText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  voiceStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voiceStatusDots: { color: colors.accent, fontSize: 18, fontWeight: '700', lineHeight: 18 },
  voiceStatusText: { color: colors.textMuted, fontSize: 13, flex: 1 },
  voiceTranscriptPreview: { color: colors.textPrimary, fontSize: 12, marginTop: 4, lineHeight: 18 },
  inputArea: {
    backgroundColor: colors.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    gap: 10,
  },
  pendingAttachmentRow: {
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
  },
  pendingAttachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: 240,
  },
  pendingAttachmentThumb: { width: 28, height: 28, borderRadius: 8 },
  pendingAttachmentIcon: { fontSize: 16 },
  pendingAttachmentMeta: { flex: 1, minWidth: 0 },
  pendingAttachmentName: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
  pendingAttachmentSub: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  pendingAttachmentRemove: { color: colors.textMuted, fontSize: 12, paddingHorizontal: 2 },
  attachToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  attachToolbarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    gap: 4,
  },
  attachToolbarIcon: { fontSize: 28 },
  attachToolbarLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  attachBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachBtnIcon: { fontSize: 18, color: colors.textPrimary, fontWeight: '600' },
  utilityBtn: {
    minWidth: 54,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  utilityBtnText: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
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
  holdTalkText: { color: '#fff', fontSize: 15, fontWeight: '600' },
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
  attachmentList: { marginTop: 8, gap: 8 },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachmentImage: { width: 52, height: 52, borderRadius: 10 },
  attachmentFileIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentFileIcon: { fontSize: 22 },
  attachmentMeta: { flex: 1, minWidth: 0 },
  attachmentName: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  attachmentSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  audioPlayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  audioPlayerIcon: { fontSize: 28 },
  audioPlayerMeta: { flex: 1, minWidth: 0 },
  audioPlayerLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  audioPlayerUrl: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: '#000000ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.75,
  },
  imagePreviewImage: {
    width: '100%',
    height: '100%',
  },
  imagePreviewClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewCloseText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cameraModalRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraPermissionState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  cameraPermissionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  cameraPermissionText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  cameraTopBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cameraCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCloseBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  cameraBottomBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: Platform.OS === 'ios' ? 34 : 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cameraAuxBtn: {
    minWidth: 72,
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraAuxBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  cameraCaptureBtn: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCaptureBtnDisabled: {
    opacity: 0.7,
  },
  cameraCaptureBtnInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: '#111827',
    backgroundColor: '#fff',
  },
  cameraAuxSpacer: {
    width: 72,
  },
});
