# Agentrix 合约标准化路线图

> 目标：使 Agentrix 分账结算合约成为 AI Agent 生态的标准基础设施

---

## 一、当前状态评估

### 已实现功能 ✅
- [x] 多角色分账 (商户/Agent/平台)
- [x] Session Key 管理 (ERC-8004)
- [x] X402 协议适配
- [x] 自动支付授权 (AutoPay)
- [x] 支付路由
- [x] 争议标记机制

### 缺失功能 ❌
- [ ] 标准化接口 (EIP 兼容)
- [ ] 跨链通信
- [ ] Agent 注册/发现
- [ ] 协作协议链上存证
- [ ] 结果证明验证 (Audit Proof)
- [ ] DAO 治理
- [ ] SDK / Developer Tools

---

## 二、标准化 TODO 清单

### Phase 1: 接口标准化 (EIP 兼容) 🎯

| 任务 | 描述 | 优先级 | 预计工时 |
|-----|------|-------|---------|
| T1.1 | 定义 IAgentPayment 接口 | P0 | 4h |
| T1.2 | 定义 IAgentRegistry 接口 | P0 | 4h |
| T1.3 | 定义 ICollaboration 接口 | P1 | 4h |
| T1.4 | 定义 IAuditProof 接口 | P1 | 4h |
| T1.5 | 撰写 EIP 草案 (ERC-XXXX) | P2 | 8h |

**接口定义草案**:

```solidity
// IAgentPayment.sol - Agent 支付标准
interface IAgentPayment {
    struct PaymentIntent {
        bytes32 intentId;
        address payer;
        address[] recipients;
        uint256[] amounts;
        bytes32 collaborationId;
        bytes metadata;
    }
    
    function createIntent(PaymentIntent calldata intent) external returns (bytes32);
    function executeIntent(bytes32 intentId, bytes calldata proof) external;
    function cancelIntent(bytes32 intentId) external;
    
    event IntentCreated(bytes32 indexed intentId, address indexed payer);
    event IntentExecuted(bytes32 indexed intentId, uint256 totalAmount);
}

// IAgentRegistry.sol - Agent 注册标准
interface IAgentRegistry {
    struct AgentInfo {
        bytes32 agentId;
        address owner;
        string endpoint;  // API/MCP endpoint
        bytes32[] capabilities;
        uint256 trustScore;
        bool isActive;
    }
    
    function registerAgent(AgentInfo calldata info) external returns (bytes32);
    function updateAgent(bytes32 agentId, AgentInfo calldata info) external;
    function deactivateAgent(bytes32 agentId) external;
    function getAgent(bytes32 agentId) external view returns (AgentInfo memory);
    
    event AgentRegistered(bytes32 indexed agentId, address indexed owner);
}
```

---

### Phase 2: Agent 注册与发现 🔍

| 任务 | 描述 | 优先级 | 预计工时 |
|-----|------|-------|---------|
| T2.1 | 实现 AgentRegistry 合约 | P0 | 8h |
| T2.2 | Agent 能力声明机制 | P1 | 4h |
| T2.3 | 信任评分计算 | P1 | 4h |
| T2.4 | Agent 黑名单机制 | P1 | 2h |
| T2.5 | 与 EAS 集成 (链上存证) | P2 | 6h |

**AgentRegistry 设计要点**:
- 每个 Agent 有唯一 `agentId` (bytes32)
- 声明 capabilities (如 "payment", "search", "analysis")
- 链上信任评分 (基于历史交易)
- 支持 ENS 集成 (agent.agentrix.eth)

---

### Phase 3: 协作协议链上化 🤝

| 任务 | 描述 | 优先级 | 预计工时 |
|-----|------|-------|---------|
| T3.1 | 实现 CollaborationAgreement 合约 | P0 | 8h |
| T3.2 | 多签批准机制 | P1 | 4h |
| T3.3 | 分成比例链上存储 | P0 | 4h |
| T3.4 | 协议版本管理 | P2 | 2h |
| T3.5 | 协议模板库 | P2 | 4h |

**协作协议结构**:
```solidity
struct CollaborationAgreement {
    bytes32 agreementId;
    address[] agents;           // 参与的 Agent
    uint256[] shareRatios;      // 分成比例 (basis points)
    uint256 validFrom;
    uint256 validUntil;
    bytes32 termsHash;          // 条款哈希 (链下存储)
    uint8 requiredApprovals;    // 需要的签名数
    mapping(address => bool) approvals;
    AgreementStatus status;
}
```

