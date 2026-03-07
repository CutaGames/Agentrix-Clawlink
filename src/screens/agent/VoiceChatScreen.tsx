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
import { useI18n } from '../../stores/i18nStore';

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

// ─── Component ────────────────────────────────────────────────────────────────

export function VoiceChatScreen() {
  const navigation = useNavigation<any>();
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: t({ en: '👋 Hey! Press the microphone button and speak, or type your message below.', zh: '👋 你好！按下麦克风开始说话，或者直接在下面输入消息。' }),
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

  // ── Send text to agent ───────────────────────────────────────────────────────
  const sendToAgent = useCallback(async (userText: string) => {
    if (!userText.trim()) return;
    addMessage('user', userText);
    setRecordState('processing');

    try {
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
  }, [addMessage, speak]);

  // ── Start recording ──────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!AudioModule) {
      Alert.alert(t({ en: 'Voice Not Available', zh: '语音不可用' }), t({ en: 'expo-av is not installed. Please use text input.', zh: '当前未安装 expo-av，请改用文字输入。' }));
      return;
    }
    try {
      const { granted } = await AudioModule.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(t({ en: 'Permission Required', zh: '需要权限' }), t({ en: 'Microphone permission is needed for voice input.', zh: '语音输入需要麦克风权限。' }));
        return;
      }
      await AudioModule.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await AudioModule.Recording.createAsync(
        AudioModule.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setRecordState('recording');
    } catch (err: any) {
      Alert.alert(t({ en: 'Recording Error', zh: '录音错误' }), err.message);
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
          t({ en: 'Transcription Failed', zh: '转写失败' }),
          t({ en: 'Could not transcribe audio. Please type your message.', zh: '无法识别这段语音，请改用文字输入。' }),
        );
        setRecordState('idle');
      }
    } catch (err: any) {
      Alert.alert(t({ en: 'Error', zh: '错误' }), err.message);
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
          <Text style={styles.backText}>← {t({ en: 'Back', zh: '返回' })}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t({ en: 'Voice Chat', zh: '语音对话' })}</Text>
        {isSpeaking && (
          <View style={styles.speakingBadge}>
            <Text style={styles.speakingText}>🔊 {t({ en: 'Speaking', zh: '播放中' })}</Text>
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
            <Text style={[styles.bubbleText, styles.assistantText]}> {t({ en: 'Processing...', zh: '处理中…' })}</Text>
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
          {micActive
            ? t({ en: 'Tap to stop recording', zh: '点击停止录音' })
            : micProcessing
              ? t({ en: 'Processing...', zh: '处理中…' })
              : t({ en: 'Tap to speak', zh: '点击开始说话' })}
        </Text>
      </View>

      {/* Text input fallback */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={textInput}
          onChangeText={setTextInput}
          placeholder={t({ en: 'Or type here...', zh: '或者在这里输入…' })}
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
