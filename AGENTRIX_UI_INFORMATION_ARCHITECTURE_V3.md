# Agentrix UI 信息架构重构方案 V3.0

**日期**: 2026-01-03  
**状态**: 设计方案  
**目标**: 解决当前"双主导航"和"层级混乱"问题

---

## 🎯 核心问题分析

### 当前问题
1. **层级混乱**: 用户任务(Jobs) + 系统构件(Building Blocks) + 治理(Governance) 混排在同一导航
2. **双主导航**: 左侧导航 + 顶部Tab，造成用户困惑
3. **心智模型不匹配**: 用户想"做事情"，系统却先展示"能力构件"

### 正确的层级关系
```
用户任务(Jobs) - 我要完成什么
    └─ 系统构件(Building Blocks) - 需要用到什么工具
        └─ 治理与审计(Governance) - 如何管理和审计
```

---

## 📋 信息架构设计原则

### 1. **任务导向优先**
主导航必须是用户任务，而非系统能力

### 2. **单一主导航**
只保留顶部Tab作为主导航，侧边栏作为工具/设置区

### 3. **分层清晰**
- **L1 主导航**：用户核心任务（我要做什么）
- **L2 侧边栏**：系统构件与工具（用什么完成）
- **L3 设置/治理**：折叠在专门区域

### 4. **角色差异化**
个人、商户、开发者有不同的任务目标

---

## 👤 个人用户端 (User Module) - 新架构

### 布局结构
```
┌─────────────────────────────────────────────────────────────┐
│ 🏠 Dashboard │ 💰 Earn │ 🛒 Shop │ 💳 Pay │ 🏦 Assets     [⚙️]│ ← L1 主导航
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│  [侧边栏] │              主内容区                             │
│  L2 工具  │           (当前任务页面)                          │
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

### L1 主导航 - 任务导向（顶部Tab）

#### 1. 🏠 **Dashboard**（控制台）
**用户心智**: "我想看整体概况"

**内容**:
- 快速统计卡片：总资产、本周收益、待处理任务
- 最近交易
- Agent活动日志
- 推荐操作（基于用户行为）

---

#### 2. 💰 **Earn**（自动赚钱）
**用户心智**: "我想自动赚钱"

**子导航**:
- **Auto Tasks** (自动任务)
  - 空投任务
  - DeFi策略
  - 推荐任务
- **Airdrops** (空投发现)
  - 可领空投列表
  - 领取历史
- **Strategies** (策略管理)
  - DCA定投
  - 网格交易
  - Copy Trading
- **History** (收益历史)
  - 收益统计图表
  - 交易记录

---

#### 3. 🛒 **Shop**（智能购物）
**用户心智**: "我想买东西"

**子导航**:
- **Browse** (浏览商品)
  - 商品分类
  - AI推荐
- **Orders** (我的订单)
  - 待支付
  - 进行中
  - 已完成
- **Cart** (购物车)
- **Wishlist** (心愿单)

---

#### 4. 💳 **Pay**（支付管理）
**用户心智**: "我想管理支付"

**子导航**:
- **Transactions** (支付历史)
  - 最近交易
  - 按类型筛选
- **Subscriptions** (订阅管理)
  - 活跃订阅
  - 续费设置
- **Invoices** (账单)
  - 待支付账单
  - 历史账单

---

#### 5. 🏦 **Assets**（资产管理）
**用户心智**: "我想管理钱包和资产"

**子导航**:
- **Wallets** (钱包)
  - MPC钱包
  - 连接的钱包
  - 余额查看
- **Balances** (资产余额)
  - 代币列表
  - NFT列表
- **KYC** (身份认证)
  - 认证状态
  - 提升额度

---

### L2 侧边栏 - 系统构件与工具（折叠式）

**默认折叠，点击右上角[⚙️]展开**

```
⚙️ SYSTEM TOOLS
├─ 🤖 Agent & Skills
│  ├─ My Agents
│  ├─ Skill Marketplace
│  └─ Mandates (授权管理)
│
├─ 🔒 Security & Governance
│  ├─ Permissions (权限)
│  ├─ Sessions (授权会话)
│  ├─ Policies (策略)
│  └─ Audit Trail (审计链)
│
└─ 👤 Account
   ├─ Profile (个人资料)
   ├─ Settings (设置)
   └─ Help & Support
