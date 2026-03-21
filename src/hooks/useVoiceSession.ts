/**
 * useVoiceSession — Unified voice session hook for mobile
 *
 * Extracts all voice logic from AgentChatScreen into a reusable hook:
 * - Voice recording (expo-av)
 * - Live speech recognition (expo-speech-recognition)
 * - TTS playback queue (AudioQueuePlayer)
 * - Duplex mode (listen → transcribe → send → speak → resume)
 * - Barge-in / interrupt / resume
 * - Streamed sentence-level TTS
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { AudioQueuePlayer } from '../services/AudioQueuePlayer';
import {
  isLiveSpeechRecognitionAvailable,
  requestLiveSpeechPermissions,
  startLiveSpeechRecognition,
  type LiveSpeechController,
} from '../services/liveSpeech.service';
import { API_BASE } from '../config/env';
import type { UploadedChatAttachment } from '../services/api';
import { BackgroundVoiceService } from '../services/backgroundVoice.service';

// expo-av: graceful degrade if missing
let Audio: any = null;
try { Audio = require('expo-av').Audio; } catch (_) {}

let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch (_) {}

// ── Types ──────────────────────────────────────────────────

export type VoicePhase = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking';

export interface UseVoiceSessionOptions {
  token: string | null;
  language: string;              // 'zh' | 'en'
  voiceModeRequested?: boolean;
  duplexModeRequested?: boolean;
  agentVoiceId?: string;
  instanceName?: string;
  isSending?: boolean;
  /** Called to send a transcript (and optional audio attachment) as a message */
  onSendMessage: (text: string, attachments?: UploadedChatAttachment[]) => void;
  /** Called to stop/interrupt the current streaming response */
  onStopCurrentResponse: (showHint?: boolean) => void;
  /** i18n translation function */
  t: (opts: { en: string; zh: string }) => string;
}

export interface UseVoiceSessionReturn {
  // State
  voiceMode: boolean;
  setVoiceMode: (v: boolean) => void;
  duplexMode: boolean;
  setDuplexMode: (v: boolean) => void;
  voicePhase: VoicePhase;
  isRecording: boolean;
  isSpeaking: boolean;
  liveListening: boolean;
  liveVoiceVolume: number;
  transcriptPreview: string;
  voiceInteractionMode: 'hold' | 'tap';
  setVoiceInteractionMode: (m: 'hold' | 'tap') => void;
  autoSpeak: boolean;
  setAutoSpeak: (v: boolean) => void;
  liveVoiceAvailable: boolean;

  // Actions
  startVoiceRecording: () => Promise<void>;
  stopVoiceRecording: () => Promise<void>;
  handleVoicePressIn: () => Promise<void>;
  handleVoicePressOut: () => Promise<void>;
  handleVoiceTapToggle: () => Promise<void>;
  speakText: (text: string) => void;
  stopSpeaking: () => void;
  handleSpeakMessage: (text: string, messageId?: string) => void;
  enqueueStreamedSpeech: (chunk: string, flush?: boolean) => void;
  resetVoicePhaseAfterResponse: () => void;
  resumeLiveSpeech: () => void;
  speakingMessageId: string | null;
}

// ── Hook ───────────────────────────────────────────────────

