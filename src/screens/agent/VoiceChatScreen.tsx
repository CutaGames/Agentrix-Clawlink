/**
 * VoiceChatScreen — Voice-first conversation with the agent.
 * - Records audio via expo-av, sends to backend /api/voice/transcribe (Whisper)
 * - Agent reply is spoken back via expo-speech (TTS)
 * - Falls back to text input when voice not available
 *
 * Backend: POST /api/hq/chat (or active instance chat endpoint)
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { apiFetch, API_BASE } from '../../services/api';
import { AudioQueuePlayer } from '../../services/AudioQueuePlayer';
import { useAuthStore } from '../../stores/authStore';
import {
  agentMarketplacePurchase,
  agentResourcePublish,
  agentResourceSearch,
  agentSkillExecute,
  agentSkillInstall,
  agentSkillPublish,
  agentSkillSearch,
  agentTaskPost,
  agentTaskSearch,
  sendAgentMessage,
} from '../../services/openclaw.service';

// expo-av may not be installed yet — degrade gracefully
let AudioModule: any = null;
try {
  AudioModule = require('expo-av').Audio;
} catch (_) {}

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  ts: number;
};

type RecordingState = 'idle' | 'recording' | 'processing';

type ParsedVoiceCommand =
  | { kind: 'skill_search'; query: string }
  | { kind: 'resource_search'; query: string }
  | { kind: 'task_search'; query: string }
  | { kind: 'skill_install'; query: string }
  | { kind: 'skill_execute'; query: string; input?: Record<string, any> }
  | { kind: 'purchase'; query: string; target: 'skill' | 'resource' }
  | { kind: 'task_post'; title: string; description: string; budget: number; currency: string }
  | { kind: 'skill_publish'; name: string; description: string; price?: number; category?: string }
  | { kind: 'resource_publish'; name: string; description: string; price?: number; resourceType?: string; category?: string };

function extractLabeledValue(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}[：:]?\s*([^，。;；\n]+)`, 'i'));
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return undefined;
}

function extractPrice(text: string): number | undefined {
  const match = text.match(/(?:预算|价格|price|budget)[：:]?\s*(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : undefined;
}

function extractJsonPayload(text: string): Record<string, any> | undefined {
  const jsonMatch = text.match(/\{[\s\S]*\}$/);
  if (!jsonMatch) return undefined;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return undefined;
  }
}

function parseVoiceCommand(text: string): ParsedVoiceCommand | null {
  const raw = text.trim();
  const lower = raw.toLowerCase();
  const queryAfter = (pattern: RegExp) => raw.replace(pattern, '').trim().replace(/^[：:\s]+/, '');

  if (/^(搜索|查找|找|search|find).*(技能|skill)/i.test(raw)) {
    const query = queryAfter(/^(搜索|查找|找|search|find)\s*(技能|skill)?/i);
    return query ? { kind: 'skill_search', query } : null;
  }

  if (/^(搜索|查找|找|search|find).*(资源|商品|product|resource|goods)/i.test(raw)) {
    const query = queryAfter(/^(搜索|查找|找|search|find)\s*(资源|商品|product|resource|goods)?/i);
    return query ? { kind: 'resource_search', query } : null;
  }

  if (/^(搜索|查找|找|search|find).*(任务|task)/i.test(raw)) {
    const query = queryAfter(/^(搜索|查找|找|search|find)\s*(任务|task)?/i);
    return { kind: 'task_search', query };
  }

  if (/^(安装|install)/i.test(raw)) {
    const query = queryAfter(/^(安装|install)\s*(技能|skill)?/i);
    return query ? { kind: 'skill_install', query } : null;
  }

  if (/^(执行|运行|run|execute)/i.test(raw)) {
    const query = queryAfter(/^(执行|运行|run|execute)\s*(技能|skill)?/i).replace(/\{[\s\S]*\}$/, '').trim();
    return query ? { kind: 'skill_execute', query, input: extractJsonPayload(raw) } : null;
  }

  if (/^(购买|buy|purchase)/i.test(raw)) {
    const target: 'skill' | 'resource' = /(资源|商品|product|resource|goods)/i.test(raw) ? 'resource' : 'skill';
    const query = queryAfter(/^(购买|buy|purchase)\s*(技能|skill|资源|商品|product|resource|goods)?/i);
    return query ? { kind: 'purchase', query, target } : null;
  }

  if (/^(发布任务|post task|publish task)/i.test(lower)) {
    const title = extractLabeledValue(raw, ['标题', 'title']) || raw.replace(/^(发布任务|post task|publish task)/i, '').split(/[，。\n]/)[0]?.trim();
    const description = extractLabeledValue(raw, ['描述', 'description']) || raw;
    const budget = extractPrice(raw);
    const currency = /cny|人民币|¥/i.test(raw) ? 'CNY' : 'USD';
    if (title && description && budget) return { kind: 'task_post', title, description, budget, currency };
    return null;
  }

  if (/^(发布技能|publish skill)/i.test(lower)) {
    const name = extractLabeledValue(raw, ['名称', 'name']) || raw.replace(/^(发布技能|publish skill)/i, '').split(/[，。\n]/)[0]?.trim();
    const description = extractLabeledValue(raw, ['描述', 'description']);
    const price = extractPrice(raw);
    const category = extractLabeledValue(raw, ['分类', 'category']);
    if (name && description) return { kind: 'skill_publish', name, description, price, category };
    return null;
  }

  if (/^(发布资源|发布商品|publish resource|publish product)/i.test(lower)) {
    const name = extractLabeledValue(raw, ['名称', 'name']) || raw.replace(/^(发布资源|发布商品|publish resource|publish product)/i, '').split(/[，。\n]/)[0]?.trim();
    const description = extractLabeledValue(raw, ['描述', 'description']);
    const price = extractPrice(raw);
    const resourceType = extractLabeledValue(raw, ['类型', 'type']);
    const category = extractLabeledValue(raw, ['分类', 'category']);
    if (name && description) return { kind: 'resource_publish', name, description, price, resourceType, category };
    return null;
  }

  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VoiceChatScreen() {
  const navigation = useNavigation<any>();
  const activeInstance = useAuthStore((s) => s.activeInstance);
  const sessionIdRef = useRef<string | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: '👋 Hey! Press the microphone button and speak, or type your message below.',
      ts: Date.now(),
    },
  ]);
  const [recordState, setRecordState] = useState<RecordingState>('idle');
  const [textInput, setTextInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioPlayer = React.useRef<AudioQueuePlayer | null>(null);

  React.useEffect(() => {
    audioPlayer.current = new AudioQueuePlayer(() => setIsSpeaking(false));
    return () => {
      audioPlayer.current?.stopAll();
    };
  }, []);
  const recordingRef = useRef<any>(null);
  const scrollRef = useRef<ScrollView>(null);

  // ── TTS helper ───────────────────────────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    if (!text) return;
    setIsSpeaking(true);
    // Cut responses into smaller sentences for audio streaming
    const sentences = text.match(/[^。！？.!?]+[。！？.!?]*/g) || [text];
    for (let i = 0; i < sentences.length; i++) {
      const s = sentences[i].trim();
      if (!s) continue;
      const encodedText = encodeURIComponent(s);
      const audioUri = `${API_BASE}/voice/tts?text=${encodedText}`;
      audioPlayer.current?.enqueue(audioUri);
    }
  }, []);

  // ── Add message ──────────────────────────────────────────────────────────────
  const addMessage = useCallback((role: 'user' | 'assistant', text: string) => {
    const msg: Message = { id: String(Date.now()), role, text, ts: Date.now() };
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    return msg;
  }, []);

  const formatToolResult = useCallback((command: ParsedVoiceCommand, payload: any): string => {
    if (!payload) return 'Done.';
    if (payload.success === false || payload.error) return `❌ ${payload.error || 'Command failed'}`;

    switch (command.kind) {
      case 'skill_search': {
        const skills = payload.result?.skills || payload.skills || [];
        if (!skills.length) return `没有找到和“${command.query}”相关的技能。`;
        return `找到 ${skills.length} 个技能：\n${skills.slice(0, 5).map((s: any, i: number) => `${i + 1}. ${s.name}（${s.id}）`).join('\n')}`;
      }
      case 'resource_search': {
        const items = payload.result?.products || payload.products || [];
        if (!items.length) return `没有找到和“${command.query}”相关的资源或商品。`;
        return `找到 ${items.length} 个资源：\n${items.slice(0, 5).map((s: any, i: number) => `${i + 1}. ${s.name} - ${s.price || 0} ${s.currency || 'USD'}`).join('\n')}`;
      }
      case 'task_search': {
        const items = payload.result?.tasks || payload.tasks || [];
        if (!items.length) return `没有找到相关任务。`;
        return `找到 ${items.length} 个任务：\n${items.slice(0, 5).map((t: any, i: number) => `${i + 1}. ${t.title} - ${t.budget} ${t.currency || 'USDC'}`).join('\n')}`;
      }
      case 'skill_install':
      case 'purchase':
      case 'task_post':
      case 'skill_publish':
      case 'resource_publish':
        return payload.result?.message || payload.message || '操作已完成。';
      case 'skill_execute':
        return payload.result?.result?.output?.message || payload.result?.message || JSON.stringify(payload.result?.result || payload.result || payload, null, 2);
      default:
        return payload.result?.message || payload.message || 'Done.';
    }
  }, []);

  const resolveFirstSkillId = useCallback(async (query: string) => {
    if (!activeInstance) return null;
    const result = await agentSkillSearch(activeInstance.id, query, undefined, 5);
    const skills = result.result?.skills || [];
    return skills[0]?.id ? { id: String(skills[0].id), searchResult: result } : null;
  }, [activeInstance]);

  const resolveFirstResourceId = useCallback(async (query: string) => {
    if (!activeInstance) return null;
    const result = await agentResourceSearch(activeInstance.id, query, undefined, 5);
    const products = result.result?.products || [];
    return products[0]?.id ? { id: String(products[0].id), searchResult: result } : null;
  }, [activeInstance]);

  const maybeHandleCommand = useCallback(async (userText: string): Promise<boolean> => {
    if (!activeInstance) return false;

    const command = parseVoiceCommand(userText);
    if (!command) return false;

    let payload: any;

    switch (command.kind) {
      case 'skill_search':
        payload = await agentSkillSearch(activeInstance.id, command.query, undefined, 8);
        break;
      case 'resource_search':
        payload = await agentResourceSearch(activeInstance.id, command.query, undefined, 8);
        break;
      case 'task_search':
        payload = await agentTaskSearch(activeInstance.id, command.query, 8);
        break;
      case 'skill_install': {
        const resolved = await resolveFirstSkillId(command.query);
        if (!resolved) {
          addMessage('assistant', `没有找到可安装的技能：${command.query}`);
          return true;
        }
        payload = await agentSkillInstall(activeInstance.id, resolved.id);
        break;
      }
      case 'skill_execute': {
        const resolved = await resolveFirstSkillId(command.query);
        if (!resolved) {
          addMessage('assistant', `没有找到可执行的技能：${command.query}`);
          return true;
        }
        payload = await agentSkillExecute(activeInstance.id, resolved.id, command.input);
        break;
      }
      case 'purchase': {
        const resolved = command.target === 'resource'
          ? await resolveFirstResourceId(command.query)
          : await resolveFirstSkillId(command.query);
        if (!resolved) {
          addMessage('assistant', `没有找到可购买的${command.target === 'resource' ? '资源' : '技能'}：${command.query}`);
          return true;
        }
        payload = await agentMarketplacePurchase(activeInstance.id, resolved.id);
        break;
      }
      case 'task_post':
        payload = await agentTaskPost(activeInstance.id, command.title, command.description, command.budget, command.currency);
        break;
      case 'skill_publish':
        payload = await agentSkillPublish(activeInstance.id, {
          name: command.name,
          description: command.description,
          category: command.category,
          price: command.price,
        });
        break;
      case 'resource_publish':
        payload = await agentResourcePublish(activeInstance.id, {
          name: command.name,
          description: command.description,
          category: command.category,
          resourceType: command.resourceType,
          price: command.price,
        });
        break;
      default:
        return false;
    }

    const reply = formatToolResult(command, payload);
    addMessage('assistant', reply);
    await speak(reply);
    return true;
  }, [activeInstance, addMessage, formatToolResult, resolveFirstResourceId, resolveFirstSkillId, speak]);

  // ── Send text to agent ───────────────────────────────────────────────────────
  const sendToAgent = useCallback(async (userText: string) => {
    if (!userText.trim()) return;
    addMessage('user', userText);
    setRecordState('processing');

    try {
      const handledByCommand = await maybeHandleCommand(userText);
      if (handledByCommand) {
        return;
      }

      if (activeInstance?.id) {
        const data = await sendAgentMessage(activeInstance.id, userText, sessionIdRef.current);
        sessionIdRef.current = data.sessionId || sessionIdRef.current;
        const reply = data.reply?.content || data.reply?.text || data.reply?.id || '(no response)';
        addMessage('assistant', reply);
        await speak(reply);
        return;
      }

      const data = await apiFetch<{ reply?: string; content?: string; message?: string }>(
        '/hq/chat',
        {
          method: 'POST',
          body: JSON.stringify({ message: userText }),
        },
      );
      const reply = data.reply || data.content || data.message || '(no response)';
      addMessage('assistant', reply);
      await speak(reply);
    } catch (err: any) {
      const errMsg = `Error: ${err.message}`;
      addMessage('assistant', errMsg);
    } finally {
      setRecordState('idle');
    }
  }, [activeInstance?.id, addMessage, maybeHandleCommand, speak]);

  // ── Start recording ──────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!AudioModule) {
      Alert.alert('Voice Not Available', 'expo-av is not installed. Please use text input.');
      return;
    }
    try {
      const { granted } = await AudioModule.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Required', 'Microphone permission is needed for voice input.');
        return;
      }
      await AudioModule.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await AudioModule.Recording.createAsync(
        AudioModule.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setRecordState('recording');
    } catch (err: any) {
      Alert.alert('Recording Error', err.message);
    }
  }, []);

  // ── Stop recording & transcribe ──────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    setRecordState('processing');

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Upload audio to backend for transcription
      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      } as any);

      const result = await apiFetch<{ transcript: string }>('/voice/transcribe', {
        method: 'POST',
        body: formData,
        headers: {}, // let fetch set multipart content-type
      }).catch(() => null);

      const transcript = result?.transcript;
      if (transcript) {
        await sendToAgent(transcript);
      } else {
        // Transcription failed — show prompt for manual override
        Alert.alert(
          'Transcription Failed',
          'Could not transcribe audio. Please type your message.',
        );
        setRecordState('idle');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
      setRecordState('idle');
    }
  }, [sendToAgent]);

  // ── Handle mic press ─────────────────────────────────────────────────────────
  const handleMicPress = useCallback(() => {
    if (recordState === 'idle') {
      startRecording();
    } else if (recordState === 'recording') {
      stopRecording();
    }
  }, [recordState, startRecording, stopRecording]);

  // ── Send text ────────────────────────────────────────────────────────────────
  const handleSendText = useCallback(() => {
    if (!textInput.trim() || recordState === 'processing') return;
    const text = textInput.trim();
    setTextInput('');
    sendToAgent(text);
  }, [textInput, recordState, sendToAgent]);

  // ── Mic button style ─────────────────────────────────────────────────────────
  const micActive = recordState === 'recording';
  const micProcessing = recordState === 'processing';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Voice Chat</Text>
        {isSpeaking && (
          <View style={styles.speakingBadge}>
            <Text style={styles.speakingText}>🔊 Speaking</Text>
          </View>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.assistantBubble]}
          >
            <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userText : styles.assistantText]}>
              {msg.text}
            </Text>
            <Text style={styles.bubbleTime}>
              {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        ))}
        {micProcessing && (
          <View style={[styles.bubble, styles.assistantBubble]}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.bubbleText, styles.assistantText]}> Processing...</Text>
          </View>
        )}
      </ScrollView>

      {/* Mic orb */}
      <View style={styles.micSection}>
        <TouchableOpacity
          style={[styles.micOrb, micActive && styles.micOrbActive, micProcessing && styles.micOrbProcessing]}
          onPress={handleMicPress}
          disabled={micProcessing}
          activeOpacity={0.8}
        >
          {micProcessing ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <Text style={styles.micIcon}>{micActive ? '⏹' : '🎤'}</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.micHint}>
          {micActive ? 'Tap to stop recording' : micProcessing ? 'Processing...' : 'Tap to speak'}
        </Text>
      </View>

      {/* Text input fallback */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={textInput}
          onChangeText={setTextInput}
          placeholder="Or type here..."
          placeholderTextColor={colors.textMuted}
          editable={recordState !== 'processing'}
          onSubmitEditing={handleSendText}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!textInput.trim() || micProcessing) && styles.sendBtnDisabled]}
          onPress={handleSendText}
          disabled={!textInput.trim() || micProcessing}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 12,
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { marginRight: 12 },
  backText: { color: colors.accent, fontSize: 16 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  speakingBadge: {
    backgroundColor: colors.accent + '33',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  speakingText: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    flexDirection: 'column',
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.accent },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: colors.bgCard, flexDirection: 'row', flexWrap: 'wrap' },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  assistantText: { color: colors.textPrimary },
  bubbleTime: { fontSize: 11, color: colors.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  micSection: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  micOrb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  micOrbActive: { backgroundColor: '#ef4444', shadowColor: '#ef4444' },
  micOrbProcessing: { backgroundColor: colors.textMuted },
  micIcon: { fontSize: 30 },
  micHint: { color: colors.textMuted, fontSize: 13 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    paddingTop: 8,
    gap: 8,
    backgroundColor: colors.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.bgCard, opacity: 0.5 },
  sendIcon: { color: '#fff', fontSize: 18 },
});
