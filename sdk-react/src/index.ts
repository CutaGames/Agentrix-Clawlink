/**
 * Agentrix React SDK - Main entry point
 */

export { AgentrixProvider, useAgentrix } from './AgentrixProvider';
export { usePayment } from './hooks/usePayment';
export { useAgent } from './hooks/useAgent';
export { PaymentButton } from './components/PaymentButton';

// Re-export types from @agentrix/sdk
export * from '@agentrix/sdk';

