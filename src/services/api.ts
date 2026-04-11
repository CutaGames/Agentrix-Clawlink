// API 鏈嶅姟灞?
import { 
  AssetSummary, 
  Airdrop, 
  AutoEarnSummary, 
  AutoEarnStrategy,
  MerchantSummary,
  SplitPlan,
  Settlement,
  DeveloperSummary,
  BudgetPool,
  Milestone,
  DeveloperOrder,
} from '../types/identity';
import * as SecureStore from 'expo-secure-store';

import { API_BASE } from '../config/env';

export interface ApiConfig {
  baseUrl?: string;
  token?: string;
}

export interface UploadedChatAttachment {
  url: string;
  publicUrl: string;
  localUri?: string;
  fileName: string;
  originalName: string;
  mimetype: string;
  size: number;
  kind: 'image' | 'audio' | 'video' | 'file';
  isImage: boolean;
  isAudio: boolean;
  isVideo: boolean;
}

let config: ApiConfig = {
  baseUrl: API_BASE,
};

const LOOPBACK_BASE_URL_RE = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/.*)?$/i;

function normalizeBaseUrl(baseUrl?: string): string {
  const trimmed = baseUrl?.trim();
  if (!trimmed) {
    return API_BASE;
  }

  if (!__DEV__ && LOOPBACK_BASE_URL_RE.test(trimmed)) {
    console.warn(`[api] Ignoring loopback base URL in release build: ${trimmed}`);
    return API_BASE;
  }

  return trimmed.replace(/\/+$/, '');
}

export const setApiConfig = (next: ApiConfig) => {
  config = {
    ...config,
    ...next,
    baseUrl: normalizeBaseUrl(next.baseUrl ?? config.baseUrl),
  };
};

export const getApiConfig = () => config;

// 浠?SecureStore 鑾峰彇 token
// KEY: 'clawlink_token' 鈥?must match authStore.setAuth SecureStore key
export const loadTokenFromStorage = async () => {
  try {
    const token = await SecureStore.getItemAsync('clawlink_token');
    if (token) {
      config.token = token;
    }
    return token;
  } catch (e) {
    console.warn('Failed to load token:', e);
    return null;
  }
};

// 淇濆瓨 token 鍒?SecureStore
export const saveTokenToStorage = async (token: string) => {
  try {
    await SecureStore.setItemAsync('clawlink_token', token);
    config.token = token;
  } catch (e) {
    console.warn('Failed to save token:', e);
  }
};

