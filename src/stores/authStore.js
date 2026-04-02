// ClawLink Auth Store (Zustand)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './mmkvStorage';
import * as SecureStore from 'expo-secure-store';
import { setApiConfig } from '../services/api';
export const useAuthStore = create()(persist((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,
    hasCompletedOnboarding: false,
    hasValidInvitation: false,
    activeInstance: null,
    setAuth: async (user, token) => {
        // Sync token to api config immediately so apiFetch works in the same tick
        setApiConfig({ token });
        try {
            await SecureStore.setItemAsync('clawlink_token', token);
        }
        catch (e) {
            console.warn('Failed to save token to SecureStore:', e);
        }
        // Set active instance if user has instances; preserve existing if user object has none
        const previousUserId = get().user?.id;
        const currentActive = get().activeInstance;
        const firstInstance = user.openClawInstances?.[0] ?? null;
        const activeInstance = firstInstance ?? currentActive;
        set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            activeInstance,
            hasValidInvitation: previousUserId && previousUserId !== user.id ? false : get().hasValidInvitation,
        });
    },
    clearAuth: async () => {
        try {
            await SecureStore.deleteItemAsync('clawlink_token');
            await SecureStore.deleteItemAsync('mpc_shard_a');
            await SecureStore.deleteItemAsync('mpc_recovery_code');
            await SecureStore.deleteItemAsync('mpc_backup_confirmed');
        }
        catch (e) {
            console.warn('Failed to clear SecureStore:', e);
        }
        set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            hasValidInvitation: false,
            activeInstance: null,
        });
    },
    setLoading: (loading) => set({ isLoading: loading }),
    setInitialized: (initialized) => set({ isInitialized: initialized }),
    setOnboardingComplete: () => set({ hasCompletedOnboarding: true }),
    setInvitationValid: () => set({ hasValidInvitation: true }),
    restoreSession: async () => {
        try {
            let token = await SecureStore.getItemAsync('clawlink_token');
            if (!token) {
                token = get().token;
            }
            if (!token) {
                set({ isInitialized: true });
                return false;
            }
            setApiConfig({ token });
            set({ token, isInitialized: true });
            return true;
        }
        catch (e) {
            console.warn('Failed to restore session:', e);
            set({ isInitialized: true });
            return false;
        }
    },
    addInstance: (instance) => {
        const user = get().user;
        if (!user)
            return;
        const existing = user.openClawInstances ?? [];
        const updated = [...existing, instance];
        const updatedUser = { ...user, openClawInstances: updated };
        set({ user: updatedUser, activeInstance: instance });
    },
    setActiveInstance: (instanceId) => {
        const user = get().user;
        if (!user)
            return;
        const instance = user.openClawInstances?.find(i => i.id === instanceId) ?? null;
        set({ activeInstance: instance });
    },
    updateInstance: (instanceId, update) => {
        const user = get().user;
        if (!user)
            return;
        const instances = (user.openClawInstances ?? []).map(i => i.id === instanceId ? { ...i, ...update } : i);
        const updatedUser = { ...user, openClawInstances: instances };
        const activeInstance = instances.find(i => i.id === instanceId) ??
            get().activeInstance;
        set({ user: updatedUser, activeInstance });
    },
    removeInstance: (instanceId) => {
        const user = get().user;
        if (!user)
            return;
        const instances = (user.openClawInstances ?? []).filter(i => i.id !== instanceId);
        const updatedUser = { ...user, openClawInstances: instances };
        const currentActive = get().activeInstance;
        const newActive = currentActive?.id === instanceId
            ? (instances[0] ?? null)
            : currentActive;
        set({ user: updatedUser, activeInstance: newActive });
    },
    updateUser: (updates) => {
        const user = get().user;
        if (!user)
            return;
        set({ user: { ...user, ...updates } });
    },
}), {
    name: 'clawlink-auth-storage',
    storage: createJSONStorage(() => mmkvStorage),
    partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        hasValidInvitation: state.hasValidInvitation,
        activeInstance: state.activeInstance,
    }),
}));
