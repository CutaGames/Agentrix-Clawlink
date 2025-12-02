# PayMind 第一阶段开发待办清单 V1.0

**制定日期**: 2025-01-XX  
**目标**: 统一支付 + 个人Agent + 商家Agent + 开发者Agent + 联盟生态  
**预计时间**: 8-10周

---

## 📊 当前完成度总览

| 模块 | 当前完成度 | 第一阶段目标 | 待完成工作 |
|------|----------|------------|----------|
| **统一支付** | 70% | 90% | 手续费估算、风险模型、QuickPay增强 |
| **个人Agent** | 60% | 85% | 支付助手、消费管理、智能购物 |
| **商家Agent** | 50% | 85% | 订单处理自动化、财务结算、Webhook自动化 |
| **开发者Agent** | 30% | 80% | 代码生成增强、API文档生成、SDK工具链 |
| **联盟生态** | 60% | 85% | 前端界面、多级分佣、推广系统完善 |

---

## 1. 统一支付系统完善 ⭐⭐⭐ P0

### 1.1 支付路由增强（2周）

#### 手续费估算模型
- [ ] **实现手续费估算服务** (`FeeEstimationService`)
  - 计算各通道手续费（Stripe、钱包、X402、跨链桥接）
  - 实时Gas费估算（EVM、Solana）
  - 汇率转换成本计算
  - 位置：`backend/src/modules/payment/fee-estimation.service.ts`

- [ ] **手续费展示优化**
  - 前端显示各支付方式总成本（含手续费）
  - 手续费明细展示
  - 最优支付方式推荐（基于总成本）
  - 位置：`paymindfrontend/components/payment/PaymentMethodSelector.tsx`

#### 风险评分模型
- [ ] **实现风险评分服务** (`RiskAssessmentService`)
  - 交易风险评分算法（0-100分）
  - 风险因子：金额、频率、KYC状态、历史交易、IP地址
  - 高风险交易拦截或二次确认
  - 位置：`backend/src/modules/payment/risk-assessment.service.ts`

- [ ] **风险提示前端**
  - 高风险交易提示
  - 二次确认流程
  - 位置：`paymindfrontend/components/payment/RiskWarning.tsx`

#### 统一支付API封装
- [ ] **创建TransactionFoundationService**
  - 统一支付路由API
  - 整合现有PaymentService逻辑
  - 提供统一的支付接口给Agent调用
  - 位置：`backend/src/modules/foundation/transaction-foundation.service.ts`

**数据库设计**:
```sql
-- 手续费估算记录
CREATE TABLE fee_estimations (
  id UUID PRIMARY KEY,
  payment_method VARCHAR(50),
  amount DECIMAL(18,2),
  currency VARCHAR(3),
  estimated_fee DECIMAL(18,2),
  fee_breakdown JSONB,
  created_at TIMESTAMP
);

-- 风险评分记录
CREATE TABLE risk_assessments (
  id UUID PRIMARY KEY,
  payment_id UUID,
  risk_score DECIMAL(5,2),
  risk_factors JSONB,
  decision VARCHAR(50), -- 'approve', 'review', 'reject'
  created_at TIMESTAMP
);
```

### 1.2 QuickPay增强（1周）

- [ ] **QuickPay授权管理增强**
  - 授权状态实时查询
  - 授权限额动态调整
  - 授权撤销流程优化
  - 位置：`backend/src/modules/payment/quick-pay.service.ts`

- [ ] **QuickPay自动选择逻辑**
  - 支付时自动选择已授权的QuickPay方式
  - 优先使用X402（如果已授权）
  - 自动选择最便宜的授权方式
  - 位置：`backend/src/modules/payment/payment.service.ts`

- [ ] **QuickPay前端界面**
  - 授权管理页面
  - 授权状态展示
  - 一键授权流程
  - 位置：`paymindfrontend/pages/app/user/quick-pay.tsx`

### 1.3 支付体验优化（1周）

- [ ] **支付进度实时更新**
  - WebSocket支付状态推送
  - 支付步骤可视化
  - 位置：`paymindfrontend/components/payment/PaymentProgress.tsx`

- [ ] **支付失败重试机制**
  - 自动重试逻辑
  - 失败原因分析
  - 位置：`backend/src/modules/payment/payment-retry.service.ts`

- [ ] **支付成功页面优化**
  - 订单详情展示
  - 分享功能
  - 继续购物引导
  - 位置：`paymindfrontend/pages/pay/success.tsx`

---

## 2. 个人Agent功能完善 ⭐⭐⭐ P0

