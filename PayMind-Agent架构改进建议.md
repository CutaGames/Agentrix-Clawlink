# PayMind Agent 架构改进建议

## 📋 当前实现的问题

### 1. 没有独立的Core Brain层

**现状**：
- 所有Agent共享同一个`AgentService`和`AgentP0IntegrationService`
- 通过`mode`参数区分不同的Agent类型
- 功能耦合度高，难以独立扩展

**问题**：
- 无法为不同Agent配置不同的能力集
- 权限控制需要手动在每个处理函数中实现
- 难以实现Agent级别的个性化配置

### 2. Mode参数传递机制

**现状**：
- Mode参数从前端传递到后端
- 没有持久化存储（每次请求都需要传递）
- 没有权限验证（用户可以随意切换mode）

**问题**：
- 如果用户忘记传递mode，默认使用'user'模式
- 没有根据用户角色自动设置mode
- 安全性不足

---

## 🎯 改进方案

### 方案1：在Session中保存Mode（简单改进）

**实现步骤**：

1. **修改AgentSession实体**

```typescript
@Entity('agent_sessions')
export class AgentSession {
  // ... 现有字段
  
  @Column({ 
    type: 'enum', 
    enum: ['user', 'merchant', 'developer'],
    default: 'user'
  })
  mode: 'user' | 'merchant' | 'developer';  // ⭐ 新增字段
}
```

2. **修改AgentService.processMessage()**

```typescript
async processMessage(
  message: string,
  context?: any,
  userId?: string,
  sessionId?: string,
): Promise<{...}> {
  // 获取或创建会话
  const session = await this.getOrCreateSession(userId || null, sessionId);
  
  // ⭐ 从context获取mode，如果没有则从session获取，都没有则根据用户角色推断
  let mode: 'user' | 'merchant' | 'developer' = context?.mode;
  
  if (!mode && session) {
    mode = session.mode || 'user';
  }
  
  if (!mode && userId) {
    // 根据用户角色推断mode
    const user = await this.userService.findById(userId);
    if (user?.roles?.includes('merchant')) {
      mode = 'merchant';
    } else if (user?.roles?.includes('developer')) {
      mode = 'developer';
    } else {
      mode = 'user';
    }
  }
  
  // 更新session的mode
  if (session && mode) {
    session.mode = mode;
    await this.sessionRepository.save(session);
  }
  
  // 后续处理使用mode
  // ...
}
```

3. **添加权限检查**

```typescript
// 在AgentP0IntegrationService.handleP0Request()中
async handleP0Request(
  intent: string,
  params: Record<string, any>,
  userId?: string,
  mode: 'user' | 'merchant' | 'developer' = 'user',
  context?: any,
): Promise<{...}> {
  // ⭐ 权限检查
  if (userId) {
    const user = await this.userService.findById(userId);
    const userRoles = user?.roles || [];
    
    // 检查用户是否有权限使用该mode
    if (mode === 'merchant' && !userRoles.includes('merchant')) {
      return {
        response: '抱歉，您没有商户权限，无法使用商户Agent功能。',
        type: 'error',
      };
    }
    
    if (mode === 'developer' && !userRoles.includes('developer')) {
      return {
        response: '抱歉，您没有开发者权限，无法使用开发者Agent功能。',
        type: 'error',
      };
    }
  }
  
  // 继续处理...
}
```

**优点**：
- 实现简单，改动小
- Mode持久化，不需要每次传递
- 可以根据用户角色自动设置

**缺点**：
- 仍然没有独立的Agent实例
- 功能仍然耦合在同一个服务类中

---

### 方案2：引入Agent Registry（中等改进）

**实现步骤**：

1. **创建Agent基类**

```typescript
// backend/src/modules/agent/agents/base-agent.ts
export abstract class BaseAgent {
  abstract readonly type: 'user' | 'merchant' | 'developer';
  abstract readonly name: string;
  abstract readonly description: string;
  
  protected session: AgentSession;
  protected userId?: string;
  
  constructor(session: AgentSession, userId?: string) {
    this.session = session;
    this.userId = userId;
  }
  
  // 抽象方法：处理消息
  abstract processMessage(
    message: string,
    context?: any,
  ): Promise<AgentResponse>;
  
  // 抽象方法：获取支持的功能列表
  abstract getSupportedIntents(): string[];
  
  // 通用方法：检查权限
  protected async checkPermission(): Promise<boolean> {
    if (!this.userId) return true; // 未登录用户可以使用基础功能
    
    const user = await this.userService.findById(this.userId);
    const userRoles = user?.roles || [];
    
    switch (this.type) {
      case 'merchant':
        return userRoles.includes('merchant');
      case 'developer':
        return userRoles.includes('developer');
      default:
        return true;
    }
  }
}
```

