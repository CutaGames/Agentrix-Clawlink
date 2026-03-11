import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, ScrollView, Linking,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore, SUPPORTED_MODELS } from '../../stores/settingsStore';
import { streamProxyChatSSE, streamDirectClaude } from '../../services/realtime.service';
import { sendAgentMessage, switchInstanceModel } from '../../services/openclaw.service';
import { DeviceBridgingService } from '../../services/deviceBridging.service';
import { API_BASE } from '../../config/env';
import { useTokenQuota } from '../../hooks/useTokenQuota';
import type { AgentStackParamList } from '../../navigation/types';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioQueuePlayer } from '../../services/AudioQueuePlayer';
import { useI18n } from '../../stores/i18nStore';
import { uploadChatAttachment, type UploadedChatAttachment } from '../../services/api';

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

  const attachmentLines = attachments.map((attachment, index) => {
    const label = attachment.kind === 'image' ? 'Image' : 'File';
    return `${index + 1}. ${label}: ${attachment.originalName} (${attachment.mimetype}, ${formatAttachmentSize(attachment.size)})\nURL: ${attachment.publicUrl}`;
  });

  const prefix = trimmed ? `${trimmed}\n\n` : '';
  return `${prefix}[User Attachments]\n${attachmentLines.join('\n\n')}\nUse the attachment URLs when relevant.`;
}

function serializeMessageForModel(message: Message) {
  return buildOutgoingMessageContent(message.content, message.attachments || []);
}

function dedupeUrls(urls: string[]) {
  return [...new Set(urls)];
}

function extractUrlsFromMessage(content: string) {
  const markdownImageUrls = Array.from(content.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)).map((match) => match[1]);
  const plainUrls = Array.from(content.matchAll(/https?:\/\/[^\s)]+/g)).map((match) => match[0].replace(/[),.;]+$/, ''));
  const allUrls = dedupeUrls([...markdownImageUrls, ...plainUrls]);
  const imageUrls = allUrls.filter((url) => /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(url));
  const fileUrls = allUrls.filter((url) => !imageUrls.includes(url) && /(\/api\/uploads\/|\.(pdf|txt|md|csv|json|docx?|xlsx?|pptx?))(\?.*)?$/i.test(url));
  return { imageUrls, fileUrls };
}

function getCopyableMessageText(message: Message) {
  const attachmentLines = (message.attachments || []).map((attachment) => `${attachment.originalName}: ${attachment.publicUrl}`);
  return [message.content.trim(), ...attachmentLines].filter(Boolean).join('\n');
}

