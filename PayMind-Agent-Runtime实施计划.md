# PayMind Agent Runtime 实施计划

## 🎯 实施目标

**先完成 Runtime 架构，解决当前 Agent 功能调不通的问题**

### 当前问题
- ❌ 意图识别不准确（关键词匹配）
- ❌ 上下文丢失（无法跨轮次引用）
- ❌ 流程无法串联（电商流程执行不了）
- ❌ 没有工作流引擎

### 目标
- ✅ 准确的意图识别
- ✅ 持久的上下文管理
- ✅ 可串联的流程管理
- ✅ 完整的工作流引擎

---

## 📅 实施时间线（4-6周）

### 第1周：Memory 系统（上下文持久化）

**目标**：解决上下文丢失问题

#### 任务清单

1. **创建 Memory 系统接口**
   - [ ] `IMemoryService` 接口定义
   - [ ] `MemoryEntry` 数据模型
   - [ ] `MemoryType` 枚举（对话、实体、状态、流程）

2. **实现 MemoryService**
   - [ ] `saveMemory()` - 保存记忆
   - [ ] `getMemory()` - 获取记忆
   - [ ] `searchMemory()` - 搜索记忆（语义搜索）
   - [ ] `updateMemory()` - 更新记忆
   - [ ] `deleteMemory()` - 删除记忆

3. **创建 Memory 数据表**
   ```sql
   CREATE TABLE agent_memory (
     id UUID PRIMARY KEY,
     session_id UUID NOT NULL,
     type VARCHAR(50) NOT NULL, -- 'conversation', 'entity', 'state', 'workflow'
     key VARCHAR(255),
     value JSONB,
     embedding VECTOR(1536), -- 用于语义搜索
     created_at TIMESTAMP,
     updated_at TIMESTAMP,
     FOREIGN KEY (session_id) REFERENCES agent_session(id)
   );
   ```

4. **集成到 AgentService**
   - [ ] 在 `processMessage` 中保存对话记忆
   - [ ] 在意图识别时搜索相关记忆
   - [ ] 在流程处理时读取状态记忆

**交付物**：
- ✅ MemoryService 可用
- ✅ 上下文可以跨轮次引用
- ✅ "刚才那个商品"可以理解

---

### 第2周：Workflow 引擎（流程管理）

**目标**：解决流程无法串联问题

#### 任务清单

1. **创建 Workflow 引擎接口**
   - [ ] `IWorkflowEngine` 接口定义
   - [ ] `WorkflowDefinition` 数据模型
   - [ ] `WorkflowState` 数据模型
   - [ ] `WorkflowStep` 数据模型

2. **实现 WorkflowEngine**
   - [ ] `startWorkflow()` - 启动流程
   - [ ] `executeStep()` - 执行步骤
   - [ ] `getCurrentState()` - 获取当前状态
   - [ ] `resumeWorkflow()` - 恢复流程
   - [ ] `cancelWorkflow()` - 取消流程

3. **创建 Workflow 数据表**
   ```sql
   CREATE TABLE agent_workflow (
     id UUID PRIMARY KEY,
     session_id UUID NOT NULL,
     workflow_type VARCHAR(100) NOT NULL, -- 'ecommerce', 'payment', 'refund'
     current_step VARCHAR(100),
     state JSONB,
     context JSONB,
     status VARCHAR(50), -- 'active', 'paused', 'completed', 'cancelled'
     created_at TIMESTAMP,
     updated_at TIMESTAMP,
     FOREIGN KEY (session_id) REFERENCES agent_session(id)
   );
   ```

4. **定义电商流程**
   - [ ] 搜索商品 → 查看详情 → 加入购物车 → 结算 → 支付
   - [ ] 每个步骤的状态定义
   - [ ] 步骤之间的转换逻辑

**交付物**：
- ✅ WorkflowEngine 可用
- ✅ 电商流程可以串联执行
- ✅ 流程状态可以跟踪

---

### 第3周：Skills 系统（功能模块化）

**目标**：将功能模块化，便于管理和扩展

#### 任务清单

1. **创建 Skills 系统接口**
   - [ ] `ISkill` 接口定义
   - [ ] `ISkillsRegistry` 接口定义
   - [ ] `SkillResult` 数据模型

2. **实现 SkillsRegistry**
   - [ ] `registerSkill()` - 注册技能
   - [ ] `getSkill()` - 获取技能
   - [ ] `listSkills()` - 列出所有技能
   - [ ] `executeSkill()` - 执行技能

3. **重构现有功能为 Skills**
   - [ ] `ProductSearchSkill` - 商品搜索
   - [ ] `AddToCartSkill` - 加入购物车
   - [ ] `CheckoutSkill` - 结算
   - [ ] `PaymentSkill` - 支付
   - [ ] `OrderQuerySkill` - 订单查询
   - [ ] `RefundSkill` - 退款

4. **集成到 Workflow**
   - [ ] Workflow 步骤调用 Skills
   - [ ] Skills 结果更新 Workflow 状态

**交付物**：
- ✅ SkillsRegistry 可用
- ✅ 现有功能重构为 Skills
- ✅ Workflow 可以调用 Skills