2. **实现具体的Agent类**

```typescript
// backend/src/modules/agent/agents/user-agent.ts
@Injectable()
export class UserAgent extends BaseAgent {
  readonly type = 'user' as const;
  readonly name = '个人Agent';
  readonly description = '个人支付和财务管理助手';
  
  getSupportedIntents(): string[] {
    return [
      'estimate_fee',
      'assess_risk',
      'kyc_status',
      'payment_memory',
      'subscriptions',
      'budget',
      'classify_transaction',
    ];
  }
  
  async processMessage(
    message: string,
    context?: any,
  ): Promise<AgentResponse> {
    if (!await this.checkPermission()) {
      throw new ForbiddenException('没有权限使用个人Agent');
    }
    
    // 处理用户Agent的消息
    // ...
  }
}

// backend/src/modules/agent/agents/merchant-agent.ts
@Injectable()
export class MerchantAgent extends BaseAgent {
  readonly type = 'merchant' as const;
  readonly name = '商户Agent';
  readonly description = '商户管理和运营助手';
  
  getSupportedIntents(): string[] {
    return [
      'webhook_config',
      'auto_fulfill',
      'multi_chain_balance',
      'reconciliation',
      'settlement_rules',
    ];
  }
  
  async processMessage(
    message: string,
    context?: any,
  ): Promise<AgentResponse> {
    if (!await this.checkPermission()) {
      throw new ForbiddenException('没有权限使用商户Agent');
    }
    
    // 处理商户Agent的消息
    // ...
  }
}
```

3. **创建Agent Registry**

```typescript
// backend/src/modules/agent/agent-registry.service.ts
@Injectable()
export class AgentRegistryService {
  private agents: Map<string, BaseAgent> = new Map();
  
  constructor(
    private userAgent: UserAgent,
    private merchantAgent: MerchantAgent,
    private developerAgent: DeveloperAgent,
  ) {
    // 注册所有Agent
    this.registerAgent(this.userAgent);
    this.registerAgent(this.merchantAgent);
    this.registerAgent(this.developerAgent);
  }
  
  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.type, agent);
  }
  
  getAgent(type: 'user' | 'merchant' | 'developer'): BaseAgent {
    const agent = this.agents.get(type);
    if (!agent) {
      throw new NotFoundException(`Agent type ${type} not found`);
    }
    return agent;
  }
  
  async createAgentInstance(
    type: 'user' | 'merchant' | 'developer',
    session: AgentSession,
    userId?: string,
  ): Promise<BaseAgent> {
    const agentClass = this.getAgent(type);
    // 创建Agent实例（需要根据具体实现调整）
    return agentClass;
  }
}
```

4. **修改AgentService使用Agent Registry**

```typescript
// backend/src/modules/agent/agent.service.ts
@Injectable()
export class AgentService {
  constructor(
    // ... 现有依赖
    private agentRegistry: AgentRegistryService,
  ) {}
  
  async processMessage(
    message: string,
    context?: any,
    userId?: string,
    sessionId?: string,
  ): Promise<{...}> {
    // 获取或创建会话
    const session = await this.getOrCreateSession(userId || null, sessionId);
    
    // 确定mode
    const mode = context?.mode || session.mode || this.inferMode(userId) || 'user';
    
    // ⭐ 从Registry获取对应的Agent
    const agent = await this.agentRegistry.createAgentInstance(
      mode,
      session,
      userId,
    );
    
    // ⭐ 使用Agent处理消息
    return await agent.processMessage(message, context);
  }
  
  private async inferMode(userId?: string): Promise<'user' | 'merchant' | 'developer' | null> {
    if (!userId) return null;
    
    const user = await this.userService.findById(userId);
    if (user?.roles?.includes('merchant')) return 'merchant';
    if (user?.roles?.includes('developer')) return 'developer';
    return 'user';
  }
}
```

**优点**：
- Agent类型独立，易于扩展
- 每个Agent有自己的能力集
- 权限检查统一在基类中
- 符合面向对象设计原则

**缺点**：
- 需要重构现有代码
- 需要创建多个Agent类

---

### 方案3：实现真正的Core Brain（完整改进）

**架构设计**：

