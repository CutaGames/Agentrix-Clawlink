/**
 * Agentrix Provider for React
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { Agentrix, AgentrixConfig } from '@agentrix/sdk';

interface AgentrixContextType {
  agentrix: Agentrix;
}

const AgentrixContext = createContext<AgentrixContextType | null>(null);

interface AgentrixProviderProps {
  children: ReactNode;
  config: AgentrixConfig;
}

export function AgentrixProvider({ children, config }: AgentrixProviderProps) {
  const agentrix = new Agentrix(config);

  return (
    <AgentrixContext.Provider value={{ agentrix }}>
      {children}
    </AgentrixContext.Provider>
  );
}

export function useAgentrix() {
  const context = useContext(AgentrixContext);
  if (!context) {
    throw new Error('useAgentrix must be used within a AgentrixProvider');
  }
  return context.agentrix;
}