---

### Phase 4: 结果证明 (Audit Proof) 🔒

| 任务 | 描述 | 优先级 | 预计工时 |
|-----|------|-------|---------|
| T4.1 | 定义 Proof 数据结构 | P0 | 4h |
| T4.2 | 实现 AuditProofVerifier 合约 | P0 | 8h |
| T4.3 | Merkle Tree 验证 | P1 | 4h |
| T4.4 | ZK Proof 集成 (可选) | P3 | 16h |
| T4.5 | 结果到支付的原子绑定 | P1 | 6h |

**Audit Proof 流程**:
```
1. Agent 执行任务 → 生成 resultHash
2. 多方签名 resultHash
3. 链上提交 Proof
4. 验证通过 → 触发自动分账
```

---

### Phase 5: 跨链支持 🌐

| 任务 | 描述 | 优先级 | 预计工时 |
|-----|------|-------|---------|
| T5.1 | 抽象 Token 接口 (USDC/USDT) | P0 | 4h |
| T5.2 | 多链配置管理 | P0 | 4h |
| T5.3 | LayerZero/Axelar 集成评估 | P2 | 8h |
| T5.4 | 跨链消息传递 | P2 | 12h |
| T5.5 | 统一流动性管理 | P3 | 8h |

---

### Phase 6: Agent Skill/Plugin 生态接入 🔌 (新增)

> 目标：通过 Skill/Plugin 方式让 AI 生态（ChatGPT、Claude、Gemini）一键接入支付能力

| 任务 | 描述 | 优先级 | 预计工时 |
|-----|------|-------|---------|
| T6.0 | **MCP Payment Skill** - Claude/ChatGPT 支付技能 | **P0** | 8h |
| T6.1 | **GPT Action Schema** - OpenAPI 3.0 规范 | P0 | 4h |
| T6.2 | **意图支付 Skill** - 自然语言到分账的原子操作 | P0 | 6h |
| T6.3 | **Proof 提交 Skill** - 任务完成证明提交 | P1 | 4h |
| T6.4 | **分账树生成器 Skill** - SplitTreeGenerator 封装 | P1 | 4h |

**MCP Payment Skill 设计**:
```typescript
// Tool: agent_payment
{
  name: 'agent_payment',
  description: '一键完成 Agent 间的支付和分账。支持自然语言描述任务，自动生成分账树并执行支付。',
  inputSchema: {
    type: 'object',
    properties: {
      intent: { type: 'string', description: '支付意图的自然语言描述，如"支付100U给翻译Agent，从上周的预存款扣"' },
      amount: { type: 'number', description: '支付金额（USDC）' },
      recipientAgentId: { type: 'string', description: '收款 Agent ID' },
      taskId: { type: 'string', description: '关联的任务ID（用于 Audit Proof）' },
      splitConfig: {
        type: 'object',
        description: '可选的分账配置',
        properties: {
          referrer: { type: 'string' },
          referralFee: { type: 'number' },
          platformFee: { type: 'number' }
        }
      }
    },
    required: ['amount', 'recipientAgentId']
  }
}
```

---

### Phase 6.5: SDK & Developer Tools 🛠️

| 任务 | 描述 | 优先级 | 预计工时 |
|-----|------|-------|---------|
| T6.5 | TypeScript SDK | P0 | 16h |
| T6.6 | Python SDK | P1 | 12h |
| T6.7 | CLI 工具 | P2 | 8h |
| T6.8 | 合约 ABI 文档生成 | P1 | 4h |
| T6.9 | 集成示例代码 | P1 | 8h |

**SDK 核心功能**:
```typescript
// agentrix-sdk usage
const agentrix = new AgentrixSDK({ chain: 'base', token: 'usdc' });

// 注册 Agent
await agentrix.registerAgent({
  name: 'MyAgent',
  endpoint: 'https://api.myagent.ai/mcp',
  capabilities: ['payment', 'search']
});

// 创建协作协议
await agentrix.createCollaboration({
  agents: ['agent1', 'agent2'],
  shares: [7000, 3000], // 70%, 30%
});

// 执行支付
await agentrix.pay({
  orderId: 'order-123',
  amount: 100_000000, // 100 USDC
  collaborationId: 'collab-456'
});
```

---

### Phase 7.5: 完全自然语言意图支付 🧠 (新增)

> 目标：实现从自然语言到支付执行的完整链路，支持复杂混合意图

