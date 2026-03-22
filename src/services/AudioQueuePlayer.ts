import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

interface QueueItem {
  uri: string;
  fallbackText?: string;
  language?: string;
}

export class AudioQueuePlayer {
  private queue: QueueItem[] = [];
  private isPlaying: boolean = false;
  private currentSound: Audio.Sound | null = null;
  private onFinishedAll: (() => void) | null = null;

  constructor(onFinishedAll?: () => void) {
    this.onFinishedAll = onFinishedAll || null;
  }

  enqueue(uri: string, fallbackText?: string, language?: string) {
    this.queue.push({ uri, fallbackText, language });
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      if (this.onFinishedAll) this.onFinishedAll();
      return;
    }

    this.isPlaying = true;
    const nextItem = this.queue.shift();
    if (!nextItem) {
      this.isPlaying = false;
      if (this.onFinishedAll) this.onFinishedAll();
      return;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: nextItem.uri },
        { shouldPlay: true }
      );
      this.currentSound = sound;

      sound.setOnPlaybackStatusUpdate(async (status: any) => {
        if (status.didJustFinish) {
          await sound.unloadAsync();
          this.currentSound = null;
          this.playNext();
        }
      });
    } catch (e) {
      console.error('AudioQueuePlayer play error:', e);
      if (nextItem.fallbackText) {
        try {
          Speech.speak(nextItem.fallbackText, {
            language: nextItem.language,
            onDone: () => {
              this.currentSound = null;
              this.playNext();
            },
            onStopped: () => {
              this.currentSound = null;
              this.playNext();
            },
            onError: () => {
              this.currentSound = null;
              this.playNext();
            },
          });
          return;
        } catch (speechError) {
          console.error('AudioQueuePlayer speech fallback error:', speechError);
        }
      }
      this.playNext();
    }
  }

  async stopAll() {
    this.queue = [];
    Speech.stop();
    if (this.currentSound) {
      await this.currentSound.stopAsync();
      await this.currentSound.unloadAsync();
      this.currentSound = null;
    }
    this.isPlaying = false;
  }
}
