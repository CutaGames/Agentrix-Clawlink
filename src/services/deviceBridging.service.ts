import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
// expo-image-picker is required lazily (inside pickImageAsBase64) to avoid
// loading the ExponentImagePicker native module at JS bundle evaluation time,
// which crashes on HarmonyOS before the native bridge is fully initialised.

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
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
   * Pick an image from the device's photo album
   * @returns Base64 string of the image, or null if canceled
   */
  static async pickImageAsBase64(): Promise<string | null> {
    try {
      // Lazy require: only load expo-image-picker native module when this
      // function is actually called (not at startup), preventing HarmonyOS crash.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ImagePicker = require('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Photo album permission denied by user.');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true, 
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          // Return base64 string formatted for data URI
          return `data:image/jpeg;base64,${asset.base64}`;
        }
      }
      
      return null;
    } catch (error: any) {
      console.error('Failed to pick image:', error);
      throw new Error(error.message || 'Failed to pick image');
    }
  }
}
