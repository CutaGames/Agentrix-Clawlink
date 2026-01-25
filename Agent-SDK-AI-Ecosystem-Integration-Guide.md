# Agentrix Agent SDK - AI生态系统集成指南

本文档介绍如何将Agentrix Agent核心功能模块集成到主流AI生态系统（GPTs、Claude MCP、Gemini等）。

## 📦 新增SDK模块概览

SDK v2.3.0新增了以下Agent核心功能模块：

### 1. Agent授权管理 (`agentAuthorization`)
- ERC8004 Session Key授权
- MPC钱包授权
- API Key授权
- 策略权限配置

### 2. 空投发现与领取 (`airdrop`)
- 自动扫描空投机会
- 资格检查
- 一键领取/批量领取
- 空投历史追踪

### 3. 自动收益 (`autoEarn`)
- **任务系统**: 空投任务、策略任务、推荐任务
- **策略引擎**: DCA、网格交易、套利、Copy Trading
- **套利模块**: 机会扫描、自动执行
- **Launchpad**: 项目发现、参与投资

### 4. MPC钱包 (`mpcWallet`)
- 安全钱包创建
- 资产管理
- 自动分账配置
- 密钥分片恢复

---

## 🔧 SDK基础使用

### 安装

```bash
npm install @agentrix/sdk
```

### 初始化

```typescript
import Agentrix from '@agentrix/sdk';

const client = new Agentrix({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.agentrix.io'
});
```

### 使用Agent模块

```typescript
// Agent授权
const auth = await client.agentAuthorization.create({
  agentId: 'agent-123',
  type: 'erc8004_session',
  limit: { singleLimit: 100, dailyLimit: 1000 }
});

// 空投发现
const airdrops = await client.airdrop.discover();

// 自动收益
const stats = await client.autoEarn.getStats();

// MPC钱包
const wallet = await client.mpcWallet.create('mainnet');
```

---

## 🤖 GPTs集成 (ChatGPT Actions)

### 获取OpenAPI Schema

```typescript
import { AIEcosystemIntegration } from '@agentrix/sdk';

// 获取完整OpenAPI规范
const schema = AIEcosystemIntegration.getOpenAPISchema();

// 获取GPTs Actions配置
const gptConfig = AIEcosystemIntegration.getGPTsActionsConfig();
console.log('Auth URL:', gptConfig.auth.authorizationUrl);
console.log('Actions Schema:', gptConfig.actionsSchema);
```

### GPTs配置步骤

1. **创建GPT**
   - 访问 https://chat.openai.com/gpts/editor
   - 点击 "Create a GPT"

2. **配置Actions**
   - 在"Configure"标签页找到"Actions"
   - 点击"Create new action"
   - 导入SDK生成的OpenAPI Schema

3. **设置认证**
   ```yaml
   Authentication Type: OAuth
   Client ID: [Your Agentrix Client ID]
   Client Secret: [Your Agentrix Client Secret]
   Authorization URL: https://api.agentrix.io/oauth/authorize
   Token URL: https://api.agentrix.io/oauth/token
   Scope: agent:read agent:write wallet:read wallet:write
   ```

4. **可用Actions示例**
   - `agent_create_authorization` - 创建Agent授权
   - `airdrop_discover` - 发现空投机会
   - `autoearn_get_stats` - 获取收益统计
   - `mpc_wallet_get_balances` - 查询钱包余额

### GPT Prompt示例

```
你是一个Agentrix Agent助手，可以帮助用户：
1. 管理Agent授权 - 创建、查看、撤销Agent访问权限
2. 发现和领取空投 - 扫描可用空投并帮助用户领取
3. 自动收益管理 - 查看收益统计、管理策略
4. MPC钱包操作 - 查询余额、执行交易

当用户询问时，使用相应的Actions获取数据并提供有帮助的建议。
```

---

## 🔌 Claude MCP集成

### 获取MCP配置

```typescript
import { AIEcosystemIntegration } from '@agentrix/sdk';

// 获取Claude MCP工具定义
const tools = AIEcosystemIntegration.getMCPTools();

// 获取完整MCP配置
const mcpConfig = AIEcosystemIntegration.getClaudeMCPConfig();
```

### MCP服务器实现

创建 `mcp-server.ts`:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import Agentrix, { AIEcosystemIntegration } from '@agentrix/sdk';

const client = new Agentrix({
  apiKey: process.env.AGENTRIX_API_KEY!
});

