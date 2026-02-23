import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import { sendAgentMessage } from '../../services/openclaw.service';
import { streamProxyChatSSE } from '../../services/realtime.service';
import { API_BASE } from '../../config/env';
import type { AgentStackParamList } from '../../navigation/types';
import * as Haptics from 'expo-haptics';

type RouteT = RouteProp<AgentStackParamList, 'AgentChat'>;
type Nav = NativeStackNavigationProp<AgentStackParamList, 'AgentChat'>;

// Available models — all routed through OpenClaw proxy
const MODELS = [
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', emoji: '⚡', provider: 'aws_bedrock' },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet', emoji: '🤖', provider: 'aws_bedrock' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', emoji: '🟢', provider: 'openai' },
  { id: 'gpt-4o', label: 'GPT-4o', emoji: '🟢', provider: 'openai' },
  { id: 'gemini-2.0-flash', label: 'Gemini Flash', emoji: '🔵', provider: 'google' },
  { id: 'deepseek-v3', label: 'DeepSeek V3', emoji: '🟣', provider: 'deepseek' },
];

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  streaming?: boolean;
  error?: boolean;
  createdAt: number;
  thoughts?: string[]; // Added for Thought Chain UI
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
                {item.streaming ? 'Agent is thinking...' : `Thought process (${item.thoughts?.length} steps)`}
              </Text>
            </TouchableOpacity>
            
            {isThoughtsExpanded && item.thoughts?.map((thought, idx) => (
              <Text key={idx} style={styles.thoughtItem}>
                <Text style={{ color: colors.accent }}>›</Text> {thought}
              </Text>
            ))}
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
              {item.content || (item.streaming && !hasThoughts ? ' ' : '')}
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
  const navigation = useNavigation<Nav>();
  const activeInstance = useAuthStore((s) => s.activeInstance);
  const instanceId = route.params?.instanceId || activeInstance?.id || '';
  const instanceName = route.params?.instanceName || activeInstance?.name || 'Agent';
  const token = useAuthStore.getState().token || '';

  const sessionIdRef = useRef<string>(`session-${Date.now()}`);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Model selection (default to Claude Haiku 4.5 via Bedrock)
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  // Session token tracking (estimated: ~4 chars per token)
  const [sessionTokens, setSessionTokens] = useState(0);

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
  const flatListRef = useRef<FlatList>(null);

  // Load chat history on mount
  useEffect(() => {
    if (!instanceId) return;
    loadHistory();
    return () => {
      // Cancel any in-flight stream on unmount
      streamAbortRef.current?.abort();
    };
  }, [instanceId]);

  const loadHistory = async () => {
    if (!instanceId || !token) return;
    try {
      setLoadingHistory(true);
      const resp = await fetch(
        `${API_BASE}/openclaw/proxy/${instanceId}/history?sessionId=${sessionIdRef.current}`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(6000) },
      );
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

  const handleSend = async () => {
    const text = input.trim();
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
      thoughts: ['Analyzing request...'], // Initial thought
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setSending(true);

    // Abort any previous stream
    streamAbortRef.current?.abort();

    try {
      await Haptics.selectionAsync();

      let streamSucceeded = false;
      await new Promise<void>((resolve) => {
        const ac = streamProxyChatSSE({
          instanceId,
          message: text,
          sessionId: sessionIdRef.current,
          token,
          model: selectedModel,
          onChunk: (chunk) => {
            streamSucceeded = true;
            appendToStreamingMessage(assistantMsgId, chunk);
            // Estimate token usage: ~4 chars per token
            setSessionTokens((t) => t + Math.ceil(chunk.length / 4));
          },
          onDone: () => resolve(),
          onError: () => resolve(), // resolve so we can fall back
        });
        streamAbortRef.current = ac;
      });

      if (!streamSucceeded) {
        // HTTP fallback via non-streaming endpoint
        const result = await sendAgentMessage(instanceId, text);
        const replyContent = (result as any)?.reply?.content
          || (result as any)?.message
          || (result as any)?.content
          || 'Could not reach agent. Check your connection.';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: replyContent, streaming: false } : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantMsgId ? { ...m, streaming: false } : m)
        );
      }
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

  const handleClearChat = () => {
    Alert.alert('Start new session?', 'Chat history will be cleared.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'New Session',
        style: 'destructive',
        onPress: () => {
          streamAbortRef.current?.abort();
          sessionIdRef.current = `session-${Date.now()}`;
          setSessionTokens(0);
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
          {sessionTokens > 0 && (
            <View style={styles.tokenBadge}>
              <Text style={styles.tokenBadgeText}>⚡ {sessionTokens > 1000 ? `${(sessionTokens/1000).toFixed(1)}k` : sessionTokens} tkn</Text>
            </View>
          )}
          <TouchableOpacity onPress={handleClearChat} style={styles.chatBarBtn}>
            <Text style={styles.chatBarBtnText}>New session</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Model Selector */}
      <View style={styles.modelSelectorRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingVertical: 6 }}>
          {MODELS.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.modelPill, selectedModel === m.id && styles.modelPillActive]}
              onPress={() => setSelectedModel(m.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modelPillText, selectedModel === m.id && styles.modelPillTextActive]}>
                {m.emoji} {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {sessionTokens > 0 && (
          <View style={styles.tokenBar}>
            <View style={[styles.tokenBarFill, { width: `${Math.min((sessionTokens / 4000) * 100, 100)}%` as any }]} />
          </View>
        )}
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

      {/* Input */}
      <View style={styles.inputRow}>
        {/* Voice mic button */}
        <TouchableOpacity
          style={styles.micBtn}
          onPress={() => navigation.navigate('VoiceChat', { instanceId })}
          activeOpacity={0.7}
        >
          <Text style={styles.micIcon}>🎤</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder={`Message ${instanceName}...`}
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={4000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendIcon}>↑</Text>
          )}
        </TouchableOpacity>
      </View>
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
  tokenBadge: { backgroundColor: colors.accent + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tokenBadgeText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  modelSelectorRow: { backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border },
  modelPill: {
    backgroundColor: colors.bgSecondary, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: colors.border,
  },
  modelPillActive: { borderColor: colors.accent, backgroundColor: colors.accent + '22' },
  modelPillText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  modelPillTextActive: { color: colors.accent },
  tokenBar: { height: 2, backgroundColor: colors.bgSecondary, marginHorizontal: 12, marginBottom: 6, borderRadius: 1, overflow: 'hidden' },
  tokenBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 1 },
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
    gap: 8,
  },
  micBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  micIcon: { fontSize: 18 },
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
  thoughtContainer: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thoughtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  thoughtHeaderText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  thoughtItem: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginLeft: 4,
  },
});
