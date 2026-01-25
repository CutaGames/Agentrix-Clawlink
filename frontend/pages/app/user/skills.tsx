import React from 'react';
import Head from 'next/head';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useLocalization } from '../../../contexts/LocalizationContext';
import { SkillMarketplace } from '../../../src/components/workbench/SkillMarketplace';

export default function SkillsPage() {
  const { t } = useLocalization();

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>{t({ zh: '技能中心', en: 'Skill Center' })} - Agentrix</title>
      </Head>

      <div className="min-h-screen bg-[#0f1115] text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold mb-2">{t({ zh: '技能中心', en: 'Skill Center' })}</h1>
              <p className="text-neutral-400">
                {t({ 
                  zh: '管理和发现 AI Agent 的原子能力。这些技能可以被 ChatGPT、Claude 和您的个人 Agent 调用。', 
                  en: 'Manage and discover atomic capabilities for AI Agents. These skills can be called by ChatGPT, Claude, and your personal Agent.' 
                })}
              </p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold transition-all border border-white/5">
                {t({ zh: '我的技能', en: 'My Skills' })}
              </button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-500/20">
                {t({ zh: '发布技能', en: 'Publish Skill' })}
              </button>
            </div>
          </div>

          <SkillMarketplace />
        </div>
      </div>
    </DashboardLayout>
  );
}