```

---

## 🏪 商户端 (Merchant Module) - 新架构

### L1 主导航 - 商户核心任务（顶部Tab）

#### 1. 🏠 **Dashboard**（仪表板）
- 今日GMV、订单量、转化率
- 商品技能化状态
- 热销商品TOP10
- Agent访问统计

---

#### 2. 📦 **Products**（商品管理）
**用户心智**: "我想管理商品和上架"

**子导航**:
- **List** (商品列表)
  - 全部商品
  - 上架/下架管理
- **Add New** (添加商品)
  - 手动添加
  - 批量导入
- **As Skills** (商品技能化) ⭐
  - 技能预览
  - 自动生成API
- **E-commerce Sync** (电商同步)
  - Shopify连接
  - 淘宝/京东同步

---

#### 3. 📋 **Orders**（订单管理）
**用户心智**: "我想处理订单"

**子导航**:
- **All Orders** (全部订单)
- **Pending** (待处理)
- **Shipping** (配送中)
- **Completed** (已完成)
- **Refunds** (退款管理)

---

#### 4. 💰 **Finance**（财务中心）
**用户心智**: "我想管理收款和提现"

**子导航**:
- **Overview** (财务概览)
  - 账户余额
  - 今日收入
- **Transactions** (交易记录)
  - 收款记录
  - 分账明细
- **Withdrawals** (提现)
  - 提现申请
  - 到账记录
- **Invoices** (发票管理)

---

#### 5. 📊 **Analytics**（数据分析）
**用户心智**: "我想看数据"

**子导航**:
- **Sales** (销售分析)
  - 销售趋势
  - 商品分析
- **Customers** (客户分析)
  - 用户画像
  - 复购率
- **AI Traffic** (AI流量) ⭐
  - Agent访问来源
  - 技能调用统计

---

### L2 侧边栏 - 商户工具

```
⚙️ MERCHANT TOOLS
├─ 🤖 AI Integration
│  ├─ Product → Skill Converter
│  ├─ Multi-platform Config
│  └─ AI Agent Whitelist
│
├─ 🔌 Integrations
│  ├─ API Keys
│  ├─ Webhooks
│  └─ Payment Gateway
│
├─ 🔒 Compliance
│  ├─ Audit Logs
│  ├─ Tax Settings
│  └─ Legal Docs
│
└─ ⚙️ Settings
   ├─ Store Info
   ├─ Notification
   └─ Team Management
```

---

## 👨‍💻 开发者端 (Developer Module) - 新架构

### L1 主导航 - 开发者任务（顶部Tab）

#### 1. 🏠 **Dashboard**（仪表板）
- API调用量 (24h)
- 已发布技能数
- 收益统计
- 活跃Agent数
- 技能工厂快捷入口

---

#### 2. ⚡ **Build**（构建技能）⭐
**用户心智**: "我想开发技能"

**子导航**:
- **Skill Factory** (技能工厂)
  - 创建新技能
  - 使用模板
- **Skills Registry** (技能注册表)
  - 我的技能列表
  - 版本管理
- **Skill Packs** (技能包)
  - 创建技能包
  - 组合技能
- **Test Sandbox** (测试沙盒)
  - 本地测试
  - 模拟调用

---

#### 3. 🚀 **Publish**（发布与分发）
**用户心智**: "我想发布到AI平台"

**子导航**:
- **Marketplace** (Agentrix市场)
  - 发布到市场
  - 定价设置
- **Multi-platform** (多平台分发) ⭐
  - ChatGPT (MCP)
  - Claude Desktop
  - Gemini Extensions
  - Grok Tools
- **Distribution** (分发管理)
  - 发布状态
  - 平台审核

---

#### 4. 💰 **Revenue**（收益中心）
**用户心智**: "我想看收益"

**子导航**:
- **Earnings** (收益统计)
  - 总收益
  - 按技能统计
- **Transactions** (交易记录)
  - 调用收费
  - 订阅收入
- **Withdrawals** (提现)
  - 申请提现
  - 到账记录
- **Pricing** (定价策略)
  - Free/Per-call/Subscription

---

#### 5. 📚 **Docs**（文档与支持）
**用户心智**: "我需要帮助"

**子导航**:
- **API Reference** (API文档)
- **SDK Guides** (SDK指南)
- **Examples** (示例代码)
- **Changelog** (更新日志)

---

### L2 侧边栏 - 开发工具

```
⚙️ DEVELOPER TOOLS
├─ 🔌 Integration
│  ├─ API Keys
│  ├─ MCP Config (生成配置)
│  ├─ OAuth Apps
│  └─ Webhooks
│
├─ 🤖 Agent Testing
│  ├─ Test Agents
│  ├─ Debug Console
│  └─ Mock Scenarios
│
├─ 📊 Monitoring
│  ├─ Logs (调用日志)
│  ├─ Errors (错误追踪)
│  ├─ Performance
│  └─ Alerts
│
├─ 🔒 Security
│  ├─ Audit Trail
│  ├─ Rate Limits
│  └─ IP Whitelist
│
└─ ⚙️ Settings
   ├─ Developer Profile
   ├─ Team Members
   └─ Billing
