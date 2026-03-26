import { Logger } from '@nestjs/common';
import * as WebSocket from 'ws';
import * as crypto from 'crypto';

/**
 * Edge TTS Adapter — uses Microsoft Edge's free online TTS service,
 * with AWS Polly as automatic fallback when Edge TTS is blocked (403).
 *
 * Protocol: WebSocket → speech.platform.bing.com
 * Output: audio/mpeg (24kHz 48kbps mono MP3)
 */

const BASE_URL = 'speech.platform.bing.com/consumer/speech/synthesize/readaloud';
const TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const VOICE_LIST_URL = `https://${BASE_URL}/voices/list?trustedclienttoken=${TOKEN}`;
const SEC_MS_GEC_VERSION = '1-130.0.2849.68';
const WIN_EPOCH_OFFSET = 621355968000000000n;
const ROUND_TICKS = 3000000000n;

function generateSecMsGec(): string {
  const nowTicks = WIN_EPOCH_OFFSET + BigInt(Date.now()) * 10000n;
  const roundedTicks = nowTicks - (nowTicks % ROUND_TICKS);
  const hmacKey = crypto.createHash('sha256').update(Buffer.from(TOKEN, 'hex')).digest();
  return crypto.createHmac('sha256', hmacKey)
    .update(String(roundedTicks), 'utf8')
    .digest('hex')
    .toUpperCase();
}

function buildWsUrl(connectionId: string): string {
  const secToken = generateSecMsGec();
  return `wss://${BASE_URL}/edge/v1?TrustedClientToken=${TOKEN}&ConnectionId=${connectionId}&Sec-MS-GEC=${secToken}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;
}

export interface EdgeTTSVoice {
  Name: string;
  ShortName: string;
  FriendlyName: string;
  Gender: 'Male' | 'Female';
  Locale: string;
}

/** Voice presets — best voices for each language */
export const EDGE_VOICE_PRESETS: Record<string, Record<string, string>> = {
  // Chinese voices (Natural, high quality)
  alloy:   { zh: 'zh-CN-XiaoxiaoNeural',  en: 'en-US-JennyNeural' },
  echo:    { zh: 'zh-CN-YunxiNeural',      en: 'en-US-GuyNeural' },
  fable:   { zh: 'zh-CN-XiaoyiNeural',     en: 'en-US-AriaNeural' },
  onyx:    { zh: 'zh-CN-YunjianNeural',     en: 'en-US-DavisNeural' },
  nova:    { zh: 'zh-CN-XiaochenNeural',    en: 'en-US-SaraNeural' },
  shimmer: { zh: 'zh-CN-XiaohanNeural',     en: 'en-US-AmberNeural' },
};

/** Default voices per language */
const DEFAULT_VOICE: Record<string, string> = {
  zh: 'zh-CN-XiaoxiaoNeural',
  en: 'en-US-JennyNeural',
};

const logger = new Logger('EdgeTTSAdapter');

function uuid(): string {
  return crypto.randomUUID().replaceAll('-', '');
}

function escapeSSML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Fetch the list of all available Edge TTS voices.
 */
export async function getEdgeVoices(): Promise<EdgeTTSVoice[]> {
  const resp = await fetch(VOICE_LIST_URL);
  if (!resp.ok) throw new Error(`Failed to fetch Edge voices: ${resp.status}`);
  return resp.json();
}

/**
 * Resolve the voice ID from a requested voice name.
 * Supports our preset names (alloy, echo, etc.), direct Edge voice ShortNames,
 * and falls back to language-based defaults.
 */
export function resolveEdgeVoice(requestedVoice: string | undefined, isChinese: boolean): string {
  const lang = isChinese ? 'zh' : 'en';

  if (requestedVoice) {
    const preset = EDGE_VOICE_PRESETS[requestedVoice.toLowerCase()];
    if (preset) return preset[lang];
    // If it looks like a direct Edge voice name (contains "Neural"), use as-is
    if (requestedVoice.includes('Neural') || requestedVoice.includes('-')) {
      return requestedVoice;
    }
  }

  return DEFAULT_VOICE[lang] || DEFAULT_VOICE.en;
}

export interface EdgeTTSOptions {
  voice?: string;
  rate?: string;   // e.g. "+0%", "+20%", "-10%"
  pitch?: string;  // e.g. "+0Hz", "+5Hz"
  volume?: string; // e.g. "+0%"
}

// Track whether Edge TTS is known to be unavailable (e.g. 403 from this IP)
let edgeTTSBlocked = false;
let edgeTTSBlockedAt = 0;
const EDGE_TTS_BLOCK_RECHECK_MS = 5 * 60 * 1000; // retry Edge TTS every 5 min

/**
 * Google Translate TTS fallback — works worldwide from any server IP.
 * Returns MP3 audio. Supports text up to ~200 chars per request.
 */
async function googleTranslateTTS(text: string, lang: string): Promise<Buffer> {
  const maxChunkLength = 180;
  const chunks: string[] = [];

  // Split long text into chunks at sentence boundaries
  let remaining = text;
  while (remaining.length > maxChunkLength) {
    let splitIdx = -1;
    for (const sep of ['。', '！', '？', '.', '!', '?', '，', ',', '、', ' ']) {
      const idx = remaining.lastIndexOf(sep, maxChunkLength);
      if (idx > 0) { splitIdx = idx + 1; break; }
    }
    if (splitIdx <= 0) splitIdx = maxChunkLength;
    chunks.push(remaining.slice(0, splitIdx).trim());
    remaining = remaining.slice(splitIdx).trim();
  }
  if (remaining) chunks.push(remaining);

  const audioBuffers: Buffer[] = [];
  for (const chunk of chunks) {
    const encoded = encodeURIComponent(chunk);
    const tl = lang.startsWith('zh') ? 'zh-CN' : lang.startsWith('en') ? 'en' : lang;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${tl}&client=tw-ob&q=${encoded}`;

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0',
      },
    });

    if (!resp.ok) {
      throw new Error(`Google TTS returned ${resp.status}`);
    }

    const arrayBuf = await resp.arrayBuffer();
    audioBuffers.push(Buffer.from(arrayBuf));
  }

  return Buffer.concat(audioBuffers);
}