---

### 第4周：意图识别改进

**目标**：解决意图识别不准确问题

#### 任务清单

1. **改进意图识别**
   - [ ] 使用 Memory 搜索相关上下文
   - [ ] 结合 Workflow 状态判断意图
   - [ ] 使用规则引擎 + 关键词匹配（暂时）
   - [ ] 为后续模型训练准备数据

2. **实现意图路由**
   - [ ] `IntentRouter` 类
   - [ ] 根据意图路由到对应 Skill 或 Workflow
   - [ ] 支持意图优先级

3. **测试电商流程**
   - [ ] 完整测试：搜索 → 详情 → 加购 → 结算 → 支付
   - [ ] 测试上下文引用："刚才那个"、"第一个"
   - [ ] 测试流程中断和恢复

**交付物**：
- ✅ 意图识别准确率提升
- ✅ 电商流程可以完整执行
- ✅ 上下文引用可以理解

---

### 第5-6周：集成和优化

**目标**：完整集成 Runtime，优化性能

#### 任务清单

1. **完整集成 Runtime**
   - [ ] 重构 `AgentService` 使用 Runtime
   - [ ] 重构 `AgentP0IntegrationService` 使用 Runtime
   - [ ] 保持向后兼容

2. **实现更多 Workflow**
   - [ ] 支付流程 Workflow
   - [ ] 退款流程 Workflow
   - [ ] 订阅流程 Workflow

3. **性能优化**
   - [ ] Memory 搜索性能优化
   - [ ] Workflow 状态管理优化
   - [ ] 缓存机制

4. **测试和修复**
   - [ ] 完整功能测试
   - [ ] 性能测试
   - [ ] 修复 Bug

**交付物**：
- ✅ Runtime 完整集成
- ✅ 所有功能可以正常使用
- ✅ 性能达到要求

---

## 🏗️ 架构设计

### Runtime 架构图

```
AgentService
    ↓
AgentRuntime (新增)
    ├─ MemoryService (上下文持久化)
    ├─ WorkflowEngine (流程管理)
    └─ SkillsRegistry (功能模块化)
        ├─ ProductSearchSkill
        ├─ AddToCartSkill
        ├─ CheckoutSkill
        └─ PaymentSkill
```

### 数据流

```
用户消息
    ↓
AgentService.processMessage()
    ↓
1. MemoryService.searchMemory() - 搜索相关上下文
    ↓
2. IntentRouter.route() - 识别意图
    ↓
3. WorkflowEngine.executeStep() - 执行流程步骤
    ↓
4. SkillsRegistry.executeSkill() - 执行具体功能
    ↓
5. MemoryService.saveMemory() - 保存结果到记忆
    ↓
6. WorkflowEngine.updateState() - 更新流程状态
    ↓
返回响应
```

---

## 📝 实施步骤

### 步骤1：创建 Runtime 模块结构

```
backend/src/modules/agent/runtime/
├── interfaces/
│   ├── memory.interface.ts
│   ├── workflow.interface.ts
│   └── skill.interface.ts
├── services/
│   ├── memory.service.ts
│   ├── workflow-engine.service.ts
│   └── skills-registry.service.ts
├── skills/
│   ├── product-search.skill.ts
│   ├── add-to-cart.skill.ts
│   ├── checkout.skill.ts
│   └── payment.skill.ts
├── workflows/
│   ├── ecommerce.workflow.ts
│   ├── payment.workflow.ts
│   └── refund.workflow.ts
└── agent-runtime.service.ts
```

### 步骤2：实现 Memory 系统

### 步骤3：实现 Workflow 引擎

### 步骤4：实现 Skills 系统

### 步骤5：集成到 AgentService

---

## 🎯 关键决策

### 1. 是否使用向量数据库？

**暂时不使用**，原因：
- 增加复杂度
- 需要额外的服务（Pinecone、Weaviate等）
- 可以先使用 PostgreSQL + JSONB + 关键词搜索

**后续优化**：
- 如果效果不好，再引入向量数据库
- 为模型训练做准备

### 2. 意图识别是否使用模型？

**暂时不使用模型**，原因：
- 模型训练需要时间
- 先用规则引擎 + 关键词匹配
- 同时收集训练数据

**后续优化**：
- 等基础模型底座完成后，使用模型
- 现在先收集数据

### 3. 是否保持向后兼容？

**必须保持向后兼容**，原因：
- 现有功能不能中断
- 逐步迁移
- 降低风险

---

## 📊 成功指标

### 功能指标

- [ ] 电商流程可以完整执行（搜索 → 加购 → 结算 → 支付）
- [ ] 上下文引用可以理解（"刚才那个"、"第一个"）
- [ ] 流程状态可以跟踪
- [ ] 意图识别准确率 > 80%（暂时）

### 性能指标

- [ ] Memory 搜索响应时间 < 100ms
- [ ] Workflow 执行响应时间 < 200ms
- [ ] 整体响应时间 < 500ms

---

## 🚀 开始实施

**立即开始第1周任务：Memory 系统**

