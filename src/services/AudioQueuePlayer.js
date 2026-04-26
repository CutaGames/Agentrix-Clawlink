import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
export class AudioQueuePlayer {
    constructor(onFinishedAll) {
        this.queue = [];
        this.isPlaying = false;
        this.currentSound = null;
        this.onFinishedAll = null;
        this._destroyed = false;
        // Interruption tracking
        this.playedCount = 0;
        this.totalEnqueued = 0;
        this.currentItem = null;
        this.lastInterruption = null;
        this.onFinishedAll = onFinishedAll || null;
    }
    /** Permanently destroy this player — stops all audio and rejects future enqueues. */
    destroy() {
        this._destroyed = true;
        this.stopAll();
    }
    get destroyed() {
        return this._destroyed;
    }
    enqueue(uri, fallbackText, language) {
        if (this._destroyed)
            return;
        this.queue.push({ uri, fallbackText, language });
        this.totalEnqueued++;
        if (!this.isPlaying) {
            this.playNext();
        }
    }
    async playNext() {
        if (this._destroyed || this.queue.length === 0) {
            this.isPlaying = false;
            this.currentItem = null;
            // Reset counters on natural completion
            this.playedCount = 0;
            this.totalEnqueued = 0;
            if (this.onFinishedAll)
                this.onFinishedAll();
            return;
        }
        this.isPlaying = true;
        const nextItem = this.queue.shift();
        if (!nextItem) {
            this.isPlaying = false;
            this.currentItem = null;
            this.playedCount = 0;
            this.totalEnqueued = 0;
            if (this.onFinishedAll)
                this.onFinishedAll();
            return;
        }
        this.currentItem = nextItem;
        try {
            const { sound } = await Audio.Sound.createAsync({ uri: nextItem.uri }, { shouldPlay: true });
            this.currentSound = sound;
            sound.setOnPlaybackStatusUpdate(async (status) => {
                if (status.didJustFinish) {
                    this.playedCount++;
                    this.currentItem = null;
                    await sound.unloadAsync();
                    this.currentSound = null;
                    this.playNext();
                }
            });
        }
        catch (e) {
            console.error('AudioQueuePlayer play error:', e);
            if (nextItem.fallbackText) {
                try {
                    Speech.speak(nextItem.fallbackText, {
                        language: nextItem.language,
                        onDone: () => {
                            this.playedCount++;
                            this.currentItem = null;
                            this.currentSound = null;
                            this.playNext();
                        },
                        onStopped: () => {
                            this.currentItem = null;
                            this.currentSound = null;
                            this.playNext();
                        },
                        onError: () => {
                            this.currentItem = null;
                            this.currentSound = null;
                            this.playNext();
                        },
                    });
                    return;
                }
                catch (speechError) {
                    console.error('AudioQueuePlayer speech fallback error:', speechError);
                }
            }
            this.playNext();
        }
    }
    async stopAll() {
        // Capture interruption info before clearing
        const skippedItems = [];
        if (this.currentItem?.fallbackText) {
            skippedItems.push(this.currentItem.fallbackText);
        }
        for (const item of this.queue) {
            if (item.fallbackText)
                skippedItems.push(item.fallbackText);
        }
        if (skippedItems.length > 0 || this.playedCount > 0) {
            this.lastInterruption = {
                playedCount: this.playedCount,
                skippedItems,
                totalItems: this.totalEnqueued,
            };
        }
        this.queue = [];
        this.currentItem = null;
        this.playedCount = 0;
        this.totalEnqueued = 0;
        Speech.stop();
        if (this.currentSound) {
            await this.currentSound.stopAsync();
            await this.currentSound.unloadAsync();
            this.currentSound = null;
        }
        this.isPlaying = false;
    }
    /** Get info about the last interruption (barge-in). Returns null if no interruption occurred. */
    getLastInterruption() {
        return this.lastInterruption;
    }
    /** Clear saved interruption info after it has been consumed. */
    clearInterruptionInfo() {
        this.lastInterruption = null;
    }
}