/**
 * Synthesize text to audio buffer.
 * Tries Edge TTS first, falls back to Google Translate TTS if Edge is blocked.
 */
export async function edgeTTS(text: string, options: EdgeTTSOptions = {}): Promise<Buffer> {
  const voice = options.voice || 'en-US-JennyNeural';
  const isChinese = voice.startsWith('zh-');
  const lang = isChinese ? 'zh-CN' : 'en';

  // If Edge TTS was recently blocked, go straight to fallback
  const shouldSkipEdge = edgeTTSBlocked && (Date.now() - edgeTTSBlockedAt < EDGE_TTS_BLOCK_RECHECK_MS);
  if (shouldSkipEdge) {
    return googleTranslateTTS(text, lang);
  }

  try {
    const result = await edgeTTSOnce(text, options);
    edgeTTSBlocked = false;
    return result;
  } catch (err: any) {
    const is403 = err?.message?.includes('403');
    if (is403) {
      logger.warn('Edge TTS blocked (403), switching to Google Translate TTS fallback');
      edgeTTSBlocked = true;
      edgeTTSBlockedAt = Date.now();
    } else {
      logger.warn(`Edge TTS failed: ${err.message}, trying Google Translate TTS fallback`);
    }

    return googleTranslateTTS(text, lang);
  }
}