```
┌─────────────────────────────────────────┐
│         Core Brain (共享层)              │
│  - Memory System                        │
│  - Skills Registry                      │
│  - Workflow Engine                      │
│  - Foundation Models                    │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│User   │ │Merchant│ │Developer│
│Agent  │ │Agent   │ │Agent   │
│       │ │        │ │        │
│Skills:│ │Skills: │ │Skills: │
│-支付  │ │-订单   │ │-代码   │
│-预算  │ │-对账   │ │-SDK    │
│-订阅  │ │-发货   │ │-API    │
└───────┘ └────────┘ └────────┘
```

**实现步骤**：

1. **创建Core Brain服务**

```typescript
// backend/src/modules/agent/core/agent-core-brain.service.ts
@Injectable()
export class AgentCoreBrainService {
  // Memory系统
  private memory: AgentMemoryService;
  
  // Skills注册表
  private skillsRegistry: SkillsRegistryService;
  
  // Workflow引擎
  private workflowEngine: WorkflowEngineService;
  
  // 基础模型
  private foundationModels: {
    transaction: TransactionFoundationModel;
    asset: AssetFoundationModel;
    merchant: MerchantFoundationModel;
    developer: DeveloperFoundationModel;
  };
  
  // 处理请求（所有Agent共享）
  async processRequest(
    agentType: 'user' | 'merchant' | 'developer',
    request: AgentRequest,
  ): Promise<AgentResponse> {
    // 1. 从Memory获取上下文
    const context = await this.memory.getContext(request.sessionId);
    
    // 2. 识别需要的Skills
    const requiredSkills = await this.identifySkills(agentType, request, context);
    
    // 3. 执行Skills（调用Foundation Models）
    const results = await Promise.all(
      requiredSkills.map(skill => this.executeSkill(skill, request, context))
    );
    
    // 4. 更新Memory
    await this.memory.updateContext(request.sessionId, {
      lastAction: request.action,
      results,
    });
    
    // 5. 触发Workflows
    await this.workflowEngine.checkAndTrigger(request, results);
    
    return this.formatResponse(results);
  }
}
```

2. **创建Agent实例管理**

```typescript
// backend/src/modules/agent/core/agent-instance.service.ts
@Injectable()
export class AgentInstanceService {
  private instances: Map<string, AgentInstance> = new Map();
  
  async getOrCreateAgent(
    userId: string,
    agentType: 'user' | 'merchant' | 'developer',
  ): Promise<AgentInstance> {
    const key = `${userId}:${agentType}`;
    
    if (!this.instances.has(key)) {
      const instance = new AgentInstance(userId, agentType, this.coreBrain);
      this.instances.set(key, instance);
    }
    
    return this.instances.get(key)!;
  }
}
```

**优点**：
- 真正的分层架构
- Core Brain共享，Agent独立
- 易于扩展和维护
- 支持插件化Skills

**缺点**：
- 需要大量重构
- 开发周期长

---

## 📊 方案对比

| 方案 | 实现难度 | 改进效果 | 开发周期 | 推荐度 |
|------|---------|---------|---------|--------|
| 方案1：Session保存Mode | ⭐ 低 | ⭐⭐ 中 | 1-2天 | ⭐⭐⭐⭐ |
| 方案2：Agent Registry | ⭐⭐ 中 | ⭐⭐⭐ 高 | 1-2周 | ⭐⭐⭐⭐⭐ |
| 方案3：Core Brain | ⭐⭐⭐ 高 | ⭐⭐⭐⭐⭐ 很高 | 1-2月 | ⭐⭐⭐ |

---

## 🎯 推荐实施路径

### 阶段1：立即实施（方案1）

**目标**：快速改进当前实现

1. 在`AgentSession`中添加`mode`字段
2. 在`processMessage`中自动推断和保存mode
3. 添加基本的权限检查

**时间**：1-2天

### 阶段2：中期改进（方案2）

**目标**：实现Agent的独立性

1. 创建Agent基类和具体实现
2. 实现Agent Registry
3. 重构现有代码使用Registry

**时间**：1-2周

### 阶段3：长期演进（方案3）

**目标**：实现真正的Core Brain架构

1. 实现Memory系统
2. 实现Skills系统
3. 实现Workflow引擎
4. 实现Foundation Models

**时间**：1-2月

---

## 📝 总结

当前实现通过`mode`参数支持不同的Agent，但存在以下问题：
1. 没有独立的Agent实例
2. Mode没有持久化
3. 没有权限检查
4. 功能耦合度高

**建议**：
- **短期**：实施方案1，快速改进
- **中期**：实施方案2，实现Agent独立性
- **长期**：实施方案3，实现真正的Core Brain架构

