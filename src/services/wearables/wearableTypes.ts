export type WearableKind = 'ring' | 'band' | 'clip' | 'sensor' | 'unknown';

export type WearableSupportTier = 'ready' | 'known' | 'beta';

export type WearableConnectionStage = 'connecting' | 'discovering' | 'reading' | 'done';

export interface BlePermissionState {
  bluetooth: boolean;
  location: boolean;
  nearbyDevices: boolean;
  granted: boolean;
}

export interface BleScanResult {
  id: string;
  name: string;
  localName: string | null;
  rssi: number | null;
  manufacturerData: string | null;
  serviceUUIDs: string[];
}

export interface WearableCharacteristicSnapshot {
  uuid: string;
  serviceUuid: string;
  isReadable: boolean;
  isWritableWithResponse: boolean;
  isWritableWithoutResponse: boolean;
  isNotifiable: boolean;
  value: string | null;
}

export interface WearableServiceSnapshot {
  uuid: string;
  characteristics: WearableCharacteristicSnapshot[];
}

export interface WearableConnectionSnapshot {
  device: BleScanResult;
  services: WearableServiceSnapshot[];
  readableCharacteristics: WearableCharacteristicSnapshot[];
  notifiableCharacteristics: WearableCharacteristicSnapshot[];
  firstReadCharacteristic: WearableCharacteristicSnapshot | null;
  readError: string | null;
  connectedAt: string;
}

export interface WearableScanCandidate {
  id: string;
  name: string;
  kind: WearableKind;
  supportTier: WearableSupportTier;
  summary: string;
  serviceLabels: string[];
  signalLabel: string;
  raw: BleScanResult;
}

export interface WearableProfile {
  id: string;
  name: string;
  kind: WearableKind;
  supportTier: WearableSupportTier;
  summary: string;
  serviceLabels: string[];
  servicesCount: number;
  readableCount: number;
  notifiableCount: number;
  firstReadCharacteristicUuid: string | null;
  firstReadPayload: string | null;
  readError: string | null;
  connectedAt: string;
}

export interface WearableVendorProfile {
  key: string;
  name: string;
  kind: WearableKind;
  supportTier: WearableSupportTier;
  namePatterns: string[];
  serviceLabels: string[];
  gestureHints: string[];
  summary: string;
}

export interface AgentVerificationEvent {
  type: 'wearable.phase1_verified';
  source: 'wearable';
  deviceId: string;
  deviceName: string;
  services: string[];
  firstReadableCharacteristicUuid: string | null;
  payloadPreview: string | null;
}

export interface AgentCapabilityPreview {
  title: string;
  summary: string;
  triggers: string[];
  evidence: string[];
  verificationEvent: AgentVerificationEvent;
}

export interface PairedWearableRecord {
  id: string;
  name: string;
  kind: WearableKind;
  supportTier: WearableSupportTier;
  serviceLabels: string[];
  pairedAt: string;
  lastSeenAt: string;
  verificationEventType: AgentVerificationEvent['type'];
}

export interface LiveCharacteristicEvent {
  id: string;
  deviceId: string;
  serviceUuid: string;
  characteristicUuid: string;
  value: string | null;
  receivedAt: string;
}