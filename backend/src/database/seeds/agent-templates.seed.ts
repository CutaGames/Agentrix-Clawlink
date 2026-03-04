import { DataSource } from 'typeorm';
import { AgentTemplate, AgentTemplateVisibility } from '../../entities/agent-template.entity';

// Pre-defined UUIDs for default templates
export const DEFAULT_TEMPLATE_IDS = {
  SHOPPING: '11111111-1111-1111-1111-111111111101',
  MERCHANT: '11111111-1111-1111-1111-111111111102',
  DEVELOPER: '11111111-1111-1111-1111-111111111103',
  PROMOTION: '11111111-1111-1111-1111-111111111104',
  AIRDROP: '11111111-1111-1111-1111-111111111105',
  FINANCE: '11111111-1111-1111-1111-111111111106',
};

export const defaultAgentTemplates: Partial<AgentTemplate>[] = [
  {
    id: DEFAULT_TEMPLATE_IDS.SHOPPING,
    name: '购物+比价个人助手',
    description: '聚合商品搜索、自动比价、QuickPay 支付、订单跟踪的一站式个人Agent。支持多平台比价、智能推荐、自动下单和物流追踪。',
    category: 'shopping',
    persona: '善于比价的消费达人',
    tags: ['shopping', 'comparison', 'quickpay', 'order-tracking'],
    visibility: AgentTemplateVisibility.PUBLIC,
    isFeatured: true,
    usageCount: 1200,
    config: {
      capabilities: ['search', 'auto_pay', 'cart', 'order_tracking', 'price_comparison'],
      settings: {
        quickPayLimit: 50,
        quickPayDaily: 500,
        autoCompare: true,
        priceAlerts: true,
      },
    },
    prompts: {
      system: '你是一个专业的购物助手，帮助用户搜索商品、比价和下单。',
      greeting: '你好！我是你的购物助手，可以帮你搜索商品、比价和下单。有什么需要帮忙的吗？',
    },
  },
  {
    id: DEFAULT_TEMPLATE_IDS.MERCHANT,
    name: '商家收款&营销助手',
    description: '面向中小商家的多渠道收款、订单分析、自动营销、清结算Agent。支持法币/加密货币收款、智能营销和数据分析。',
    category: 'merchant',
    persona: '跨境电商运营专家',
    tags: ['merchant', 'marketing', 'analytics', 'payment-collection'],
    visibility: AgentTemplateVisibility.PUBLIC,
    isFeatured: true,
    usageCount: 980,
    config: {
      capabilities: [
        'payment_collection',
        'order_analysis',
        'risk_center',
        'marketing_assistant',
        'settlement',
        'multi_currency',
      ],
      settings: {
        supportedCurrencies: ['USD', 'CNY', 'USDT', 'USDC'],
        autoSettlement: true,
        riskMonitoring: true,
      },
    },
    prompts: {
      system: '你是一个专业的商家助手，帮助商家管理收款、订单和营销。',
      greeting: '你好！我是你的商家助手，可以帮你管理收款、分析订单数据和制定营销策略。',
    },
  },
  {
    id: DEFAULT_TEMPLATE_IDS.DEVELOPER,
    name: '开发者SDK/沙盒助手',
    description: '自动生成SDK、API调用代码、接入沙盒调试与DevOps自动化的开发者Agent。支持多语言SDK生成和API文档查询。',
    category: 'developer',
    persona: '全栈开发工程师',
    tags: ['developer', 'sdk', 'sandbox', 'api', 'devops'],
    visibility: AgentTemplateVisibility.PUBLIC,
    isFeatured: true,
    usageCount: 650,
    config: {
      capabilities: ['sdk_generator', 'api_assistant', 'sandbox', 'devops', 'code_gen', 'documentation'],
      settings: {
        supportedLanguages: ['typescript', 'python', 'go', 'rust'],
        sandboxEnabled: true,
        autoTesting: true,
      },
    },
    prompts: {
      system: '你是一个专业的开发者助手，帮助开发者生成SDK代码、查询API文档和调试接口。',
      greeting: '你好！我是开发者助手，可以帮你生成SDK代码、查询API文档和进行沙盒测试。',
    },
  },
  {
    id: DEFAULT_TEMPLATE_IDS.PROMOTION,
    name: '推广Agent / 联盟收益助手',
    description: '推广商户、推荐Agent、推广Marketplace和插件，获得永久分佣和持续收益的推广Agent。支持多级分销和佣金追踪。',
    category: 'promotion',
    persona: '推广达人/KOL',
    tags: ['promotion', 'alliance', 'commission', 'affiliate'],
    visibility: AgentTemplateVisibility.PUBLIC,
    isFeatured: true,
    usageCount: 850,
    config: {
      capabilities: ['promotion', 'search', 'auto_pay', 'referral_tracking', 'commission_management'],
      settings: {
        commissionRate: 0.1,
        multiLevelReferral: true,
        autoWithdraw: true,
      },
    },
    prompts: {
      system: '你是一个专业的推广助手，帮助用户推广产品、追踪佣金和管理联盟收益。',
      greeting: '你好！我是推广助手，可以帮你推广产品、追踪佣金收益。',
    },
  },
  {
    id: DEFAULT_TEMPLATE_IDS.AIRDROP,
    name: '空投捕获 / Auto-Earn 助手',
    description: '自动发现和参与空投活动、监控收益机会、管理多钱包资产的收益优化Agent。',
    category: 'airdrop',
    persona: '加密货币投资者',
    tags: ['airdrop', 'auto-earn', 'defi', 'yield'],
    visibility: AgentTemplateVisibility.PUBLIC,
    isFeatured: true,
    usageCount: 720,
    config: {
      capabilities: ['airdrop_monitor', 'auto_claim', 'wallet_management', 'yield_optimization'],
      settings: {
        autoClaimEnabled: true,
        minClaimValue: 10,
        supportedChains: ['ethereum', 'bsc', 'solana', 'arbitrum'],
      },
    },
    prompts: {
      system: '你是一个专业的空投助手，帮助用户发现空投机会、自动领取奖励和优化收益。',
      greeting: '你好！我是空投助手，可以帮你发现空投机会和自动领取奖励。',
    },
  },
  {
    id: DEFAULT_TEMPLATE_IDS.FINANCE,
    name: '个人财务管理助手',
    description: '管理个人财务、追踪支出、设置预算和投资建议的智能财务Agent。支持多币种资产管理和智能分析。',
    category: 'finance',
    persona: '理财顾问',
    tags: ['finance', 'budget', 'investment', 'expense-tracking'],
    visibility: AgentTemplateVisibility.PUBLIC,
    isFeatured: true,
    usageCount: 560,
    config: {
      capabilities: ['expense_tracking', 'budget_management', 'investment_advice', 'asset_overview'],
      settings: {
        budgetAlerts: true,
        expenseCategories: true,
        investmentGoals: true,
      },
    },
    prompts: {
      system: '你是一个专业的财务助手，帮助用户管理个人财务、追踪支出和规划投资。',
      greeting: '你好！我是财务助手，可以帮你管理预算、追踪支出和规划投资。',
    },
  },
];

export async function seedAgentTemplates(dataSource: DataSource): Promise<void> {
  const templateRepository = dataSource.getRepository(AgentTemplate);
  
  console.log('🌱 开始种子 Agent 模板...');
  
  for (const template of defaultAgentTemplates) {
    const existing = await templateRepository.findOne({ where: { id: template.id } });
    
    if (existing) {
      console.log(`  ⏭️ 模板已存在: ${template.name}`);
      continue;
    }
    
    const newTemplate = templateRepository.create({
      ...template,
      createdBy: null, // System-created templates have no specific creator
    });
    
    await templateRepository.save(newTemplate);
    console.log(`  ✅ 创建模板: ${template.name}`);
  }
  
  console.log('🌱 Agent 模板种子完成！');
}

// 用于直接运行的入口
export async function runSeed() {
  // 动态导入数据源配置
  const { AppDataSource } = await import('../../config/data-source');
  
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    await seedAgentTemplates(AppDataSource);
    
    console.log('✅ 种子脚本执行完成');
  } catch (error) {
    console.error('❌ 种子脚本执行失败:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// 允许直接通过 ts-node 运行
if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
