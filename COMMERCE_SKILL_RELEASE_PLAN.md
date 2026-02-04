# Commerce Skill 完整发布方案

> 版本: 1.0 | 日期: 2026-02-01 | 状态: 可发布

## 一、发布状态清单

### ✅ 已完成项目

| 模块 | 状态 | 详情 |
|------|------|------|
| **数据库** | ✅ | `split_plans`, `budget_pools`, `milestones` 表已创建 |
| **后端API** | ✅ | Commerce Controller 完整实现 |
| **前端UI** | ✅ | 5个Commerce面板组件 |
| **智能合约** | ✅ | CommissionV2 + BudgetPool 已部署 |
| **引导系统** | ✅ | UsagePatternService 用户转化引导 |
| **文档** | ✅ | 佣金架构 + 转化漏斗文档 |

### 📋 合约部署信息

| 合约 | 网络 | 地址 | 部署时间 |
|------|------|------|----------|
| CommissionV2 | BNB Testnet | `0x1de9d3e3EFbF30f0846aBC07b684C7E675138827` | 2026-02-01 |
| BudgetPool | BNB Testnet | `0x8C8D25589b700D0F94b5Ad09aFacEB58595481c9` | 2026-02-01 |
| USDC Token | BNB Testnet | `0xc23453b4842FDc4360A0a3518E2C0f51a2069386` | - |

---

## 二、核心能力

### 2.1 Commerce Skill 功能列表

| 功能 | API端点 | 费率 | 描述 |
|------|---------|------|------|
| 创建分佣计划 | `POST /commerce/split-plans` | 0% | 定义多方分账规则 |
| 预览分配 | `POST /commerce/split-plans/:id/preview` | 0% | 计算分账预览 |
| 创建预算池 | `POST /commerce/budget-pools` | 0% | 多Agent协作预算管理 |
| 添加里程碑 | `POST /commerce/milestones` | 0% | 阶段性付款 |
| 执行支付 | `POST /commerce/execute` | 0~0.5% | 统一支付入口 |
| 提交里程碑 | `POST /commerce/milestones/:id/submit` | 0% | 执行者提交成果 |
| 审批里程碑 | `POST /commerce/milestones/:id/approve` | 0% | 审核者批准 |
| 释放资金 | `POST /commerce/milestones/:id/release` | 0.3% | 触发分账 |

### 2.2 费率结构

```
纯加密支付:     0%
+ 法币入金:    +0.1%
+ 法币出金:    +0.1%
+ 分账功能:    +0.3%
─────────────────
最高组合:      0.5%
```

---

## 三、用户转化系统

### 3.1 新增API端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/commerce/usage-stats` | GET | 获取用户使用统计 |
| `/commerce/conversion-hints` | GET | 获取个性化转化建议 |
| `/commerce/suggested-marketplace-config` | GET | 获取推荐的Marketplace配置 |
| `/commerce/dismiss-hint` | POST | 关闭特定提示 |

### 3.2 模式检测规则

| 规则名 | 触发条件 | 引导目标 |
|--------|----------|----------|
| `creator_split` | 分账角色包含creator/developer | 发布到Marketplace |
| `milestone_project` | 创建预算池+2个以上里程碑 | 发布项目制服务 |
| `subscription_model` | 检测到recurring参数 | 创建订阅商品 |
| `agent_task_distribution` | 3个以上不同Agent参与 | 创建Agent任务 |
| `high_frequency_user` | 7天内调用>=10次 | 推荐SDK接入 |
| `power_user` | 30天内调用>=50次 | 推荐企业方案 |

### 3.3 响应格式

```typescript
interface CommerceResponse<T> {
  success: boolean;
  data: T;
  hints?: {
    type: 'upgrade' | 'marketplace' | 'pattern' | 'welcome';
    priority: 'low' | 'medium' | 'high';
    message: string;
    messageZh: string;
    action: string;
    actionZh: string;
    link: string;
    suggestedConfig?: {
      productType?: string;
      fee?: string;
      splitRules?: Array<{ role: string; share: string }>;
    };
    dismissible: boolean;
  };
}
```

---

## 四、文件清单

### 4.1 后端文件

| 文件路径 | 描述 |
|----------|------|
| `backend/src/modules/commerce/commerce.service.ts` | 核心服务 |
| `backend/src/modules/commerce/commerce.controller.ts` | API控制器 |
| `backend/src/modules/commerce/commerce.module.ts` | 模块定义 |
| `backend/src/modules/commerce/split-plan.service.ts` | 分佣计划服务 |
| `backend/src/modules/commerce/budget-pool.service.ts` | 预算池服务 |
| `backend/src/modules/commerce/usage-pattern.service.ts` | **新增** 用户模式分析 |
| `backend/src/entities/split-plan.entity.ts` | 分佣计划实体 |
| `backend/src/entities/budget-pool.entity.ts` | 预算池实体 |
| `backend/src/entities/milestone.entity.ts` | 里程碑实体 |