### 2.1 支付助手能力（2周）

#### KYC复用（One-KYC）
- [ ] **KYC状态查询服务**
  - 查询用户KYC级别
  - 查询商户KYC要求
  - 判断是否需要重新KYC
  - 位置：`backend/src/modules/user-agent/kyc-reuse.service.ts`

- [ ] **KYC复用前端**
  - KYC状态展示
  - 自动复用提示
  - 位置：`paymindfrontend/components/agent/user/KYCStatus.tsx`

#### 商家可信度验证
- [ ] **商家信誉服务**
  - 商家信誉评分查询
  - 交易历史统计
  - 投诉记录查询
  - 位置：`backend/src/modules/user-agent/merchant-trust.service.ts`

- [ ] **商家可信度展示**
  - 信誉评分展示
  - 风险提示
  - 位置：`paymindfrontend/components/agent/user/MerchantTrust.tsx`

#### 自动填写支付信息
- [ ] **支付信息记忆服务**
  - 保存用户常用支付信息
  - 自动填充支付表单
  - 位置：`backend/src/modules/user-agent/payment-memory.service.ts`

- [ ] **自动填充前端**
  - 支付表单自动填充
  - 地址簿管理
  - 位置：`paymindfrontend/components/payment/AutoFillForm.tsx`

### 2.2 消费与订阅管理（2周）

#### 订阅识别与管理
- [ ] **订阅识别服务**
  - 自动识别定期交易（订阅）
  - 订阅分类（Netflix、Spotify等）
  - 订阅到期提醒
  - 位置：`backend/src/modules/user-agent/subscription-detector.service.ts`

- [ ] **订阅管理前端**
  - 订阅列表展示
  - 订阅详情
  - 取消订阅功能
  - 位置：`paymindfrontend/pages/app/user/subscriptions.tsx`

#### 预算设置与管理
- [ ] **预算管理服务**
  - 预算设置（按类别、按月）
  - 预算使用情况统计
  - 预算超额提醒
  - 位置：`backend/src/modules/user-agent/budget-manager.service.ts`

- [ ] **预算管理前端**
  - 预算设置界面
  - 预算使用情况图表
  - 超额提醒
  - 位置：`paymindfrontend/pages/app/user/budget.tsx`

#### 交易自动分类
- [ ] **交易分类器服务**
  - AI交易分类（收入/支出、类别、标签）
  - 规则引擎分类
  - 用户手动纠正学习
  - 位置：`backend/src/modules/user-agent/transaction-classifier.service.ts`

- [ ] **分类账本前端**
  - 交易分类展示
  - 分类统计图表
  - 手动分类编辑
  - 位置：`paymindfrontend/pages/app/user/ledger.tsx`

**数据库设计**:
```sql
-- 订阅记录
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID,
  merchant_name VARCHAR(255),
  amount DECIMAL(18,2),
  currency VARCHAR(3),
  frequency VARCHAR(50), -- 'monthly', 'yearly', etc.
  next_billing_date DATE,
  status VARCHAR(50), -- 'active', 'cancelled', 'expired'
  created_at TIMESTAMP
);

-- 预算设置
CREATE TABLE budgets (
  id UUID PRIMARY KEY,
  user_id UUID,
  category VARCHAR(100),
  amount DECIMAL(18,2),
  period VARCHAR(50), -- 'monthly', 'yearly'
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP
);

-- 交易分类
CREATE TABLE transaction_classifications (
  id UUID PRIMARY KEY,
  transaction_id UUID,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  tags TEXT[],
  confidence DECIMAL(5,2),
  classified_at TIMESTAMP
);
```

### 2.3 智能购物能力（1周）

#### 价格监控
- [ ] **价格监控服务**
  - 商品价格跟踪
  - 价格变化通知
  - 历史价格查询
  - 位置：`backend/src/modules/user-agent/price-monitor.service.ts`

#### 自动比价
- [ ] **比价服务**
  - 多平台价格对比
  - 最优价格推荐
  - 位置：`backend/src/modules/user-agent/price-comparison.service.ts`

#### 诈骗识别
- [ ] **诈骗检测服务**
  - 高风险商家识别
  - 可疑交易检测
  - 位置：`backend/src/modules/user-agent/fraud-detection.service.ts`

---

## 3. 商家Agent功能完善 ⭐⭐⭐ P0

### 3.1 订单处理自动化（2周）

#### Webhook自动化
- [ ] **Webhook处理服务增强**
  - 自动处理订单Webhook
  - 订单状态自动更新
  - 错误重试机制
  - 位置：`backend/src/modules/merchant/webhook-handler.service.ts`

