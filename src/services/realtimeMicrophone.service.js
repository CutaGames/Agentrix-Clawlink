import { addVoiceDiagnostic } from './voiceDiagnostics';
const FRAME_LENGTH = 512;
const SAMPLE_RATE = 16000;
const SPEECH_START_THRESHOLD = 0.15;
const SPEECH_END_THRESHOLD = 0.05;
const SPEECH_END_FRAME_COUNT = 30;
const MIN_SPEECH_FRAME_COUNT = 8;
const SPEECH_RESTART_COOLDOWN_FRAMES = 20;
/**
 * Number of frames to send as pre-roll when speech starts.
 * This avoids cutting off the beginning of a word.
 */
const SPEECH_PRE_ROLL_FRAMES = 6;
/**
 * Extra frames to send after speech ends (post-roll) so tail isn't clipped.
 */
const SPEECH_POST_ROLL_FRAMES = 8;
/**
 * Volume threshold for barge-in detection while mic is muted (agent speaking).
 * Must be well above speaker echo levels — phone speakers can hit 0.4-0.6.
 * Real user speech close to the mic typically exceeds 0.70.
 */
const BARGE_IN_THRESHOLD = 0.72;
/**
 * Number of consecutive loud frames required to confirm barge-in.
 * At 16kHz/512 frame size (~32ms/frame), 20 frames ≈ 640ms.
 * Requires sustained loud speech, not transient echo spikes.
 */
const BARGE_IN_FRAME_COUNT = 20;
/**
 * Cooldown (ms) after mic is muted before barge-in detection activates.
 * Prevents initial TTS burst from triggering barge-in.
 */