// 娓呴櫎 token
export const clearToken = async () => {
  try {
    await SecureStore.deleteItemAsync('clawlink_token');
    config.token = undefined;
  } catch (e) {
    console.warn('Failed to clear token:', e);
  }
};

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${config.baseUrl}${path}`;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const contentTypeHeader = Object.keys(headers).find((key) => key.toLowerCase() === 'content-type');

  if (isFormData) {
    if (contentTypeHeader) {
      delete headers[contentTypeHeader];
    }
  } else if (!contentTypeHeader) {
    headers['Content-Type'] = 'application/json';
  }

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    let errorMessage = `Request failed: ${res.status}`;
    try {
      const json = JSON.parse(text);
      errorMessage = json.message || json.error || errorMessage;
    } catch {
      // If it's HTML (like 502 Bad Gateway), provide a friendly message
      if (text.includes('<html') || res.status >= 500) {
        errorMessage = `Server error (${res.status}). Please try again later.`;
      } else {
        errorMessage = text || errorMessage;
      }
    }
    throw new Error(errorMessage);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export async function uploadChatAttachment(file: {
  uri: string;
  name: string;
  type: string;
}): Promise<UploadedChatAttachment> {
  const formData = new FormData();
  formData.append('file', file as any);

  const uploaded = await apiFetch<Omit<UploadedChatAttachment, 'publicUrl' | 'localUri'>>('/upload/chat-attachment', {
    method: 'POST',
    body: formData,
  });

  const publicBase = (config.baseUrl || API_BASE).replace(/\/api\/?$/, '');
  return {
    ...uploaded,
    publicUrl: uploaded.url.startsWith('http') ? uploaded.url : `${publicBase}${uploaded.url}`,
    localUri: file.uri,
  };
}

export async function syncLocalConversation(options: {
  sessionId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  model?: string;
  platform?: 'mobile' | 'desktop';
  deviceId?: string;
}): Promise<void> {
  try {
    await apiFetch('/openclaw/proxy/sync-local-messages', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: options.sessionId,
        messages: options.messages,
        model: options.model,
        platform: options.platform || 'mobile',
        deviceId: options.deviceId,
      }),
    });
  } catch {
    // Non-blocking: local conversation should still complete even if sync fails.
  }
}

// ========== Memory API ==========

export const memoryApi = {
  // Get memory preferences
  async getPreferences(): Promise<any[]> {
    return apiFetch('/ai-rag/memory/preferences');
  },

  // Add memory preference
  async addPreference(content: string): Promise<any> {
    return apiFetch('/ai-rag/memory/preferences', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  // Delete memory preference
  async deletePreference(id: string): Promise<void> {
    return apiFetch(`/ai-rag/memory/preferences/${id}`, {
      method: 'DELETE',
    });
  },
};


export const authApi = {
  // 鐧诲綍 (閽卞寘绛惧悕)
  async loginWithWallet(params: {
    address: string;
    signature: string;
    message: string;
    chainType: 'evm' | 'solana';
  }): Promise<{ token: string; user: any }> {
    const result = await apiFetch<{ token: string; user: any }>('/auth/wallet/login', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    await saveTokenToStorage(result.token);
    return result;
  },

  // 鑾峰彇鐧诲綍 nonce
  async getLoginNonce(address: string): Promise<{ nonce: string; message: string }> {
    return apiFetch(`/auth/wallet/nonce?address=${address}`);
  },

  // 鐧诲嚭
  async logout(): Promise<void> {
    await clearToken();
  },

  // 鑾峰彇褰撳墠鐢ㄦ埛
  async getCurrentUser(): Promise<any> {
    return apiFetch('/auth/me');
  },
};

// ========== 涓汉韬唤 API ==========

export const personalApi = {
  // 鑾峰彇璧勪骇鎽樿
  async getAssetSummary(): Promise<any> {
    // 瀵规帴鍚庣 /user/assets/summary 鎴栬嚜瀹氫箟鑱氬悎
    try {
      return await apiFetch('/user/assets/summary');
    } catch (e) {
      // 鍚庣鍙兘娌℃湁姝ょ鐐癸紝杩斿洖榛樿鍊?
      return {
        totalBalance: '0',
        change24h: '0%',
        assets: [],
      };
    }
  },

  // 鑾峰彇绌烘姇鍒楄〃 - 瀵规帴 /auto-earn/airdrops
  async getAirdrops(status?: string): Promise<Airdrop[]> {
    const query = status ? `?status=${status}` : '';
    try {
      const result = await apiFetch<any>(`/auto-earn/airdrops${query}`);
      // 杞崲鍚庣鏍煎紡涓哄墠绔牸寮?
      return (result.airdrops || result || []).map((item: any) => ({
        id: item.id,
        projectName: item.projectName || item.name,
        tokenSymbol: item.tokenSymbol || item.symbol,
        estimatedValue: item.estimatedValue || item.amount || '0',
        status: item.status || 'available',
        expiresAt: item.expiresAt || item.deadline,
      }));
    } catch (e) {
      return [];
    }
  },

  // 鍙戠幇鏂扮┖鎶?- 瀵规帴 /auto-earn/airdrops/discover
  async discoverAirdrops(): Promise<Airdrop[]> {
    try {
      const result = await apiFetch<any>('/auto-earn/airdrops/discover', { method: 'POST' });
      return result.airdrops || result || [];
    } catch (e) {
      return [];
    }
  },

  // 棰嗗彇绌烘姇 - 瀵规帴 /auto-earn/airdrops/:id/claim
  async claimAirdrop(airdropId: string): Promise<{ success: boolean; txHash?: string }> {
    return apiFetch(`/auto-earn/airdrops/${airdropId}/claim`, { method: 'POST' });
  },

  // 鑾峰彇 AutoEarn 缁熻 - 瀵规帴 /auto-earn/stats
  async getAutoEarnStats(): Promise<any> {
    try {
      const result = await apiFetch<any>('/auto-earn/stats');
      return {
        totalEarnings: result.totalEarnings || '0',
        activeStrategies: result.activeStrategies || 0,
        pendingRewards: result.pendingRewards || '0',
      };
    } catch (e) {
      return { totalEarnings: '0', activeStrategies: 0, pendingRewards: '0' };
    }
  },

  // 鑾峰彇 AutoEarn 浠诲姟鍒楄〃 - 瀵规帴 /auto-earn/tasks
  async getAutoEarnTasks(): Promise<any[]> {
    try {
      return await apiFetch('/auto-earn/tasks');
    } catch (e) {
      return [];
    }
  },

  // 鍒囨崲绛栫暐寮€鍏?- 瀵规帴 /auto-earn/strategies/:id/toggle
  async toggleStrategy(strategyId: string, enabled: boolean): Promise<any> {
    return apiFetch(`/auto-earn/strategies/${strategyId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  },
};

