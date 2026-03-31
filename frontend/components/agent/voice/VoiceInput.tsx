import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

// Web Speech API 类型定义
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  language?: string;
}

/**
 * 语音输入组件（P0功能）
 * 使用Web Speech API实现语音转文字
 */
export function VoiceInput({
  onTranscript,
  onError,
  disabled = false,
  language = 'zh-CN',
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // 检查浏览器是否支持Web Speech API
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        onTranscript(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errorMessage =
          event.error === 'no-speech'
            ? '未检测到语音，请重试'
            : event.error === 'audio-capture'
            ? '无法访问麦克风，请检查权限'
            : event.error === 'not-allowed'
            ? '麦克风权限被拒绝'
            : `识别错误: ${event.error}`;
        onError?.(errorMessage);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      onError?.('您的浏览器不支持语音识别功能');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language, onTranscript, onError]);

  const startListening = () => {
    if (!isSupported || disabled) return;

    try {
      recognitionRef.current?.start();
    } catch (error: any) {
      onError?.(error.message || '启动语音识别失败');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      className={`
        flex items-center justify-center
        w-10 h-10 rounded-full
        transition-all duration-200
        ${
          isListening
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      title={isListening ? '点击停止录音' : '点击开始录音'}
    >
      {isListening ? (
        <MicOff size={20} />
      ) : (
        <Mic size={20} />
      )}
    </button>
  );
}

