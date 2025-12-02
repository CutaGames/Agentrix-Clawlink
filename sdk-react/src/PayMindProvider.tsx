/**
 * PayMind Provider for React
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { PayMind, PayMindConfig } from '@paymind/sdk';

interface PayMindContextType {
  paymind: PayMind;
}

const PayMindContext = createContext<PayMindContextType | null>(null);

interface PayMindProviderProps {
  children: ReactNode;
  config: PayMindConfig;
}

export function PayMindProvider({ children, config }: PayMindProviderProps) {
  const paymind = new PayMind(config);

  return (
    <PayMindContext.Provider value={{ paymind }}>
      {children}
    </PayMindContext.Provider>
  );
}

export function usePayMind() {
  const context = useContext(PayMindContext);
  if (!context) {
    throw new Error('usePayMind must be used within a PayMindProvider');
  }
  return context.paymind;
}

