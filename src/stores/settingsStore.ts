// 设置 Store
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Environment = 'sandbox' | 'production';

interface SettingsState {
  // 环境配置
  environment: Environment;
  apiBaseUrl: string;
  
  // 通知设置
  notificationsEnabled: boolean;
  airdropNotifications: boolean;
  earningsNotifications: boolean;
  paymentNotifications: boolean;
  
  // 安全设置
  biometricEnabled: boolean;
  
  // Actions
  setEnvironment: (env: Environment) => void;
  setApiBaseUrl: (url: string) => void;
  toggleNotifications: (enabled: boolean) => void;
  toggleBiometric: (enabled: boolean) => void;
}

const API_URLS = {
  sandbox: 'https://sandbox-api.agentrix.io',
  production: 'https://api.agentrix.io',
  local: 'http://localhost:3001/api',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      environment: 'sandbox',
      apiBaseUrl: API_URLS.local, // 开发时使用本地
      
      notificationsEnabled: true,
      airdropNotifications: true,
      earningsNotifications: true,
      paymentNotifications: true,
      
      biometricEnabled: false,
      
      setEnvironment: (env) => set({ 
        environment: env,
        apiBaseUrl: API_URLS[env],
      }),
      
      setApiBaseUrl: (url) => set({ apiBaseUrl: url }),
      
      toggleNotifications: (enabled) => set({ 
        notificationsEnabled: enabled,
        airdropNotifications: enabled,
        earningsNotifications: enabled,
        paymentNotifications: enabled,
      }),
      
      toggleBiometric: (enabled) => set({ biometricEnabled: enabled }),
    }),
    {
      name: 'agentrix-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
