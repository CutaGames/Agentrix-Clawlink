import { Platform } from 'react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { getVoiceUiE2ERuntime, isVoiceUiE2EEnabled } from '../testing/e2e';

type SpeechSubscription = { remove: () => void };

export interface LiveSpeechCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: { error?: string; message?: string }) => void;
  onVolumeChange?: (value: number) => void;
}

export interface LiveSpeechController {
  stop: () => void;
  abort: () => void;
}

function getTranscriptFromResults(results: Array<{ transcript?: string }> | undefined) {
  return (results || []).map((item) => item?.transcript || '').join(' ').trim();
}

export function isLiveSpeechRecognitionAvailable() {
  try {
    return Boolean(ExpoSpeechRecognitionModule?.isRecognitionAvailable?.());
  } catch {
    return false;
  }
}

export async function requestLiveSpeechPermissions() {
  if (isVoiceUiE2EEnabled()) {
    const runtime = getVoiceUiE2ERuntime();
    const webPermissionState = typeof window !== 'undefined'
      ? window.__AGENTRIX_VOICE_UI_E2E_LIVE_SPEECH_PERMISSION__
      : undefined;
    const nextState = webPermissionState ?? runtime?.liveSpeechPermission;
    return { granted: nextState !== 'denied' };
  }

  const microphone = await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
  if (!microphone?.granted) {
    return microphone;
  }

  if (Platform.OS === 'ios') {
    const speech = await ExpoSpeechRecognitionModule.requestSpeechRecognizerPermissionsAsync();
    if (!speech?.granted) {
      return speech;
    }
  }

  return { granted: true };
}

export function startLiveSpeechRecognition(
  lang: string,
  callbacks: LiveSpeechCallbacks,
  contextualStrings: string[] = [],
): LiveSpeechController {
  const subscriptions: SpeechSubscription[] = [];

  subscriptions.push(
    ExpoSpeechRecognitionModule.addListener('start', () => callbacks.onStart?.()),
    ExpoSpeechRecognitionModule.addListener('end', () => callbacks.onEnd?.()),
    ExpoSpeechRecognitionModule.addListener('speechstart', () => callbacks.onSpeechStart?.()),
    ExpoSpeechRecognitionModule.addListener('speechend', () => callbacks.onSpeechEnd?.()),
    ExpoSpeechRecognitionModule.addListener('volumechange', (event: { value?: number }) => {
      callbacks.onVolumeChange?.(typeof event?.value === 'number' ? event.value : -2);
    }),
    ExpoSpeechRecognitionModule.addListener(
      'result',
      (event: { isFinal?: boolean; results?: Array<{ transcript?: string }> }) => {
        const transcript = getTranscriptFromResults(event?.results);
        if (!transcript) return;
        if (event?.isFinal) {
          callbacks.onFinalResult?.(transcript);
          return;
        }
        callbacks.onInterimResult?.(transcript);
      },
    ),
    ExpoSpeechRecognitionModule.addListener('error', (event: { error?: string; message?: string }) => {
      callbacks.onError?.(event || {});
    }),
  );

  ExpoSpeechRecognitionModule.start({
    lang: lang === 'zh' ? 'zh-CN' : 'en-US',
    interimResults: true,
    continuous: true,
    maxAlternatives: 1,
    addsPunctuation: true,
    contextualStrings: contextualStrings.filter(Boolean).slice(0, 8),
    requiresOnDeviceRecognition: Platform.OS === 'ios',
    volumeChangeEventOptions: {
      enabled: true,
      intervalMillis: 150,
    },
    androidIntentOptions: {
      EXTRA_LANGUAGE_MODEL: 'web_search',
      EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
      EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1000,
    },
    iosCategory: {
      category: 'playAndRecord',
      categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
      mode: 'measurement',
    },
    iosVoiceProcessingEnabled: true,
  });

  const cleanup = () => {
    subscriptions.splice(0).forEach((subscription) => {
      try {
        subscription.remove();
      } catch {}
    });
  };

  return {
    stop: () => {
      cleanup();
      ExpoSpeechRecognitionModule.stop();
    },
    abort: () => {
      cleanup();
      ExpoSpeechRecognitionModule.abort();
    },
  };
}