// 推广/推荐 API 服务
import { apiFetch } from './api';
import { useAuthStore } from '../stores/authStore';

// ========== 类型定义 ==========

export interface ReferralLink {
  id: string;
  name: string;
  shortCode: string;
  shortUrl: string;
  targetType: 'general' | 'product' | 'skill' | 'campaign';
  targetId?: string;
  clicks: number;
  conversions: number;
  commission: number;
  status: 'active' | 'paused' | 'expired' | 'archived';
  createdAt: string;
}

export interface ReferralStats {
  totalInvites: number;
  totalClicks: number;
  conversionRate: number;
  totalCommission: number;
  pendingCommission: number;
  todayClicks: number;
  todayConversions: number;
}

export interface CommissionRule {
  assetType: string;
  platformFeeRate: number;
  promoterShare: number;
  effectiveRate: number;
  settlementCycle: string;
}

const DEFAULT_RULES: CommissionRule[] = [
  { assetType: '技能/服务', platformFeeRate: 5, promoterShare: 20, effectiveRate: 1, settlementCycle: 'T+3' },
  { assetType: '虚拟商品', platformFeeRate: 4, promoterShare: 20, effectiveRate: 0.8, settlementCycle: 'T+1' },
  { assetType: '实物商品', platformFeeRate: 3, promoterShare: 20, effectiveRate: 0.6, settlementCycle: 'T+7' },
];

function getEmptyStats(): ReferralStats {
  return {
    totalInvites: 0,
    totalClicks: 0,
    conversionRate: 0,
    totalCommission: 0,
    pendingCommission: 0,
    todayClicks: 0,
    todayConversions: 0,
  };
}

// ========== API 方法 ==========

