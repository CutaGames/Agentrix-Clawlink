import { Audio } from 'expo-av';

export class AudioQueuePlayer {
  private queue: string[] = [];
  private isPlaying: boolean = false;
  private currentSound: Audio.Sound | null = null;
  private onFinishedAll: (() => void) | null = null;

  constructor(onFinishedAll?: () => void) {
    this.onFinishedAll = onFinishedAll || null;
  }

  enqueue(uri: string) {
    this.queue.push(uri);
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
    const nextUri = this.queue.shift();

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: nextUri! },
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
      this.playNext();
    }
  }

  async stopAll() {
    this.queue = [];
    if (this.currentSound) {
      await this.currentSound.stopAsync();
      await this.currentSound.unloadAsync();
      this.currentSound = null;
    }
    this.isPlaying = false;
  }
}
