import axios from 'axios';

// HQ Backend API URL with /api prefix
const HQ_API_URL = process.env.NEXT_PUBLIC_HQ_URL || 'http://localhost:3005/api';

export const api = axios.create({
  baseURL: HQ_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dashboard Stats
export interface DashboardStats {
  revenue24h: number;
  revenueChange: number;
  activeAgents: number;
  totalAgents: number;
  activeMerchants: number;
  newMerchants24h: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  systemHealth: 'HEALTHY' | 'DEGRADED' | 'DOWN';
}

export interface Alert {
  id: string;
  type: 'risk' | 'biz' | 'sys' | 'ops';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface AgentStatus {
  id: string;
  name: string;
  role: string;
  status: 'running' | 'idle' | 'paused' | 'error';
  currentTask?: string;
  progress?: number;
  lastActive: string;
}

// API Functions
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get('/hq/dashboard');
  return data;
}

export async function getAlerts(limit = 10): Promise<Alert[]> {
  const { data } = await api.get(`/hq/alerts?limit=${limit}`);
  return data;
}

export async function getAgentStatuses(): Promise<AgentStatus[]> {
  const { data } = await api.get('/hq/agents');
  return data;
}

export async function sendAgentCommand(agentId: string, command: string): Promise<{ response: string }> {
  const { data } = await api.post('/hq/chat', { agentId, messages: [{ role: 'user', content: command }] });
  return { response: data.content };
}

export async function chatWithAgent(agentId: string, messages: any[]): Promise<any> {
  const { data } = await api.post('/hq/chat', { agentId, messages });
  return data;
}

// ============================================
// Workspace API
// ============================================

export interface Workspace {
  id: string;
  name: string;
  rootPath: string;
  description?: string;
  type: string;
  isActive: boolean;
  settings?: {
    defaultAgent?: string;
    autoSave?: boolean;
  };
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  language?: string;
  size?: number;
}

export interface AgentChatRequest {
  agentCode: string;
  message: string;
  filePath?: string;
  selectedCode?: string;
}

export interface AgentChatResponse {
  agentCode: string;
  response: string;
  suggestedChanges?: {
    filePath: string;
    oldCode: string;
    newCode: string;
    explanation: string;
  }[];
}

// HQ API Object for Workspace features
export const hqApi = {
  // Workspace Management
  async getWorkspaces(): Promise<Workspace[]> {
    const { data } = await api.get('/hq/workspace');
    return data;
  },

  async createWorkspace(params: { name: string; rootPath: string; description?: string }): Promise<Workspace> {
    const { data } = await api.post('/hq/workspace', params);
    return data;
  },

  async getWorkspace(id: string): Promise<Workspace> {
    const { data } = await api.get(`/hq/workspace/${id}`);
    return data;
  },

  // File Operations
  async getFileTree(workspaceId: string, subPath?: string): Promise<FileNode[]> {
    const params = subPath ? `?path=${encodeURIComponent(subPath)}` : '';
    const { data } = await api.get(`/hq/workspace/${workspaceId}/files${params}`);
    return data;
  },

  async readFile(workspaceId: string, filePath: string): Promise<{ content: string; language: string; fileName: string }> {
    const { data } = await api.get(`/hq/workspace/${workspaceId}/file?path=${encodeURIComponent(filePath)}`);
    return data;
  },

  async saveFile(workspaceId: string, filePath: string, content: string): Promise<{ success: boolean }> {
    const { data } = await api.put(`/hq/workspace/${workspaceId}/file`, { filePath, content });
    return data;
  },

  // Agent Chat in Workspace
  async chatWithAgent(workspaceId: string, request: AgentChatRequest): Promise<AgentChatResponse> {
    const { data } = await api.post(`/hq/workspace/${workspaceId}/chat`, request);
    return data;
  },

  // Knowledge Base
  async getKnowledgeStats(): Promise<{ total: number; byCategory: Record<string, number>; totalWords: number }> {
    const { data } = await api.get('/hq/knowledge/stats');
    return data;
  },

  async importKnowledgeDocuments(projectRoot: string): Promise<{ success: number; failed: string[] }> {
    const { data } = await api.post('/hq/knowledge/import-important', { projectRoot });
    return data;
  },

  async searchKnowledge(query: string, category?: string): Promise<any[]> {
    const { data } = await api.post('/hq/knowledge/search', { query, category });
    return data;
  },
};