const BARGE_IN_COOLDOWN_MS = 1500;
function getVoiceProcessor() {
    try {
        const { VoiceProcessor } = require('@picovoice/react-native-voice-processor');
        return VoiceProcessor?.instance ?? null;
    }
    catch {
        return null;
    }
}
function toPcmBuffer(frame) {
    const buffer = new ArrayBuffer(frame.length * 2);
    const view = new DataView(buffer);
    for (let index = 0; index < frame.length; index += 1) {
        view.setInt16(index * 2, frame[index] ?? 0, true);
    }
    return buffer;
}
function calculateNormalizedVolume(frame) {
    if (!frame.length) {
        return 0;
    }
    let sumSquares = 0;
    for (const sample of frame) {
        sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / frame.length) / 32767;
    if (!Number.isFinite(rms) || rms <= 0) {
        return 0;
    }
    const dbfs = 20 * Math.log10(Math.max(rms, 1e-9));
    return Math.min(1, Math.max(0, (dbfs + 60) / 60));
}
export class RealtimeMicrophoneService {
    constructor(callbacks) {
        this.voiceProcessor = null;
        this.frameListener = null;
        this.errorListener = null;
        this.running = false;
        this.speechActive = false;
        this.silentFrameCount = 0;
        this.speechFrameCount = 0;
        this.restartCooldownFrameCount = 0;
        this.pausedUntil = 0;
        /** When true, frames are not sent but speech detection still runs for barge-in */
        this.muted = false;
        /** Consecutive loud frames while muted — need several to confirm barge-in (not echo) */
        this.mutedLoudFrames = 0;
        /** Timestamp after which barge-in detection becomes active (cooldown after mute start) */
        this.bargeInActiveAfter = 0;
        /** Ring buffer for pre-roll frames so we don't clip the start of speech */
        this.preRollBuffer = [];
        /** Post-roll counter: after speech ends, continue sending this many frames */
        this.postRollRemaining = 0;
        this.callbacks = callbacks;
    }
    static isAvailable() {
        return getVoiceProcessor() !== null;
    }
    async start() {
        if (this.running) {
            return;
        }
        const voiceProcessor = getVoiceProcessor();
        if (!voiceProcessor) {
            throw new Error('Realtime microphone processor unavailable');
        }
        const granted = await voiceProcessor.hasRecordAudioPermission();
        if (!granted) {
            throw new Error('Realtime microphone permission denied');
        }
        this.voiceProcessor = voiceProcessor;
        this.speechActive = false;
        this.silentFrameCount = 0;
        this.speechFrameCount = 0;
        this.restartCooldownFrameCount = 0;
        this.muted = false;
        this.mutedLoudFrames = 0;
        this.preRollBuffer = [];
        this.postRollRemaining = 0;
        this.frameListener = (frame) => {
            const normalizedVolume = calculateNormalizedVolume(frame);
            this.callbacks.onVolumeChange?.(normalizedVolume);
            if (Date.now() < this.pausedUntil) {
                return;
            }
            // Muted mode: don't send audio, but detect barge-in (user speaking over agent)
            if (this.muted) {
                // Skip barge-in detection during cooldown after mute starts (initial TTS burst)
                if (Date.now() < this.bargeInActiveAfter) {
                    return;
                }
                // Use a higher threshold and require multiple consecutive loud frames
                // to distinguish real speech from speaker echo
                if (normalizedVolume >= BARGE_IN_THRESHOLD) {
                    this.mutedLoudFrames += 1;
                    if (this.mutedLoudFrames >= BARGE_IN_FRAME_COUNT) {
                        addVoiceDiagnostic('realtime-mic', 'barge-in-detected', { normalizedVolume, frames: this.mutedLoudFrames });
                        this.muted = false;
                        this.mutedLoudFrames = 0;
                        this.callbacks.onBargeIn?.();
                    }
                }
                else {
                    this.mutedLoudFrames = 0;
                }
                return;
            }
            if (!this.speechActive && this.restartCooldownFrameCount > 0) {
                this.restartCooldownFrameCount -= 1;
            }
            const pcmChunk = toPcmBuffer(frame);
            if (this.speechActive) {
                this.speechFrameCount += 1;
                if (normalizedVolume <= SPEECH_END_THRESHOLD) {
                    this.silentFrameCount += 1;
                    if (this.silentFrameCount >= SPEECH_END_FRAME_COUNT) {
                        const speechFrameCount = this.speechFrameCount;
                        this.speechActive = false;
                        this.silentFrameCount = 0;
                        this.speechFrameCount = 0;
                        this.restartCooldownFrameCount = SPEECH_RESTART_COOLDOWN_FRAMES;
                        this.postRollRemaining = SPEECH_POST_ROLL_FRAMES;
                        if (speechFrameCount >= MIN_SPEECH_FRAME_COUNT) {
                            addVoiceDiagnostic('realtime-mic', 'speech-end', { speechFrameCount });
                            this.callbacks.onSpeechEnd?.();
                        }
                        else {
                            addVoiceDiagnostic('realtime-mic', 'speech-end-ignored', { speechFrameCount });
                        }
                    }
                }
                else {
                    this.silentFrameCount = 0;
                }
                // During speech: always send audio
                this.callbacks.onFrame(pcmChunk);
            }
            else if (normalizedVolume >= SPEECH_START_THRESHOLD
                && this.restartCooldownFrameCount === 0) {
                this.silentFrameCount = 0;
                this.speechActive = true;
                this.speechFrameCount = 1;
                this.postRollRemaining = 0;
                addVoiceDiagnostic('realtime-mic', 'speech-start', { normalizedVolume });
                this.callbacks.onSpeechStart?.();
                // Flush pre-roll buffer so onset of speech isn't clipped
                for (const preRollChunk of this.preRollBuffer) {
                    this.callbacks.onFrame(preRollChunk);
                }
                this.preRollBuffer = [];
                this.callbacks.onFrame(pcmChunk);
            }
            else {
                // No speech — buffer for pre-roll only, don't send to server
                this.preRollBuffer.push(pcmChunk);
                if (this.preRollBuffer.length > SPEECH_PRE_ROLL_FRAMES) {
                    this.preRollBuffer.shift();
                }
                // Send post-roll frames after speech end so tail isn't clipped
                if (this.postRollRemaining > 0) {
                    this.postRollRemaining -= 1;
                    this.callbacks.onFrame(pcmChunk);
                }
            }
        };
        this.errorListener = (error) => {
            const nextError = error instanceof Error ? error : new Error(String(error));
            addVoiceDiagnostic('realtime-mic', 'error', { message: nextError.message });
            this.callbacks.onError?.(nextError);
        };
        voiceProcessor.addFrameListener(this.frameListener);
        voiceProcessor.addErrorListener(this.errorListener);
        try {
            await voiceProcessor.start(FRAME_LENGTH, SAMPLE_RATE);
            this.running = true;
            addVoiceDiagnostic('realtime-mic', 'start', { frameLength: FRAME_LENGTH, sampleRate: SAMPLE_RATE });
        }
        catch (error) {
            this.detachListeners();
            this.voiceProcessor = null;
            throw error;
        }
    }
    async stop() {
        if (!this.voiceProcessor) {
            this.running = false;
            return;
        }
        const processor = this.voiceProcessor;
        this.detachListeners();
        this.voiceProcessor = null;
        this.running = false;
        this.speechActive = false;
        this.silentFrameCount = 0;
        this.speechFrameCount = 0;
        this.restartCooldownFrameCount = 0;
        this.pausedUntil = 0;
        this.muted = false;
        this.mutedLoudFrames = 0;
        this.preRollBuffer = [];
        this.postRollRemaining = 0;
        try {
            if (await processor.isRecording()) {
                await processor.stop();
            }
        }
        catch (error) {
            addVoiceDiagnostic('realtime-mic', 'stop-error', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    get isRunning() {
        return this.running;
    }
    pauseInput(durationMs) {
        this.pausedUntil = Math.max(this.pausedUntil, Date.now() + Math.max(0, durationMs));
        this.speechActive = false;
        this.silentFrameCount = 0;
        this.speechFrameCount = 0;
        this.restartCooldownFrameCount = SPEECH_RESTART_COOLDOWN_FRAMES;
    }
    resumeInput() {
        this.pausedUntil = 0;
        this.muted = false;
        this.mutedLoudFrames = 0;
        this.speechActive = false;
        this.silentFrameCount = 0;
        this.speechFrameCount = 0;
        this.restartCooldownFrameCount = 0;
    }
    /** Mute audio sending but keep speech detection active for barge-in */
    muteForEchoCancel() {
        this.muted = true;
        this.mutedLoudFrames = 0;
        this.bargeInActiveAfter = Date.now() + BARGE_IN_COOLDOWN_MS;
        this.speechActive = false;
        this.silentFrameCount = 0;
        this.speechFrameCount = 0;
    }
    /** Unmute after agent stops speaking */
    unmuteInput() {
        this.muted = false;
        this.mutedLoudFrames = 0;
        this.restartCooldownFrameCount = SPEECH_RESTART_COOLDOWN_FRAMES;
    }
    detachListeners() {
        if (this.voiceProcessor && this.frameListener) {
            this.voiceProcessor.removeFrameListener(this.frameListener);
        }
        if (this.voiceProcessor && this.errorListener) {
            this.voiceProcessor.removeErrorListener(this.errorListener);
        }
        this.frameListener = null;
        this.errorListener = null;
    }
}