| 任务 | 描述 | 优先级 | 预计工时 |
|-----|------|-------|---------|
| T7.5.1 | **LLM 语义映射引擎** - 替代规则引擎的关键词匹配 | **P0** | 8h |
| T7.5.2 | **意图确认流** - 交易预览 → 用户确认 → MPC签名 | **P0** | 12h |
| T7.5.3 | **混合意图解析** - 支付+任务关联，Session上下文绑定 | P0 | 8h |
| T7.5.4 | **预存款关联** - ERC8004 Session 与后端任务系统打通 | P1 | 6h |
| T7.5.5 | **多轮对话意图累积** - 上下文记忆与意图修正 | P1 | 6h |

**意图确认流完整链路**:
```
用户输入: "帮我修这张图，钱从我上周存的100U里扣"
                ↓
1. LLM语义解析 → { intent: 'pay_from_deposit', amount: ?, taskType: 'image_edit', sessionRef: 'last_week_deposit' }
                ↓
2. Session关联 → 查找用户上周的 ERC8004 Session，确认余额 100U
                ↓
3. 任务创建 → 创建 image_edit 任务，关联 sessionId
                ↓
4. 交易预览 → 显示: "从 Session #xxx 扣款 ? USDC，支付给图片编辑Agent"
                ↓
5. 用户确认 → "确认支付"
                ↓
6. MPC签名 → 调用 AutoPay 或 QuickPay 执行扣款
                ↓
7. 分账执行 → Commission.sol._autoSplit() 自动分账
                ↓
8. Proof记录 → 任务完成后提交 Audit Proof
```

**缺失项补充清单**:
- [ ] LLM Provider 抽象层（支持 OpenAI/Claude/Gemini 切换）
- [ ] 意图置信度阈值配置
- [ ] 歧义消解对话模板
- [ ] 多语言意图识别（中/英/日）
- [ ] 意图历史追溯与审计

---

### Phase 8: 治理 & 升级 🏛️

| 任务 | 描述 | 优先级 | 预计工时 |
|-----|------|-------|---------|
| T8.1 | 实现 Proxy 升级模式 | P1 | 6h |
| T8.2 | Timelock 控制器 | P1 | 4h |
| T8.3 | 参数治理 (费率等) | P2 | 4h |
| T8.4 | DAO 投票机制 (远期) | P3 | 16h |

---

## 三、多链部署准备

### 目标链配置

| 链 | 代币 | 精度 | RPC | 状态 |
|---|-----|-----|-----|-----|
| BNB Chain | USDT | 18 | bsc-dataseed.binance.org | ✅ 已配置 |
| Base | USDC | 6 | mainnet.base.org | ⏳ 待添加 |
| Arbitrum | USDC | 6 | arb1.arbitrum.io/rpc | ⏳ 远期 |

### 多链部署 TODO

| 任务 | 描述 | 优先级 |
|-----|------|-------|
| M1 | 添加 Base 网络配置 | P0 |
| M2 | 代币精度适配 (6 vs 18) | P0 |
| M3 | 多链代币地址配置 | P0 |
| M4 | 部署脚本参数化 | P1 |
| M5 | 验证脚本适配 | P1 |
| M6 | 文档更新 | P2 |

### 代币地址清单

```typescript
const TOKENS = {
  bsc: {
    USDT: '0x55d398326f99059fF775485246999027B3197955', // 18 decimals
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // 18 decimals
  },
  base: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // 6 decimals
  },
  arbitrum: {
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // 6 decimals
  }
};
```

---

## 四、实施优先级排序

### 🔥 上线前必须 (P0)

1. **安全修复** - 审计报告中的 Critical/High 问题
2. **接口标准化** - IAgentPayment, IAgentRegistry
3. **多链支持** - Base USDC 部署准备
4. **代币精度适配** - 6/18 decimals 统一处理

### 📌 上线后第一迭代 (P1)

1. AgentRegistry 合约实现
2. CollaborationAgreement 合约
3. TypeScript SDK 发布
4. Proxy 升级模式

### 🎯 生态扩展 (P2-P3)

1. Audit Proof 验证
2. 跨链消息传递
3. DAO 治理
4. ZK Proof 集成

---

## 五、里程碑时间表

| 里程碑 | 内容 | 目标日期 |
|-------|------|---------|
| M1 | 安全修复 + 编译通过 | 2026-01-15 |
| M2 | 接口标准化完成 | 2026-01-31 |
| M3 | 多链部署 (BSC + Base) | 2026-02-15 |
| M4 | AgentRegistry + SDK | 2026-03-15 |
| M5 | Collaboration 协议 | 2026-04-15 |
| M6 | Audit Proof 验证 | 2026-06-01 |

