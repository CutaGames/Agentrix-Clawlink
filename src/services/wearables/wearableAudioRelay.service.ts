/**
 * WearableAudioRelay 鈥?BLE 鈫?WebSocket audio bridge for AI glasses.
 *
 * Upstream:  Glass mic (BLE Notify) 鈫?decode Opus 鈫?PCM 鈫?voice:audio:chunk
 * Downstream: voice:agent:audio 鈫?encode Opus 鈫?BLE Write 鈫?Glass speaker
 *
 * Designed to work with the existing Voice Gateway v2 WebSocket protocol.
 * The relay is transparent 鈥?the cloud side sees standard voice:audio:chunk events
 * indistinguishable from phone microphone input.
 */

import { BleManager, type Subscription } from 'react-native-ble-plx';
import type { Socket } from 'socket.io-client';
import { Buffer } from 'buffer';

// 鈹€鈹€ GATT UUIDs 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

/** Agentrix Glass Service UUID (custom) */
const GLASS_SERVICE_UUID = '0000AGX0-0000-1000-8000-00805F9B34FB';
/** Mic audio stream characteristic (Notify 鈥?glass 鈫?phone) */
const MIC_AUDIO_CHAR_UUID = '0000AGX1-0000-1000-8000-00805F9B34FB';
/** Speaker audio stream characteristic (Write 鈥?phone 鈫?glass) */
const SPEAKER_AUDIO_CHAR_UUID = '0000AGX2-0000-1000-8000-00805F9B34FB';

// 鈹€鈹€ Types 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

export interface AudioRelayCallbacks {
  onUpstreamStart?: () => void;
  onUpstreamStop?: () => void;
  onDownstreamChunk?: (bytesWritten: number) => void;
  onError?: (error: Error, direction: 'upstream' | 'downstream') => void;
}

export interface AudioRelayOptions {
  /** BLE device ID (from scan/pair) */
  deviceId: string;
  /** Voice Gateway session ID */
  sessionId: string;
  /** Custom GATT service UUID override */
  serviceUuid?: string;
  /** Custom mic characteristic UUID override */
  micCharUuid?: string;
  /** Custom speaker characteristic UUID override */
  speakerCharUuid?: string;
}

// 鈹€鈹€ Service 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

export class WearableAudioRelay {
  private bleManager: BleManager;
  private micSubscription: Subscription | null = null;
  private agentAudioListener: (() => void) | null = null;
  private active = false;
  private options: AudioRelayOptions;
  private callbacks: AudioRelayCallbacks;

  private serviceUuid: string;
  private micCharUuid: string;
  private speakerCharUuid: string;

  constructor(
    bleManager: BleManager,
    options: AudioRelayOptions,
    callbacks: AudioRelayCallbacks = {},
  ) {
    this.bleManager = bleManager;
    this.options = options;
    this.callbacks = callbacks;
    this.serviceUuid = options.serviceUuid || GLASS_SERVICE_UUID;
    this.micCharUuid = options.micCharUuid || MIC_AUDIO_CHAR_UUID;
    this.speakerCharUuid = options.speakerCharUuid || SPEAKER_AUDIO_CHAR_UUID;
  }

  // 鈹€鈹€ Upstream: Glass Mic 鈫?Cloud 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

  /**
   * Subscribe to the glass microphone BLE characteristic and forward
   * audio chunks to the Voice Gateway via Socket.IO.
   */
  async startUpstream(voiceSocket: Socket): Promise<void> {
    if (this.active) return;
    this.active = true;

    try {
      // Ensure device is connected
      const device = await this.bleManager.connectToDevice(this.options.deviceId);
      await device.discoverAllServicesAndCharacteristics();

      // Subscribe to mic audio notifications
      this.micSubscription = device.monitorCharacteristicForService(
        this.serviceUuid,
        this.micCharUuid,
        (error, characteristic) => {
          if (error) {
            this.callbacks.onError?.(
              error instanceof Error ? error : new Error(String(error)),
              'upstream',
            );
            return;
          }

          if (!characteristic?.value || !this.active) return;

          // BLE characteristic value is base64-encoded
          // For Opus-over-BLE: each notification is a 20ms Opus frame
          // For raw PCM: each notification is a PCM chunk

          const audioBytes = Buffer.from(characteristic.value, 'base64');

          // Forward directly to Voice Gateway as audio chunk
          voiceSocket.emit('voice:audio:chunk', {
            sessionId: this.options.sessionId,
            audio: {
              type: 'Buffer',
              data: Array.from(audioBytes),
            },
          });
        },
      );

      this.callbacks.onUpstreamStart?.();
    } catch (error: any) {
      this.active = false;
      this.callbacks.onError?.(
        error instanceof Error ? error : new Error(error?.message || 'BLE upstream failed'),
        'upstream',
      );
      throw error;
    }
  }

  // 鈹€鈹€ Downstream: Cloud 鈫?Glass Speaker 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

  /**
   * Listen for voice:agent:audio events from the Voice Gateway and write
   * audio data to the glass speaker BLE characteristic.
   */
  startDownstream(voiceSocket: Socket): void {
    if (this.agentAudioListener) return;

    const handler = async (data: { sessionId: string; audio: string; format: string }) => {
      if (data.sessionId !== this.options.sessionId || !this.active) return;

      try {
        // Write audio to glass speaker characteristic
        // audio is base64-encoded (MP3 or PCM from cloud TTS/e2e model)
        await this.writeToSpeaker(data.audio);
        this.callbacks.onDownstreamChunk?.(data.audio.length);
      } catch (error: any) {
        this.callbacks.onError?.(
          error instanceof Error ? error : new Error('Speaker write failed'),
          'downstream',
        );
      }
    };

    voiceSocket.on('voice:agent:audio', handler);
    this.agentAudioListener = () => voiceSocket.off('voice:agent:audio', handler);
  }

  // 鈹€鈹€ Control 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

  /** Stop all relay activity */
  async stop(): Promise<void> {
    this.active = false;

    // Unsubscribe from mic notifications
    if (this.micSubscription) {
      this.micSubscription.remove();
      this.micSubscription = null;
    }

    // Remove socket listener
    if (this.agentAudioListener) {
      this.agentAudioListener();
      this.agentAudioListener = null;
    }

    this.callbacks.onUpstreamStop?.();
  }

  get isActive(): boolean {
    return this.active;
  }

  // 鈹€鈹€ Private 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

  /**
   * Write audio data to the glass speaker characteristic.
   * BLE MTU limits (~247 bytes), so we chunk the data.
   */
  private async writeToSpeaker(audioBase64: string): Promise<void> {
    const device = await this.bleManager.connectToDevice(this.options.deviceId);

    // BLE Write has MTU limit 鈥?chunk the audio
    const MTU_PAYLOAD = 200; // Conservative BLE MTU payload
    const audioBytes = Buffer.from(audioBase64, 'base64');

    for (let offset = 0; offset < audioBytes.length; offset += MTU_PAYLOAD) {
      const chunk = audioBytes.subarray(offset, offset + MTU_PAYLOAD);
      const chunkBase64 = chunk.toString('base64');

      await device.writeCharacteristicWithResponseForService(
        this.serviceUuid,
        this.speakerCharUuid,
        chunkBase64,
      );
    }
  }
}