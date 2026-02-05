// Strategic Plan Data Structure

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  progress: number; // 0-100
  assignedAgents: string[];
}

export interface StrategicGoal {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'revenue' | 'growth' | 'product' | 'operations';
  milestones: Milestone[];
  kpis: KPI[];
}

export interface KPI {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

export interface AgentTask {
  id: string;
  agentId: string;
  title: string;
  description: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  startedAt?: string;
  completedAt?: string;
  parentMilestoneId?: string;
}

export interface Command {
  id: string;
  from: 'ceo' | 'architect';
  to: string; // agent id or 'all'
  content: string;
  timestamp: string;
  status: 'sent' | 'received' | 'executing' | 'completed';
}

// Initial Strategic Plan
export const initialStrategicPlan: StrategicGoal[] = [
  {
    id: 'goal-1',
    title: 'Agentrix 产品上线',
    description: '完成 MVP 并获得首批用户',
    priority: 'critical',
    category: 'product',
    milestones: [
      {
        id: 'ms-1-1',
        title: 'HQ Console 完善',
        description: '完成指挥中心界面升级',
        dueDate: '2026-02-10',
        status: 'in_progress',
        progress: 30,
        assignedAgents: ['ARCHITECT-01', 'DEV-01'],
      },
      {
        id: 'ms-1-2',
        title: 'Agent 协作系统',
        description: '实现 Agent 间任务分配和协作',
        dueDate: '2026-02-15',
        status: 'pending',
        progress: 0,
        assignedAgents: ['ARCHITECT-01'],
      },
      {
        id: 'ms-1-3',
        title: '官网上线',
        description: '完成官网并部署',
        dueDate: '2026-02-20',
        status: 'pending',
        progress: 0,
        assignedAgents: ['DEV-01', 'CONTENT-01'],
      },
    ],
    kpis: [
      { id: 'kpi-1-1', name: '功能完成度', current: 30, target: 100, unit: '%', trend: 'up' },
      { id: 'kpi-1-2', name: 'Bug 数量', current: 5, target: 0, unit: '个', trend: 'down' },
    ],
  },
  {
    id: 'goal-2',
    title: '市场推广启动',
    description: '建立社交媒体影响力，获取早期用户',
    priority: 'high',
    category: 'growth',
    milestones: [
      {
        id: 'ms-2-1',
        title: 'Twitter 账号运营',
        description: '每日发布内容，增长粉丝',
        dueDate: '2026-02-28',
        status: 'in_progress',
        progress: 10,
        assignedAgents: ['MARKET-01', 'CONTENT-01'],
      },
      {
        id: 'ms-2-2',
        title: '首批用户获取',
        description: '获得 100 个注册用户',
        dueDate: '2026-03-15',
        status: 'pending',
        progress: 0,
        assignedAgents: ['SALES-01', 'MARKET-01'],
      },
    ],
    kpis: [
      { id: 'kpi-2-1', name: 'Twitter 粉丝', current: 0, target: 1000, unit: '人', trend: 'stable' },
      { id: 'kpi-2-2', name: '注册用户', current: 0, target: 100, unit: '人', trend: 'stable' },
    ],
  },
  {
    id: 'goal-3',
    title: '收入启动',
    description: '实现首笔收入',
    priority: 'high',
    category: 'revenue',
    milestones: [
      {
        id: 'ms-3-1',
        title: '定价策略制定',
        description: '确定产品定价和商业模式',
        dueDate: '2026-02-25',
        status: 'pending',
        progress: 0,
        assignedAgents: ['ARCHITECT-01'],
      },
      {
        id: 'ms-3-2',
        title: '支付系统集成',
        description: '集成 Stripe 支付',
        dueDate: '2026-03-01',
        status: 'pending',
        progress: 0,
        assignedAgents: ['DEV-01'],
      },
    ],
    kpis: [
      { id: 'kpi-3-1', name: '月收入', current: 0, target: 1000, unit: 'USD', trend: 'stable' },
      { id: 'kpi-3-2', name: '付费用户', current: 0, target: 10, unit: '人', trend: 'stable' },
    ],
  },
];

// Agent definitions
export const agentDefinitions = [
  {
    id: 'ARCHITECT-01',
    name: 'ARCHITECT-01',
    role: '首席架构师 / Agent CEO',
    description: '总体规划、技术决策、团队协调',
    capabilities: ['架构设计', '代码审查', '任务分配', '技术指导'],
    status: 'active' as const,
  },
  {
    id: 'DEV-01',
    name: 'DEV-01',
    role: '开发工程师',
    description: '功能开发、Bug修复、代码实现',
    capabilities: ['前端开发', '后端开发', 'API开发', '测试'],
    status: 'standby' as const,
  },
  {
    id: 'MARKET-01',
    name: 'MARKET-01',
    role: '市场营销',
    description: '社交媒体运营、内容营销、用户增长',
    capabilities: ['Twitter运营', '内容创作', '数据分析', '用户调研'],
    status: 'standby' as const,
  },
  {
    id: 'SALES-01',
    name: 'SALES-01',
    role: '销售拓展',
    description: '客户开发、商务合作、收入增长',
    capabilities: ['客户沟通', '商务谈判', '合作拓展', '收入分析'],
    status: 'standby' as const,
  },
  {
    id: 'CONTENT-01',
    name: 'CONTENT-01',
    role: '内容创作',
    description: '文案撰写、文档编写、品牌内容',
    capabilities: ['文案撰写', '技术文档', '社交内容', '品牌故事'],
    status: 'standby' as const,
  },
  {
    id: 'OPS-01',
    name: 'OPS-01',
    role: '运维工程师',
    description: '系统运维、部署管理、监控告警',
    capabilities: ['服务器管理', '部署自动化', '监控告警', '故障排查'],
    status: 'standby' as const,
  },
];