---

## 六、成为 AI 生态标准的关键要素

### 技术层面
- [ ] EIP 标准提案 (类似 ERC-20, ERC-721)
- [ ] 参考实现开源
- [ ] 多语言 SDK
- [ ] 完善的文档

### 生态层面
- [ ] 与主流 AI 平台集成 (OpenAI, Anthropic, Google)
- [ ] MCP 协议原生支持
- [ ] Agent 框架集成 (LangChain, AutoGPT)
- [ ] 开发者社区建设

### 治理层面
- [ ] 标准委员会
- [ ] 版本管理流程
- [ ] 兼容性认证

---

## 七、三方插件与跨平台生态集成 (Claude MCP & GPT Actions)

> 目标：实现 “Write Once, Run Everywhere”，让 Agentrix Marketplace 兼容主流 AI 生态的插件资产。相关术语已统一：**弃用“插件 (Plugin)”概念，全面转向“技能 (Skill)”与“工具 (Tool)”**。

### 1. 外部生态现状调研与 Agentrix 决策

| 平台 | 核心单元 | 现状 | Agentrix 映射 |
| :--- | :--- | :--- | :--- |
| **Claude** | **Tools (via MCP)** | 无中心化 Store，通过 MCP 协议直接调用 Tool。 | **AX Skill** |
| **ChatGPT** | **Actions** | 插件(Plugins)已停用，Action 基于 OpenAPI。 | **AX Skill** |
| **Agentrix**| **Skills** | **核心概念**。原子化功能单元，支持计费与结算。 | - |
| **Agentrix**| **Plugins** | **已废弃 / 仅限底层基础设施**（如支付网关驱动）。 | **已弃用** |

**决策建议**：
1.  **品牌统一**：将 “Plugin Marketplace” 更名为 “Skill Marketplace”。
2.  **Builder 适配**：`AgentBuilder` 不再基于“插件模板”，而是基于 **“技能组合 (Skill Sets / Capability Packs)”**。
3.  **协议对齐**：所有 Skill 必须兼容 MCP Tool 定义和 OpenAPI Schema，实现自动跨平台发布。

### 2. 集成至 Agentrix Marketplace 的技术路径


#### **路径 A：Claude MCP 插件导入 (Agentrix as MCP Host)**
*   **实现方案**：在 Agentrix 后端实现 MCP Client Bridge。
*   **工作内容**：
    1.  **MCP Host 适配器**：支持连接外部 MCP Server（本地进程 stdio 或 远程 SSE）。
    2.  **Manifest 映射**：将 MCP 的 `ListTools` 输出自动转换为 Agentrix `Skill` 实体。
    3.  **动态 Tool 调用**：`SkillExecutor` 增加 `mcp` 类型，将请求转发至对应 MCP Server。

#### **路径 B：ChatGPT Actions 导入 (OpenAPI Importer)**
*   **实现方案**：开发 OpenAPI 到 AX Skill 的自动化转换工具。
*   **工作内容**：
    1.  **Schema 转换器**：解析 OpenAPI `.yaml/.json`，提取 `paths`, `parameters`, `requestBody`。
    2.  **Auth 代理**：处理外部 API 所需的 API Key 或 OAuth2 凭证存储。
    3.  **批量导入工具**：允许商户通过粘贴 URL 一键导入 GPT Actions 到自己的 Agent 配置中。

### 3. 具体实施步骤 (Plugin Store Integration)

| 阶段 | 任务 | 描述 |
| :--- | :--- | :--- |
| **Phase 1** | **OpenAPI Importer** | 支持通过 OpenAPI URL 导入技能。解决 ChatGPT 生态迁移问题。 |
| **Phase 2** | **MCP Host Bridge** | 实现后端 MCP Client。支持直接运行 Claude 生态的开源 MCP 插件 (如 Google Search, GitHub)。 |
| **Phase 3** | **Marketplace Syncer** | 对接 MCP-Hub 等第三方仓库，实现“一键同步”热门插件到 Agentrix 市场。 |
| **Phase 4** | **Security Validator** | 对导入的外部插件进行权限审计（如限制出站域名），确保钱包操作安全。 |

---

*路线图版本: v1.1 | 更新日期: 2026-01-11*

