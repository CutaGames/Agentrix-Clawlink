/**
 * Agent Team Configuration
 * 
 * 统一的 Agent 团队配置
 * 与 prompt-builder.service.ts 和 hq-ai.service.ts 保持一致
 */

export interface AgentConfig {
  code: string;
  name: string;
  role: string;
  skills: string[];
  priority: number;       // 1-10, 越高越优先
  maxConcurrent: number;  // 最大并发任务数
  costTier: 'high' | 'medium' | 'low';  // 成本等级
}

export const TEAM_CONFIG: AgentConfig[] = [
  {
    code: 'ARCHITECT-01',
    name: '首席架构师',
    role: 'architect',
    skills: ['system-design', 'code-review', 'tech-decision', 'team-lead'],
    priority: 10,
    maxConcurrent: 1,
    costTier: 'high',  // Claude Opus
  },
  {
    code: 'CODER-01',
    name: '高级开发工程师',
    role: 'developer',
    skills: ['coding', 'debugging', 'testing', 'refactoring', 'full-stack'],
    priority: 9,
    maxConcurrent: 3,
    costTier: 'medium',  // Claude Sonnet
  },
  {
    code: 'GROWTH-01',
    name: '增长黑客',
    role: 'growth',
    skills: ['seo', 'marketing', 'analytics', 'user-acquisition', 'conversion'],
    priority: 8,
    maxConcurrent: 2,
    costTier: 'low',  // Claude Haiku
  },
  {
    code: 'BD-01',
    name: '商务拓展',
    role: 'business',
    skills: ['partnership', 'negotiation', 'market-research', 'proposal'],
    priority: 7,
    maxConcurrent: 2,
    costTier: 'low',  // Claude Haiku
  },
  {
    code: 'ANALYST-01',
    name: '数据分析师',
    role: 'analyst',
    skills: ['data-analysis', 'reporting', 'market-intelligence', 'competitor-analysis'],
    priority: 6,
    maxConcurrent: 2,
    costTier: 'low',  // Gemini Flash
  },
  {
    code: 'SOCIAL-01',
    name: '社交媒体运营',
    role: 'social',
    skills: ['content-creation', 'community', 'twitter', 'discord', 'engagement'],
    priority: 5,
    maxConcurrent: 2,
    costTier: 'low',  // Gemini Flash
  },
  {
    code: 'CONTENT-01',
    name: '内容创作者',
    role: 'content',
    skills: ['writing', 'documentation', 'blog', 'tutorial', 'copywriting'],
    priority: 5,
    maxConcurrent: 2,
    costTier: 'low',  // Gemini Flash
  },
  {
    code: 'SUPPORT-01',
    name: '技术支持',
    role: 'support',
    skills: ['troubleshooting', 'user-support', 'faq', 'onboarding', 'github-issues'],
    priority: 4,
    maxConcurrent: 3,
    costTier: 'low',  // Groq
  },
  {
    code: 'SECURITY-01',
    name: '安全审计官',
    role: 'security',
    skills: ['security-audit', 'vulnerability-scan', 'compliance', 'dependency-check', 'credential-review'],
    priority: 6,
    maxConcurrent: 1,
    costTier: 'low',  // Gemini Flash
  },
  {
    code: 'DEVREL-01',
    name: '开发者关系',
    role: 'devrel',
    skills: ['developer-support', 'sdk-docs', 'integration', 'github-community', 'demo-creation'],
    priority: 5,
    maxConcurrent: 2,
    costTier: 'low',  // Gemini Flash
  },
  {
    code: 'LEGAL-01',
    name: '合规顾问',
    role: 'legal',
    skills: ['compliance', 'regulation', 'privacy-policy', 'terms-of-service', 'grant-review'],
    priority: 3,
    maxConcurrent: 1,
    costTier: 'low',  // Gemini Flash
  },
];

// 按优先级排序的 Agent 列表
export const AGENTS_BY_PRIORITY = [...TEAM_CONFIG].sort((a, b) => b.priority - a.priority);

// 按成本等级分组
export const AGENTS_BY_COST = {
  high: TEAM_CONFIG.filter(a => a.costTier === 'high'),
  medium: TEAM_CONFIG.filter(a => a.costTier === 'medium'),
  low: TEAM_CONFIG.filter(a => a.costTier === 'low'),
};

// 根据技能找到最合适的 Agent
export function findBestAgent(requiredSkills: string[]): AgentConfig | null {
  let bestMatch: AgentConfig | null = null;
  let bestScore = 0;

  for (const agent of AGENTS_BY_PRIORITY) {
    const matchCount = requiredSkills.filter(s => agent.skills.includes(s)).length;
    const score = matchCount * 10 + agent.priority;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = agent;
    }
  }

  return bestMatch;
}

// 预算限制配置
export const BUDGET_CONFIG = {
  dailyLimit: 25,           // $25/天
  warningThreshold: 0.8,    // 80% 时告警
  highCostLimit: 5,         // 高成本 Agent 每天最多 5 次
  mediumCostLimit: 20,      // 中成本 Agent 每天最多 20 次
  lowCostLimit: 50,         // 低成本 Agent 每天最多 50 次
};
