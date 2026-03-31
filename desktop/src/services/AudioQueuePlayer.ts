/**
 * Web-based audio queue player for streaming TTS.
 * Plays TTS audio URLs sequentially, one sentence at a time.
 * Desktop counterpart of mobile's expo-av AudioQueuePlayer.
 */

const API_BASE = "https://api.agentrix.top/api";

export class AudioQueuePlayer {
  private queue: string[] = [];
  private isPlaying = false;
  private currentAudio: HTMLAudioElement | null = null;
  private token: string;
  private onFinishedAll: (() => void) | null;
  private onPlayStateChange: ((playing: boolean) => void) | null;

  constructor(
    token: string,
    onFinishedAll?: () => void,
    onPlayStateChange?: (playing: boolean) => void,
  ) {
    this.token = token;
    this.onFinishedAll = onFinishedAll || null;
    this.onPlayStateChange = onPlayStateChange || null;
  }

  /** Enqueue a text sentence for TTS playback */
  enqueue(text: string, lang?: "zh" | "en") {
    const truncated = text.slice(0, 1500);
    const langParam = lang ? `&lang=${lang}` : "";
    const url = `${API_BASE}/voice/tts?text=${encodeURIComponent(truncated)}${langParam}`;
    this.queue.push(url);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.onPlayStateChange?.(false);
      this.onFinishedAll?.();
      return;
    }

    this.isPlaying = true;
    this.onPlayStateChange?.(true);
    const url = this.queue.shift()!;

    try {
      // Fetch with auth then play from blob URL
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!res.ok) {
        this.playNext();
        return;
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const audio = new Audio(blobUrl);
      this.currentAudio = audio;

      audio.onended = () => {
        URL.revokeObjectURL(blobUrl);
        this.currentAudio = null;
        this.playNext();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        this.currentAudio = null;
        this.playNext();
      };

      await audio.play();
    } catch {
      this.currentAudio = null;
      this.playNext();
    }
  }

  /** Stop all playback and clear queue */
  stopAll() {
    this.queue = [];
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = "";
      this.currentAudio = null;
    }
    this.isPlaying = false;
    this.onPlayStateChange?.(false);
  }

  get playing() {
    return this.isPlaying;
  }
}

/**
 * Detect language from text (Chinese vs English).
 * Returns "zh" if text contains CJK characters, otherwise "en".
 */
export function detectLang(text: string): "zh" | "en" {
  return /[\u4e00-\u9fff]/.test(text) ? "zh" : "en";
}

/**
 * Sentence boundary detector for streaming TTS.
 * Accumulates text chunks and emits complete sentences.
 */
export class SentenceAccumulator {
  private buffer = "";
  private onSentence: (sentence: string) => void;

  // Chinese-aware punctuation delimiters
  private static BOUNDARY_RE = /[^。！？.!?\n]+[。！？.!?\n]+/g;
  private static EARLY_FLUSH_CHARS = 36;
  private static EARLY_FLUSH_PUNCT = /[、，:;；—]/;

  constructor(onSentence: (sentence: string) => void) {
    this.onSentence = onSentence;
  }

  /** Feed a new chunk from SSE stream */
  push(chunk: string) {
    this.buffer += chunk;

    // Try to extract complete sentences
    const matches = this.buffer.match(SentenceAccumulator.BOUNDARY_RE);
    if (matches) {
      let consumed = 0;
      for (const sentence of matches) {
        const trimmed = sentence.trim();
        if (trimmed.length > 0) {
          this.onSentence(trimmed);
        }
        consumed += sentence.length;
      }
      this.buffer = this.buffer.slice(consumed);
    }

    // Early flush: if buffer is long enough and has a weak delimiter
    if (
      this.buffer.length >= SentenceAccumulator.EARLY_FLUSH_CHARS &&
      SentenceAccumulator.EARLY_FLUSH_PUNCT.test(this.buffer)
    ) {
      const lastPunctIdx = Math.max(
        ...Array.from(this.buffer).map((ch, i) =>
          SentenceAccumulator.EARLY_FLUSH_PUNCT.test(ch) ? i : -1,
        ),
      );
      if (lastPunctIdx > 0) {
        const sentence = this.buffer.slice(0, lastPunctIdx + 1).trim();
        if (sentence) this.onSentence(sentence);
        this.buffer = this.buffer.slice(lastPunctIdx + 1);
      }
    }
  }

  /** Flush any remaining text (call when streaming ends) */
  flush() {
    const trimmed = this.buffer.trim();
    if (trimmed.length > 0) {
      this.onSentence(trimmed);
    }
    this.buffer = "";
  }

  /** Reset without emitting */
  reset() {
    this.buffer = "";
  }
}
