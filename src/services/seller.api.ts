// 卖家 API 服务
import { apiFetch } from './api';

// ========== 类型定义 ==========

export interface SellerDashboard {
  totalSkills: number;
  totalRevenue: number;
  monthlyRevenue: number;
  monthlyCallCount: number;
  revenueChange: number; // 环比变化百分比
}

export interface SellerSkill {
  id: string;
  name: string;
  rating: number;
  monthlyCallCount: number;
  monthlyRevenue: number;
  revenueChange: number; // 环比变化百分比
  totalReviews: number;
  newReviews: number;
  status: 'active' | 'paused' | 'draft';
}

interface RawSkillRecord {
  id: string;
  name?: string;
  displayName?: string;
  rating?: number;
  callCount?: number;
  reviewCount?: number;
  pricing?: { pricePerCall?: number };
  status?: string;
}

function mapSellerSkill(skill: RawSkillRecord): SellerSkill {
  const monthlyCallCount = Number(skill.callCount || 0);
  const pricePerCall = Number(skill.pricing?.pricePerCall || 0);

  return {
    id: skill.id,
    name: skill.displayName || skill.name || 'Untitled Skill',
    rating: Number(skill.rating || 0),
    monthlyCallCount,
    monthlyRevenue: Number((monthlyCallCount * pricePerCall).toFixed(2)),
    revenueChange: 0,
    totalReviews: Number(skill.reviewCount || 0),
    newReviews: 0,
    status: skill.status === 'paused' ? 'paused' : skill.status === 'draft' ? 'draft' : 'active',
  };
}

async function fetchMySkills(): Promise<SellerSkill[]> {
  const result = await apiFetch<{ items?: RawSkillRecord[] }>('/skills/my?limit=100');
  return (result.items || []).map(mapSellerSkill);
}

// ========== API 方法 ==========

export const sellerApi = {
  // 获取卖家总览
  async getDashboard(): Promise<SellerDashboard> {
    try {
      const dashboard = await apiFetch<any>('/developer-accounts/dashboard');
      const account = dashboard?.account;
      return {
        totalSkills: Number(account?.publishedSkillCount || 0),
        totalRevenue: Number(account?.totalRevenue || 0),
        monthlyRevenue: Number(account?.monthlyRevenue || 0),
        monthlyCallCount: Number(account?.monthlyApiCallCount || 0),
        revenueChange: 0,
      };
    } catch {
      const skills = await fetchMySkills().catch(() => []);
      return {
        totalSkills: skills.length,
        totalRevenue: skills.reduce((sum, item) => sum + item.monthlyRevenue, 0),
        monthlyRevenue: skills.reduce((sum, item) => sum + item.monthlyRevenue, 0),
        monthlyCallCount: skills.reduce((sum, item) => sum + item.monthlyCallCount, 0),
        revenueChange: 0,
      };
    }
  },

  // 获取我发布的技能列表
  async getMySkills(): Promise<SellerSkill[]> {
    return fetchMySkills().catch(() => []);
  },

  // 获取单个技能统计
  async getSkillStats(skillId: string): Promise<SellerSkill> {
    try {
      const skill = await apiFetch<RawSkillRecord>(`/skills/${skillId}`);
      return mapSellerSkill(skill);
    } catch {
      const skills = await fetchMySkills().catch(() => []);
      const found = skills.find(item => item.id === skillId);
      if (!found) {
        throw new Error('Skill not found');
      }
      return found;
    }
  },
};
