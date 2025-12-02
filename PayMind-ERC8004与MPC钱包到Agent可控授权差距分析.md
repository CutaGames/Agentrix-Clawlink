# PayMind ERC8004 与 MPC 钱包到 Agent 可控授权差距分析

**分析日期**: 2025-01-XX  
**分析范围**: 当前已完成的 ERC8004（QuickPay）和 MPC 钱包功能，与 ABTE 方案要求的 Agent 可控授权和策略级权限的差距  
**版本**: V1.0

---

## 📋 目录

1. [当前实现总览](#1-当前实现总览)
2. [ABTE 方案要求](#2-abte-方案要求)
3. [差距详细分析](#3-差距详细分析)
4. [实施建议](#4-实施建议)

---

## 1. 当前实现总览

### 1.1 ERC8004（QuickPay）实现 ✅

#### 核心功能
- ✅ **Session 管理**
  - 用户创建 Session（单笔限额、每日限额、过期时间）
  - Session Key 签名授权
  - 支持撤销 Session
  - 链上记录 Session 状态

- ✅ **限额控制**
  - 单笔限额（`singleLimit`）
  - 每日限额（`dailyLimit`）
  - 自动重置每日限额（跨天时）
  - 实时检查限额

- ✅ **支付执行**
  - 使用 Session Key 签名（链下）
  - Relayer 验证签名并执行（链上）
  - 支持批量支付（最多50笔/批次）

**数据结构**：
```solidity
struct Session {
    address signer;           // Session Key 地址
    address owner;            // 主钱包地址
    uint256 singleLimit;      // 单笔限额
    uint256 dailyLimit;       // 每日限额
    uint256 usedToday;        // 今日已用
    uint256 expiry;           // 过期时间戳
    uint256 lastResetDate;    // 上次重置日期
    bool isActive;           // 是否激活
}
```

**使用场景**：
- 用户创建 Session 用于 QuickPay 免密支付
- 商户后台暂未集成（主要用于用户端）

**文件位置**：
- `contract/contracts/ERC8004SessionManager.sol`
- `paymindfrontend/hooks/useSessionManager.ts`
- `paymindfrontend/components/payment/SessionManager.tsx`

---

### 1.2 MPC 钱包实现 ✅

#### 核心功能
- ✅ **MPC 钱包创建**
  - 3分片 MPC 钱包（分片A/B/C）
  - 2/3阈值恢复（任意2个分片可恢复）
  - 分片加密存储（AES-256-GCM）

- ✅ **自动分账授权**
  - 商户授权 PayMind 自动分账
  - 使用分片 B+C 签名
  - 最大金额限制（`autoSplitMaxAmount`）
  - 授权过期时间（`autoSplitExpiresAt`）

- ✅ **签名服务**
  - 场景1：商户主动支付（分片A+B）
  - 场景2：自动分账（分片B+C）
  - 场景3：商户提现（分片A+C）

**数据结构**：
```typescript
@Entity('mpc_wallets')
export class MPCWallet {
  merchantId: string;              // 商户ID
  walletAddress: string;           // MPC钱包地址
  chain: string;                   // 链类型
  currency: string;                // 币种
  encryptedShardB: string;         // 加密的分片B（PayMind持有）
  isActive: boolean;               // 是否激活
  autoSplitAuthorized: boolean;    // 是否授权自动分账
  autoSplitMaxAmount: string;      // 自动分账最大金额
  autoSplitExpiresAt: Date;        // 自动分账授权过期时间
}
```

**使用场景**：
- 商户后台 MPC 钱包管理
- 商户收款和自动分账
- 商户提现

**文件位置**：
- `backend/src/entities/mpc-wallet.entity.ts`
- `backend/src/modules/mpc-wallet/mpc-wallet.service.ts`
- `backend/src/modules/mpc-wallet/mpc-signature.service.ts`

---

## 2. ABTE 方案要求

### 2.1 L1: 账户与托管层要求

根据 ABTE 方案，L1 层需要实现：

1. **MPC / 多方签名钱包**
   - ✅ 当前已实现（商户MPC钱包）

2. **Agent 可控授权（限额 / 场景化 API Key）**
   - ⚠️ 部分实现（ERC8004有限额，但缺少场景化）
   - ❌ 缺少 Agent 级别的授权管理

3. **策略级权限（只允许执行某类策略）**
   - ❌ 完全缺失

### 2.2 ABTE 核心原则

**原则1**：每个 Agent 都是一个独立的做市商 / 清算节点
- 每个钱包内置自己的量化模型
- 每个商户和企业都有自己的资金管理 Agent
- 这些 Agent 不断地供给订单流、提供深度

**原则2**：Agent 直接与流动性层交互（绕过交易所 UI）
- Agent 自己指令资产去哪里换流动性最优
- 所有订单由 Agent 下发、组合、套利、批处理

**原则3**：用户不再下订单，用户只表达意图
- "帮我把 10% 资产换成 BTC，每周自动定投。"
- Agent 转换为策略树（Strategy Graph）

---

## 3. 差距详细分析

### 3.1 差距对比表

| ABTE 要求 | 当前实现 | 完成度 | 关键差距 | 优先级 |
|----------|---------|--------|---------|--------|
| **Agent 级别的授权管理** | ❌ | 0% | 当前授权是用户级别的，不是Agent级别的 | P0 |
| **场景化 API Key** | ⚠️ | 30% | ERC8004只有支付场景，缺少交易/做市/套利等场景 | P0 |
| **策略级权限** | ❌ | 0% | 完全缺失，无法限制Agent只能执行某类策略 | P0 |
| **Agent 与钱包绑定** | ⚠️ | 40% | MPC钱包只绑定商户，不绑定Agent | P0 |
| **动态权限调整** | ❌ | 0% | 无法根据策略执行情况动态调整权限 | P1 |
| **多策略并行授权** | ❌ | 0% | 无法同时授权多个策略（定投+套利+做市） | P1 |
| **策略执行历史追踪** | ❌ | 0% | 无法追踪每个策略的执行历史 | P1 |

---

### 3.2 核心差距详解

#### 🔴 **差距1：授权是用户级别的，不是Agent级别的** ⭐⭐⭐

**当前实现**：
```typescript
// ERC8004 Session
struct Session {
    address owner;  // 用户钱包地址
    address signer; // Session Key
    // ...
}

// MPC钱包
@Entity('mpc_wallets')
export class MPCWallet {
  merchantId: string;  // 商户ID
  // ...
}
```

**问题**：
- ERC8004 Session 绑定的是**用户钱包地址**，不是 Agent
- MPC 钱包绑定的是**商户ID**，不是 Agent
- 无法区分是哪个 Agent 在使用授权
- 无法为不同 Agent 设置不同的授权策略

**ABTE 要求**：
```typescript
// 应该是这样
struct AgentSession {
    address owner;        // 用户钱包地址
    string agentId;       // Agent ID ⭐
    address signer;      // Session Key
    StrategyPermission[] allowedStrategies; // 允许的策略列表 ⭐
    // ...
}
```

**影响**：
- 无法实现"每个 Agent 都是独立的做市商"
- 无法为不同 Agent 设置不同的交易策略
- 无法追踪每个 Agent 的执行情况

---

#### 🔴 **差距2：缺少场景化 API Key** ⭐⭐⭐

**当前实现**：
```solidity
// ERC8004 只有支付场景
function executeWithSession(
    bytes32 sessionId,
    address to,
    uint256 amount,
    bytes32 paymentId,
    bytes calldata signature
) external onlyRelayer
```

**问题**：
- ERC8004 只支持**支付场景**（`executeWithSession`）
- 无法区分不同的使用场景（支付/交易/做市/套利）
- 所有场景共享同一个限额

**ABTE 要求**：
```typescript
// 应该是这样
interface AgentAuthorization {
  agentId: string;
  scenarios: {
    payment: { singleLimit: number; dailyLimit: number; };      // 支付场景
    trading: { singleLimit: number; dailyLimit: number; };      // 交易场景
    marketMaking: { singleLimit: number; dailyLimit: number; }; // 做市场景
    arbitrage: { singleLimit: number; dailyLimit: number; };    // 套利场景
  };
  allowedTokens: string[];  // 允许的代币列表
  allowedDEXs: string[];    // 允许的DEX列表
  allowedCEXs: string[];    // 允许的CEX列表
}
```

**影响**：
- 无法为不同场景设置不同的限额
- 无法限制 Agent 只能使用特定的 DEX/CEX
- 无法限制 Agent 只能交易特定的代币

---

#### 🔴 **差距3：完全缺少策略级权限** ⭐⭐⭐

**当前实现**：
- ❌ 没有策略（Strategy）概念
- ❌ 没有策略权限管理
- ❌ 无法限制 Agent 只能执行某类策略

**ABTE 要求**：
```typescript
// 策略级权限
interface StrategyPermission {
  strategyType: 'dca' | 'grid' | 'arbitrage' | 'market_making' | 'rebalancing';
  allowed: boolean;
  maxAmount?: number;        // 该策略的最大金额
  maxFrequency?: number;     // 该策略的最大执行频率
  allowedTokens?: string[];  // 该策略允许的代币
  riskLimits?: {            // 风险限制
    maxDrawdown?: number;
    maxLeverage?: number;
    stopLoss?: number;
  };
}
```

**示例场景**：
```
用户："帮我把 10% 资产换成 BTC，每周自动定投。"

Agent 需要：
1. 检查是否有 "dca"（定投）策略权限
2. 检查是否有 "rebalancing"（调仓）策略权限
3. 检查 BTC 是否在允许的代币列表中
4. 检查金额是否在策略限额内
5. 检查风险限制（最大回撤、止损等）
```

**影响**：
- 无法实现"用户只表达意图，Agent 转换为策略树"
- 无法限制 Agent 只能执行安全的策略
- 无法防止 Agent 执行高风险操作

---

#### 🟡 **差距4：Agent 与钱包绑定不完整** ⭐⭐

**当前实现**：
- MPC 钱包绑定商户ID
- ERC8004 Session 绑定用户钱包地址
- 没有 Agent 与钱包的直接绑定关系

**ABTE 要求**：
```typescript
// Agent 与钱包绑定
interface AgentWalletBinding {
  agentId: string;
  walletAddress: string;      // Agent 使用的钱包地址
  walletType: 'mpc' | 'eoa' | 'aa'; // 钱包类型
  authorizedStrategies: string[];    // 该钱包允许的策略
  maxTotalAmount: number;     // 该钱包的总限额
}
```

**影响**：
- 无法实现"每个钱包内置自己的量化模型"
- 无法为不同钱包设置不同的策略权限
- 无法追踪每个钱包的执行情况

---

#### 🟡 **差距5：缺少动态权限调整** ⭐

**当前实现**：
- 权限是静态的（创建时设置，手动撤销）
- 无法根据执行情况自动调整

**ABTE 要求**：
```typescript
// 动态权限调整
interface DynamicPermission {
  // 根据执行结果调整权限
  adjustPermissionByResult(agentId: string, result: ExecutionResult): void;
  
  // 根据风险评分调整权限
  adjustPermissionByRisk(agentId: string, riskScore: number): void;
  
  // 根据收益调整权限
  adjustPermissionByProfit(agentId: string, profit: number): void;
}
```

**示例**：
- Agent 执行策略连续亏损 → 自动降低限额或暂停策略
- Agent 执行策略收益良好 → 自动提高限额
- Agent 风险评分过高 → 自动限制高风险策略

---

## 4. 实施建议

### 4.1 Phase 1: Agent 级别授权管理（2-3周）⭐ P0

#### 4.1.1 数据库设计

```sql
-- Agent 授权表
CREATE TABLE agent_authorizations (
  id UUID PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  authorization_type VARCHAR(50) NOT NULL, -- 'erc8004' | 'mpc' | 'api_key'
  session_id VARCHAR(255), -- ERC8004 Session ID
  mpc_wallet_id UUID, -- MPC钱包ID
  single_limit DECIMAL(18,6),
  daily_limit DECIMAL(18,6),
  total_limit DECIMAL(18,6), -- 总限额
  expiry TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX idx_agent_id (agent_id),
  INDEX idx_user_id (user_id)
);

-- Agent 策略权限表
CREATE TABLE agent_strategy_permissions (
  id UUID PRIMARY KEY,
  agent_authorization_id UUID NOT NULL,
  strategy_type VARCHAR(50) NOT NULL, -- 'dca' | 'grid' | 'arbitrage' | 'market_making' | 'rebalancing'
  allowed BOOLEAN DEFAULT true,
  max_amount DECIMAL(18,6),
  max_frequency INTEGER, -- 每小时/每天最大执行次数
  allowed_tokens TEXT[], -- 允许的代币列表
  allowed_dexs TEXT[], -- 允许的DEX列表
  allowed_cexs TEXT[], -- 允许的CEX列表
  risk_limits JSONB, -- 风险限制配置
  created_at TIMESTAMP,
  FOREIGN KEY (agent_authorization_id) REFERENCES agent_authorizations(id)
);

-- Agent 执行历史表
CREATE TABLE agent_execution_history (
  id UUID PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  authorization_id UUID NOT NULL,
  strategy_type VARCHAR(50),
  execution_type VARCHAR(50), -- 'payment' | 'trading' | 'market_making' | 'arbitrage'
  amount DECIMAL(18,6),
  token_address VARCHAR(255),
  dex_name VARCHAR(50),
  status VARCHAR(50), -- 'success' | 'failed' | 'rejected'
  error_message TEXT,
  executed_at TIMESTAMP,
  INDEX idx_agent_id (agent_id),
  INDEX idx_executed_at (executed_at)
);
```

#### 4.1.2 后端服务实现

```typescript
// backend/src/modules/agent-authorization/agent-authorization.service.ts
@Injectable()
export class AgentAuthorizationService {
  
  /**
   * 为 Agent 创建授权
   */
  async createAgentAuthorization(
    agentId: string,
    userId: string,
    config: {
      walletAddress: string;
      authorizationType: 'erc8004' | 'mpc' | 'api_key';
      singleLimit: number;
      dailyLimit: number;
      totalLimit: number;
      expiry: Date;
      allowedStrategies: StrategyPermission[];
    }
  ): Promise<AgentAuthorization> {
    // 1. 创建授权记录
    const authorization = await this.authorizationRepository.save({
      agentId,
      userId,
      walletAddress: config.walletAddress,
      authorizationType: config.authorizationType,
      singleLimit: config.singleLimit,
      dailyLimit: config.dailyLimit,
      totalLimit: config.totalLimit,
      expiry: config.expiry,
      isActive: true,
    });

    // 2. 创建策略权限
    for (const strategy of config.allowedStrategies) {
      await this.strategyPermissionRepository.save({
        authorizationId: authorization.id,
        strategyType: strategy.strategyType,
        allowed: strategy.allowed,
        maxAmount: strategy.maxAmount,
        maxFrequency: strategy.maxFrequency,
        allowedTokens: strategy.allowedTokens,
        allowedDEXs: strategy.allowedDEXs,
        allowedCEXs: strategy.allowedCEXs,
        riskLimits: strategy.riskLimits,
      });
    }

    // 3. 如果是 ERC8004，创建链上 Session
    if (config.authorizationType === 'erc8004') {
      const sessionId = await this.createERC8004Session(
        config.walletAddress,
        config.singleLimit,
        config.dailyLimit,
        config.expiry
      );
      await this.authorizationRepository.update(authorization.id, {
        sessionId,
      });
    }

    return authorization;
  }

  /**
   * 检查 Agent 是否有权限执行策略
   */
  async checkStrategyPermission(
    agentId: string,
    strategyType: string,
    amount: number,
    tokenAddress: string,
    dexName?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    // 1. 获取 Agent 的授权
    const authorization = await this.getActiveAuthorization(agentId);
    if (!authorization) {
      return { allowed: false, reason: 'Agent 未授权' };
    }

    // 2. 检查授权是否过期
    if (authorization.expiry && authorization.expiry < new Date()) {
      return { allowed: false, reason: '授权已过期' };
    }

    // 3. 检查策略权限
    const strategyPermission = await this.strategyPermissionRepository.findOne({
      where: {
        authorizationId: authorization.id,
        strategyType,
      },
    });

    if (!strategyPermission || !strategyPermission.allowed) {
      return { allowed: false, reason: `策略 ${strategyType} 未授权` };
    }

    // 4. 检查金额限制
    if (strategyPermission.maxAmount && amount > strategyPermission.maxAmount) {
      return { allowed: false, reason: `金额超过策略限额 ${strategyPermission.maxAmount}` };
    }

    // 5. 检查代币权限
    if (strategyPermission.allowedTokens && 
        !strategyPermission.allowedTokens.includes(tokenAddress)) {
      return { allowed: false, reason: `代币 ${tokenAddress} 未授权` };
    }

    // 6. 检查DEX权限
    if (dexName && strategyPermission.allowedDEXs && 
        !strategyPermission.allowedDEXs.includes(dexName)) {
      return { allowed: false, reason: `DEX ${dexName} 未授权` };
    }

    // 7. 检查频率限制
    const recentExecutions = await this.getRecentExecutions(agentId, strategyType);
    if (strategyPermission.maxFrequency && 
        recentExecutions.length >= strategyPermission.maxFrequency) {
      return { allowed: false, reason: `执行频率超过限制` };
    }

    return { allowed: true };
  }

  /**
   * 记录执行历史
   */
  async recordExecution(
    agentId: string,
    execution: {
      authorizationId: string;
      strategyType: string;
      executionType: string;
      amount: number;
      tokenAddress: string;
      dexName?: string;
      status: 'success' | 'failed' | 'rejected';
      errorMessage?: string;
    }
  ): Promise<void> {
    await this.executionHistoryRepository.save({
      agentId,
      ...execution,
      executedAt: new Date(),
    });
  }
}
```

---

### 4.2 Phase 2: 场景化 API Key（1-2周）⭐ P0

#### 4.2.1 扩展 ERC8004 合约

```solidity
// 扩展 Session 结构，支持场景
struct Session {
    address signer;
    address owner;
    uint256 singleLimit;
    uint256 dailyLimit;
    uint256 usedToday;
    uint256 expiry;
    uint256 lastResetDate;
    bool isActive;
    // ⭐ 新增字段
    string[] allowedScenarios;  // 允许的场景列表：['payment', 'trading', 'market_making', 'arbitrage']
    string[] allowedTokens;      // 允许的代币列表
    string[] allowedDEXs;        // 允许的DEX列表
}

// 扩展执行函数，支持场景参数
function executeWithSession(
    bytes32 sessionId,
    address to,
    uint256 amount,
    bytes32 paymentId,
    string calldata scenario,  // ⭐ 场景参数
    bytes calldata signature
) external onlyRelayer validSession(sessionId) {
    Session storage session = sessions[sessionId];
    
    // ⭐ 检查场景权限
    require(isScenarioAllowed(session, scenario), "Scenario not allowed");
    
    // 原有逻辑...
}

function isScenarioAllowed(Session storage session, string calldata scenario) 
    internal view returns (bool) {
    if (session.allowedScenarios.length == 0) {
        return true; // 如果没有限制，允许所有场景
    }
    for (uint i = 0; i < session.allowedScenarios.length; i++) {
        if (keccak256(bytes(session.allowedScenarios[i])) == keccak256(bytes(scenario))) {
            return true;
        }
    }
    return false;
}
```

#### 4.2.2 后端服务扩展

```typescript
// 创建场景化授权
async createScenarioAuthorization(
  agentId: string,
  scenarios: {
    payment?: { singleLimit: number; dailyLimit: number; };
    trading?: { singleLimit: number; dailyLimit: number; };
    marketMaking?: { singleLimit: number; dailyLimit: number; };
    arbitrage?: { singleLimit: number; dailyLimit: number; };
  },
  constraints: {
    allowedTokens?: string[];
    allowedDEXs?: string[];
    allowedCEXs?: string[];
  }
): Promise<AgentAuthorization> {
  // 为每个场景创建独立的 Session 或使用同一个 Session 但设置场景限制
  // ...
}
```

---

### 4.3 Phase 3: 策略级权限系统（2-3周）⭐ P0

#### 4.3.1 策略权限引擎

```typescript
// backend/src/modules/strategy-permission/strategy-permission-engine.service.ts
@Injectable()
export class StrategyPermissionEngine {
  
  /**
   * 检查策略权限（在 Agent 执行策略前调用）
   */
  async checkPermission(
    agentId: string,
    strategy: StrategyGraph,
    context: ExecutionContext
  ): Promise<PermissionResult> {
    // 1. 获取 Agent 授权
    const authorization = await this.getAuthorization(agentId);
    
    // 2. 检查每个策略节点的权限
    for (const node of strategy.nodes) {
      const permission = await this.checkNodePermission(
        authorization,
        node,
        context
      );
      if (!permission.allowed) {
        return permission;
      }
    }
    
    // 3. 检查风险限制
    const riskCheck = await this.checkRiskLimits(
      authorization,
      strategy,
      context
    );
    if (!riskCheck.allowed) {
      return riskCheck;
    }
    
    return { allowed: true };
  }

  /**
   * 检查策略节点权限
   */
  private async checkNodePermission(
    authorization: AgentAuthorization,
    node: StrategyNode,
    context: ExecutionContext
  ): Promise<PermissionResult> {
    const strategyPermission = await this.getStrategyPermission(
      authorization.id,
      node.type
    );
    
    // 检查金额、代币、DEX等限制
    // ...
  }

  /**
   * 检查风险限制
   */
  private async checkRiskLimits(
    authorization: AgentAuthorization,
    strategy: StrategyGraph,
    context: ExecutionContext
  ): Promise<PermissionResult> {
    const riskLimits = await this.getRiskLimits(authorization.id);
    
    // 检查最大回撤、杠杆、止损等
    // ...
  }
}
```

---

### 4.4 Phase 4: Agent 与钱包绑定（1-2周）⭐ P0

#### 4.4.1 扩展 MPC 钱包实体

```typescript
// 扩展 MPCWallet 实体
@Entity('mpc_wallets')
export class MPCWallet {
  // 原有字段...
  
  // ⭐ 新增字段
  @Column({ type: 'varchar', length: 255, nullable: true })
  agentId: string; // 绑定的 Agent ID
  
  @Column({ type: 'jsonb', nullable: true })
  agentConfig: {
    allowedStrategies: string[];
    maxTotalAmount: string;
    riskLimits: Record<string, any>;
  };
}
```

---

## 5. 实施优先级

### P0（立即开始，4-6周）

1. **Agent 级别授权管理**（2-3周）
   - 数据库设计
   - 后端服务实现
   - 前端界面开发

2. **场景化 API Key**（1-2周）
   - 扩展 ERC8004 合约
   - 后端服务扩展
   - 测试验证

3. **策略级权限系统**（2-3周）
   - 策略权限引擎
   - 风险限制检查
   - 集成到 Agent Runtime

### P1（第二阶段，2-3周）

4. **Agent 与钱包绑定**（1-2周）
5. **动态权限调整**（1周）

---

## 6. 总结

### 当前优势 ✅

1. **ERC8004 基础完善**：Session 管理、限额控制、支付执行都已实现
2. **MPC 钱包基础完善**：3分片、自动分账授权都已实现
3. **商户后台集成**：MPC 钱包已在商户后台完成 P0

### 核心差距 ❌

1. **授权是用户级别的，不是 Agent 级别的** ⭐⭐⭐
2. **缺少场景化 API Key** ⭐⭐⭐
3. **完全缺少策略级权限** ⭐⭐⭐
4. **Agent 与钱包绑定不完整** ⭐⭐

### 实施建议

**立即开始 Phase 1-3（4-6周）**，实现：
- Agent 级别授权管理
- 场景化 API Key
- 策略级权限系统

这样才能支持 ABTE 方案要求的"每个 Agent 都是独立的做市商"和"用户只表达意图，Agent 转换为策略树"。

---

**报告完成日期**: 2025-01-XX  
**建议审查**: 技术团队、产品团队

