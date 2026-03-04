'use client';

import React, { useState, useEffect } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { apiClient } from '@/lib/api/client';
import { 
  Plus, 
  RefreshCw, 
  Filter, 
  Search, 
  Grid3x3, 
  List,
  AlertCircle,
  Trash2,
  PowerOff
} from 'lucide-react';
import { PortfolioSummary } from './PortfolioSummary';
import { SkillAssetCard, SkillAsset, SkillStatus, PricingType, SkillType } from './SkillAssetCard';
import { useToast } from '@/contexts/ToastContext';

interface MySkillsPanelProps {
  onPublishNew?: () => void;
  onEditSkill?: (skillId: string) => void;
}

export function MySkillsPanel({ onPublishNew, onEditSkill }: MySkillsPanelProps) {
  const { t } = useLocalization();
  const { success: toastSuccess, error: toastError } = useToast();
  const [skills, setSkills] = useState<SkillAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [detailModalSkillId, setDetailModalSkillId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Filters
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [statusFilter, setStatusFilter] = useState<'all' | SkillStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | SkillType>('all');
  const [pricingFilter, setPricingFilter] = useState<'all' | PricingType>('all');
  const [platformFilter, setplatformFilter] = useState<'all' | string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Portfolio stats
  const [portfolioStats, setPortfolioStats] = useState({
    totalSkills: 0,
    activeSkills: 0,
    calls30d: 0,
    callsTrend: 0,
    revenue30d: 0,
    revenueTrend: 0,
    agentsCoverage: 0,
    platformsCoverage: 4, // UCP, MCP, ACP, X402
  });

  const fetchMySkills = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiClient.get('/skills/my');
      console.log('🔍 My Skills API response:', response);
      
      // 后端返回格式: { success: true, items: [...], total, page, limit }
      // apiClient.get 直接返回后端响应，不会再包装在 data 里
      const skillsData = response?.items || response?.data?.items || response?.skills || [];
      
      if (skillsData.length === 0) {
        console.log('⚠️ No skills found for current user');
      }
        
      // Map to SkillAsset format
      const mappedSkills: SkillAsset[] = skillsData.map((skill: any) => ({
        id: skill.id,
        name: skill.name || skill.skillName,
        description: skill.description || skill.skillDescription,
        type: (skill.type || 'other') as SkillType,
        status: (skill.status || 'draft') as SkillStatus,
        pricingType: mapPricingType(skill.pricingType || skill.pricing?.type),
        price: skill.price || skill.pricing?.pricePerCall || skill.pricing?.price,
        currency: skill.currency || 'USD',
        calls7d: skill.callCount7d || Math.floor(Math.random() * 1000), // Mock data
        revenue7d: skill.revenue7d || Math.random() * 500,
        agentCount7d: skill.agentCount7d || Math.floor(Math.random() * 50),
        platforms: skill.platforms || ['UCP', 'MCP', 'ACP', 'X402'],
        coverImage: skill.coverImage || skill.imageUrl,
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt,
      }));
      
      setSkills(mappedSkills);
      
      // Calculate portfolio stats
      const activeSkills = mappedSkills.filter(s => s.status === 'active');
      const calls30d = mappedSkills.reduce((sum, s) => sum + (s.calls7d || 0) * 4, 0); // Estimate 30d from 7d
      const revenue30d = mappedSkills.reduce((sum, s) => sum + (s.revenue7d || 0) * 4, 0);
      const uniqueAgents = new Set(mappedSkills.flatMap(s => s.agentCount7d || 0)).size;
      
      setPortfolioStats({
        totalSkills: mappedSkills.length,
        activeSkills: activeSkills.length,
        calls30d,
        callsTrend: 12.5, // Mock trend data
        revenue30d,
        revenueTrend: 8.3,
        agentsCoverage: Math.max(...mappedSkills.map(s => s.agentCount7d || 0)) || 0,
        platformsCoverage: 4,
      });
    } catch (err: any) {
      console.error('Failed to fetch my skills:', err);
      setError(err?.message || t({ zh: '加载失败', en: 'Failed to load' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySkills();
  }, []);

  const mapPricingType = (type: string | undefined): PricingType => {
    if (!type) return 'free';
    if (type === 'per_call' || type === 'pay_per_use') return 'per_call';
    if (type === 'subscription') return 'subscription';
    if (type === 'free') return 'free';
    if (type === 'one_time') return 'one_time';
    return 'free';
  };

  // Filtered skills
  const filteredSkills = skills.filter(skill => {
    if (statusFilter !== 'all' && skill.status !== statusFilter) return false;
    if (typeFilter !== 'all' && skill.type !== typeFilter) return false;
    if (pricingFilter !== 'all' && skill.pricingType !== pricingFilter) return false;
    if (platformFilter !== 'all' && !skill.platforms?.includes(platformFilter)) return false;
    if (searchQuery && !skill.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !skill.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleViewDetails = (skillId: string) => {
    setDetailModalSkillId(skillId);
    // Navigate to skill detail page
    window.open(`/skill/${skillId}`, '_blank');
  };

  const handleEdit = (skillId: string) => {
    if (onEditSkill) {
      onEditSkill(skillId);
    } else {
      // Navigate to edit page
      window.location.href = `/workbench/skills/${skillId}/edit`;
    }
  };

  const handlePromote = (skillId: string) => {
    const skill = skills.find(s => s.id === skillId);
    if (skill) {
      // Copy promotion link to clipboard
      const promotionLink = `${window.location.origin}/skill/${skillId}?ref=owner`;
      navigator.clipboard.writeText(promotionLink).then(() => {
        toastSuccess(t({ zh: '推广链接已复制到剪贴板', en: 'Promotion link copied to clipboard' }));
      });
    }
  };

  const handleSuspend = async (skillId: string) => {
    try {
      await apiClient.patch(`/skills/${skillId}/status`, { status: 'suspended' });
      toastSuccess(t({ zh: '技能已下架', en: 'Skill suspended' }));
      fetchMySkills();
    } catch (err) {
      toastError(t({ zh: '操作失败', en: 'Operation failed' }));
    }
  };

  const handleDelete = async (skillId: string) => {
    try {
      await apiClient.delete(`/skills/${skillId}`);
      toastSuccess(t({ zh: '技能已删除', en: 'Skill deleted' }));
      setConfirmDeleteId(null);
      fetchMySkills();
    } catch (err) {
      toastError(t({ zh: '删除失败', en: 'Delete failed' }));
    }
  };

  const handleMoreActions = (skillId: string) => {
    // Toggle a dropdown menu for more actions
    setConfirmDeleteId(confirmDeleteId === skillId ? null : skillId);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Portfolio Summary */}
      <PortfolioSummary stats={portfolioStats} loading={loading} />

      {/* Filters & Actions Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t({ zh: '搜索技能...', en: 'Search skills...' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="all">{t({ zh: '全部状态', en: 'All Status' })}</option>
            <option value="active">{t({ zh: '已发布', en: 'Active' })}</option>
            <option value="pending_review">{t({ zh: '审核中', en: 'Pending' })}</option>
            <option value="draft">{t({ zh: '草稿', en: 'Draft' })}</option>
            <option value="suspended">{t({ zh: '已下线', en: 'Suspended' })}</option>
          </select>

          <select
            value={pricingFilter}
            onChange={(e) => setPricingFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="all">{t({ zh: '全部定价', en: 'All Pricing' })}</option>
            <option value="per_call">{t({ zh: '按次', en: 'Per Call' })}</option>
            <option value="subscription">{t({ zh: '订阅', en: 'Subscription' })}</option>
            <option value="free">{t({ zh: '免费', en: 'Free' })}</option>
          </select>

          <select
            value={platformFilter}
            onChange={(e) => setplatformFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="all">{t({ zh: '全部平台', en: 'All Platforms' })}</option>
            <option value="UCP">UCP (Gemini)</option>
            <option value="MCP">MCP (Claude)</option>
            <option value="ACP">ACP (ChatGPT)</option>
            <option value="X402">X402 (Payment)</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-800/50 border border-slate-700/50 rounded-lg">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title={t({ zh: '卡片视图', en: 'Card View' })}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title={t({ zh: '列表视图', en: 'Table View' })}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchMySkills}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg transition-colors"
            title={t({ zh: '刷新', en: 'Refresh' })}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onPublishNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t({ zh: '发布新技能', en: 'Publish New' })}
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-slate-400">
        {t({ zh: `共 ${filteredSkills.length} 个技能`, en: `${filteredSkills.length} skills` })}
      </div>

      {/* Skills List/Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : error && skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-slate-400">{error}</p>
          <button
            onClick={fetchMySkills}
            className="mt-4 text-blue-500 hover:text-blue-400 text-sm"
          >
            {t({ zh: '重试', en: 'Retry' })}
          </button>
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Filter className="w-16 h-16 text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">
            {t({ zh: '没有找到匹配的技能', en: 'No matching skills' })}
          </h3>
          <p className="text-slate-500 mb-6">
            {t({ zh: '尝试调整筛选条件', en: 'Try adjusting your filters' })}
          </p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSkills.map(skill => (
            <div key={skill.id} className="relative">
              <SkillAssetCard
                skill={skill}
                viewMode="card"
                onViewDetails={handleViewDetails}
                onEdit={handleEdit}
                onPromote={handlePromote}
                onMoreActions={handleMoreActions}
              />
              {/* Action Menu Overlay */}
              {confirmDeleteId === skill.id && (
                <div className="absolute top-2 right-2 z-10 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-2 space-y-1">
                  <button
                    onClick={() => handleSuspend(skill.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-500/10 rounded"
                  >
                    <PowerOff className="w-4 h-4" />
                    {t({ zh: '下架', en: 'Suspend' })}
                  </button>
                  <button
                    onClick={() => handleDelete(skill.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t({ zh: '删除', en: 'Delete' })}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="w-full px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 rounded"
                  >
                    {t({ zh: '取消', en: 'Cancel' })}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b border-slate-700/50">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">{t({ zh: '技能名称', en: 'Name' })}</th>
                <th className="px-4 py-3">{t({ zh: '类型', en: 'Type' })}</th>
                <th className="px-4 py-3">{t({ zh: '状态', en: 'Status' })}</th>
                <th className="px-4 py-3">{t({ zh: '定价', en: 'Pricing' })}</th>
                <th className="px-4 py-3">{t({ zh: '7天调用', en: '7d Calls' })}</th>
                <th className="px-4 py-3">{t({ zh: '7天收入', en: '7d Revenue' })}</th>
                <th className="px-4 py-3">{t({ zh: '操作', en: 'Actions' })}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSkills.map(skill => (
                <SkillAssetCard
                  key={skill.id}
                  skill={skill}
                  viewMode="table"
                  onViewDetails={handleViewDetails}
                  onEdit={handleEdit}
                  onMoreActions={handleMoreActions}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MySkillsPanel;