function buildDisplayMessageText(content: string) {
  if (!content) return '';

  const { imageUrls, fileUrls } = extractUrlsFromMessage(content);
  let display = content
    .replace(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g, '')
    .replace(/\[User Attachments\][\s\S]*$/g, '')
    .trim();

  for (const url of [...imageUrls, ...fileUrls]) {
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

const MessageBubble = ({ item }: { item: Message }) => {
  const { t } = useI18n();
  const isUser = item.role === 'user';
  const hasThoughts = item.thoughts && item.thoughts.length > 0;
  const [isThoughtsExpanded, setIsThoughtsExpanded] = useState(true);
  const bubbleText = buildDisplayMessageText(item.content) || (item.streaming ? '...' : '');
  const { imageUrls, fileUrls } = extractUrlsFromMessage(item.content || '');

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
            {!item.streaming && !!getCopyableMessageText(item) && (
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                <Text style={styles.copyBtnText}>{t({ en: 'Copy', zh: '复制' })}</Text>
              </TouchableOpacity>
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
                onPress={() => openExternalUrl(attachment.publicUrl)}
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
              <TouchableOpacity key={`${item.id}-${url}`} style={styles.attachmentCard} activeOpacity={0.8} onPress={() => openExternalUrl(url)}>
                <Image source={{ uri: url }} style={styles.attachmentImage} resizeMode="cover" />
                <View style={styles.attachmentMeta}>
                  <Text style={styles.attachmentName} numberOfLines={1}>{t({ en: 'Generated image', zh: '生成图片' })}</Text>
                  <Text style={styles.attachmentSub} numberOfLines={1}>{url}</Text>
                </View>
              </TouchableOpacity>
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);  // Auto TTS for agent replies
  const [voicePhase, setVoicePhase] = useState<'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking'>('idle');
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const audioPlayerRef = useRef<AudioQueuePlayer | null>(null);
  const isNearBottomRef = useRef(true);
  const activeAssistantMessageIdRef = useRef<string | null>(null);
  const responseInterruptedRef = useRef(false);
  const pendingTtsSentenceRef = useRef('');
  const streamedTtsStartedRef = useRef(false);

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

  // Init TTS audio queue player
  useEffect(() => {
    audioPlayerRef.current = new AudioQueuePlayer(() => {
      setIsSpeaking(false);
      setVoicePhase((prev) => (prev === 'speaking' ? 'idle' : prev));
    });
    return () => { audioPlayerRef.current?.stopAll(); };
  }, []);

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
    }
  }, [voiceMode]);

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
    setIsSpeaking(true);
    setVoicePhase((prev) => (prev === 'recording' || prev === 'transcribing' ? prev : 'speaking'));
    // Split sentences for streaming playback
    const sentences = text.match(/[^。！？.!?\n]+[。！？.!?\n]*/g) || [text];
    for (const s of sentences) {
      const trimmed = s.trim();
      if (!trimmed || trimmed.length < 2) continue;
      const encoded = encodeURIComponent(trimmed);
      audioPlayerRef.current?.enqueue(`${API_BASE}/voice/tts?text=${encoded}`);
    }
  }, []);

  const enqueueStreamedSpeech = useCallback((chunk: string, flush = false) => {
    if (!(voiceMode || autoSpeak)) return;

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
        audioPlayerRef.current?.enqueue(`${API_BASE}/voice/tts?text=${encodeURIComponent(sentence)}`);
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
        audioPlayerRef.current?.enqueue(`${API_BASE}/voice/tts?text=${encodeURIComponent(remainder)}`);
      }
      pendingTtsSentenceRef.current = '';
    }
  }, [autoSpeak, voiceMode]);

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

      // Try OpenClaw proxy first (requires active instance)
      if (instanceId) {
        await new Promise<void>((resolve) => {
          const ac = streamProxyChatSSE({
            instanceId,
            message: outgoingText,
            sessionId: sessionIdRef.current,
            token,
            model: selectedModelId,
            onChunk: (chunk) => {
              streamSucceeded = true;
              resetVoicePhaseAfterResponse();
              appendToStreamingMessage(assistantMsgId, chunk);
              enqueueStreamedSpeech(chunk);
            },
            onDone: () => resolve(),
            onError: (_err) => resolve(), // silently fall through to direct Claude
          });
          streamAbortRef.current = ac;
        });
      }

      if (responseInterruptedRef.current) return;

      if (!streamSucceeded) {
        if (instanceId) {
          try {
            const proxyResult = await sendAgentMessage(instanceId, outgoingText, sessionIdRef.current);
            const proxyReply = typeof proxyResult?.reply === 'string'
              ? proxyResult.reply
              : proxyResult?.reply?.content || '';

            if (proxyReply) {
              streamSucceeded = true;
              resetVoicePhaseAfterResponse();
              appendToStreamingMessage(assistantMsgId, proxyReply);
              enqueueStreamedSpeech(proxyReply, true);
            }
          } catch {
            // Keep the final fallback below, but avoid silently losing agent capabilities when proxy chat works.
          }
        }
      }

      if (!streamSucceeded) {
        // Fallback: direct Claude via backend Bedrock key (always available)
        const history = buildHistory(currentMsgs, outgoingText);
        await new Promise<void>((resolve) => {
          const ac = streamDirectClaude({
            messages: history,
            token,
            model: selectedModelId,
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
    }
  };

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
          try {
            const formData = new FormData();
            formData.append('audio', { uri, name: 'voice.m4a', type: 'audio/m4a' } as any);
            const ac = new AbortController();
            const timeout = setTimeout(() => ac.abort(), 35_000);
            let resp: Response;
            try {
              resp = await fetch(`${API_BASE}/voice/transcribe?lang=${voiceLanguageHint}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
                signal: ac.signal,
              });
            } finally {
              clearTimeout(timeout);
            }
            if (resp.ok) {
              const data = await resp.json();
              const transcript = data?.text || data?.transcript || '';
              if (transcript) {
                setTranscriptPreview(transcript);
                setVoicePhase('thinking');
                setTimeout(() => handleSend(transcript), 80);
              } else {
                setVoicePhase('idle');
                Alert.alert(t({ en: 'No Speech Detected', zh: '未检测到语音' }), t({ en: 'Could not detect any speech. Please try again or type your message.', zh: '没有识别到有效语音，请重试或直接输入文字。' }));
              }
            } else {
              const errText = await resp.text().catch(() => '');
              setVoicePhase('idle');
              Alert.alert(t({ en: 'Transcription Failed', zh: '转写失败' }), `${t({ en: 'Server returned', zh: '服务器返回' })} ${resp.status}. ${errText ? errText.slice(0, 100) : t({ en: 'Try typing instead.', zh: '请改用文字输入。' })}`);
            }
          } catch (fetchErr: any) {
            setVoicePhase('idle');
            const msg = fetchErr?.name === 'AbortError'
              ? t({ en: 'Transcription timed out. Try again or type your message.', zh: '语音转写超时，请重试或直接输入文字。' })
              : t({ en: `Could not reach voice service: ${fetchErr?.message || 'Network error'}`, zh: `无法连接语音服务：${fetchErr?.message || '网络错误'}` });
            Alert.alert(t({ en: 'Voice Error', zh: '语音错误' }), msg);
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
    if (isRecordingRef.current) {
      await stopVoiceRecording();
      return;
    }
    await startVoiceRecording();
  }, [startVoiceRecording, stopVoiceRecording]);

  const openModelPicker = () => setShowModelPicker(true);

  const handleDeviceAction = () => {
    Alert.alert(t({ en: 'Device Tools', zh: '设备工具' }), t({ en: 'Provide local device data to the Agent', zh: '向智能体提供本地设备数据' }), [
      {
        text: t({ en: '📍 Send GPS Location', zh: '📍 发送 GPS 位置' }),
        onPress: async () => {
          try {
            const loc = await DeviceBridgingService.getCurrentLocation();
            handleSend(`[System] Current GPS Location:\nLatitude: ${loc.latitude}\nLongitude: ${loc.longitude}\nAccuracy: ${loc.accuracy}m`);
          } catch (e: any) {
            Alert.alert(t({ en: 'Location Error', zh: '定位错误' }), e.message);
          }
        }
      },
      {
        text: t({ en: '📋 Paste Clipboard', zh: '📋 粘贴剪贴板' }),
        onPress: async () => {
          try {
            const text = await DeviceBridgingService.readClipboard();
            if (!text) return Alert.alert(t({ en: 'Clipboard Empty', zh: '剪贴板为空' }), t({ en: 'Nothing to paste.', zh: '没有可粘贴的内容。' }));
            setInput((prev) => prev ? `${prev}\n${text}` : text);
          } catch (e: any) {
            Alert.alert(t({ en: 'Clipboard Error', zh: '剪贴板错误' }), e.message);
          }
        }
      },
      { text: t({ en: 'Cancel', zh: '取消' }), style: 'cancel' }
    ]);
  };

  const handleAttachmentAction = () => {
    Alert.alert(t({ en: 'Attach', zh: '添加附件' }), t({ en: 'Choose what to upload', zh: '选择要上传的内容' }), [
      {
        text: t({ en: '🖼️ Insert Photo', zh: '🖼️ 插入图片' }),
        onPress: async () => {
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
        },
      },
      {
        text: t({ en: '📎 Insert File', zh: '📎 插入文件' }),
        onPress: async () => {
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
        },
      },
      { text: t({ en: 'Cancel', zh: '取消' }), style: 'cancel' },
    ]);
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
            onPress={() => setDuplexMode((prev) => !prev)}
            style={[styles.chatBarBtn, duplexMode && { backgroundColor: colors.accent + '30' }]}
          >
            <Text style={[styles.chatBarBtnText, duplexMode && { color: colors.accent }]}>
              {duplexMode ? t({ en: 'Duplex', zh: '双工' }) : t({ en: 'Simple', zh: '基础' })}
            </Text>
          </TouchableOpacity>
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
                  ? t({ en: 'Listening… tap again to send', zh: '正在聆听… 再点一次发送' })
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
      <View style={styles.inputRow}>
        {/* Left: voice/keyboard toggle */}
        <TouchableOpacity
          style={styles.modeToggleBtn}
          onPress={() => { setVoiceMode(!voiceMode); setIsRecording(false); }}
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
                {isRecording
                  ? t({ en: '🔴  Tap to Send', zh: '🔴  点击发送' })
                  : duplexMode
                    ? t({ en: '🎙  Tap to Talk (Duplex)', zh: '🎙  点击说话（双工）' })
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
                {isRecording ? t({ en: '🔴  Release to Send', zh: '🔴  松开发送' }) : t({ en: '🎙  Hold to Talk', zh: '🎙  按住说话' })}
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
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
          />
        )}

        {!voiceMode && (
          <TouchableOpacity
            style={[styles.attachBtn, (sending || uploadingAttachment) && styles.sendBtnDisabled]}
            onPress={handleAttachmentAction}
            disabled={sending || uploadingAttachment}
          >
            {uploadingAttachment ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Text style={styles.attachBtnIcon}>📎</Text>
            )}
          </TouchableOpacity>
        )}

        {!voiceMode && !!input.length && (
          <TouchableOpacity
            style={styles.utilityBtn}
            onPress={handleCopyDraft}
          >
            <Text style={styles.utilityBtnText}>{t({ en: 'Copy', zh: '复制' })}</Text>
          </TouchableOpacity>
        )}

        {/* Right: Device Action or Send */}
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
          ) : (
            <TouchableOpacity style={styles.deviceBtn} onPress={handleDeviceAction}>
              <Text style={styles.deviceIcon}>⊕</Text>
            </TouchableOpacity>
          )
        )}
      </View>
      </View>

      {/* Model picker modal — enhanced with availability & backend sync */}
      <Modal visible={showModelPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowModelPicker(false)} activeOpacity={1}>
          <View style={styles.modelSheet}>
            <Text style={styles.modelSheetTitle}>{t({ en: 'Switch Model', zh: '切换模型' })}</Text>
            <Text style={styles.modelSheetSubtitle}>{t({ en: 'Applies to this agent (cloud & local)', zh: '应用到当前智能体（云端 / 本地）' })}</Text>
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
                        Alert.alert(m.label, isComingSoon ? t({ en: 'This model is coming soon!', zh: '该模型即将上线！' }) : t({ en: 'Requires API key configuration.', zh: '需要先配置 API Key。' }));
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
                                {isComingSoon ? t({ en: 'Soon', zh: '即将上线' }) : m.badge}
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
  bubbleTextPending: { opacity: 0.72 },
  copyBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
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
  attachBtnIcon: { fontSize: 18 },
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
});