export const referralApi = {
  // 获取推广统计
  async getStats(): Promise<ReferralStats> {
    try {
      const [referralStats, commissionStats] = await Promise.all([
        apiFetch<any>('/referral/stats').catch(() => null),
        apiFetch<any>('/human-commissions/stats').catch(() => null),
      ]);

      const totalInvites = Number(commissionStats?.referralCount ?? referralStats?.totalReferrals ?? 0);
      const totalClicks = Number(referralStats?.totalMerchantGMV ?? commissionStats?.totalOrders ?? 0);
      const todayConversions = Number(commissionStats?.todayOrders || 0);

      return {
        totalInvites,
        totalClicks,
        conversionRate: totalClicks > 0 ? Number(((todayConversions / totalClicks) * 100).toFixed(2)) : 0,
        totalCommission: Number(commissionStats?.totalCommission || referralStats?.totalCommissionEarned || 0),
        pendingCommission: Number(commissionStats?.pendingCommission || referralStats?.pendingCommissions || 0),
        todayClicks: Number(commissionStats?.todayOrders || 0),
        todayConversions,
      };
    } catch {
      return getEmptyStats();
    }
  },

  // 获取专属推广链接
  async getMyLink(): Promise<string> {
    try {
      const result = await apiFetch<{ link: string }>('/referral/link');
      return result.link;
    } catch {
      const user = useAuthStore.getState().user;
      return user?.id ? `https://www.agentrix.top/?ref=${user.id}` : 'https://www.agentrix.top';
    }
  },

  // 获取我的推广链接列表 — 对接 GET /referral/links
  async getMyLinks(): Promise<ReferralLink[]> {
    try {
      const data = await apiFetch<any[]>('/referral/links');
      return (data || []).map((l: any) => ({
        id: l.id,
        name: l.title || l.targetName || 'Link',
        shortCode: l.shortCode,
        shortUrl: l.shortUrl,
        targetType: l.type || 'general',
        targetId: l.targetId,
        clicks: l.clicks || 0,
        conversions: l.conversions || 0,
        commission: l.totalCommission || 0,
        status: l.status || 'active',
        createdAt: l.createdAt,
      }));
    } catch {
      return [];
    }
  },

  // 创建推广短链 — 对接 POST /referral/links
  async createLink(params: {
    name: string;
    targetType: 'general' | 'product' | 'skill' | 'campaign';
    targetId?: string;
  }): Promise<ReferralLink> {
    try {
      const dto = {
        title: params.name,
        type: params.targetType,
        targetId: params.targetId,
        targetName: params.name,
      };
      const l = await apiFetch<any>('/referral/links', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      return {
        id: l.id,
        name: l.title || params.name,
        shortCode: l.shortCode,
        shortUrl: l.shortUrl,
        targetType: l.type || params.targetType,
        targetId: l.targetId || params.targetId,
        clicks: l.clicks || 0,
        conversions: l.conversions || 0,
        commission: l.totalCommission || 0,
        status: l.status || 'active',
        createdAt: l.createdAt || new Date().toISOString(),
      };
    } catch (e: any) {
      throw new Error(e?.message || 'Failed to create referral link');
    }
  },

  // 获取单条链接统计
  async getLinkStats(linkId: string): Promise<ReferralLink> {
    try {
      const links = await apiFetch<any[]>('/referral/links');
      const link = (links || []).find((item: any) => item.id === linkId);
      if (!link) {
        throw new Error('Referral link not found');
      }
      return {
        id: link.id,
        name: link.title || link.targetName || 'Link',
        shortCode: link.shortCode,
        shortUrl: link.shortUrl,
        targetType: link.type || 'general',
        targetId: link.targetId,
        clicks: link.clicks || 0,
        conversions: link.conversions || 0,
        commission: link.totalCommission || 0,
        status: link.status || 'active',
        createdAt: link.createdAt,
      };
    } catch (e: any) {
      throw new Error(e?.message || 'Failed to load referral link stats');
    }
  },

  // 暂停/恢复链接 — 对接 PUT /referral/links/:id/status
  async toggleLinkStatus(linkId: string, status: 'active' | 'paused'): Promise<{ success: boolean }> {
    try {
      await apiFetch(`/referral/links/${linkId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      return { success: true };
    } catch (e) {
      throw e;
    }
  },

  // 获取佣金规则
  getCommissionRules(): CommissionRule[] {
    return DEFAULT_RULES;
  },

  // 获取佣金统计 — 对接 GET /human-commissions/stats
  async getCommissionStats(): Promise<{
    totalCommission: number;
    settledCommission: number;
    pendingCommission: number;
    todayCommission: number;
    todayOrders: number;
    totalOrders: number;
    referralCount: number;
  }> {
    try {
      return await apiFetch('/human-commissions/stats');
    } catch {
      return {
        totalCommission: 0,
        settledCommission: 0,
        pendingCommission: 0,
        todayCommission: 0,
        todayOrders: 0,
        totalOrders: 0,
        referralCount: 0,
      };
    }
  },

  // 获取佣金明细列表 — 对接 GET /human-commissions
  async getCommissionList(page: number = 1, status?: string): Promise<{
    items: any[];
    total: number;
  }> {
    try {
      const qs = new URLSearchParams({ page: String(page) });
      if (status) qs.set('status', status);
      return await apiFetch(`/human-commissions?${qs}`);
    } catch {
      return { items: [], total: 0 };
    }
  },

  // 获取我推荐的用户 — 对接 GET /human-commissions/referrals
  async getReferralUsers(): Promise<any[]> {
    try {
      return await apiFetch('/human-commissions/referrals');
    } catch {
      return [];
    }
  },

  // 生成推广文案
  generateShareText(skill?: { name: string; price: number; priceUnit: string; shortUrl: string }): string {
    if (skill) {
      return `🔥 Check out "${skill.name}" on Agentrix — only $${skill.price}/${skill.priceUnit}!\n💰 Earn commission when friends buy through your link\n👉 ${skill.shortUrl}`;
    }
    return '🚀 Agentrix Commerce — AI Skills Marketplace\n🤖 100+ AI skills, pay-per-use\n💰 Earn 10% referral commission\n👉 https://agentrix.top/r/abc123';
  },
};
