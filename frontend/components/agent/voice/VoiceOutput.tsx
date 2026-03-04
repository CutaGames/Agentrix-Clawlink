import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Pause, Play } from 'lucide-react';

interface VoiceOutputProps {
  text: string;
  language?: string;
  autoPlay?: boolean;
  onComplete?: () => void;
}

/**
 * 语音输出组件（P0功能）
 * 使用Web Speech API实现文字转语音
 */
export function VoiceOutput({
  text,
  language = 'zh-CN',
  autoPlay = false,
  onComplete,
}: VoiceOutputProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
  }, []);

  useEffect(() => {
    if (autoPlay && text && isSupported) {
      speak();
    }

    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [autoPlay, text, isSupported]);

  const speak = () => {
    if (!isSupported || !text) return;

    // 停止之前的语音
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      onComplete?.();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  const toggle = () => {
    if (isPlaying) {
      stop();
    } else {
      speak();
    }
  };

  if (!isSupported || !text) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`
        flex items-center justify-center
        w-8 h-8 rounded-full
        transition-all duration-200
        ${
          isPlaying
            ? 'bg-indigo-500 text-white'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
        }
      `}
      title={isPlaying ? '停止播放' : '播放语音'}
    >
      {isPlaying ? (
        <Pause size={16} />
      ) : (
        <Play size={16} />
      )}
    </button>
  );
}

