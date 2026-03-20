import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, ScrollView, Linking,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore, SUPPORTED_MODELS, type ModelOption } from '../../stores/settingsStore';
import { streamProxyChatSSE, streamDirectClaude } from '../../services/realtime.service';
import { sendAgentMessage, switchInstanceModel } from '../../services/openclaw.service';
import { DeviceBridgingService } from '../../services/deviceBridging.service';
import { API_BASE } from '../../config/env';
import { useTokenQuota } from '../../hooks/useTokenQuota';
import { useVoiceSession } from '../../hooks/useVoiceSession';
import type { AgentStackParamList } from '../../navigation/types';
import * as Haptics from 'expo-haptics';
import { mmkv } from '../../stores/mmkvStorage';
import { useI18n } from '../../stores/i18nStore';
import DesktopDiscoveryBanner from '../../components/DesktopDiscoveryBanner';
import { uploadChatAttachment, apiFetch, type UploadedChatAttachment } from '../../services/api';
import { fetchLatestDesktopClipboard, type MobileDesktopClipboardSnapshot } from '../../services/desktopSync';
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
  const [isThoughtsExpanded, setIsThoughtsExpanded] = useState(false);
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
              style={styles.thoughtCapsule} 
              onPress={() => setIsThoughtsExpanded(!isThoughtsExpanded)}
              activeOpacity={0.7}
            >
              {item.streaming ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ transform: [{ scale: 0.6 }] }} />
              ) : (
                <Text style={{ color: colors.accent, fontSize: 10 }}>{'⚡'}</Text>
              )}
              <Text style={styles.thoughtCapsuleText} numberOfLines={1}>
                {item.streaming
                  ? (item.thoughts?.[item.thoughts.length - 1]?.replace('[Tool Call]', '').trim().slice(0, 40) || t({ en: 'Processing...', zh: '处理中…' }))
                  : t({ en: `${item.thoughts?.length} steps completed`, zh: `已完成 ${item.thoughts?.length} 步` })}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>{isThoughtsExpanded ? '▼' : '›'}</Text>
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
  const navigation = useNavigation<any>();
  const { t, language } = useI18n();
  const activeInstance = useAuthStore((s) => s.activeInstance);
  const instanceId = route.params?.instanceId || activeInstance?.id || '';
  const instanceName = route.params?.instanceName || activeInstance?.name || 'Agent';
  const voiceModeRequested = !!route.params?.voiceMode;
  const token = useAuthStore.getState().token || '';
  const selectedModelId = useSettingsStore((s) => s.selectedModelId);
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [remoteClipboard, setRemoteClipboard] = useState<MobileDesktopClipboardSnapshot | null>(null);

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
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<UploadedChatAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [showAttachToolbar, setShowAttachToolbar] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const cameraRef = useRef<any>(null);
  const isNearBottomRef = useRef(true);
  const activeAssistantMessageIdRef = useRef<string | null>(null);
  const responseInterruptedRef = useRef(false);
  const handleSendRef = useRef<(overrideText?: string | any, overrideAttachments?: UploadedChatAttachment[]) => Promise<void>>(async () => {});
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  // Token quota for energy bar
  const { data: quota } = useTokenQuota();
  const used = quota?.usedTokens ?? 0;
  const total = quota?.totalQuota ?? 100000;
  const tokenPct = quota?.energyLevel ?? (total > 0 ? Math.min(100, (used / total) * 100) : 0);
  const tokenBarColor = tokenPct > 80 ? '#ef4444' : tokenPct > 50 ? '#f59e0b' : '#22c55e';

  // Offline detection + message queue
  const [isOffline, setIsOffline] = useState(false);
  const isOfflineRef = useRef(false);
  const offlineQueueRef = useRef<Array<{ text: string; attachments: UploadedChatAttachment[] }>>([]);
  const flushingOfflineQueueRef = useRef(false);

  // Check connectivity periodically
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
        if (mounted) setIsOffline(!res.ok);
      } catch {
        if (mounted) setIsOffline(true);
      }
    };
    check();
    const timer = setInterval(check, 15000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  useEffect(() => {
    isOfflineRef.current = isOffline;
  }, [isOffline]);

  useEffect(() => {
    if (!token) {
      setRemoteClipboard(null);
      return;
    }

    let cancelled = false;
    const pollDesktopClipboard = async () => {
      try {
        const latest = await fetchLatestDesktopClipboard();
        if (!cancelled) {
          setRemoteClipboard((previous) => {
            if (!latest) return null;
            if (
              previous &&
              previous.deviceId === latest.deviceId &&
              previous.lastSeenAt === latest.lastSeenAt &&
              previous.text === latest.text
            ) {
              return previous;
            }
            return latest;
          });
        }
      } catch {
        if (!cancelled) {
          setRemoteClipboard(null);
        }
      }
    };

    void pollDesktopClipboard();
    const timer = setInterval(pollDesktopClipboard, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token]);

  // Auto-send queued messages when back online
  useEffect(() => {
    if (isOffline || flushingOfflineQueueRef.current || offlineQueueRef.current.length === 0) return;

    let cancelled = false;
    const flushQueuedMessages = async () => {
      flushingOfflineQueueRef.current = true;
      try {
        while (!cancelled && !isOfflineRef.current && offlineQueueRef.current.length > 0) {
          const item = offlineQueueRef.current.shift();
          if (!item) break;
          await handleSendRef.current(item.text, item.attachments);
        }
      } finally {
        flushingOfflineQueueRef.current = false;
      }
    };

    void flushQueuedMessages();
    return () => {
      cancelled = true;
    };
  }, [isOffline]);

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

  // All messages (persisted) and visible slice for lazy rendering
  const allMessagesRef = useRef<Message[]>([]);
  const PAGE_SIZE = 20;
  const [loadingOlder, setLoadingOlder] = useState(false);

  const loadOlderMessages = useCallback(() => {
    const all = allMessagesRef.current;
    if (all.length <= messages.length || loadingOlder) return;
    setLoadingOlder(true);
    const currentLen = messages.length;
    const nextSlice = all.slice(Math.max(0, all.length - currentLen - PAGE_SIZE), all.length - currentLen);
    setMessages((prev) => [...nextSlice, ...prev]);
    setLoadingOlder(false);
  }, [messages.length, loadingOlder]);

  // Load chat history on mount — MMKV is synchronous, then try API
  useEffect(() => {
    if (!instanceId) return;
    const raw = mmkv.getString(storageKey);
    if (raw) {
      try {
        const saved: Message[] = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length > 0) {
          allMessagesRef.current = saved;
          // Show only last PAGE_SIZE messages initially
          setMessages(saved.slice(-PAGE_SIZE));
        }
      } catch {}
    }
    const draft = mmkv.getString(draftStorageKey);
    if (draft) setInput(draft);
    loadHistory();
    return () => {
      // Cancel any in-flight stream on unmount
      streamAbortRef.current?.abort();
    };
  }, [draftStorageKey, instanceId, storageKey]);

  // Persist messages to local storage whenever they change
  useEffect(() => {
    if (messages.length > 1) {
      const visibleMessages = messages.filter((m) => !m.streaming);
      const previousAll = allMessagesRef.current.filter((m) => !m.streaming);
      const visibleById = new Map(visibleMessages.map((message) => [message.id, message]));
      const seenIds = new Set<string>();

      const mergedMessages: Message[] = [];
      for (const message of previousAll) {
        const nextMessage = visibleById.get(message.id) ?? message;
        mergedMessages.push(nextMessage);
        seenIds.add(nextMessage.id);
      }

      for (const message of visibleMessages) {
        if (!seenIds.has(message.id)) {
          mergedMessages.push(message);
          seenIds.add(message.id);
        }
      }

      allMessagesRef.current = mergedMessages;
      try { mmkv.set(storageKey, JSON.stringify(mergedMessages.slice(-80))); } catch {}
    }
  }, [messages]);

  useEffect(() => {
    try { mmkv.set(draftStorageKey, input); } catch {}
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
        allMessagesRef.current = historyMessages;
        setMessages(historyMessages.slice(-PAGE_SIZE));
      }
    } catch {
      // Silently ignore — instance may not support history endpoint
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleInsertDesktopClipboard = useCallback(() => {
    if (!remoteClipboard?.text) return;
    setInput((previous) => {
      const next = previous.trim().length > 0
        ? `${previous.trim()}\n\n${remoteClipboard.text}`
        : remoteClipboard.text;
      return next.slice(0, 2000);
    });
    Haptics.selectionAsync().catch(() => {});
  }, [remoteClipboard]);

  const handleCopyDesktopClipboard = useCallback(async () => {
    if (!remoteClipboard?.text) return;
    await DeviceBridgingService.writeClipboard(remoteClipboard.text);
    Haptics.selectionAsync().catch(() => {});
    Alert.alert(
      t({ en: 'Desktop Clipboard Copied', zh: '桌面剪贴板已复制' }),
      t({ en: 'The latest desktop clipboard text is now on your phone.', zh: '最新桌面剪贴板内容已复制到手机剪贴板。' }),
    );
  }, [remoteClipboard, t]);

  const scrollToBottom = useCallback((force = false) => {
    if (!force && !isNearBottomRef.current) return;
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;
    scrollToBottom(lastMessage.role === 'user');
  }, [messages.length, scrollToBottom]);

  const stopCurrentResponse = useCallback((showInterruptedHint = false) => {
    responseInterruptedRef.current = true;
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
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

  const {
    voiceMode,
    setVoiceMode,
    duplexMode,
    setDuplexMode,
    voicePhase,
    isRecording,
    isSpeaking,
    liveListening,
    liveVoiceVolume,
    transcriptPreview,
    voiceInteractionMode,
    setVoiceInteractionMode,
    autoSpeak,
    setAutoSpeak,
    liveVoiceAvailable,
    speakingMessageId,
    handleVoicePressIn,
    handleVoicePressOut,
    handleVoiceTapToggle,
    speakText,
    stopSpeaking,
    handleSpeakMessage: speakMessageText,
    enqueueStreamedSpeech,
    resetVoicePhaseAfterResponse,
    resumeLiveSpeech,
  } = useVoiceSession({
    token,
    language,
    voiceModeRequested,
    agentVoiceId: agentVoiceId || undefined,
    instanceName,
    isSending: sending,
    onSendMessage: (text, attachments) => {
      void handleSendRef.current(text, attachments);
    },
    onStopCurrentResponse: stopCurrentResponse,
    t,
  });

  const handleSpeakMessage = useCallback((message: Message) => {
    const text = buildDisplayMessageText(message.content);
    if (!text) return;
    speakMessageText(text, message.id);
  }, [speakMessageText]);

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

    // Offline: queue the message instead of streaming
    if (isOffline) {
      offlineQueueRef.current.push({ text, attachments });
      const queueMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: text, attachments, createdAt: Date.now() };
      setMessages((prev) => [...prev, queueMsg]);
      setInput('');
      setPendingAttachments([]);
      return;
    }

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
    activeAssistantMessageIdRef.current = assistantMsgId;
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setPendingAttachments([]);
    try { mmkv.delete(draftStorageKey); } catch {}
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
      resumeLiveSpeech();
    }
  };

  handleSendRef.current = handleSend;

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
          try { mmkv.delete(storageKey); } catch {}
          try { mmkv.delete(draftStorageKey); } catch {}
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
        speakingMessageId={speakingMessageId}
        onPreviewImage={(uri) => setPreviewImageUri(uri)}
      />
    );
  };

  // Sprint 2: Auto-provision — when no agent instance exists, show friendly welcome
  const handleAutoProvision = useCallback(async () => {
    if (provisioning) return;
    setProvisioning(true);
    try {
      const result = await apiFetch<{ instance: any }>('/openclaw/auto-provision', { method: 'POST' });
      if (result?.instance) {
        useAuthStore.getState().addInstance({
          id: result.instance.id,
          name: result.instance.name || 'My Agent',
          instanceUrl: result.instance.instanceUrl || '',
          status: 'active',
          deployType: result.instance.deployType || 'cloud',
        });
        useAuthStore.getState().setOnboardingComplete();
        // Navigate to skill pack for one-tap core skill installation
        navigation.navigate('SkillPack');
      }
    } catch (err: any) {
      // Fallback: navigate to manual deploy
      navigation.navigate('DeploySelect');
    } finally {
      setProvisioning(false);
    }
  }, [provisioning, navigation]);

  // Sprint 1+2: No-instance welcome screen
  if (!activeInstance && !instanceId) {
    return (
      <SafeAreaView style={styles.welcomeContainer}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeEmoji}>{'🤖'}</Text>
          <Text style={styles.welcomeTitle}>{t({ en: 'Hi, I\'m your AI Agent!', zh: '你好，我是你的 AI 智能体！' })}</Text>
          <Text style={styles.welcomeSubtitle}>
            {t({ en: 'Let me set up everything for you. One tap and we can start chatting.', zh: '让我帮你准备好一切，一键即可开始对话。' })}
          </Text>
          <TouchableOpacity
            style={styles.welcomeBtn}
            onPress={handleAutoProvision}
            disabled={provisioning}
          >
            {provisioning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.welcomeBtnText}>{t({ en: 'Get Started', zh: '立即开始' })}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.welcomeSecondaryBtn}
            onPress={() => navigation.navigate('DeploySelect')}
          >
            <Text style={styles.welcomeSecondaryText}>{t({ en: 'Advanced Setup', zh: '高级配置' })}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={88}
    >
      {/* Simplified Chat toolbar */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bgCard }}>
        <View style={styles.chatBar}>
          <TouchableOpacity onPress={() => navigation.navigate('AgentConsole')} style={styles.chatBarBackBtn}>
            <Text style={styles.chatBarBackIcon}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={styles.chatBarTitle} numberOfLines={1}>🤖 {instanceName}</Text>
          <TouchableOpacity onPress={() => setShowSettingsSheet(true)} style={styles.chatBarGearBtn}>
            <Text style={styles.chatBarGearIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loadingHistory && (
        <View style={styles.historyLoader}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.historyLoaderText}>{t({ en: 'Loading history…', zh: '正在加载历史记录…' })}</Text>
        </View>
      )}

      <DesktopDiscoveryBanner
        sessionId={sessionIdRef.current}
        agentId={activeInstance?.metadata?.agentAccountId || instanceId}
        instanceName={instanceName}
        messages={allMessagesRef.current.length > 0 ? allMessagesRef.current.slice(-10) : messages.slice(-10)}
      />

      {isOffline && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f59e0b', paddingVertical: 6 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
            {t({ en: 'Offline — messages will be sent when reconnected', zh: '离线模式 — 恢复连接后自动发送' })}
          </Text>
        </View>
      )}

      {!!remoteClipboard?.text && (
        <View style={styles.remoteClipboardBanner}>
          <View style={styles.remoteClipboardTextWrap}>
            <Text style={styles.remoteClipboardTitle}>
              {t({ en: 'Desktop clipboard available', zh: '检测到桌面剪贴板' })}
            </Text>
            <Text style={styles.remoteClipboardSubtitle} numberOfLines={2}>
              {remoteClipboard.text}
            </Text>
          </View>
          <View style={styles.remoteClipboardActions}>
            <TouchableOpacity style={styles.remoteClipboardActionBtn} onPress={handleInsertDesktopClipboard}>
              <Text style={styles.remoteClipboardActionText}>{t({ en: 'Insert', zh: '插入' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.remoteClipboardActionBtn} onPress={handleCopyDesktopClipboard}>
              <Text style={styles.remoteClipboardActionText}>{t({ en: 'Copy', zh: '复制' })}</Text>
            </TouchableOpacity>
          </View>
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
        initialNumToRender={PAGE_SIZE}
        maxToRenderPerBatch={10}
        windowSize={5}
        onStartReached={loadOlderMessages}
        onStartReachedThreshold={0.3}
        ListHeaderComponent={
          allMessagesRef.current.length > messages.length ? (
            <TouchableOpacity onPress={loadOlderMessages} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: colors.accent, fontSize: 13 }}>
                {t({ en: 'Load older messages', zh: '加载更早消息' })}
              </Text>
            </TouchableOpacity>
          ) : null
        }
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
          onPress={() => { setVoiceMode(!voiceMode); setShowAttachToolbar(false); }}
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

      {/* Settings Bottom Sheet — replaces cluttered chatBar controls */}
      <Modal visible={showSettingsSheet} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSettingsSheet(false)} activeOpacity={1}>
          <View style={styles.settingsSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t({ en: 'Chat Settings', zh: '对话设置' })}</Text>

            {/* Voice mode toggle */}
            <View style={styles.sheetRow}>
              <Text style={styles.sheetRowLabel}>{t({ en: 'Voice Mode', zh: '语音模式' })}</Text>
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
                style={[styles.sheetToggle, duplexMode && styles.sheetToggleActive]}
              >
                <Text style={[styles.sheetToggleText, duplexMode && { color: colors.accent }]}>
                  {duplexMode ? t({ en: 'Live', zh: '实时' }) : t({ en: 'Basic', zh: '基础' })}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Auto-speak toggle */}
            <View style={styles.sheetRow}>
              <Text style={styles.sheetRowLabel}>{t({ en: 'Auto Read Aloud', zh: '自动朗读' })}</Text>
              <TouchableOpacity
                onPress={() => { setAutoSpeak(!autoSpeak); if (isSpeaking) stopSpeaking(); }}
                style={[styles.sheetToggle, autoSpeak && styles.sheetToggleActive]}
              >
                <Text style={[styles.sheetToggleText, autoSpeak && { color: colors.accent }]}>
                  {autoSpeak ? t({ en: 'On', zh: '开' }) : t({ en: 'Off', zh: '关' })}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Model selector */}
            <View style={styles.sheetRow}>
              <Text style={styles.sheetRowLabel}>{t({ en: 'Model', zh: '模型' })}</Text>
              <TouchableOpacity
                onPress={() => { setShowSettingsSheet(false); setTimeout(() => setShowModelPicker(true), 300); }}
                style={styles.sheetModelBtn}
              >
                <Text style={styles.sheetModelText} numberOfLines={1}>
                  {resolvedModelLabel || availableModels.find((m) => m.id === effectiveModelId)?.label || effectiveModelId}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Token usage */}
            <View style={styles.sheetRow}>
              <Text style={styles.sheetRowLabel}>{t({ en: 'Tokens Used', zh: '已用额度' })}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{used.toLocaleString()} / {total.toLocaleString()}</Text>
            </View>

            {/* New chat */}
            <TouchableOpacity style={styles.sheetActionBtn} onPress={() => { setShowSettingsSheet(false); handleClearChat(); }}>
              <Text style={styles.sheetActionText}>{'✨ '}{t({ en: 'New Conversation', zh: '新建对话' })}</Text>
            </TouchableOpacity>

            {/* Agent management */}
            <TouchableOpacity
              style={[styles.sheetActionBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }]}
              onPress={() => { setShowSettingsSheet(false); navigation.navigate('AgentConsole'); }}
            >
              <Text style={[styles.sheetActionText, { color: colors.textSecondary }]}>{'⚙️ '}{t({ en: 'Agent Management', zh: '智能体管理' })}</Text>
            </TouchableOpacity>
          </View>
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
                      const agentAccountId = activeInstance?.metadata?.agentAccountId;
                      if (agentAccountId) {
                        try {
                          const { updateAgentPresenceAccount } = await import('../../services/agentPresenceAccount');
                          await updateAgentPresenceAccount(agentAccountId, { preferredModel: m.id });
                        } catch {}
                      }
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
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  chatBarTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 16, flex: 1, textAlign: 'center' },
  chatBarBackBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  chatBarBackIcon: { color: colors.textPrimary, fontSize: 28, fontWeight: '300', marginTop: -2 },
  chatBarGearBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  chatBarGearIcon: { fontSize: 18 },
  chatBarBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.bgSecondary },
  chatBarBtnText: { color: colors.textMuted, fontSize: 12 },
  // Welcome screen (no instance)
  welcomeContainer: { flex: 1, backgroundColor: colors.bgPrimary },
  welcomeContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  welcomeEmoji: { fontSize: 72, marginBottom: 20 },
  welcomeTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  welcomeSubtitle: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  welcomeBtn: {
    width: '100%', height: 52, borderRadius: 26,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  welcomeBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  welcomeSecondaryBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  welcomeSecondaryText: { color: colors.textMuted, fontSize: 14 },
  // Settings Bottom Sheet
  settingsSheet: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12, paddingBottom: 40, paddingHorizontal: 20,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 17, marginBottom: 20, textAlign: 'center' },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sheetRowLabel: { color: colors.textPrimary, fontSize: 15 },
  sheetToggle: {
    paddingVertical: 5, paddingHorizontal: 14, borderRadius: 16,
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
  },
  sheetToggleActive: { backgroundColor: colors.accent + '20', borderColor: colors.accent + '40' },
  sheetToggleText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  sheetModelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 5, paddingHorizontal: 12, borderRadius: 12,
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, maxWidth: 200,
  },
  sheetModelText: { color: colors.accent, fontSize: 13, fontWeight: '600', flex: 1 },
  sheetActionBtn: {
    marginTop: 14, paddingVertical: 14, borderRadius: 14,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  sheetActionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  historyLoader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, justifyContent: 'center' },
  historyLoaderText: { color: colors.textMuted, fontSize: 13 },
  remoteClipboardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  remoteClipboardTextWrap: { flex: 1, minWidth: 0 },
  remoteClipboardTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  remoteClipboardSubtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  remoteClipboardActions: { flexDirection: 'row', gap: 8 },
  remoteClipboardActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  remoteClipboardActionText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
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
  thoughtContainer: { marginBottom: 6 },
  thoughtCapsule: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.accent + '12', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  thoughtCapsuleText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary, flex: 1 },
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
