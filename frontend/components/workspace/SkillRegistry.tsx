/**
 * Skill Registry 组件
 * 
 * 提供 Skill 的注册、版本管理、校验功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import { skillApi, Skill, CreateSkillDto, SkillCategory, SkillStatus, SkillValidationResult } from '../../lib/api/skill.api';
import { Package, Zap, Check, AlertCircle, Search, Filter, Plus, ExternalLink, ChevronRight } from 'lucide-react';

interface SkillRegistryProps {
  onSkillSelect?: (skill: Skill) => void;
  onSkillCreated?: (skill: Skill) => void;
}

interface SkillFormData {
  name: string;
  description: string;
  version: string;
  category: SkillCategory;
  inputSchema: string; // JSON string
  outputSchema: string; // JSON string
  executorType: 'http' | 'internal';
  executorEndpoint: string;
  executorMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  internalHandler: string;
}

const defaultFormData: SkillFormData = {
  name: '',
  description: '',
  version: '1.0.0',
  category: 'utility',
  inputSchema: JSON.stringify({
    type: 'object',
    properties: {
      query: { type: 'string', description: '查询参数' }
    },
    required: ['query']
  }, null, 2),
  outputSchema: JSON.stringify({
    type: 'object',
    properties: {
      result: { type: 'string', description: '返回结果' }
    }
  }, null, 2),
  executorType: 'internal',
  executorEndpoint: '',
  executorMethod: 'POST',
  internalHandler: 'echo'
};

export const SkillRegistry: React.FC<SkillRegistryProps> = ({
  onSkillSelect,
  onSkillCreated
}) => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<SkillFormData>(defaultFormData);
  const [validation, setValidation] = useState<SkillValidationResult | null>(null);
  const [filter, setFilter] = useState<{ category?: SkillCategory; status?: SkillStatus; search?: string }>({});

  // 加载 Skills 列表
  const loadSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await skillApi.list({
        ...filter,
        limit: 50
      });
      setSkills(response.items || []);
    } catch (err: any) {
      setError(err.message || '加载 Skills 失败');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  // 校验 Skill 定义
  const validateSkill = async () => {
    try {
      const dto = buildCreateDto();
      if (!dto) return;
      
      const result = await skillApi.validate(dto);
      setValidation(result);
    } catch (err: any) {
      setValidation({ valid: false, errors: [err.message] });
    }
  };

  // 构建创建 DTO
  const buildCreateDto = (): CreateSkillDto | null => {
    try {
      const inputSchema = JSON.parse(formData.inputSchema);
      const outputSchema = formData.outputSchema ? JSON.parse(formData.outputSchema) : undefined;

      return {
        name: formData.name,
        description: formData.description,
        version: formData.version,
        category: formData.category,
        inputSchema,
        outputSchema,
        executor: formData.executorType === 'http' 
          ? {
              type: 'http',
              endpoint: formData.executorEndpoint,
              method: formData.executorMethod
            }
          : {
              type: 'internal',
              internalHandler: formData.internalHandler
            }
      };
    } catch (err: any) {
      setError('JSON 格式错误: ' + err.message);
      return null;
    }
  };

  // 创建 Skill
  const createSkill = async () => {
    const dto = buildCreateDto();
    if (!dto) return;

    setLoading(true);
    setError(null);
    try {
      const response = await skillApi.create(dto);
      setSkills(prev => [response.data, ...prev]);
      setShowCreateForm(false);
      setFormData(defaultFormData);
      setValidation(null);
      onSkillCreated?.(response.data);
    } catch (err: any) {
      setError(err.message || '创建 Skill 失败');
    } finally {
      setLoading(false);
    }
  };

  // 发布 Skill
  const publishSkill = async (skill: Skill) => {
    try {
      const response = await skillApi.publish(skill.id);
      setSkills(prev => prev.map(s => s.id === skill.id ? response.data : s));
    } catch (err: any) {
      setError(err.message || '发布失败');
    }
  };

  return (
    <div className="skill-registry bg-slate-900 rounded-2xl shadow-2xl border border-white/10 text-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="text-blue-400" size={24} />
            Skill Registry
          </h2>
          <p className="text-xs text-slate-400 mt-1">管理 AX Skill 定义、版本与校验</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
            showCreateForm 
              ? 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10' 
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25'
          }`}
        >
          {showCreateForm ? '取消' : <><Plus size={18} /> 新建 Skill</>}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border-b border-red-500/20 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-400" />
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="p-6 bg-slate-800/30 border-b border-white/5 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Skill 名称</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all placeholder:text-slate-600"
                placeholder="如: search_products"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">版本号</label>
              <input
                type="text"
                value={formData.version}
                onChange={e => setFormData(prev => ({ ...prev, version: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">功能描述</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all resize-none"
              rows={2}
              placeholder="详细描述此 Skill 的功能，帮助 AI 更好地理解调用时机..."
            />
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">所属分类</label>
              <select
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as SkillCategory }))}
                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all appearance-none"
              >
                <option value="payment">Payment - 支付类</option>
                <option value="commerce">Commerce - 电商类</option>
                <option value="data">Data - 数据类</option>
                <option value="utility">Utility - 工具类</option>
                <option value="integration">Integration - 集成类</option>
                <option value="custom">Custom - 自定义</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">执行器类型</label>
              <select
                value={formData.executorType}
                onChange={e => setFormData(prev => ({ ...prev, executorType: e.target.value as 'http' | 'internal' }))}
                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all appearance-none"
              >
                <option value="internal">Internal Handler - 内部逻辑</option>
                <option value="http">HTTP Endpoint - 外部接口</option>
              </select>
            </div>
          </div>

          {formData.executorType === 'http' ? (
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Endpoint URL</label>
                <input
                  type="text"
                  value={formData.executorEndpoint}
                  onChange={e => setFormData(prev => ({ ...prev, executorEndpoint: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl outline-none text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="https://api.example.com/action"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Method</label>
                <select
                  value={formData.executorMethod}
                  onChange={e => setFormData(prev => ({ ...prev, executorMethod: e.target.value as any }))}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl outline-none text-white focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">内部处理器 (Handler)</label>
              <select
                value={formData.internalHandler}
                onChange={e => setFormData(prev => ({ ...prev, internalHandler: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl outline-none text-white focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="echo">echo - 回显测试</option>
                <option value="search_products">search_products - 搜索商品</option>
                <option value="create_order">create_order - 创建订单</option>
                <option value="get_balance">get_balance - 查询余额</option>
              </select>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Input Schema (JSON)</label>
            <textarea
              value={formData.inputSchema}
              onChange={e => setFormData(prev => ({ ...prev, inputSchema: e.target.value }))}
              className="w-full px-4 py-4 bg-slate-950 border border-white/5 rounded-xl font-mono text-xs text-blue-300 outline-none focus:ring-1 focus:ring-blue-500/50 leading-relaxed"
              rows={8}
            />
          </div>

          {/* Validation Result */}
          {validation && (
            <div className={`p-4 rounded-xl mb-6 border animate-in zoom-in-95 duration-200 ${validation.valid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              <div className="flex items-start gap-3">
                {validation.valid ? <Check size={20} className="mt-0.5" /> : <AlertCircle size={20} className="mt-0.5" />}
                <div>
                  <p className="font-bold">{validation.valid ? 'Skill 定义验证通过' : 'Skill 定义验证失败'}</p>
                  {validation.errors && validation.errors.length > 0 && (
                    <ul className="list-disc list-inside text-xs mt-2 space-y-1 opacity-80">
                      {validation.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={validateSkill}
              className="flex-1 px-6 py-3 bg-white/5 text-slate-300 rounded-xl hover:bg-white/10 border border-white/10 transition-all font-bold"
            >
              运行校验
            </button>
            <button
              onClick={createSkill}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all font-bold shadow-lg shadow-blue-500/25"
            >
              {loading ? '处理中...' : '确认创建 Skill'}
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 border-b border-white/5 flex gap-4 bg-slate-900/50">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="搜索 Skill 名称或描述..."
            value={filter.search || ''}
            onChange={e => setFilter(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl outline-none text-white text-sm focus:border-blue-500/50 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter.category || ''}
            onChange={e => setFilter(prev => ({ ...prev, category: e.target.value as SkillCategory || undefined }))}
            className="px-4 py-2 bg-slate-950 border border-white/10 rounded-xl outline-none text-white text-sm focus:border-blue-500/50 appearance-none"
          >
            <option value="">全部分类</option>
            <option value="payment">Payment</option>
            <option value="commerce">Commerce</option>
            <option value="utility">Utility</option>
          </select>
          <select
            value={filter.status || ''}
            onChange={e => setFilter(prev => ({ ...prev, status: e.target.value as SkillStatus || undefined }))}
            className="px-4 py-2 bg-slate-950 border border-white/10 rounded-xl outline-none text-white text-sm focus:border-blue-500/50 appearance-none"
          >
            <option value="">全部状态</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      {/* Skills List */}
      <div className="divide-y divide-white/5">
        {loading && skills.length === 0 ? (
          <div className="p-20 text-center text-slate-500">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            正在同步全球技能库...
          </div>
        ) : skills.length === 0 ? (
          <div className="p-20 text-center text-slate-500">
            <Package size={48} className="mx-auto mb-4 opacity-10" />
            <p className="text-lg font-medium text-slate-400">暂无 Skill 定义</p>
            <p className="text-sm mt-1">开始创建您的第一个 AX Skill 赋能 Agent</p>
            <button 
              onClick={() => setShowCreateForm(true)}
              className="mt-6 px-6 py-2 bg-white/5 border border-white/10 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              快速开始
            </button>
          </div>
        ) : (
          skills.map(skill => (
            <div 
              key={skill.id} 
              className="group p-6 hover:bg-white/[0.02] cursor-pointer transition-all border-l-4 border-transparent hover:border-blue-500"
              onClick={() => onSkillSelect?.(skill)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{skill.name}</h3>
                    <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase">v{skill.version}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      skill.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {skill.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2 max-w-2xl leading-relaxed">{skill.description}</p>
                  <div className="flex gap-6 mt-4 text-[11px] font-medium text-slate-500">
                    <span className="flex items-center gap-2"><Package size={14} className="text-slate-600" /> {skill.category}</span>
                    <span className="flex items-center gap-2"><Zap size={14} className="text-slate-600" /> {skill.callCount} 次成功调用</span>
                    <span className="flex items-center gap-2 text-amber-500/80">★ {skill.rating.toFixed(1)}</span>
                    <span className="flex items-center gap-2"><ChevronRight size={14} className="text-slate-600" /> ID: {skill.id.slice(0, 8)}...</span>
                  </div>
                </div>
                <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {skill.status === 'draft' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); publishSkill(skill); }}
                      className="px-4 py-2 text-xs bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-lg shadow-emerald-600/20"
                    >
                      发布到市场
                    </button>
                  )}
                  <button className="w-10 h-10 flex items-center justify-center bg-white/5 text-slate-400 rounded-xl hover:text-white hover:bg-white/10 border border-white/10 transition-all">
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SkillRegistry;