```

---

## 🎨 视觉设计指南

### 导航层级视觉差异

#### L1 主导航（顶部Tab）
```css
背景: bg-slate-900
字体: text-base font-semibold
高度: h-14
选中态: border-b-2 border-blue-500
```

#### L2 侧边栏（系统工具）
```css
背景: bg-slate-800/50
字体: text-sm font-medium
宽度: w-64 (展开) / w-0 (折叠)
位置: fixed right (从右侧滑出)
```

#### 内容区
```css
背景: bg-slate-950
边距: p-6
圆角: rounded-xl
```

---

## 📊 对比：改进前 vs 改进后

| 维度 | 改进前 ❌ | 改进后 ✅ |
|------|----------|----------|
| **导航结构** | 双主导航（左侧+顶部） | 单一主导航（顶部Tab） |
| **信息架构** | 任务+构件+治理混排 | 任务→构件→治理分层 |
| **用户心智** | "系统有什么" | "我要做什么" |
| **导航层级** | 平铺13+标签 | 5个主任务+子导航 |
| **可扩展性** | 难以添加新功能 | 清晰的扩展路径 |
| **学习曲线** | 需要理解系统概念 | 符合直觉 |

---

## 🚀 实施计划

### Phase 1: 个人用户端重构（1周）
- [ ] 实现新的顶部Tab导航
- [ ] 重构5个主任务页面
- [ ] 实现侧边栏工具抽屉
- [ ] 迁移现有组件到新架构

### Phase 2: 商户端重构（1周）
- [ ] 商户5个主任务页面
- [ ] 商品技能化流程优化
- [ ] 侧边栏AI集成工具

### Phase 3: 开发者端重构（1周）
- [ ] 开发者5个主任务页面
- [ ] 技能工厂界面优化
- [ ] 多平台发布工作流

### Phase 4: 测试与优化（3天）
- [ ] 用户测试
- [ ] 性能优化
- [ ] 文档更新

---

## 💡 关键创新点

### 1. **任务导向优先**
用户首先看到的是"我要做什么"，而不是"系统有什么"

### 2. **工具抽屉模式**
系统构件(Agent/Skill/Mandate)放在侧边栏工具抽屉，按需展开

### 3. **角色专属工作流**
- 个人：Earn → Shop → Pay → Assets
- 商户：Products → Orders → Finance
- 开发者：Build → Publish → Revenue

### 4. **渐进式披露**
只在需要时展示高级功能（治理、审计、日志）

---

## 📝 用户体验提升

### 改进前
```
用户: "我想自动赚钱"
系统: 这里有Agent、Skill、Mandate、Policy...（困惑😵）
```

### 改进后
```
用户: "我想自动赚钱"
系统: 点击 💰 Earn → 看到自动任务、空投、策略（清晰😊）
需要配置Agent? 点击⚙️打开工具抽屉
```

---

## 🎯 成功指标

- **任务完成率** ↑ 30%
- **导航跳转次数** ↓ 40%
- **新用户学习时间** ↓ 50%
- **功能发现率** ↑ 60%
- **用户满意度** ↑ 40%

---

## 总结

这次重构的核心是**从系统视角转向用户视角**：

- ❌ 不再是：这是Agent、这是Skill、这是Policy
- ✅ 而是：我要赚钱、我要购物、我要管理资产

通过**任务导向的主导航**和**工具抽屉式的构件管理**，彻底解决"双主导航"和"层级混乱"问题。
