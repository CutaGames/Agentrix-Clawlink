// 认证 Store (Zustand)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export type AuthProvider = 'google' | 'x' | 'telegram' | 'discord' | 'wallet' | 'email';

export interface AuthUser {
  id: string;
  agentrixId: string;
  email?: string;
  nickname?: string;
  avatarUrl?: string;
  walletAddress?: string;
  roles: string[];
  provider?: AuthProvider;
}

interface AuthState {
  // 状态
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setAuth: (user: AuthUser, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  restoreSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      setAuth: async (user, token) => {
        // 存储 token 到 SecureStore (加密存储)
        try {
          await SecureStore.setItemAsync('auth_token', token);
        } catch (e) {
          console.warn('Failed to save token to SecureStore:', e);
        }
        set({ user, token, isAuthenticated: true, isLoading: false });
      },

      clearAuth: async () => {
        try {
          await SecureStore.deleteItemAsync('auth_token');
          await SecureStore.deleteItemAsync('mpc_shard_a');
        } catch (e) {
          console.warn('Failed to clear SecureStore:', e);
        }
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setInitialized: (initialized) => set({ isInitialized: initialized }),

      restoreSession: async () => {
        try {
          const token = await SecureStore.getItemAsync('auth_token');
          if (!token) {
            set({ isInitialized: true });
            return false;
          }
          // Token 存在，设置到 state 中
          // 实际验证会在 App 启动时通过 /auth/me 接口完成
          set({ token, isInitialized: true });
          return true;
        } catch (e) {
          console.warn('Failed to restore session:', e);
          set({ isInitialized: true });
          return false;
        }
      },
    }),
    {
      name: 'agentrix-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
