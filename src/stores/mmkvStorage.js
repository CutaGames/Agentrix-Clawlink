/**
 * MMKV storage adapter for Zustand persist middleware.
 *
 * react-native-mmkv provides synchronous reads (~30x faster than AsyncStorage).
 * This adapter wraps MMKV in the StateStorage interface required by Zustand.
 *
 * Usage:
 *   import { mmkvStorage } from './mmkvStorage';
 *   persist(storeCreator, { name: 'key', storage: createJSONStorage(() => mmkvStorage) })
 */
import { MMKV } from 'react-native-mmkv';
export const mmkv = new MMKV({ id: 'agentrix-app' });
export const mmkvStorage = {
    getItem: (name) => {
        const value = mmkv.getString(name);
        return value ?? null;
    },
    setItem: (name, value) => {
        mmkv.set(name, value);
    },
    removeItem: (name) => {
        mmkv.delete(name);
    },
};
/**
 * One-time migration from AsyncStorage to MMKV.
 * Call once at app startup before stores hydrate.
 */
export async function migrateFromAsyncStorage() {
    const migrated = mmkv.getBoolean('__mmkv_migrated');
    if (migrated)
        return;
    try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const keys = await AsyncStorage.getAllKeys();
        const pairs = await AsyncStorage.multiGet(keys);
        for (const [key, value] of pairs) {
            if (key && value != null) {
                mmkv.set(key, value);
            }
        }
        mmkv.set('__mmkv_migrated', true);
        // Don't delete AsyncStorage data yet — keep as fallback for one release cycle
    }
    catch {
        // Migration failed silently — stores will still work with empty MMKV
    }
}
