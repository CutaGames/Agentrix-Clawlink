import React, { useState, useEffect, useCallback } from 'react';
import { skillApi, Skill, SkillCategory } from '../../../lib/api/skill.api';
import { 
  Package, 
  Zap, 
  Search, 
  Filter, 
  Plus, 
  Star, 
  Download, 
  ShoppingCart, 
  Wallet, 
  TrendingUp, 
  Shield, 
  MessageSquare,
  ChevronRight,
  ExternalLink,
  Activity
} from 'lucide-react';
import { useLocalization } from '../../../contexts/LocalizationContext';
import SkillPublishModal from './SkillPublishModal';

const CATEGORIES = [
  { id: 'all', label: { zh: '全部', en: 'All' }, icon: Package },
  { id: 'payment', label: { zh: '支付', en: 'Payment' }, icon: Wallet },
  { id: 'commerce', label: { zh: '电商', en: 'Commerce' }, icon: ShoppingCart },
  { id: 'data', label: { zh: '数据', en: 'Data' }, icon: Activity },
  { id: 'utility', label: { zh: '工具', en: 'Utility' }, icon: Zap },
  { id: 'integration', label: { zh: '集成', en: 'Integration' }, icon: ExternalLink },
];

export const SkillMarketplace: React.FC = () => {
  const { t } = useLocalization();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const response = await skillApi.getMarketplaceSkills();
      setSkills(response.items);
    } catch (err: any) {
      setError(err.message || 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const filteredSkills = skills.filter(skill => {
    const matchesCategory = activeCategory === 'all' || skill.category === activeCategory;
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         skill.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const popularSkills = [...skills].sort((a, b) => b.callCount - a.callCount).slice(0, 3);

  const handlePublish = async (skillData: any) => {
    try {
      await skillApi.create(skillData);
      loadSkills();
    } catch (err: any) {
      console.error('Failed to publish skill:', err);
      alert('Failed to publish skill: ' + err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with Publish Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Skill Marketplace</h2>
          <p className="text-slate-400">Discover and integrate powerful capabilities for your agents</p>
        </div>
        <button 
          onClick={() => setIsPublishModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus size={20} />
          Publish Skill
        </button>
      </div>

      {/* 热门 Skill 栏 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {popularSkills.map((skill, idx) => (
          <div key={skill.id} className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden group hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all">
            <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform">
              <Zap size={100} />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded uppercase tracking-wider">Popular #{idx + 1}</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{skill.name}</h3>
            <p className="text-sm text-slate-400 line-clamp-2 mb-4">{skill.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Download size={14} /> {skill.callCount}</span>
                <span className="flex items-center gap-1"><Star size={14} className="text-yellow-500" /> {skill.rating}</span>
              </div>
              <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 分类与搜索 */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeCategory === cat.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                <Icon size={16} />
                {t(cat.label)}
              </button>
            );
          })}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder={t({ zh: '搜索技能...', en: 'Search skills...' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Skill 列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-48 bg-slate-800/50 rounded-xl animate-pulse border border-white/5" />
          ))
        ) : filteredSkills.length > 0 ? (
          filteredSkills.map(skill => (
            <div key={skill.id} className="bg-slate-900 border border-white/5 rounded-xl p-5 hover:border-blue-500/50 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-slate-800 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                  <Zap size={20} />
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Star size={12} className="text-yellow-500 fill-yellow-500" />
                  {skill.rating}
                </div>
              </div>
              <h4 className="font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{skill.name}</h4>
              <p className="text-xs text-slate-400 line-clamp-2 mb-4 h-8">{skill.description}</p>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{skill.category}</span>
                <button className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  {t({ zh: '查看详情', en: 'Details' })}
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center">
            <Package size={48} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-500">{t({ zh: '未找到相关技能', en: 'No skills found' })}</p>
          </div>
        )}
      </div>
      <SkillPublishModal 
        isOpen={isPublishModalOpen} 
        onClose={() => setIsPublishModalOpen(false)} 
        onPublish={handlePublish} 
      />    </div>
  );
};
