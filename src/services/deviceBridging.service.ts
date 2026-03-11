import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import { File as ExpoFile } from 'expo-file-system';
// expo-image-picker is required lazily (inside pickImageAttachment) to avoid
// loading the ExponentImagePicker native module at JS bundle evaluation time,
// which crashes on HarmonyOS before the native bridge is fully initialised.

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
}

export interface ImageAttachment {
  uri: string;
  width: number | null;
  height: number | null;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
}

export interface FileAttachment {
  uri: string;
  fileName: string;
  mimeType: string;
  size: number | null;
}

export class DeviceBridgingService {
  /**
   * Get current device location (GPS)
   */
  static async getCurrentLocation(): Promise<LocationData> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied by user.');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
      };
    } catch (error: any) {
      console.error('Failed to get location:', error);
      throw new Error(error.message || 'Failed to get location');
    }
  }

  /**
   * Read text from clipboard
   */
  static async readClipboard(): Promise<string> {
    try {
      const hasString = await Clipboard.hasStringAsync();
      if (!hasString) {
        return '';
      }
      const content = await Clipboard.getStringAsync();
      return content;
    } catch (error: any) {
      console.error('Failed to read clipboard:', error);
      throw new Error(error.message || 'Failed to read clipboard');
    }
  }

  /**
   * Write text to clipboard
   */
  static async writeClipboard(text: string): Promise<boolean> {
    try {
      await Clipboard.setStringAsync(text);
      return true;
    } catch (error: any) {
      console.error('Failed to write clipboard:', error);
      throw new Error(error.message || 'Failed to write clipboard');
    }
  }

  /**
   * Pick an image from the device's photo album without loading base64 into JS memory.
   */
  static async pickImageAttachment(): Promise<ImageAttachment | null> {
    try {
      const selected = await ExpoFile.pickFileAsync(undefined, 'image/*');
      const file = Array.isArray(selected) ? selected[0] : selected;

      if (file?.uri) {
        return {
          uri: file.uri,
          width: null,
          height: null,
          fileName: file.uri.split('/').pop() || 'image',
          mimeType: file.type || 'image/*',
          size: typeof file.size === 'number' ? file.size : null,
        };
      }

      return null;
    } catch (filePickerError: any) {
      const filePickerMessage = String(filePickerError?.message || '').toLowerCase();
      if (filePickerMessage.includes('cancel')) {
        return null;
      }

      try {
        // Lazy require: only load expo-image-picker native module when needed.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ImagePicker = require('expo-image-picker');
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Photo album permission denied by user.');
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
          base64: false,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          return {
            uri: asset.uri,
            width: asset.width ?? null,
            height: asset.height ?? null,
            fileName: asset.fileName ?? null,
            mimeType: asset.mimeType ?? null,
            size: asset.fileSize ?? null,
          };
        }

        return null;
      } catch (error: any) {
        const message = String(error?.message || '').toLowerCase();
        if (message.includes('cancel')) {
          return null;
        }
        console.error('Failed to pick image:', error);
        throw new Error(error.message || 'Failed to pick image');
      }
    }
  }

  /**
   * Pick a general document/file from the device.
   */
  static async pickFileAttachment(): Promise<FileAttachment | null> {
    try {
      const selected = await ExpoFile.pickFileAsync();
      const file = Array.isArray(selected) ? selected[0] : selected;

      if (!file) {
        return null;
      }

      return {
        uri: file.uri,
        fileName: file.uri.split('/').pop() || 'attachment',
        mimeType: file.type || 'application/octet-stream',
        size: typeof file.size === 'number' ? file.size : null,
      };
    } catch (error: any) {
      if (String(error?.message || '').toLowerCase().includes('cancel')) {
        return null;
      }
      console.error('Failed to pick file:', error);
      throw new Error(error.message || 'Failed to pick file');
    }
  }

  /**
   * Take a photo using the device camera.
   * Falls back to album picker if camera is unavailable (e.g. HarmonyOS).
   */
  static async takeCameraPhoto(): Promise<ImageAttachment | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ImagePicker = require('expo-image-picker');

      // Check if camera hardware is available before requesting permissions
      const available = await ImagePicker.getCameraPermissionsAsync();
      const { status } = available.status === 'granted'
        ? available
        : await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Camera permission denied by user.');
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: false,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        return {
          uri: asset.uri,
          width: asset.width ?? null,
          height: asset.height ?? null,
          fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
          mimeType: asset.mimeType ?? 'image/jpeg',
          size: asset.fileSize ?? null,
        };
      }

      return null;
    } catch (error: any) {
      if (String(error?.message || '').toLowerCase().includes('cancel')) {
        return null;
      }
      console.error('Failed to take camera photo:', error);
      // If camera launch crashes for any reason, fall back to album picker
      // This covers HarmonyOS, missing native modules, activity resolution failures, etc.
      const msg = String(error?.message || '').toLowerCase();
      if (msg.includes('permission')) {
        throw new Error(error.message || 'Camera permission denied.');
      }
      console.warn('Camera unavailable — falling back to photo album');
      try {
        return await DeviceBridgingService.pickImageAttachment();
      } catch (fallbackErr: any) {
        throw new Error(fallbackErr?.message || 'Failed to take camera photo');
      }
    }
  }
}