- [ ] **Webhook配置管理**
  - Webhook URL配置
  - 事件订阅管理
  - Webhook测试工具
  - 位置：`paymindfrontend/pages/app/merchant/webhooks.tsx`

#### 自动发货
- [ ] **自动发货服务**
  - 支付成功后自动发货
  - 虚拟商品自动核销
  - 实物商品发货单生成
  - 位置：`backend/src/modules/merchant/auto-fulfillment.service.ts`

- [ ] **发货管理前端**
  - 发货列表
  - 批量发货
  - 发货单打印
  - 位置：`paymindfrontend/pages/app/merchant/fulfillment.tsx`

#### 自动核销
- [ ] **核销服务**
  - 会员卡自动开通
  - 充值自动到账
  - 服务自动激活
  - 位置：`backend/src/modules/merchant/auto-redemption.service.ts`

### 3.2 财务结算能力（2周）

#### 多链统一账户
- [ ] **多链账户聚合服务**
  - 聚合多链收款地址
  - 统一账户余额查询
  - 位置：`backend/src/modules/merchant/multi-chain-account.service.ts`

- [ ] **账户管理前端**
  - 多链账户展示
  - 账户余额统计
  - 位置：`paymindfrontend/pages/app/merchant/accounts.tsx`

#### 自动对账
- [ ] **对账服务**
  - 自动对账（T+0/T+1/T+7）
  - 对账差异检测
  - 对账报表生成
  - 位置：`backend/src/modules/merchant/reconciliation.service.ts`

- [ ] **对账前端**
  - 对账记录查询
  - 对账差异展示
  - 对账报表下载
  - 位置：`paymindfrontend/pages/app/merchant/reconciliation.tsx`

#### 结算规则配置
- [ ] **结算规则服务**
  - 结算周期配置
  - 结算货币选择
  - 自动转换规则（USDC → EUR）
  - 位置：`backend/src/modules/merchant/settlement-rules.service.ts`

- [ ] **结算配置前端**
  - 结算规则设置
  - 结算历史查询
  - 位置：`paymindfrontend/pages/app/merchant/settlement.tsx`

**数据库设计**:
```sql
-- 多链账户
CREATE TABLE merchant_multi_chain_accounts (
  id UUID PRIMARY KEY,
  merchant_id UUID,
  chain VARCHAR(50),
  address VARCHAR(255),
  balance DECIMAL(18,2),
  currency VARCHAR(3),
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP
);

-- 对账记录
CREATE TABLE reconciliation_records (
  id UUID PRIMARY KEY,
  merchant_id UUID,
  reconciliation_date DATE,
  total_amount DECIMAL(18,2),
  matched_amount DECIMAL(18,2),
  unmatched_amount DECIMAL(18,2),
  status VARCHAR(50), -- 'pending', 'matched', 'unmatched'
  created_at TIMESTAMP
);

-- 结算规则
CREATE TABLE settlement_rules (
  id UUID PRIMARY KEY,
  merchant_id UUID,
  settlement_cycle VARCHAR(50), -- 'T+0', 'T+1', 'T+7'
  target_currency VARCHAR(3),
  auto_convert BOOLEAN,
  created_at TIMESTAMP
);
```

### 3.3 商品知识库（1周）

- [ ] **知识库抽取服务**
  - 从商品描述提取知识
  - 商品特征识别
  - 适用场景分析
  - 位置：`backend/src/modules/merchant/product-knowledge.service.ts`

- [ ] **知识库用于自动客服**
  - 基于知识库的自动回答
  - 商品推荐
  - 位置：`backend/src/modules/merchant/merchant-ai-customer.service.ts`

---

## 4. 开发者Agent功能完善 ⭐⭐ P0-P1

### 4.1 代码生成增强（2周）

#### 前端组件生成
- [ ] **组件生成服务**
  - 根据需求生成React组件
  - 支付按钮组件
  - KYC页面组件
  - 位置：`backend/src/modules/developer/component-generator.service.ts`

- [ ] **组件预览和下载**
  - 代码预览
  - 组件下载
  - 位置：`paymindfrontend/components/agent/developer/ComponentGenerator.tsx`

#### API代码生成增强
- [ ] **多框架支持**
  - NestJS代码生成
  - Express代码生成
  - FastAPI代码生成
  - 位置：`backend/src/modules/developer/api-generator.service.ts`

#### SDK代码生成
- [ ] **SDK生成服务**
  - TypeScript SDK生成
  - Python SDK生成
  - JavaScript SDK生成
  - 位置：`backend/src/modules/developer/sdk-generator.service.ts`