// ========== 鍟嗘埛韬唤 API ==========

export const merchantApi = {
  // 鑾峰彇鍟嗘埛缁熻 - 瀵规帴 /merchant/stats
  async getStats(days: number = 7): Promise<any> {
    try {
      const result = await apiFetch<any>(`/merchant/stats?days=${days}`);
      return {
        totalRevenue: String(result.summary?.totalVolume || 0),
        todayRevenue: String(result.chartData?.[result.chartData.length - 1]?.volume || 0),
        pendingSettlement: '0',
        activePlans: 0,
      };
    } catch (e) {
      return { totalRevenue: '0', todayRevenue: '0', pendingSettlement: '0', activePlans: 0 };
    }
  },

  // 鑾峰彇鍒嗕剑璁″垝鍒楄〃 - 瀵规帴 /commerce/split-plans
  async getSplitPlans(): Promise<SplitPlan[]> {
    try {
      const result = await apiFetch<any>('/commerce/split-plans');
      return (result.plans || result || []).map((plan: any) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description || '',
        feeRate: plan.feeRate || plan.feeBps / 100,
        isActive: plan.isActive ?? plan.active ?? true,
      }));
    } catch (e) {
      return [];
    }
  },

  // 鑾峰彇缁撶畻鍒楄〃 - 瀵规帴 /commerce/settlements 鎴?/merchant/settlements
  async getSettlements(status?: string): Promise<Settlement[]> {
    const query = status ? `?status=${status}` : '';
    try {
      const result = await apiFetch<any>(`/commerce/settlements${query}`);
      return (result.settlements || result || []).map((s: any) => ({
        id: s.id,
        amount: s.amount,
        currency: s.currency || 'USDC',
        status: s.status,
        createdAt: s.createdAt,
        settledAt: s.settledAt,
      }));
    } catch (e) {
      return [];
    }
  },

  // 鍒涘缓鏀舵閾炬帴 - 瀵规帴 /pay-intents/create
  async createPaymentLink(params: { 
    amount: number; 
    planId?: string; 
    currency?: string;
    description?: string;
  }): Promise<{ url: string; intentId: string }> {
    const result = await apiFetch<any>('/pay-intents/create', {
      method: 'POST',
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency || 'USDC',
        description: params.description || 'Payment',
        splitPlanId: params.planId,
      }),
    });
    return {
      url: result.paymentUrl || `https://pay.agentrix.io/${result.id}`,
      intentId: result.id,
    };
  },

  // 鍒嗕剑棰勮 - 瀵规帴 /commerce/split-plans/:id/preview
  async previewCommission(params: { amount: number; planId: string }): Promise<any> {
    return apiFetch(`/commerce/split-plans/${params.planId}/preview`, {
      method: 'POST',
      body: JSON.stringify({ amount: params.amount }),
    });
  },

  // 鑾峰彇鍟嗘埛 Profile - 瀵规帴 /merchant/profile
  async getProfile(): Promise<any> {
    return apiFetch('/merchant/profile');
  },
};

// ========== 寮€鍙戣€呰韩浠?API ==========

