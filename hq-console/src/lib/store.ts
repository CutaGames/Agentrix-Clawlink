import { create } from 'zustand';

interface HQState {
  // UI State
  sidebarCollapsed: boolean;
  operationMode: 'manual' | 'automated';
  selectedAgentId: string | null;
  
  // Actions
  toggleSidebar: () => void;
  setOperationMode: (mode: 'manual' | 'automated') => void;
  selectAgent: (agentId: string | null) => void;
}

export const useHQStore = create<HQState>((set) => ({
  sidebarCollapsed: false,
  operationMode: 'automated',
  selectedAgentId: null,
  
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setOperationMode: (mode) => set({ operationMode: mode }),
  selectAgent: (agentId) => set({ selectedAgentId: agentId }),
}));