### 4.2 API文档自动生成（1周）

- [ ] **OpenAPI文档生成**
  - 自动生成OpenAPI规范
  - Swagger UI集成
  - 位置：`backend/src/modules/developer/api-doc-generator.service.ts`

- [ ] **多语言示例生成**
  - TypeScript示例
  - Python示例
  - JavaScript示例
  - 位置：`backend/src/modules/developer/example-generator.service.ts`

### 4.3 开发者工具链（1周）

- [ ] **CI/CD脚本生成**
  - GitHub Actions配置生成
  - GitLab CI配置生成
  - 位置：`backend/src/modules/developer/cicd-generator.service.ts`

- [ ] **部署脚本生成**
  - Dockerfile生成
  - Vercel部署配置
  - Netlify部署配置
  - 位置：`backend/src/modules/developer/deployment-generator.service.ts`

- [ ] **开发者工作台增强**
  - API测试工具
  - 代码生成历史
  - 位置：`paymindfrontend/pages/app/developer/workspace.tsx`

---

## 5. 联盟生态完善 ⭐⭐⭐ P0

### 5.1 推广分成前端（2周）

- [ ] **推广面板**
  - 推广关系统计
  - 推广链接生成
  - 推广效果展示
  - 位置：`paymindfrontend/pages/app/agent/referral.tsx`

- [ ] **分成记录查询**
  - 待结算分成列表
  - 已结算分成列表
  - 分成明细
  - 位置：`paymindfrontend/pages/app/agent/commissions.tsx`

- [ ] **推广统计图表**
  - GMV趋势图
  - 分成趋势图
  - 位置：`paymindfrontend/components/agent/referral/ReferralStats.tsx`

### 5.2 多级分佣系统（2周）

- [ ] **多级分佣计算服务**
  - 推荐Agent + 执行Agent分佣
  - 多Agent协作分佣
  - 位置：`backend/src/modules/commission/multi-level-commission.service.ts`

- [ ] **分佣规则配置**
  - 分佣比例配置
  - 分佣层级限制
  - 位置：`backend/src/modules/commission/commission-rules.service.ts`

- [ ] **分佣前端展示**
  - 分佣明细展示
  - 分佣规则说明
  - 位置：`paymindfrontend/components/commission/CommissionDetails.tsx`

**数据库设计**:
```sql
-- 多级分佣记录
CREATE TABLE multi_level_commissions (
  id UUID PRIMARY KEY,
  payment_id UUID,
  referral_agent_id UUID,
  execution_agent_id UUID,
  referral_commission DECIMAL(18,2),
  execution_commission DECIMAL(18,2),
  total_commission DECIMAL(18,2),
  created_at TIMESTAMP
);

-- 分佣规则配置
CREATE TABLE commission_rules (
  id UUID PRIMARY KEY,
  product_type VARCHAR(50),
  referral_rate DECIMAL(5,2),
  execution_rate DECIMAL(5,2),
  platform_rate DECIMAL(5,2),
  max_levels INTEGER,
  created_at TIMESTAMP
);
```

### 5.3 推广系统完善（1周）

- [ ] **推广链接管理**
  - 推广链接生成
  - 推广链接统计
  - 位置：`paymindfrontend/pages/app/agent/referral-links.tsx`

- [ ] **推广素材生成**
  - 推广海报生成
  - 推广文案生成
  - 位置：`backend/src/modules/referral/promotion-material.service.ts`

---

## 6. Agent Runtime基础架构 ⭐⭐ P0

### 6.1 Memory系统（1周）

- [ ] **用户偏好记忆**
  - 支付偏好存储
  - 购物偏好存储
  - 位置：`backend/src/modules/agent/memory/user-preferences.service.ts`

- [ ] **会话长期记忆**
  - 历史对话摘要
  - 用户行为模式
  - 位置：`backend/src/modules/agent/memory/session-memory.service.ts`

**数据库设计**:
```sql
-- 用户偏好
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID,
  preferences JSONB,
  updated_at TIMESTAMP
);

-- 会话摘要
CREATE TABLE session_summaries (
  id UUID PRIMARY KEY,
  session_id UUID,
  summary TEXT,
  key_points JSONB,
  created_at TIMESTAMP
);
```

### 6.2 Skills系统（1周）

- [ ] **Skills注册系统**
  - Skills注册机制
  - Skills动态加载
  - 位置：`backend/src/modules/agent/skills/skill-registry.service.ts`

