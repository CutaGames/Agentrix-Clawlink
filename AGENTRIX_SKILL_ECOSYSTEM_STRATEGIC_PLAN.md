# Agentrix Skill 生态全景战略规划 2.0

**版本**: v2.0 | **日期**: 2026-01-11 | **状态**: 核心战略准则  
**关键词**: 统一Skill标准 · 全域Marketplace · 多生态聚合 · Agent协作网络

---

## 目录

1. [核心愿景与设计原则](#1-核心愿景与设计原则)
2. [Skill 统一标准协议 (ASP)](#2-skill-统一标准协议-asp)
3. [Skill 完整分类体系](#3-skill-完整分类体系)
4. [Agentrix 核心 Skill 清单](#4-agentrix-核心-skill-清单)
5. [统一 Marketplace 架构](#5-统一-marketplace-架构)
6. [多生态聚合策略](#6-多生态聚合策略)
7. [传统商品 Skill 化转换引擎](#7-传统商品-skill-化转换引擎)
8. [交互协议：Agent-Agent & Agent-Human](#8-交互协议agent-agent--agent-human)
9. [经济协议与分账机制](#9-经济协议与分账机制)
10. [技术实现路线图](#10-技术实现路线图)

---

## 1. 核心愿景与设计原则

### 1.1 愿景：万物皆可 Skill，一切皆可调用

在 AI Agent 时代，传统的 "App、插件、商品" 概念正在被重构。Agentrix 的愿景是：

> **"以自然语言为入口、以统一 Skill 协议为载体、以 Marketplace 为枢纽，构建 Agent 与 Human 共享的能力网络。"**

### 1.2 核心设计原则

| 原则 | 描述 |
| :--- | :--- |
| **统一性 (Unified)** | 一套 Skill 标准，兼容所有主流 AI 生态（Claude MCP、GPT Actions、Gemini、Grok） |
| **双向性 (Bidirectional)** | 每个 Skill 同时服务 Agent 调用和 Human 直接使用 |
| **可组合性 (Composable)** | Skill 可嵌套、可编排、可形成 Workflow |
| **经济性 (Economic)** | 每次调用自动触发分账，形成自治的协作经济网络 |
| **开放性 (Open)** | 聚合外部生态 Skill，开放 Agentrix Skill 给外部平台 |

### 1.3 去插件化宣言

- **停止**：开发封闭的私有插件体系、混乱的分类市场
- **拥抱**：OpenAI Actions + Claude MCP 兼容的原子化技能架构
- **终结**：插件市场 / Skill 市场 / 商品市场的割裂

---

## 2. Skill 统一标准协议 (ASP)

### 2.1 Agentrix Skill Protocol (ASP) 规范

每个 Skill 必须符合以下统一协议：

```typescript
interface AgentrixSkill {
  // === 基础元数据 ===
  id: string;                    // 全局唯一标识 (UUID)
  name: string;                  // 技能名称 (snake_case)
  displayName: string;           // 人类可读名称
  description: string;           // 自然语言描述 (供 LLM 理解)
  version: string;               // 语义化版本
  
  // === 分类标签 ===
  layer: 'infra' | 'resource' | 'logic' | 'composite';
  category: SkillCategory;
  resourceType?: 'physical' | 'service' | 'digital' | 'data' | 'logic';
  tags: string[];
  
  // === 接口定义 ===
  inputSchema: JSONSchema;       // 输入参数 (OpenAPI 兼容)
  outputSchema: JSONSchema;      // 输出格式
  
  // === 执行配置 ===
  executor: {
    type: 'internal' | 'http' | 'mcp' | 'contract';
    endpoint?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    mcpServer?: string;          // MCP Server 名称
    contractAddress?: string;    // 链上合约地址
  };
  
  // === 多平台 Schema ===
  platformSchemas: {
    openai?: OpenAIToolSchema;
    claude?: ClaudeMCPToolSchema;
    gemini?: GeminiFunctionSchema;
    grok?: GrokToolSchema;
  };
  
  // === 经济配置 ===
  pricing: {
    model: 'free' | 'per_call' | 'subscription' | 'revenue_share';
    pricePerCall?: number;
    currency?: 'USD' | 'USDT' | 'USDC';
    commissionRate?: number;      // 分佣比例 (0-100)
    freeQuota?: number;
  };
  
  // === 权限与兼容性 ===
  permissions: ('read' | 'write' | 'payment' | 'identity')[];
  compatibleAgents: 'all' | string[];  // Agent 白名单
  humanAccessible: boolean;            // 是否对人类直接开放
  
  // === 元信息 ===
  author: { id: string; name: string; type: 'platform' | 'merchant' | 'developer'; };
  source: 'native' | 'imported' | 'converted';  // 来源
  originalPlatform?: 'claude' | 'openai' | 'third_party';
}
```

### 2.2 Skill 唯一标识体系 (SID)

```
格式: ax://{layer}/{category}/{author}/{name}@{version}

示例:
- ax://infra/payment/agentrix/wallet_create@1.0.0
- ax://resource/physical/merchant_123/nvidia_rtx5090@1.0.0
- ax://logic/data/dev_456/sentiment_analysis@2.1.0
- ax://composite/workflow/agentrix/smart_shopping@1.0.0
```

---

## 3. Skill 完整分类体系

### 3.1 四层架构 (The Stack)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Layer 4: Composite Skills                     │
│         工作流编排 · 多 Skill 组合 · 复杂业务流程                 │
├─────────────────────────────────────────────────────────────────┤
│                      Layer 3: Logic Skills                       │
│         算法工具 · 数据分析 · AI 能力 · 开发者代码逻辑            │
├─────────────────────────────────────────────────────────────────┤
│                    Layer 2: Resource Skills                      │
│         实物商品 · 专业服务 · 数字资产 · 数据资源                 │
├─────────────────────────────────────────────────────────────────┤
│                      Layer 1: Infra Skills                       │
│         支付 · 钱包 · 身份 · 授权 · 链上操作 · 协议原语           │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 详细分类矩阵

| Layer | Category | ResourceType | 示例 | 调用者 |
| :--- | :--- | :--- | :--- | :--- |
| **Infra** | payment | - | `wallet_create`, `x402_pay`, `onramp` | Agent + Human |
| **Infra** | identity | - | `did_verify`, `kyc_check` | Agent + Human |
| **Infra** | authorization | - | `agent_authorize`, `permission_grant` | Agent + Human |
| **Infra** | chain | - | `token_transfer`, `contract_call`, `cross_chain_swap` | Agent |
| **Resource** | commerce | physical | 显卡、咖啡、服装等实物商品 | Agent + Human |
| **Resource** | commerce | service | 翻译、设计、咨询、家政等 | Agent + Human |
| **Resource** | commerce | digital | 软件 License、API 额度、会员订阅 | Agent + Human |
| **Resource** | asset | nft/ft | NFT、代币、RWA 资产 | Agent + Human |
| **Resource** | data | data | 实时行情、研报、数据集 | Agent |
| **Logic** | algorithm | logic | 套利扫描、收益计算、风控模型 | Agent |
| **Logic** | analysis | logic | 情感分析、图像识别、NLP 处理 | Agent |
| **Logic** | utility | logic | 格式转换、编码解码、文件处理 | Agent |
| **Logic** | integration | logic | 第三方 API 封装、协议桥接 | Agent |
| **Composite** | workflow | - | 智能购物流程、投资组合管理 | Agent + Human |

---

## 4. Agentrix 核心 Skill 清单

### 4.1 平台原生 Skill (已实现)

| Skill Name | Layer | Category | 描述 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| `search_products` | Resource | commerce | 搜索 Marketplace 商品 | ✅ Published |
| `get_product_details` | Resource | commerce | 获取商品详情 | ✅ Published |
| `create_order` | Resource | commerce | 创建订单 | ✅ Published |
| `get_balance` | Infra | payment | 查询钱包余额 | ✅ Published |
| `asset_overview` | Infra | payment | 资产总览 | ✅ Published |
| `airdrop_discover` | Logic | data | 发现空投机会 | ✅ Published |
| `airdrop_claim` | Logic | utility | 领取空投 | ✅ Published |
| `dca_strategy_create` | Logic | algorithm | 创建定投策略 | ✅ Published |
| `grid_trading_create` | Logic | algorithm | 创建网格交易 | ✅ Published |
| `arbitrage_scan` | Logic | algorithm | 套利机会扫描 | ✅ Published |
| `agent_authorize` | Infra | authorization | 创建 Agent 授权 | ✅ Published |
| `agent_revoke` | Infra | authorization | 撤销 Agent 授权 | ✅ Published |
| `fetch_crypto_price` | Logic | data | 获取加密货币价格 | ✅ Published |

### 4.2 核心能力 Skill 化计划 (待开发)

| Skill Name | Layer | Category | 描述 | 优先级 | 预计版本 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **支付与金融** |||||
| `wallet_create` | Infra | payment | 创建 MPC 钱包 | P0 | v2.1 |
| `wallet_import` | Infra | payment | 导入外部钱包 | P0 | v2.1 |
| `onramp_fiat` | Infra | payment | 法币入金 (Transak) | P0 | v2.1 |
| `offramp_fiat` | Infra | payment | 法币出金 | P1 | v2.2 |
| `x402_pay` | Infra | payment | X402 协议支付 | P0 | v2.1 |
| `quickpay_execute` | Infra | payment | QuickPay 快捷支付 | P0 | v2.1 |
| `cross_chain_swap` | Infra | chain | 跨链兑换 | P1 | v2.2 |
| **Agent 分账** |||||
| `commission_calculate` | Infra | payment | 计算分账金额 | P0 | v2.1 |
| `commission_distribute` | Infra | payment | 执行分账 | P0 | v2.1 |
| `commission_query` | Infra | payment | 查询分账记录 | P0 | v2.1 |
| `negotiate_commission` | Logic | algorithm | Agent 间协商分佣 | P1 | v2.2 |
| **身份与授权** |||||
| `did_create` | Infra | identity | 创建去中心化身份 | P1 | v2.2 |
| `kyc_verify` | Infra | identity | KYC 验证 | P1 | v2.2 |
| `permission_check` | Infra | authorization | 检查权限 | P0 | v2.1 |
| `spending_limit_set` | Infra | authorization | 设置消费限额 | P0 | v2.1 |
| **Marketplace 运营** |||||
| `skill_publish` | Logic | utility | 发布 Skill | P0 | v2.1 |
| `skill_update` | Logic | utility | 更新 Skill | P0 | v2.1 |
| `skill_analytics` | Logic | data | Skill 调用统计 | P1 | v2.2 |
| `product_to_skill` | Logic | utility | 商品转 Skill | P0 | v2.1 |
| **Agent 协作** |||||
| `agent_discover` | Logic | utility | 发现可用 Agent | P1 | v2.2 |
| `agent_invoke` | Infra | integration | 调用其他 Agent | P0 | v2.1 |
| `agent_delegate` | Infra | integration | 委托任务给 Agent | P1 | v2.2 |
| `workflow_create` | Composite | workflow | 创建工作流 | P1 | v2.3 |

---

## 5. 统一 Marketplace 架构

### 5.1 核心理念：一个市场，服务所有

**废弃**：插件市场 + Skill 市场 + 商品市场 的割裂模式

**建立**：**统一 Marketplace** —— 所有可调用能力的唯一入口

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENTRIX UNIFIED MARKETPLACE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│   │   商品      │  │   服务      │  │   工具      │  │   数据    │  │
│   │  (商户)     │  │  (服务商)   │  │  (开发者)   │  │  (提供者) │  │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │
│          │                │                │               │        │
│          └────────────────┴────────────────┴───────────────┘        │
│                                  │                                   │
│                    ┌─────────────▼─────────────┐                    │
│                    │    Skill 转换引擎         │                    │
│                    │  (Product → Skill)        │                    │
│                    └─────────────┬─────────────┘                    │
│                                  │                                   │
│          ┌───────────────────────┼───────────────────────┐          │
│          │                       │                       │          │
│    ┌─────▼─────┐          ┌──────▼──────┐         ┌─────▼─────┐    │
│    │ Agent API │          │  Human UI   │         │ External  │    │
│    │ (MCP/REST)│          │  (Web/App)  │         │ Platform  │    │
│    └───────────┘          └─────────────┘         └───────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Marketplace 核心功能

#### A. 统一展示层

| 视图模式 | 面向对象 | 展示内容 |
| :--- | :--- | :--- |
| **Discovery View** | Human | 可视化卡片、分类浏览、推荐 |
| **API Catalog** | Agent | OpenAPI Schema、MCP Tools 列表 |
| **Topology View** | Developer | Skill 依赖关系图、调用链路 |
| **Analytics View** | Provider | 调用统计、收益分析、归因数据 |

#### B. 智能搜索与匹配

```typescript
interface MarketplaceSearch {
  // 自然语言搜索 (供 Human 和 Agent 共用)
  query: string;
  
  // 结构化过滤
  filters: {
    layer?: SkillLayer[];
    category?: SkillCategory[];
    resourceType?: ResourceType[];
    priceRange?: { min: number; max: number };
    rating?: number;
    source?: ('native' | 'imported' | 'converted')[];
  };
  
  // 调用者类型 (影响结果排序)
  callerType: 'agent' | 'human';
  
  // 兼容性检查
  targetPlatform?: 'claude' | 'openai' | 'gemini' | 'grok';
}
```

#### C. 实时能力仪表盘

- **Live Feed**: 全网 Agent 调用的活跃 Skill 实时流
- **Trending Skills**: 按调用量/增长率排行
- **Revenue Attribution**: 开发者/商户的收益归因面板
- **Health Monitor**: Skill 可用性和响应时间监控

### 5.3 访问接口统一

| 入口 | 协议 | 使用者 |
| :--- | :--- | :--- |
| `https://marketplace.agentrix.top` | Web UI | Human |
| `https://api.agentrix.top/api/mcp/sse` | MCP SSE | Claude / SDK Agent |
| `https://api.agentrix.top/api/mcp/openapi.json` | OpenAPI | GPTs / Gemini / Grok |
| `https://api.agentrix.top/api/skills/*` | REST | 第三方应用 |

---

## 6. 多生态聚合策略

### 6.1 聚合目标

将以下外部生态的能力聚合进 Agentrix Marketplace：

| 生态 | 类型 | 聚合策略 |
| :--- | :--- | :--- |
| **Claude MCP** | 官方 MCP Servers | 代理调用 + Schema 转换 |
| **OpenAI GPTs** | Custom Actions | OpenAPI 导入 + 封装 |
| **第三方 Skill Store** | 独立 Skill 平台 | API 桥接 + 标准化 |
| **传统电商** | 商品数据 | 自动化 Skill 转换 |
| **SaaS API** | REST/GraphQL 服务 | Schema 推断 + 封装 |

### 6.2 Claude MCP 官方插件聚合

```typescript
// MCP Server 代理配置
interface MCPServerProxy {
  name: string;                    // 原始 MCP Server 名称
  source: 'anthropic_official' | 'community';
  originalUrl: string;             // 原始 SSE/stdio 端点
  
  // Agentrix 代理配置
  proxyEnabled: boolean;
  agentrixSkillId: string;         // 转换后的 Skill ID
  
  // 计费 (如果原始免费，Agentrix 不额外收费)
  pricing: {
    passthrough: boolean;          // 透传原始计费
    agentrixMarkup?: number;       // Agentrix 加价 (默认 0)
  };
}

// 已规划聚合的官方 MCP Servers
const officialMCPServers = [
  { name: 'filesystem', category: 'utility', priority: 'P0' },
  { name: 'github', category: 'integration', priority: 'P0' },
  { name: 'google-drive', category: 'integration', priority: 'P1' },
  { name: 'slack', category: 'integration', priority: 'P1' },
  { name: 'postgres', category: 'data', priority: 'P1' },
  { name: 'puppeteer', category: 'utility', priority: 'P1' },
  { name: 'brave-search', category: 'data', priority: 'P0' },
  { name: 'fetch', category: 'utility', priority: 'P0' },
  { name: 'memory', category: 'utility', priority: 'P1' },
];
```

### 6.3 GPT Actions / 第三方 Skill 导入

```typescript
interface ExternalSkillImporter {
  // 从 OpenAPI Schema 导入
  importFromOpenAPI(schemaUrl: string): Promise<AgentrixSkill[]>;
  
  // 从 GPT Action 配置导入
  importFromGPTAction(actionConfig: GPTActionConfig): Promise<AgentrixSkill>;
  
  // 从第三方 Skill Store 批量导入
  importFromSkillStore(storeConfig: {
    name: string;                  // 如 "PluginLab", "Zapier"
    apiEndpoint: string;
    authConfig: AuthConfig;
  }): Promise<AgentrixSkill[]>;
  
  // 标准化转换
  normalize(externalSkill: any): AgentrixSkill;
}
```

### 6.4 聚合 Skill 的标识

```
导入的 Skill 使用特殊前缀标识来源：

- ax://imported/claude/anthropic/filesystem@1.0.0
- ax://imported/openai/gpt_actions/weather_api@1.0.0
- ax://imported/zapier/integrations/gmail_send@1.0.0
- ax://converted/merchant/amazon/product_12345@1.0.0
```

---

## 7. 传统商品 Skill 化转换引擎

### 7.1 转换原理

任何可通过自然语言描述并执行的"商品"都可以转换为 Skill：

```
传统商品数据:
{
  "name": "NVIDIA RTX 5090",
  "price": 1999,
  "category": "显卡",
  "specs": { "memory": "32GB", "cuda_cores": 21760 },
  "inventory": 50
}

      ↓ Skill 转换引擎 ↓

Agentrix Skill:
{
  "name": "purchase_nvidia_rtx5090",
  "description": "购买 NVIDIA RTX 5090 显卡，32GB 显存，21760 CUDA 核心",
  "inputSchema": {
    "properties": {
      "quantity": { "type": "number", "default": 1 },
      "shipping_address": { "type": "string" }
    }
  },
  "outputSchema": { "orderId": "string", "totalPrice": "number" },
  "executor": { "type": "internal", "internalHandler": "product_purchase" },
  "pricing": { "model": "revenue_share", "commissionRate": 2.2 }
}
```

### 7.2 转换引擎架构

```typescript
class ProductToSkillConverter {
  // 商品类型 → Skill 模板映射
  private templates: Map<ProductType, SkillTemplate> = new Map([
    ['physical', PhysicalProductSkillTemplate],
    ['service', ServiceSkillTemplate],
    ['digital', DigitalProductSkillTemplate],
    ['subscription', SubscriptionSkillTemplate],
  ]);
  
  // 核心转换方法
  async convert(product: Product): Promise<AgentrixSkill> {
    const template = this.templates.get(product.type);
    
    return {
      id: `ax://converted/${product.merchantId}/${product.id}`,
      name: `purchase_${slugify(product.name)}`,
      displayName: product.name,
      description: this.generateDescription(product),
      layer: 'resource',
      category: 'commerce',
      resourceType: product.type,
      
      inputSchema: template.generateInputSchema(product),
      outputSchema: template.generateOutputSchema(product),
      
      executor: {
        type: 'internal',
        internalHandler: 'unified_product_purchase',
      },
      
      pricing: {
        model: 'revenue_share',
        commissionRate: this.getCommissionRate(product.type),
      },
      
      author: {
        id: product.merchantId,
        name: product.merchantName,
        type: 'merchant',
      },
      
      source: 'converted',
      humanAccessible: true,
    };
  }
  
  // 使用 LLM 生成自然语言描述
  private async generateDescription(product: Product): string {
    return await this.llm.generate(`
      为以下商品生成适合 AI Agent 理解的自然语言描述：
      商品名: ${product.name}
      类别: ${product.category}
      价格: ${product.price}
      规格: ${JSON.stringify(product.specs)}
      
      要求：简洁、突出关键卖点、方便 Agent 进行商品匹配
    `);
  }
}
```

### 7.3 商户商品自动转换流程

```
商户上传商品
    │
    ▼
┌──────────────────┐
│  商品数据校验    │
└────────┬─────────┘
         │
    ▼
┌──────────────────┐
│  LLM 描述生成    │  ← 自动生成 Agent 友好的描述
└────────┬─────────┘
         │
    ▼
┌──────────────────┐
│  Schema 推断     │  ← 根据商品属性生成输入/输出 Schema
└────────┬─────────┘
         │
    ▼
┌──────────────────┐
│  Skill 实例化    │  ← 生成 Skill 记录
└────────┬─────────┘
         │
    ▼
┌──────────────────┐
│  多平台 Schema   │  ← 自动生成 OpenAI/Claude/Gemini Schema
│     生成         │
└────────┬─────────┘
         │
    ▼
┌──────────────────┐
│  Marketplace     │  ← 上架到统一市场
│     发布         │
└──────────────────┘
```

---

## 8. 交互协议：Agent-Agent & Agent-Human

### 8.1 Agent-to-Agent 通信协议 (A2A)

#### 核心能力

| 能力 | 描述 | 对应 Skill |
| :--- | :--- | :--- |
| **发现** | Agent 发现其他可用 Agent | `agent_discover` |
| **调用** | Agent 调用另一个 Agent 的能力 | `agent_invoke` |
| **委托** | Agent 将子任务委托给专业 Agent | `agent_delegate` |
| **协商** | Agent 间协商分佣比例 | `negotiate_commission` |
| **同步** | Agent 间状态同步 | `agent_sync` |

#### A2A 消息格式

```typescript
interface A2AMessage {
  // 消息头
  header: {
    messageId: string;
    timestamp: number;
    sourceAgent: AgentIdentity;
    targetAgent: AgentIdentity;
    messageType: 'request' | 'response' | 'event' | 'negotiation';
  };
  
  // 消息体
  body: {
    // 请求类型
    action: 'invoke_skill' | 'delegate_task' | 'negotiate' | 'sync_state';
    
    // 请求内容
    payload: {
      skillId?: string;
      parameters?: Record<string, any>;
      taskDescription?: string;        // 自然语言任务描述
      negotiationTerms?: NegotiationTerms;
    };
    
    // 上下文
    context: {
      conversationId?: string;         // 追溯到原始对话
      userIntent?: string;             // 用户原始意图
      budget?: { amount: number; currency: string };
    };
  };
  
  // 经济条款
  economics: {
    paymentModel: 'caller_pays' | 'revenue_share' | 'free';
    maxCost?: number;
    commissionOffer?: number;          // 分佣报价
  };
}
```

#### Agent 协作场景示例

```
用户: "帮我找最划算的显卡并下单"
           │
           ▼
    ┌──────────────┐
    │ Personal     │  ← 用户的个人 Agent
    │ Agent        │
    └──────┬───────┘
           │ 1. 发起搜索请求
           ▼
    ┌──────────────┐
    │ Shopping     │  ← 专业购物 Agent
    │ Agent        │
    └──────┬───────┘
           │ 2. 调用比价 Skill
           ▼
    ┌──────────────┐      ┌──────────────┐
    │ Merchant A   │←────→│ Merchant B   │
    │ Agent        │  3.  │ Agent        │
    └──────┬───────┘ 比价 └──────────────┘
           │
           │ 4. 返回最佳选项
           ▼
    ┌──────────────┐
    │ Personal     │  5. 用户确认
    │ Agent        │
    └──────┬───────┘
           │ 6. 执行下单 + 支付
           ▼
    ┌──────────────┐
    │ Payment      │  ← 支付 Agent
    │ Agent        │
    └──────────────┘
           │ 7. 自动分账 (商户 + 各 Agent)
```

### 8.2 Agent-to-Human 交互协议 (A2H)

#### 设计原则

1. **自然语言优先**：所有交互以自然语言为主，结构化数据为辅
2. **渐进式披露**：先展示核心信息，详情按需展开
3. **确认机制**：涉及支付/授权时必须获得人类确认
4. **透明度**：清晰展示 Agent 执行了哪些操作

#### Human 交互界面组件

```typescript
interface HumanInteractionComponent {
  // 展示组件类型
  type: 
    | 'message'           // 纯文本消息
    | 'product_card'      // 商品卡片
    | 'skill_card'        // Skill 介绍卡片
    | 'payment_confirm'   // 支付确认
    | 'authorization'     // 授权请求
    | 'progress'          // 进度指示
    | 'result'            // 执行结果
    | 'error';            // 错误提示
  
  // 组件数据
  data: Record<string, any>;
  
  // 用户可执行的动作
  actions?: {
    label: string;
    action: 'confirm' | 'cancel' | 'modify' | 'detail';
    params?: Record<string, any>;
  }[];
  
  // 是否需要用户确认才能继续
  requiresConfirmation: boolean;
}
```

#### 对话流程示例

```
用户: "帮我买一个蓝牙耳机，200 以内"

Agent 响应 (A2H):
┌─────────────────────────────────────────────────────┐
│  🎧 为您找到 3 款符合要求的蓝牙耳机:                │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │ [商品卡片 1] Sony WF-C500                      │  │
│  │ ¥179 | ⭐4.8 | 续航20h | 蓝牙5.0              │  │
│  │ [查看详情] [加入购物车] [立即购买]            │  │
│  └───────────────────────────────────────────────┘  │
│  ...                                                 │
│                                                      │
│  💡 推荐第一款，性价比最高，评分也最高              │
│                                                      │
│  [一键购买推荐款] [继续浏览] [修改筛选条件]        │
└─────────────────────────────────────────────────────┘

用户: "就买第一个"

Agent 响应 (支付确认):
┌─────────────────────────────────────────────────────┐
│  📦 订单确认                                        │
│                                                      │
│  商品: Sony WF-C500 蓝牙耳机                        │
│  数量: 1                                             │
│  金额: ¥179.00                                       │
│                                                      │
│  收货地址: 上海市浦东新区xxx (上次使用地址)         │
│  [修改地址]                                          │
│                                                      │
│  支付方式: USDC (余额: $50.00)                       │
│  [切换支付方式]                                      │
│                                                      │
│  ⚠️ 点击确认后将从您的钱包扣款                      │
│                                                      │
│  [确认支付 ¥179] [取消]                              │
└─────────────────────────────────────────────────────┘
```

---

## 9. 经济协议与分账机制

### 9.1 分账架构 (基于 ARN V4.0)

每笔交易的资金分配：

```
$Total = $Cost_channel + $Fee_platform + $Pool_incentive + $Net_merchant

各部分定义：
- Cost_channel (0.3%):  ARN/X402 协议基础设施费
- Fee_platform (0.5%):  Agentrix 平台服务费
- Pool_incentive:       Agent 激励池 (按资产类型变化)
- Net_merchant:         商户实收
```

### 9.2 资产类型费率表

| 资产类型 | 激励池 | 平台费 | 通道费 | 商户实收 |
| :--- | :--- | :--- | :--- | :--- |
| 实物商品 (Physical) | 2.2% | 0.5% | 0.3% | 97.0% |
| 生活服务 (Service) | 3.7% | 1.0% | 0.3% | 95.0% |
| 数字商品 (Digital) | 2.2% | 0.5% | 0.3% | 97.0% |
| NFT/FT 资产 | 1.7% | 0.5% | 0.3% | 97.5% |
| Logic Skill 调用 | 20-50%* | 0% | 0.3% | 50-80%* |

> *Logic Skill 的分成由开发者自定义

### 9.3 Agent 角色与分成

| 角色 | 资金来源 | 分成规则 |
| :--- | :--- | :--- |
| **推广者 (Promoter)** | 平台费 | 平台费的 20% |
| **执行者 (Executor)** | 激励池 | 激励池的 70% |
| **推荐人 (Referrer)** | 激励池 | 激励池的 30% |

### 9.4 分账 Skill 接口

```typescript
// 分账计算 Skill
const commission_calculate: AgentrixSkill = {
  name: 'commission_calculate',
  description: '计算一笔交易的分账金额',
  inputSchema: {
    type: 'object',
    properties: {
      orderAmount: { type: 'number', description: '订单金额' },
      productType: { type: 'string', enum: ['physical', 'service', 'digital', 'nft'] },
      participants: {
        type: 'object',
        properties: {
          promoter: { type: 'string', description: '推广者钱包地址' },
          referrer: { type: 'string', description: '推荐人钱包地址' },
          executor: { type: 'string', description: '执行者钱包地址' },
        }
      }
    },
    required: ['orderAmount', 'productType']
  },
  outputSchema: {
    type: 'object',
    properties: {
      merchant: { type: 'number' },
      platform: { type: 'number' },
      channel: { type: 'number' },
      agents: { type: 'array', items: { wallet: 'string', amount: 'number', role: 'string' } }
    }
  }
};
```

---

## 10. 技术实现路线图

### 10.1 Phase 1: 基础设施 (v2.1 - 4周)

| 任务 | 模块 | 详情 | 优先级 |
| :--- | :--- | :--- | :--- |
| Skill 表结构升级 | Backend | 添加 `layer`, `resourceType`, `source`, `platformSchemas` 字段 | P0 |
| 合并 plugins/skills 表 | Backend | 统一为 skills 表，plugins 作为历史兼容视图 | P0 |
| Skill Converter Service | Backend | 实现 ProductToSkillConverter | P0 |
| 多平台 Schema 生成器 | Backend | 自动生成 OpenAI/Claude/Gemini Schema | P0 |
| 统一 Marketplace API | Backend | `/api/marketplace/*` 新接口 | P0 |
| 核心支付 Skill | Backend | wallet_create, x402_pay, quickpay_execute | P0 |

### 10.2 Phase 2: 聚合与转换 (v2.2 - 4周)

| 任务 | 模块 | 详情 | 优先级 |
| :--- | :--- | :--- | :--- |
| MCP Server Proxy | Backend | 代理官方 Claude MCP Servers | P0 |
| OpenAPI Importer | Backend | 从 OpenAPI Schema 导入外部 Skill | P0 |
| 商品自动转换流程 | Backend | 商户商品上传时自动生成 Skill | P0 |
| 分账 Skill 实现 | Backend | commission_calculate, commission_distribute | P0 |
| External Skill Registry | Backend | 外部 Skill 注册与管理 | P1 |
| A2A 消息协议 | Backend | Agent 间通信基础设施 | P1 |

### 10.3 Phase 3: 交互与体验 (v2.3 - 4周)

| 任务 | 模块 | 详情 | 优先级 |
| :--- | :--- | :--- | :--- |
| 统一 Marketplace UI | Frontend | 重构为单一市场入口 | P0 |
| Skill Topology 可视化 | Frontend | 展示 Skill 依赖关系 | P1 |
| A2H 组件库 | Frontend | 标准化 Human 交互组件 | P0 |
| Agent Builder 重构 | Frontend | 从"模版安装"转向"技能组装" | P1 |
| Live Feed 实时流 | Frontend | 全网 Skill 调用实时展示 | P2 |
| Analytics Dashboard | Frontend | 开发者/商户收益面板 | P1 |

### 10.4 Phase 4: 智能化与自治 (v2.4 - 持续)

| 任务 | 模块 | 详情 | 优先级 |
| :--- | :--- | :--- | :--- |
| 智能 Skill 推荐 | Backend | 基于用户意图的 Skill 匹配 | P1 |
| Agent 协商引擎 | Backend | Agent 间自动分佣协商 | P2 |
| Workflow Composer | Backend | 可视化 Skill 编排工具 | P2 |
| 链上 Skill 注册 | Contract | Skill 元数据上链 | P2 |
| 去中心化 Skill 市场 | Contract | 基于智能合约的市场治理 | P3 |

### 10.5 数据库变更清单

```sql
-- 1. 扩展 skills 表
ALTER TABLE skills ADD COLUMN layer VARCHAR(20) DEFAULT 'logic';
ALTER TABLE skills ADD COLUMN resource_type VARCHAR(20);
ALTER TABLE skills ADD COLUMN source VARCHAR(20) DEFAULT 'native';
ALTER TABLE skills ADD COLUMN original_platform VARCHAR(50);
ALTER TABLE skills ADD COLUMN human_accessible BOOLEAN DEFAULT true;
ALTER TABLE skills ADD COLUMN compatible_agents JSONB DEFAULT '["all"]';
ALTER TABLE skills ADD COLUMN permissions JSONB DEFAULT '["read"]';

-- 2. 创建外部 Skill 映射表
CREATE TABLE external_skill_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agentrix_skill_id UUID REFERENCES skills(id),
    external_platform VARCHAR(50) NOT NULL,
    external_id VARCHAR(200) NOT NULL,
    external_endpoint VARCHAR(500),
    proxy_config JSONB,
    sync_status VARCHAR(20) DEFAULT 'active',
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(external_platform, external_id)
);

-- 3. 创建商品-Skill 转换表
CREATE TABLE product_skill_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    skill_id UUID REFERENCES skills(id),
    conversion_config JSONB,
    auto_sync BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id)
);

-- 4. 创建 Skill 调用统计表
CREATE TABLE skill_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID REFERENCES skills(id),
    caller_type VARCHAR(20), -- 'agent' | 'human'
    caller_id VARCHAR(100),
    platform VARCHAR(50),
    execution_time_ms INT,
    success BOOLEAN,
    revenue_generated DECIMAL(20, 6),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_skill_analytics_skill_time ON skill_analytics(skill_id, created_at);
```

---

## 附录

### A. 术语表

| 术语 | 定义 |
| :--- | :--- |
| **ASP** | Agentrix Skill Protocol - Agentrix 统一技能协议 |
| **SID** | Skill Identifier - 技能唯一标识符 |
| **A2A** | Agent-to-Agent - Agent 间通信协议 |
| **A2H** | Agent-to-Human - Agent 与人类交互协议 |
| **MCP** | Model Context Protocol - Anthropic 的模型上下文协议 |
| **ARN** | Agent Resource Network - Agent 资源网络 |

### B. 参考文档

- [AGENTRIX_MCP_ECOSYSTEM_PRD.md](./AGENTRIX_MCP_ECOSYSTEM_PRD.md)
- [AI-Platform-Integration-Guide.md](./AI-Platform-Integration-Guide.md)
- [Agentrix生态分成机制详细设计-V4.0.md](./Agentrix生态分成机制详细设计-V4.0.md)
- [MCP Protocol Specification](https://modelcontextprotocol.io/docs)
- [OpenAI Actions Documentation](https://platform.openai.com/docs/actions)

---

**文档版本历史**

| 版本 | 日期 | 变更内容 |
| :--- | :--- | :--- |
| v1.0 | 2026-01-10 | 初版，基础架构定义 |
| v2.0 | 2026-01-11 | 全面重构：统一 Marketplace、多生态聚合、A2A/A2H 协议、核心 Skill 清单 |

---

*"在 Agentrix 中，我们不再销售工具，我们销售的是赋予 AI 改变现实世界的能力。"*
