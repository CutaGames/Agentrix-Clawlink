import Constants from 'expo-constants';

export interface MobileWakeWordSettingsOverride {
  enabled?: boolean;
  accessKey?: string;
  builtInKeywords?: string[];
  customKeywordPaths?: string[];
  fallbackPhrases?: string[];
  displayName?: string;
  sensitivity?: number;
}

export interface MobileWakeWordConfig {
  enabled: boolean;
  accessKey: string;
  builtInKeywords: string[];
  customKeywordPaths: string[];
  fallbackPhrases: string[];
  displayName: string;
  sensitivity: number;
}

interface ExpoWakeWordExtra {
  enabled?: boolean;
  accessKey?: string;
  builtInKeywords?: string[];
  customKeywordPaths?: string[];
  fallbackPhrases?: string[];
  displayName?: string;
  sensitivity?: number;
}

function uniqueList(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function buildDefaultFallbackPhrases(displayName?: string): string[] {
  const label = displayName?.trim() || 'Hey Agentrix';
  return uniqueList([
    label,
    'Hey Agentrix',
    'Hi Agentrix',
    'Agentrix',
    'Hey Claw',
    '嘿 Agentrix',
    '你好 Agentrix',
  ]);
}

function parseList(value?: string | string[]): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
      return false;
    }
  }

  return fallback;
}

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function clampSensitivity(value: number): number {
  if (value < 0.05) return 0.05;
  if (value > 0.95) return 0.95;
  return value;
}

export function resolveMobileWakeWordConfig(settings?: MobileWakeWordSettingsOverride): MobileWakeWordConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as {
    picovoiceAccessKey?: string;
    wakeWord?: ExpoWakeWordExtra;
  };
  const extraWakeWord = extra.wakeWord ?? {};

  const accessKey =
    settings?.accessKey?.trim() ||
    extraWakeWord.accessKey?.trim() ||
    extra.picovoiceAccessKey?.trim() ||
    process.env.EXPO_PUBLIC_PICOVOICE_ACCESS_KEY ||
    '';

  const builtInKeywords =
    settings?.builtInKeywords?.length
      ? settings.builtInKeywords.map((item) => item.trim()).filter(Boolean)
      : extraWakeWord.builtInKeywords?.length
        ? extraWakeWord.builtInKeywords.map((item) => item.trim()).filter(Boolean)
        : parseList(process.env.EXPO_PUBLIC_PICOVOICE_BUILT_IN_KEYWORDS);

  const customKeywordPaths =
    settings?.customKeywordPaths?.length
      ? settings.customKeywordPaths.map((item) => item.trim()).filter(Boolean)
      : extraWakeWord.customKeywordPaths?.length
        ? extraWakeWord.customKeywordPaths.map((item) => item.trim()).filter(Boolean)
        : parseList(process.env.EXPO_PUBLIC_PICOVOICE_CUSTOM_KEYWORD_PATHS);

  const configuredDisplayName =
    settings?.displayName?.trim() ||
    extraWakeWord.displayName?.trim() ||
    process.env.EXPO_PUBLIC_PICOVOICE_WAKE_WORD_LABEL ||
    'Hey Agentrix';

  const fallbackPhrases =
    settings?.fallbackPhrases?.length
      ? settings.fallbackPhrases.map((item) => item.trim()).filter(Boolean)
      : extraWakeWord.fallbackPhrases?.length
        ? extraWakeWord.fallbackPhrases.map((item) => item.trim()).filter(Boolean)
        : parseList(process.env.EXPO_PUBLIC_WAKE_WORD_FALLBACK_PHRASES);

  const fallbackBuiltIns = builtInKeywords.length > 0 ? builtInKeywords : ['picovoice'];
  const resolvedFallbackPhrases = fallbackPhrases.length > 0 ? uniqueList(fallbackPhrases) : buildDefaultFallbackPhrases(configuredDisplayName);
  const displayName = configuredDisplayName || (customKeywordPaths.length > 0 ? 'Custom wake word' : resolvedFallbackPhrases[0] || fallbackBuiltIns.join(', '));

  return {
    enabled: parseBoolean(settings?.enabled ?? extraWakeWord.enabled ?? process.env.EXPO_PUBLIC_PICOVOICE_WAKE_WORD_ENABLED, true),
    accessKey,
    builtInKeywords: fallbackBuiltIns,
    customKeywordPaths,
    fallbackPhrases: resolvedFallbackPhrases,
    displayName,
    sensitivity: clampSensitivity(
      parseNumber(settings?.sensitivity ?? extraWakeWord.sensitivity ?? process.env.EXPO_PUBLIC_PICOVOICE_WAKE_WORD_SENSITIVITY, 0.65),
    ),
  };
}