- [ ] **默认Skills实现**
  - 支付Skill
  - 订单查询Skill
  - 商品搜索Skill
  - 位置：`backend/src/modules/agent/skills/`

### 6.3 Workflows系统（1周）

- [ ] **工作流引擎**
  - 工作流定义
  - 工作流执行
  - 位置：`backend/src/modules/agent/workflows/workflow-engine.service.ts`

- [ ] **常用工作流模板**
  - 支付完成工作流
  - 订单创建工作流
  - 位置：`backend/src/modules/agent/workflows/templates/`

**数据库设计**:
```sql
-- 工作流定义
CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  agent_id UUID,
  name VARCHAR(255),
  trigger_config JSONB,
  actions JSONB,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP
);

-- 工作流执行记录
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY,
  workflow_id UUID,
  trigger_data JSONB,
  execution_result JSONB,
  status VARCHAR(50),
  executed_at TIMESTAMP
);
```

---

## 7. 测试与优化 ⭐ P1

### 7.1 单元测试（1周）

- [ ] **后端单元测试**
  - 服务层测试
  - 控制器测试
  - 位置：`backend/src/**/*.spec.ts`

- [ ] **前端单元测试**
  - 组件测试
  - 工具函数测试
  - 位置：`paymindfrontend/**/*.test.tsx`

### 7.2 集成测试（1周）

- [ ] **API集成测试**
  - 支付流程测试
  - Agent对话测试
  - 位置：`tests/integration/`

- [ ] **E2E测试**
  - 完整用户流程测试
  - 位置：`tests/e2e/`

### 7.3 性能优化（1周）

- [ ] **API性能优化**
  - 数据库查询优化
  - 缓存策略
  - 位置：后端服务

- [ ] **前端性能优化**
  - 代码分割
  - 懒加载
  - 位置：前端应用

---

## 📋 优先级总结

### P0（必须完成 - 核心功能）

1. **统一支付系统完善**（4周）
   - 手续费估算模型
   - 风险评分模型
   - QuickPay增强

2. **个人Agent支付助手**（2周）
   - KYC复用
   - 商家可信度
   - 自动填写支付信息

3. **个人Agent消费管理**（2周）
   - 订阅识别
   - 预算管理
   - 交易分类

4. **商家Agent订单处理自动化**（2周）
   - Webhook自动化
   - 自动发货
   - 自动核销

5. **商家Agent财务结算**（2周）
   - 多链统一账户
   - 自动对账
   - 结算规则配置

6. **联盟生态前端**（2周）
   - 推广分成前端
   - 多级分佣系统

7. **Agent Runtime基础**（3周）
   - Memory系统
   - Skills系统
   - Workflows系统

**P0总计**: 17周（可并行开发，实际约8-10周）

### P1（应该完成 - 增强体验）

1. **个人Agent智能购物**（1周）
2. **商家Agent商品知识库**（1周）
3. **开发者Agent工具链**（2周）
4. **测试与优化**（3周）

**P1总计**: 7周

---

## 📊 预计工作量

### 最短时间（并行开发）
- **P0功能**: 8-10周
- **P1功能**: 3-4周
- **总计**: 11-14周

### 最长时间（串行开发）
- **P0功能**: 17周
- **P1功能**: 7周
- **总计**: 24周

### 建议时间
- **P0功能**: 10周（关键路径优化）
- **P1功能**: 4周
- **总计**: 14周（约3.5个月）

---

## 🚀 开发建议

1. **并行开发**: 支付系统、个人Agent、商家Agent可以并行开发
2. **分阶段上线**: 先完成P0核心功能，快速推向市场
3. **持续测试**: 每个功能完成后立即测试
4. **用户反馈**: 完成P0后邀请用户测试，根据反馈调整P1优先级

---

## 📝 关键里程碑

### Week 4: 统一支付系统完善
- ✅ 手续费估算完成
- ✅ 风险评分完成
- ✅ QuickPay增强完成

### Week 6: 个人Agent核心功能
- ✅ 支付助手完成
- ✅ 消费管理完成

### Week 8: 商家Agent核心功能
- ✅ 订单处理自动化完成
- ✅ 财务结算完成

### Week 10: 联盟生态 + Agent Runtime
- ✅ 推广分成前端完成
- ✅ 多级分佣完成
- ✅ Agent Runtime基础完成

### Week 14: 第一阶段完成
- ✅ 所有P0功能完成
- ✅ 测试通过
- ✅ 准备上线

---

**制定日期**: 2025-01-XX  
**审查**: 技术团队、产品团队