function edgeTTSOnce(text: string, options: EdgeTTSOptions = {}): Promise<Buffer> {
  const {
    voice = 'en-US-JennyNeural',
    rate = '+0%',
    pitch = '+0Hz',
    volume = '+0%',
  } = options;

  return new Promise((resolve, reject) => {
    const connectionId = uuid();
    const timeoutMs = 30_000;
    let timer: NodeJS.Timeout | null = null;

    const ws = new WebSocket(buildWsUrl(connectionId), {
      host: 'speech.platform.bing.com',
      origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
      },
    });

    const audioChunks: Buffer[] = [];

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      try { ws.close(); } catch {}
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error('Edge TTS synthesis timed out'));
    }, timeoutMs);

    ws.on('error', (err) => {
      cleanup();
      reject(err);
    });

    ws.on('message', (rawData: Buffer, isBinary: boolean) => {
      if (!isBinary) {
        const msg = rawData.toString('utf8');
        if (msg.includes('turn.end')) {
          cleanup();
          resolve(Buffer.concat(audioChunks));
        }
        return;
      }

      // Binary: extract audio after "Path:audio\r\n"
      const separator = 'Path:audio\r\n';
      const data = rawData as Buffer;
      const sepIdx = data.indexOf(separator);
      if (sepIdx >= 0) {
        audioChunks.push(data.subarray(sepIdx + separator.length));
      }
    });

    ws.on('open', () => {
      // 1. Send speech config
      const speechConfig = JSON.stringify({
        context: {
          synthesis: {
            audio: {
              metadataoptions: {
                sentenceBoundaryEnabled: false,
                wordBoundaryEnabled: false,
              },
              outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
            },
          },
        },
      });

      const configMessage =
        `X-Timestamp:${new Date().toISOString()}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        speechConfig;

      ws.send(configMessage, { compress: true }, (configErr) => {
        if (configErr) {
          cleanup();
          reject(configErr);
          return;
        }

        // 2. Send SSML
        const ssml =
          `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
          `<voice name='${voice}'>` +
          `<prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>` +
          `${escapeSSML(text)}` +
          `</prosody></voice></speak>`;

        const ssmlMessage =
          `X-RequestId:${uuid()}\r\n` +
          `Content-Type:application/ssml+xml\r\n` +
          `X-Timestamp:${new Date().toISOString()}\r\n` +
          `Path:ssml\r\n\r\n` +
          ssml;

        ws.send(ssmlMessage, { compress: true }, (ssmlErr) => {
          if (ssmlErr) {
            cleanup();
            reject(ssmlErr);
          }
        });
      });
    });
  });
}

/**
 * Synthesize text and stream audio chunks via callback.
 * Useful for piping to HTTP response.
 */
export function edgeTTSStream(
  text: string,
  options: EdgeTTSOptions,
  onChunk: (chunk: Buffer) => void,
  onEnd: () => void,
  onError: (err: Error) => void,
): { cancel: () => void } {
  const {
    voice = 'en-US-JennyNeural',
    rate = '+0%',
    pitch = '+0Hz',
    volume = '+0%',
  } = options;

  const connectionId = uuid();
  let cancelled = false;
  let timer: NodeJS.Timeout | null = null;

  const ws = new WebSocket(buildWsUrl(connectionId), {
    host: 'speech.platform.bing.com',
    origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
    },
  });

  const cleanup = () => {
    if (timer) clearTimeout(timer);
    try { ws.close(); } catch {}
  };

  timer = setTimeout(() => {
    cleanup();
    if (!cancelled) onError(new Error('Edge TTS stream timed out'));
  }, 30_000);

  ws.on('error', (err) => {
    cleanup();
    if (!cancelled) onError(err as Error);
  });

  ws.on('message', (rawData: Buffer, isBinary: boolean) => {
    if (cancelled) return;

    if (!isBinary) {
      const msg = rawData.toString('utf8');
      if (msg.includes('turn.end')) {
        cleanup();
        onEnd();
      }
      return;
    }

    const separator = 'Path:audio\r\n';
    const data = rawData as Buffer;
    const sepIdx = data.indexOf(separator);
    if (sepIdx >= 0) {
      onChunk(data.subarray(sepIdx + separator.length));
    }
  });

  ws.on('open', () => {
    const speechConfig = JSON.stringify({
      context: {
        synthesis: {
          audio: {
            metadataoptions: {
              sentenceBoundaryEnabled: false,
              wordBoundaryEnabled: false,
            },
            outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
          },
        },
      },
    });

    const configMessage =
      `X-Timestamp:${new Date().toISOString()}\r\n` +
      `Content-Type:application/json; charset=utf-8\r\n` +
      `Path:speech.config\r\n\r\n` +
      speechConfig;

    ws.send(configMessage, { compress: true }, (configErr) => {
      if (configErr) { cleanup(); if (!cancelled) onError(configErr); return; }

      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
        `<voice name='${voice}'>` +
        `<prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>` +
        `${escapeSSML(text)}` +
        `</prosody></voice></speak>`;

      const ssmlMessage =
        `X-RequestId:${uuid()}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${new Date().toISOString()}\r\n` +
        `Path:ssml\r\n\r\n` +
        ssml;

      ws.send(ssmlMessage, { compress: true }, (ssmlErr) => {
        if (ssmlErr) { cleanup(); if (!cancelled) onError(ssmlErr); }
      });
    });
  });

  return {
    cancel: () => {
      cancelled = true;
      cleanup();
    },
  };
}
