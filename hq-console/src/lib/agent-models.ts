import { getModelForAgent } from '@/lib/api';

export type AIProvider =
  | 'auto'
  | 'gemini'
  | 'openai'
  | 'claude'
  | 'deepseek'
  | 'bedrock-opus'
  | 'bedrock-sonnet'
  | 'bedrock-haiku';

export interface AgentModelOverride {
  provider?: AIProvider;
  model: string;
}

export interface ModelPreset {
  id: string;
  label: string;
  provider: AIProvider;
  model: string;
}


export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: 'claude-opus-4-6',
    label: 'Claude Opus 4.6 (Bedrock)',
    provider: 'bedrock-opus',
    model: 'arn:aws:bedrock:us-east-1:696737009512:inference-profile/us.anthropic.claude-opus-4-6-v1',
  },
  {
    id: 'claude-opus-4-5',
    label: 'Claude Opus 4.5 (Bedrock)',
    provider: 'bedrock-opus',
    model: 'us.anthropic.claude-opus-4-5-20251101-v1:0',
  },
  {
    id: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5 (Bedrock)',
    provider: 'bedrock-sonnet',
    model: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
  },
  {
    id: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5 (Bedrock)',
    provider: 'bedrock-haiku',
    model: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
  },
  {
    id: 'gemini-2-5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
  },
  {
    id: 'gemini-1-5-flash',
    label: 'Gemini Flash 1.5',
    provider: 'gemini',
    model: 'gemini-1.5-flash',
  },
  {
    id: 'gemini-3-flash',
    label: 'Gemini 3 Flash',
    provider: 'gemini',
    model: 'gemini-3-flash-preview',
  },
  {
    id: 'gemini-3-pro',
    label: 'Gemini 3 Pro',
    provider: 'gemini',
    model: 'gemini-3-pro-preview',
  },
  {
    id: 'gpt-5-2',
    label: 'GPT-5.2',
    provider: 'openai',
    model: 'gpt-5.2',
  },
  {
    id: 'gpt-5-2-codex',
    label: 'GPT-5.2-Codex',
    provider: 'openai',
    model: 'gpt-5.2-codex',
  },
];

export const PROVIDER_OPTIONS: Array<{ label: string; value: AIProvider }> = [
  { label: 'Auto', value: 'auto' },
  { label: 'Bedrock Opus', value: 'bedrock-opus' },
  { label: 'Bedrock Sonnet', value: 'bedrock-sonnet' },
  { label: 'Bedrock Haiku', value: 'bedrock-haiku' },
  { label: 'Gemini', value: 'gemini' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'Claude (direct)', value: 'claude' },
  { label: 'DeepSeek', value: 'deepseek' },
];

export function getEffectiveModelId(agentCode?: string, override?: AgentModelOverride | null): string {
  if (override?.model) return override.model;
  return agentCode ? getModelForAgent(agentCode) : 'Unknown';
}

export function getModelLabel(modelId?: string | null): string {
  if (!modelId) return 'Unknown';
  const preset = MODEL_PRESETS.find(p => p.model === modelId);
  return preset?.label || modelId;
}
