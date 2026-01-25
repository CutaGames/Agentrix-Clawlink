# 🎨 Agentrix 个人 Agent 模块 - UI 优化方案 V2.0 (Updated)

## 📋 目录
1. 核心概念重定义 (Everything is a Skill)
2. 模块分类与重构
3. 详细优化方案
4. 实施优先级与任务清单

---

## **1. 核心概念重定义**

### **1.1 Skill 的定位**
根据《Agentrix Skill 架构重新定位方案》，**Skill 是 Agent 的“原子能力”**。

**✅ 必须 Skill 化的功能**：
- **支付与交易**：`payment`, `crypto-payment`, `checkout`, `subscription-payment`, `refund`, `split-payment`
- **电商类**：`product-search`, `add-to-cart`, `view-cart`, `order-tracking`, `price-compare`
- **DeFi/投资 (Auto-Earn)**：`airdrop-discover`, `airdrop-claim`, `dca-strategy`, `grid-trading`, `arbitrage-scan`, `yield-farming`
- **钱包与资产**：`wallet-balance`, `token-transfer`, `onramp`, `offramp`, `asset-overview`
- **授权与安全**：`agent-authorize`, `agent-revoke`, `session-create`, `security-audit`

**💡 核心逻辑**：
- **Skill** = 面向 AI 生态 (ChatGPT/Claude/SDK) 的 Function/Tool。
- **功能模块 (UI)** = 面向用户的应用场景，是多个 Skill 的聚合展示与交互界面。

---

## **2. 模块分类与重构**

### **2.1 重新设计的左侧导航结构**

```
个人 Agent 工作台
├─ 🏠 控制台 (Dashboard)
│   └─ 概览：收益、活跃 Agent、授权状态、快捷入口
│
├─ 🤖 Agent 中心
│   ├─ 我的 Agent (管理、部署、分享)
│   └─ Agent 市场 (发现与安装)
│
├─ 🧰 技能中心 (Skill Center) ⭐ 核心重构
│   ├─ 技能市场 (浏览所有原子能力：支付、DeFi、电商等)
│   ├─ 已安装技能 (配置与管理)
│   └─ 开发者工具 (创建与发布 Skill)
│
├─ 📊 自动赚钱 (Auto-Earn) 
│   ├─ 策略管理 (DCA、网格、套利 - 由对应 Skill 驱动)
│   ├─ 空投猎手 (发现与领取 - 由 Airdrop Skill 驱动)
│   └─ 收益统计
│
├─ 🛒 智能购物 (Smart Shopping)
│   ├─ 商品搜索与比价 (由 Search/Compare Skill 驱动)
│   ├─ 订单管理 (由 Order Skill 驱动)
│   └─ 物流追踪
│
├─ 💼 资产管理 (Assets)
│   ├─ 钱包管理 (多链、MPC 钱包)
│   ├─ 法币账户 (银行卡、余额)
│   ├─ 入金/出金 (Onramp/Offramp)
│   └─ 资产总览
│
├─ 💳 支付与账单
│   ├─ 支付历史
│   ├─ 账单分析 (图表化)
│   └─ 自动扣费/订阅管理
│
├─ 🛡️ 策略与安全
│   ├─ Agent 授权 (QuickPay 额度、有效期)
│   ├─ Session 管理
│   └─ 安全审计
│
└─ 👤 个人资料
    ├─ 社交账号绑定 (Twitter, Discord, Telegram)
    ├─ KYC 认证
    └─ 偏好设置
```

---

## **3. 详细优化方案**

### **3.1 技能中心 (Skill Center) 🆕**
- **统一入口**：不再将 Skill 隐藏在 Agent 内部，而是作为独立的资源池。
- **原子化展示**：每个 Skill 都有详细的 Input/Output 定义，支持在 UI 中直接测试。
- **AI 生态集成预览**：显示该 Skill 在 ChatGPT/Claude 中的调用示例。

### **3.2 Auto-Earn & 空投模块 Skill 化**
- **后端**：将 `airdrop.service` 和 `auto-earn.service` 的核心逻辑封装为标准 `Skill` 实体。
- **前端**：UI 保持聚合展示，但底层调用统一的 Skill 执行接口。

### **3.3 资产管理与支付分析**
- **图表化**：引入饼图展示资产分布，折线图展示收益趋势。
- **法币集成**：支持 Transak 入金和银行卡绑定。

---

## **4. 实施优先级与任务清单**

### **P0: 核心 Skill 化与后端重构 (立即执行)**
1. **Skill 迁移**：将 `McpService` 中的静态工具 (search_products, get_balance 等) 迁移至数据库 `skills` 表。
2. **新增核心 Skill**：
   - 实现 `airdrop-discover` 和 `airdrop-claim` Skill。
   - 实现 `dca-strategy` 和 `grid-trading` Skill。
   - 实现 `wallet-balance` 和 `asset-overview` Skill。
3. **Skill 执行器增强**：确保 `internal` 类型的 Skill 能正确调用对应的 Service 方法。

### **P1: 工作台 UI 框架重构 (本阶段目标)**
1. **导航栏更新**：按照 2.1 结构更新 `Sidebar`。
2. **技能中心 MVP**：实现技能列表、技能详情、安装/卸载功能。
3. **资产总览页面**：实现基础的资产分布图表。
4. **社交绑定**：完善 Twitter/Discord 绑定流程。

### **P2: AI 生态深度集成**
1. **MCP 动态加载**：`McpService` 完全从数据库加载 Skill。
2. **Gemini/Claude 适配**：自动生成对应的 Tool 定义。

### **P3: 智能购物与高级分析**
1. **比价 Skill 实现**。
2. **账单 AI 分析报告**。

---

## **📝 阶段测试验证计划**
1. **后端编译**：`cd backend && npm run build`
2. **前端编译**：`cd frontend && npm run build`
3. **功能验证**：
   - 通过 API 调用新创建的 Skill。
   - 检查 MCP `/api/mcp/sse` 是否能识别新 Skill。
   - 验证前端导航跳转是否正确。