export function useVoiceSession(options: UseVoiceSessionOptions): UseVoiceSessionReturn {
  const { token, language, voiceModeRequested, duplexModeRequested, agentVoiceId, instanceName, isSending, onSendMessage, onStopCurrentResponse, t } = options;

  // ── State ──
  const [voiceMode, setVoiceMode] = useState(!!voiceModeRequested);
  const [voiceInteractionMode, setVoiceInteractionMode] = useState<'hold' | 'tap'>(duplexModeRequested ? 'tap' : 'hold');
  const [duplexMode, setDuplexMode] = useState(!!duplexModeRequested);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle');
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const [liveVoiceAvailable, setLiveVoiceAvailable] = useState(false);
  const [liveListening, setLiveListening] = useState(false);
  const [liveVoiceVolume, setLiveVoiceVolume] = useState(-2);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // ── Refs ──
  const audioPlayerRef = useRef<AudioQueuePlayer | null>(null);
  const recordingRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const liveSpeechRef = useRef<LiveSpeechController | null>(null);
  const liveSpeechManualStopRef = useRef(false);
  const lastLiveFinalTranscriptRef = useRef('');
  const voiceModeRef = useRef(voiceMode);
  const duplexModeRef = useRef(duplexMode);
  const sendingRef = useRef(false);
  const backgroundVoiceRef = useRef<BackgroundVoiceService | null>(null);
  const pendingTtsSentenceRef = useRef('');
  const streamedTtsStartedRef = useRef(false);

  const voiceLanguageHint = language === 'zh' ? 'zh' : 'en';

  // Keep refs in sync
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { duplexModeRef.current = duplexMode; }, [duplexMode]);
  useEffect(() => { sendingRef.current = !!isSending; }, [isSending]);

  // ── Recording options ──
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

  // ── Check live speech availability ──
  useEffect(() => {
    setLiveVoiceAvailable(isLiveSpeechRecognitionAvailable());
  }, []);

  // ── Live Speech ──

  const stopLiveSpeech = useCallback((abort = false, manual = false) => {
    liveSpeechManualStopRef.current = manual;
    const ctrl = liveSpeechRef.current;
    liveSpeechRef.current = null;
    setLiveListening(false);
    setLiveVoiceVolume(-2);
    if (!ctrl) return;
    try {
      if (abort) ctrl.abort(); else ctrl.stop();
    } catch {}
  }, []);

  // ── TTS ──

  const resumeLiveSpeechFn = useCallback(() => {
    if (!duplexModeRef.current || sendingRef.current) return;
    // Will be called after TTS finishes; startLiveSpeech defined below
  }, []);

  // Init AudioQueuePlayer
  useEffect(() => {
    audioPlayerRef.current = new AudioQueuePlayer(() => {
      setIsSpeaking(false);
      setVoicePhase((prev) => (prev === 'speaking' ? 'idle' : prev));
      setSpeakingMessageId(null);
      // Live speech restart is handled by the auto-restart effect
      // that watches isSpeaking → false.
    });
    return () => {
      audioPlayerRef.current?.stopAll();
      stopLiveSpeech(true, true);
    };
  }, [stopLiveSpeech]);

  useEffect(() => {
    const service = new BackgroundVoiceService();
    backgroundVoiceRef.current = service;
    void service.init({
      onTimeout: () => {
        setDuplexMode(false);
        setVoiceMode(false);
        stopSpeaking();
        stopLiveSpeech(true, true);
      },
    });

    return () => {
      service.destroy();
      backgroundVoiceRef.current = null;
    };
  }, [stopLiveSpeech, stopSpeaking]);

  // voiceModeRequested sync
  useEffect(() => {
    if (voiceModeRequested) setVoiceMode(true);
  }, [voiceModeRequested]);

  useEffect(() => {
    if (duplexModeRequested) setDuplexMode(true);
  }, [duplexModeRequested]);

  // voiceMode off → reset
  useEffect(() => {
    if (!voiceMode) {
      setDuplexMode(false);
      setVoicePhase('idle');
      setIsRecording(false);
      isRecordingRef.current = false;
      stopLiveSpeech(true, true);
    }
  }, [stopLiveSpeech, voiceMode]);

  // duplexMode → enable voiceMode, autoSpeak, tap mode
  useEffect(() => {
    if (duplexMode) {
      setVoiceMode(true);
      setAutoSpeak(true);
      setVoiceInteractionMode('tap');
    } else {
      setVoiceInteractionMode('hold');
    }
  }, [duplexMode]);

  useEffect(() => {
    const shouldKeepBackgroundSession = voiceMode || duplexMode || isRecording || liveListening || isSpeaking;
    const backgroundVoice = backgroundVoiceRef.current;
    if (!backgroundVoice) return;
    if (shouldKeepBackgroundSession) {
      backgroundVoice.activate();
    } else {
      backgroundVoice.deactivate();
    }
  }, [duplexMode, isRecording, isSpeaking, liveListening, voiceMode]);

  const speakText = useCallback((text: string) => {
    if (!text || text.startsWith('⚠️') || text.startsWith('Error:')) return;
    if (duplexModeRef.current) {
      stopLiveSpeech(true, false);
    }
    setIsSpeaking(true);
    setVoicePhase((prev) => (prev === 'recording' || prev === 'transcribing' ? prev : 'speaking'));
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
    setSpeakingMessageId(null);
  }, []);

  const handleSpeakMessage = useCallback((text: string, messageId?: string) => {
    if (!text) return;
    if (messageId) setSpeakingMessageId(messageId);
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

    let segmentsToSpeak = matches.map((s) => s.trim()).filter(Boolean);

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

  const resetVoicePhaseAfterResponse = useCallback(() => {
    setVoicePhase((prev) => (prev === 'recording' || prev === 'transcribing' ? prev : 'idle'));
    // Reset streamed TTS tracking for next message
    pendingTtsSentenceRef.current = '';
    streamedTtsStartedRef.current = false;
  }, []);

  // ── Live Speech Recognition (duplex) ──

  const startLiveSpeechInternal = useCallback(async () => {
    if (!duplexModeRef.current || liveSpeechRef.current || !liveVoiceAvailable || !voiceModeRef.current) {
      return;
    }

    try {
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
          // Auto-restart
          setTimeout(() => {
            void startLiveSpeechInternal();
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
          if (!normalized || normalized === lastLiveFinalTranscriptRef.current) return;
          lastLiveFinalTranscriptRef.current = normalized;
          setTranscriptPreview(normalized);
          stopLiveSpeech(true, false);
          if (isSpeaking) stopSpeaking();
          onStopCurrentResponse(true);
          setVoicePhase('thinking');
          setTimeout(() => {
            onSendMessage(normalized);
          }, 60);
        },
        onError: (error) => {
          if (error?.error === 'aborted' || error?.error === 'no-speech') return;
          setLiveListening(false);
          setVoicePhase('idle');
          setTranscriptPreview('');
        },
        onVolumeChange: (value) => {
          setLiveVoiceVolume(value);
        },
      },
      [instanceName || '', agentVoiceId || '', 'Agentrix'],
    );
    } catch (err) {
      console.warn('startLiveSpeechInternal failed:', err);
      liveSpeechRef.current = null;
      setLiveListening(false);
      setVoicePhase('idle');
    }
  }, [agentVoiceId, instanceName, isSpeaking, liveVoiceAvailable, onSendMessage, onStopCurrentResponse, stopLiveSpeech, stopSpeaking, t, voiceLanguageHint]);

  // Duplex mode toggle → start/stop live speech
  useEffect(() => {
    if (duplexMode) {
      void startLiveSpeechInternal();
    } else {
      stopLiveSpeech(true, true);
    }
  }, [duplexMode, startLiveSpeechInternal, stopLiveSpeech]);

  // Auto-restart live speech when not sending and not speaking
  useEffect(() => {
    if (duplexMode && voiceMode && !isSpeaking) {
      void startLiveSpeechInternal();
    }
  }, [duplexMode, isSpeaking, startLiveSpeechInternal, voiceMode]);

  // ── Voice Recording ──

  const resetAudioModeAfterRecording = useCallback(async () => {
    if (!Audio) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    } catch {}
  }, []);

  const startVoiceRecording = useCallback(async () => {
    if (!Audio) {
      Alert.alert(t({ en: 'Voice Unavailable', zh: '语音不可用' }), t({ en: 'Audio module not available.', zh: '当前音频模块不可用。' }));
      return;
    }
    if (voicePhase === 'transcribing') {
      Alert.alert(t({ en: 'Voice Busy', zh: '语音处理中' }), t({ en: 'Still transcribing. Please wait.', zh: '上一段录音还在转写中，请稍等。' }));
      return;
    }
    try {
      if (!isRecordingRef.current) {
        isRecordingRef.current = true;
        if (isSpeaking) {
          await audioPlayerRef.current?.stopAll();
          setIsSpeaking(false);
        }
        onStopCurrentResponse(true);
        setVoicePhase('recording');
        setTranscriptPreview('');
        const permResult = await Audio.requestPermissionsAsync();
        if (!permResult.granted) {
          isRecordingRef.current = false;
          setVoicePhase('idle');
          Alert.alert(t({ en: 'Microphone Permission', zh: '麦克风权限' }), t({ en: 'Please enable microphone access.', zh: '请开启麦克风权限。' }));
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
          voiceRecordingOptions || Audio.RecordingOptionsPresets.HIGH_QUALITY,
        );
        recordingRef.current = recording;
        setIsRecording(true);
        if (Haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (e: any) {
      isRecordingRef.current = false;
      setIsRecording(false);
      setVoicePhase('idle');
      Alert.alert(t({ en: 'Voice Error', zh: '语音错误' }), e?.message || 'Unknown error');
    }
  }, [isSpeaking, onStopCurrentResponse, t, voicePhase, voiceRecordingOptions]);

  const stopVoiceRecording = useCallback(async () => {
    if (!Audio || !isRecordingRef.current) return;
    try {
      isRecordingRef.current = false;
      setIsRecording(false);
      setVoicePhase('transcribing');
      if (Haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
            console.warn('Transcription failed', err);
          } finally {
            clearTimeout(timeout);
          }

          if (transcript) {
            setTranscriptPreview(transcript);
            setVoicePhase('thinking');
            setTimeout(() => onSendMessage(transcript), 80);
          } else {
            // Try uploading audio as attachment fallback
            try {
              const { uploadChatAttachment } = require('../services/api');
              const uploadedAudio = await uploadChatAttachment({
                uri,
                name: `voice-${Date.now()}.m4a`,
                type: 'audio/m4a',
              });
              if (uploadedAudio) {
                setTranscriptPreview('[Voice Message]');
                setVoicePhase('thinking');
                setTimeout(() => onSendMessage('', [uploadedAudio]), 80);
              } else {
                setVoicePhase('idle');
              }
            } catch {
              setVoicePhase('idle');
              Alert.alert(t({ en: 'No Speech', zh: '未检测到语音' }), t({ en: 'No speech detected.', zh: '未检测到有效语音。' }));
            }
          }
        } else {
          setVoicePhase('idle');
        }
      }
    } catch (e: any) {
      isRecordingRef.current = false;
      setIsRecording(false);
      setVoicePhase('idle');
      Alert.alert(t({ en: 'Voice Error', zh: '语音错误' }), e?.message || 'Unknown');
    } finally {
      await resetAudioModeAfterRecording();
    }
  }, [onSendMessage, resetAudioModeAfterRecording, t, token, voiceLanguageHint]);

  // ── Interaction wrappers ──

  const handleVoicePressIn = useCallback(async () => {
    if (voiceInteractionMode !== 'hold') return;
    await startVoiceRecording();
  }, [voiceInteractionMode, startVoiceRecording]);

  const handleVoicePressOut = useCallback(async () => {
    if (voiceInteractionMode !== 'hold') return;
    await stopVoiceRecording();
  }, [voiceInteractionMode, stopVoiceRecording]);

  const handleVoiceTapToggle = useCallback(async () => {
    if (duplexMode) {
      if (liveSpeechRef.current) {
        stopLiveSpeech(true, true);
        setVoicePhase('idle');
        setTranscriptPreview('');
        return;
      }
      if (isSpeaking) stopSpeaking();
      onStopCurrentResponse(true);
      await startLiveSpeechInternal();
      return;
    }
    if (isRecordingRef.current) {
      await stopVoiceRecording();
      return;
    }
    await startVoiceRecording();
  }, [duplexMode, isSpeaking, onStopCurrentResponse, startLiveSpeechInternal, startVoiceRecording, stopLiveSpeech, stopSpeaking, stopVoiceRecording]);

  const resumeLiveSpeech = useCallback(() => {
    if (!duplexModeRef.current || sendingRef.current || isSpeaking || !voiceModeRef.current) return;
    void startLiveSpeechInternal();
  }, [isSpeaking, startLiveSpeechInternal]);

  return {
    // State
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

    // Actions
    startVoiceRecording,
    stopVoiceRecording,
    handleVoicePressIn,
    handleVoicePressOut,
    handleVoiceTapToggle,
    speakText,
    stopSpeaking,
    handleSpeakMessage,
    enqueueStreamedSpeech,
    resetVoicePhaseAfterResponse,
    resumeLiveSpeech,
  };
}
