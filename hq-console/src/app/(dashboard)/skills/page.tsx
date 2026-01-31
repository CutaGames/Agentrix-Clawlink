/**
 * Skills Page
 * 
 * 技能包管理页面
 */
'use client';

import { useState, useEffect } from 'react';

interface Skill {
  id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  status: string;
  usageCount: number;
  successRate: number;
  capabilities: string[];
}

interface SkillStats {
  total: number;
  byCategory: Record<string, number>;
  topUsed: Skill[];
}

const categoryColors: Record<string, string> = {
  development: 'bg-blue-500',
  analysis: 'bg-green-500',
  communication: 'bg-purple-500',
  management: 'bg-orange-500',
  creativity: 'bg-pink-500',
  automation: 'bg-cyan-500',
  integration: 'bg-indigo-500',
  research: 'bg-yellow-500',
};

const categoryIcons: Record<string, string> = {
  development: '💻',
  analysis: '📊',
  communication: '💬',
  management: '📋',
  creativity: '🎨',
  automation: '⚡',
  integration: '🔗',
  research: '🔍',
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [stats, setStats] = useState<SkillStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState('');
  const [testing, setTesting] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_HQ_API_URL || 'http://localhost:3005/api';

  useEffect(() => {
    fetchSkills();
    fetchStats();
  }, []);

  const fetchSkills = async () => {
    try {
      const res = await fetch(`${API_BASE}/hq/skills`);
      const data = await res.json();
      if (data.success) {
        setSkills(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/hq/skills/stats`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const testSkill = async () => {
    if (!selectedSkill || !testInput) return;
    
    setTesting(true);
    setTestResult('');
    
    try {
      const res = await fetch(`${API_BASE}/hq/skills/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillCode: selectedSkill.code,
          input: testInput,
        }),
      });
      const data = await res.json();
      setTestResult(data.success ? data.data.output : `Error: ${data.message}`);
    } catch (error) {
      setTestResult(`Error: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🛠️ 技能包管理</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">管理 Agent 可用的技能和能力</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          + 添加技能
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-gray-600 dark:text-gray-400">总技能数</div>
          </div>
          {Object.entries(stats.byCategory).slice(0, 3).map(([cat, count]) => (
            <div key={cat} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{count}</div>
              <div className="text-gray-600 dark:text-gray-400 capitalize">{categoryIcons[cat]} {cat}</div>
            </div>
          ))}
        </div>
      )}

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skills.map(skill => (
          <div
            key={skill.id}
            className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow cursor-pointer transition hover:shadow-lg ${
              selectedSkill?.id === skill.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedSkill(skill)}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-2xl">{categoryIcons[skill.category] || '📦'}</span>
                <h3 className="font-semibold text-gray-900 dark:text-white mt-1">{skill.name}</h3>
                <code className="text-xs text-gray-500 dark:text-gray-400">{skill.code}</code>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full text-white ${
                skill.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
              }`}>
                {skill.status}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
              {skill.description}
            </p>

            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              <span>使用: {skill.usageCount}次</span>
              <span>成功率: {(skill.successRate * 100).toFixed(0)}%</span>
            </div>

            {skill.capabilities && skill.capabilities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {skill.capabilities.slice(0, 3).map(cap => (
                  <span key={cap} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    {cap}
                  </span>
                ))}
                {skill.capabilities.length > 3 && (
                  <span className="px-2 py-0.5 text-gray-400 text-xs">
                    +{skill.capabilities.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Test Panel */}
      {selectedSkill && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🧪 测试技能: {selectedSkill.name}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                输入内容
              </label>
              <textarea
                className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={3}
                placeholder="输入要处理的内容..."
                value={testInput}
                onChange={e => setTestInput(e.target.value)}
              />
            </div>
            
            <button
              onClick={testSkill}
              disabled={testing || !testInput}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
            >
              {testing ? '⏳ 执行中...' : '▶️ 执行技能'}
            </button>

            {testResult && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  执行结果
                </label>
                <pre className="w-full p-3 bg-gray-50 dark:bg-gray-900 border rounded-lg overflow-auto max-h-64 text-sm">
                  {testResult}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