export const developerApi = {
  // 鑾峰彇寮€鍙戣€呰处鎴?- 瀵规帴 /developer-accounts/my
  async getMyAccount(): Promise<any> {
    try {
      return await apiFetch('/developer-accounts/my');
    } catch (e) {
      return null;
    }
  },

  // 鑾峰彇寮€鍙戣€呬华琛ㄧ洏 - 瀵规帴 /developer-accounts/dashboard
  async getDashboard(): Promise<any> {
    try {
      const result = await apiFetch<any>('/developer-accounts/dashboard');
      return {
        totalEarnings: String(result.totalEarnings || 0),
        activeProjects: result.activeProjects || 0,
        pendingPayment: String(result.pendingPayment || 0),
        completedTasks: result.completedTasks || 0,
      };
    } catch (e) {
      return { totalEarnings: '0', activeProjects: 0, pendingPayment: '0', completedTasks: 0 };
    }
  },

  // 鍒涘缓寮€鍙戣€呰处鎴?- 瀵规帴 /developer-accounts
  async createAccount(data: {
    name: string;
    description?: string;
    website?: string;
    contactEmail?: string;
  }): Promise<any> {
    return apiFetch('/developer-accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 鑾峰彇棰勭畻姹犲垪琛?- 瀵规帴 /commerce/budget-pools
  async getBudgetPools(): Promise<BudgetPool[]> {
    try {
      const result = await apiFetch<any>('/commerce/budget-pools');
      return (result.pools || result || []).map((pool: any) => ({
        id: pool.id,
        name: pool.name,
        totalBudget: pool.totalBudget || pool.amount,
        usedBudget: pool.usedBudget || pool.spent || 0,
        status: pool.status || 'active',
      }));
    } catch (e) {
      return [];
    }
  },

  // 鑾峰彇閲岀▼纰戝垪琛?- 瀵规帴 /commerce/milestones
  async getMilestones(poolId?: string): Promise<Milestone[]> {
    const query = poolId ? `?poolId=${poolId}` : '';
    try {
      const result = await apiFetch<any>(`/commerce/milestones${query}`);
      return (result.milestones || result || []).map((m: any) => ({
        id: m.id,
        title: m.title || m.name,
        amount: m.amount,
        status: m.status,
        dueDate: m.dueDate,
      }));
    } catch (e) {
      return [];
    }
  },

  // 鑾峰彇鍙帴璁㈠崟 - 瀵规帴 /merchant-tasks 鎴栬嚜瀹氫箟
  async getAvailableOrders(): Promise<DeveloperOrder[]> {
    try {
      const result = await apiFetch<any>('/merchant-tasks?status=open');
      return (result.tasks || result || []).map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        budget: task.budget || task.reward,
        deadline: task.deadline,
        skills: task.skills || [],
      }));
    } catch (e) {
      return [];
    }
  },

  // 鎺ュ崟 - 瀵规帴 /merchant-tasks/:id/accept
  async acceptOrder(orderId: string): Promise<{ success: boolean }> {
    return apiFetch(`/merchant-tasks/${orderId}/accept`, { method: 'POST' });
  },
};

// ========== 韬唤绠＄悊 API ==========

export const identityApi = {
  // 鐢宠婵€娲诲晢鎴疯韩浠?- 瀵规帴 /merchant/profile
  async applyForMerchant(application: {
    businessName: string;
    businessType: string;
    contactEmail: string;
  }): Promise<{ success: boolean }> {
    await apiFetch('/merchant/profile', {
      method: 'POST',
      body: JSON.stringify(application),
    });
    return { success: true };
  },

  // 鐢宠婵€娲诲紑鍙戣€呰韩浠?- 瀵规帴 /developer-accounts
  async applyForDeveloper(application: {
    name: string;
    description?: string;
    website?: string;
    contactEmail?: string;
  }): Promise<{ success: boolean }> {
    await apiFetch('/developer-accounts', {
      method: 'POST',
      body: JSON.stringify(application),
    });
    return { success: true };
  },

  // 妫€鏌ヨ韩浠界姸鎬?
  async checkIdentityStatus(): Promise<{
    personal: { activated: boolean };
    merchant: { activated: boolean; pending: boolean };
    developer: { activated: boolean; pending: boolean };
  }> {
    // 鑱氬悎澶氫釜 API 鑾峰彇韬唤鐘舵€?
    let merchantStatus = { activated: false, pending: false };
    let developerStatus = { activated: false, pending: false };

    try {
      const merchantProfile = await apiFetch<any>('/merchant/profile');
      merchantStatus.activated = !!merchantProfile?.id;
    } catch (e) {
      // 鏈縺娲?
    }

    try {
      const devAccount = await apiFetch<any>('/developer-accounts/my');
      developerStatus.activated = !!devAccount?.id;
      developerStatus.pending = devAccount?.status === 'pending';
    } catch (e) {
      // 鏈縺娲?
    }

    return {
      personal: { activated: true }, // 涓汉韬唤榛樿婵€娲?
      merchant: merchantStatus,
      developer: developerStatus,
    };
  },
};

// ========== 鐢ㄦ埛 Agent API ==========

export const agentApi = {
  // 鑾峰彇鐢ㄦ埛鐨?Agent 鍒楄〃
  async getMyAgents(): Promise<any[]> {
    try {
      return await apiFetch('/user-agents');
    } catch (e) {
      return [];
    }
  },

  // 鑾峰彇 Agent 璇︽儏
  async getAgent(agentId: string): Promise<any> {
    return apiFetch(`/user-agents/${agentId}`);
  },

  // 涓?Agent 瀵硅瘽
  async chat(agentId: string, message: string): Promise<{ reply: string }> {
    return apiFetch(`/user-agents/${agentId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
};