### 4.2 前端文件

| 文件路径 | 描述 |
|----------|------|
| `frontend/components/agent/workspace/commerce/CommissionPreviewPanel.tsx` | 佣金预览 |
| `frontend/components/agent/workspace/commerce/SplitPlansPanel.tsx` | 分佣计划管理 |
| `frontend/components/agent/workspace/commerce/BudgetPoolsPanel.tsx` | 预算池管理 |
| `frontend/components/agent/workspace/commerce/TeamCollaborationPanel.tsx` | 团队协作 |
| `frontend/components/agent/workspace/commerce/SplitRulesPanel.tsx` | 分账规则 |

### 4.3 智能合约

| 文件路径 | 描述 |
|----------|------|
| `contract/contracts/CommissionV2.sol` | 统一佣金结算合约 |
| `contract/contracts/BudgetPool.sol` | 预算池管理合约 |
| `contract/scripts/deploy-CommissionV2.ts` | 部署脚本 |
| `contract/scripts/deploy-BudgetPool.ts` | 部署脚本 |

### 4.4 文档

| 文件路径 | 描述 |
|----------|------|
| `AGENTRIX_COMMISSION_ARCHITECTURE.md` | 佣金架构设计文档 |
| `COMMERCE_SKILL_CONVERSION_FUNNEL.md` | 用户转化漏斗设计 |
| `COMMERCE_SKILL_RELEASE_PLAN.md` | 本文档 |

---

## 五、SDK调用示例

### 5.1 创建分佣计划

```typescript
const sdk = new AgentrixSDK({ apiKey: 'xxx' });

// 创建分佣计划
const plan = await sdk.commerce.createSplitPlan({
  name: 'AI创作者分成计划',
  productType: 'virtual',
  rules: [
    { role: 'creator', shareBps: 7000, source: 'pool' },  // 70%
    { role: 'promoter', shareBps: 3000, source: 'pool' }, // 30%
  ],
  feeConfig: {
    onrampFeeBps: 10,   // 0.1%
    offrampFeeBps: 10,  // 0.1%
    splitFeeBps: 30,    // 0.3%
  },
});

console.log(`Plan created: ${plan.id}`);
```

### 5.2 创建预算池

```typescript
// 创建项目预算池
const pool = await sdk.commerce.createBudgetPool({
  name: '网站开发项目',
  totalBudget: 10000,  // 10000 USDC
  currency: 'USDC',
});

// 添加里程碑
await sdk.commerce.createMilestone({
  budgetPoolId: pool.id,
  name: '需求分析',
  amount: 2000,
  qualityGate: {
    minApprovals: 1,
    reviewers: ['0x...'],
  },
});

await sdk.commerce.createMilestone({
  budgetPoolId: pool.id,
  name: 'UI设计',
  amount: 3000,
});

// 注资
await sdk.commerce.fundBudgetPool(pool.id, { amount: 10000 });
```

### 5.3 获取转化建议

```typescript
// 获取个性化建议
const hints = await sdk.commerce.getConversionHints();

if (hints?.type === 'marketplace') {
  console.log(hints.messageZh);
  // "您正在使用创作者分成模式，发布到Marketplace可获得更多曝光"
  
  // 获取推荐配置
  const config = await sdk.commerce.getSuggestedMarketplaceConfig();
  console.log(config);
  // { productType: 'virtual', suggestedFee: '3%', splitRules: [...] }
}
```

---

## 六、发布检查清单

### 6.1 技术验证
- [x] 数据库表已创建
- [x] 后端API编译通过
- [x] 前端组件编译通过
- [x] 智能合约已部署
- [x] 引导服务已集成

### 6.2 集成测试（待完成）
- [x] 创建分佣计划 E2E 测试
- [x] 预算池完整流程测试
- [ ] 里程碑审批流程测试
- [x] 转化引导触发测试

### 6.3 生产部署前
- [ ] 合约部署到 BNB 主网
- [ ] 更新 backend/.env 合约地址
- [ ] 配置 Redis 替代内存缓存
- [ ] 监控和告警配置

---

## 七、下一步计划

1. **完成集成测试** - 已输出 Commerce E2E 报告
2. **前端引导UI** - 已在 Commerce 面板显示 hints 信息
3. **主网部署** - 审计后部署到 BNB 主网
4. **SDK发布** - 发布 sdk-js 新版本
5. **文档更新** - 更新开发者文档

---

*文档维护者: Agentrix Team | 最后更新: 2026-02-01*