const server = new Server(
  { name: 'agentrix-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// 注册所有MCP工具
const tools = AIEcosystemIntegration.getMCPTools();

server.setRequestHandler('tools/list', async () => ({
  tools: tools
}));

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'agent_list_authorizations':
      return { content: [{ type: 'text', text: JSON.stringify(
        await client.agentAuthorization.listByUser()
      )}]};
      
    case 'airdrop_discover':
      return { content: [{ type: 'text', text: JSON.stringify(
        await client.airdrop.discover()
      )}]};
      
    case 'autoearn_get_stats':
      return { content: [{ type: 'text', text: JSON.stringify(
        await client.autoEarn.getStats()
      )}]};
      
    case 'mpc_wallet_get_balances':
      return { content: [{ type: 'text', text: JSON.stringify(
        await client.mpcWallet.getBalances(args.walletId)
      )}]};
      
    // ... 更多工具实现
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Claude Desktop配置

在 `~/.config/claude/config.json` 中添加：

```json
{
  "mcpServers": {
    "agentrix": {
      "command": "node",
      "args": ["/path/to/mcp-server.js"],
      "env": {
        "AGENTRIX_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 可用MCP工具

| 工具名 | 描述 |
|--------|------|
| `agent_list_authorizations` | 列出所有Agent授权 |
| `agent_create_authorization` | 创建新授权 |
| `agent_revoke_authorization` | 撤销授权 |
| `airdrop_discover` | 发现空投机会 |
| `airdrop_claim` | 领取空投 |
| `autoearn_get_stats` | 获取收益统计 |
| `autoearn_list_strategies` | 列出策略 |
| `autoearn_scan_arbitrage` | 扫描套利机会 |
| `mpc_wallet_create` | 创建MPC钱包 |
| `mpc_wallet_get_balances` | 获取余额 |
| `mpc_wallet_send` | 发送交易 |

---

## 📊 完整API参考

### AgentAuthorizationResource

```typescript
interface AgentAuthorizationResource {
  // 创建授权
  create(dto: CreateAgentAuthorizationParams): Promise<AgentAuthorization>;
  
  // 查询授权
  listByUser(): Promise<AgentAuthorization[]>;
  listByAgent(agentId: string): Promise<AgentAuthorization[]>;
  getActive(agentId: string): Promise<AgentAuthorization | null>;
  get(authorizationId: string): Promise<AgentAuthorization>;
  
  // 管理授权
  revoke(authorizationId: string): Promise<void>;
  updatePermissions(authorizationId: string, permissions: StrategyPermission[]): Promise<AgentAuthorization>;
  updateLimit(authorizationId: string, limit: Partial<AuthorizationLimit>): Promise<AgentAuthorization>;
  
  // 权限检查
  checkPermission(params: PermissionCheckParams): Promise<PermissionCheckResult>;
  getExecutionHistory(authorizationId: string, limit?: number): Promise<ExecutionHistory[]>;
}
```

### AirdropResource

```typescript
interface AirdropResource {
  // 发现空投
  discover(params?: DiscoverAirdropsParams): Promise<Airdrop[]>;
  list(params?: { status?: AirdropStatus; limit?: number }): Promise<Airdrop[]>;
  get(airdropId: string): Promise<Airdrop>;
  
  // 资格检查
  checkEligibility(airdropId: string, address?: string): Promise<EligibilityCheckResult>;
  getEligible(): Promise<Airdrop[]>;
  
  // 领取
  claim(airdropId: string, address?: string): Promise<ClaimResult>;
  claimAll(address?: string): Promise<BatchClaimResult>;
  
  // 历史
  getClaimed(): Promise<Airdrop[]>;
  refresh(): Promise<Airdrop[]>;
  getStats(): Promise<AirdropStats>;
}
```

### AutoEarnResource

```typescript
interface AutoEarnResource {
  // 总览
  getStats(): Promise<EarningsStats>;
  getDashboard(): Promise<DashboardData>;
  
  // 子资源
  tasks: TasksResource;
  strategies: StrategiesResource;
  arbitrage: ArbitrageResource;
  launchpad: LaunchpadResource;
}

interface TasksResource {
  list(params?: TaskListParams): Promise<Task[]>;
  get(taskId: string): Promise<Task>;
  execute(taskId: string): Promise<ExecuteResult>;
  cancel(taskId: string): Promise<void>;
}

interface StrategiesResource {
  list(params?: StrategyListParams): Promise<Strategy[]>;
  get(strategyId: string): Promise<Strategy>;
  create(type: AutoEarnStrategyType, config: StrategyConfig): Promise<Strategy>;
  start(strategyId: string): Promise<void>;
  pause(strategyId: string): Promise<void>;
  stop(strategyId: string): Promise<void>;
  update(strategyId: string, config: Partial<StrategyConfig>): Promise<Strategy>;
  delete(strategyId: string): Promise<void>;
}

interface ArbitrageResource {
  scan(params?: ScanParams): Promise<ArbitrageOpportunity[]>;
  execute(opportunityId: string, amount: number): Promise<TradeResult>;
  startAuto(config: AutoArbitrageConfig): Promise<{ strategyId: string }>;
  stopAuto(strategyId: string): Promise<void>;
  getHistory(limit?: number): Promise<ArbitrageHistory[]>;
}

interface LaunchpadResource {
  discover(params?: DiscoverParams): Promise<LaunchpadProject[]>;
  getProject(projectId: string): Promise<LaunchpadProject>;
  checkWhitelist(projectId: string): Promise<WhitelistStatus>;
  participate(projectId: string, amount: number): Promise<ParticipateResult>;
  getHistory(): Promise<ParticipationHistory[]>;
}
```

### MPCWalletResource

```typescript
interface MPCWalletResource {
  // 钱包管理
  create(network: string, name?: string): Promise<WalletCreationResult>;
  get(walletId: string): Promise<MPCWallet>;
  getBalances(walletId: string, tokens?: string[]): Promise<TokenBalance[]>;
  
  // 恢复
  recover(walletId: string, shardC: string): Promise<RecoveryResult>;
  exportShardC(walletId: string): Promise<{ shardC: string; expiresAt: Date }>;
  
  // 自动分账
  setAutoSplit(walletId: string, config: AutoSplitConfig): Promise<MPCWallet>;
  
  // 交易
  sendTransaction(walletId: string, params: TransactionParams): Promise<TransactionResult>;
  
  // 锁定
  lock(walletId: string): Promise<void>;
  unlock(walletId: string): Promise<void>;
}
```

---

## 🚀 快速开始示例

### 完整集成示例

```typescript
import Agentrix, { AIEcosystemIntegration } from '@agentrix/sdk';

async function main() {
  const client = new Agentrix({
    apiKey: process.env.AGENTRIX_API_KEY!
  });

  // 1. 创建MPC钱包
  const wallet = await client.mpcWallet.create('bsc-testnet', 'My Agent Wallet');
  console.log('Wallet created:', wallet.address);

  // 2. 设置Agent授权
  const auth = await client.agentAuthorization.create({
    agentId: 'my-trading-agent',
    type: 'mpc_wallet',
    limit: { singleLimit: 100, dailyLimit: 1000 },
    allowedStrategies: ['dca', 'grid', 'arbitrage']
  });
  console.log('Authorization created:', auth.id);

  // 3. 发现空投
  const airdrops = await client.airdrop.discover();
  console.log(`Found ${airdrops.length} airdrops`);

  // 4. 启动自动套利
  await client.autoEarn.arbitrage.startAuto({
    pairs: ['USDT/USDC', 'BNB/BUSD'],
    minProfit: 0.5,
    maxAmount: 100
  });

  // 5. 获取收益统计
  const stats = await client.autoEarn.getStats();
  console.log('Total earnings:', stats.totalEarnings);

  // 6. 导出AI集成配置
  const openApiSchema = AIEcosystemIntegration.getOpenAPISchema();
  const mcpTools = AIEcosystemIntegration.getMCPTools();
  
  console.log('OpenAPI endpoints:', Object.keys(openApiSchema.paths).length);
  console.log('MCP tools:', mcpTools.length);
}

main().catch(console.error);
```

---

## 📝 更新日志

### v2.3.0 (2024-12-19)
- ✅ 新增 `AgentAuthorizationResource` - Agent授权管理
- ✅ 新增 `AirdropResource` - 空投发现与领取
- ✅ 新增 `AutoEarnResource` - 自动收益（任务、策略、套利、Launchpad）
- ✅ 新增 `MPCWalletResource` - MPC钱包管理
- ✅ 新增 `AIEcosystemIntegration` - AI生态集成工具
- ✅ 支持GPTs Actions配置导出
- ✅ 支持Claude MCP工具定义导出

---

## 📞 支持

- 文档: https://docs.agentrix.io/sdk
- GitHub: https://github.com/agentrix/sdk-js
- Discord: https://discord.gg/agentrix
