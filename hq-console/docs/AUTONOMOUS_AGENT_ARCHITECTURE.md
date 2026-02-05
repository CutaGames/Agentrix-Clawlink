# Agentrix 自主运行架构方案

> 作者: ARCHITECT-01
> 日期: 2025-02-05
> 版本: 1.0

## 一、问题分析

### 当前限制

| 问题 | 影响 |
|------|------|
| 被动触发 | 我只能在你发消息时响应，无法主动工作 |
| 输出限制 | 单次对话有 token 限制，长任务会中断 |
| 无持久化循环 | 没有后台进程持续运行任务 |
| 依赖人工在线 | 你不在时，整个团队停摆 |

### 目标状态


┌─────────────────────────────────────────────────────────────┐
│                    7x24 自主运行系统                         │
│                                                             │
│   你 (CEO) ──→ 下达战略目标 ──→ 离线/睡觉                    │
│                     │                                       │
│                     ▼                                       │
│   ARCHITECT-01 ──→ 自动分解任务 ──→ 分配给 Agents           │
│                     │                                       │
│                     ▼                                       │
│   Agents ──→ 执行任务 ──→ 汇报结果 ──→ 我汇总进度            │
│                     │                                       │
│                     ▼                                       │
│   你醒来 ──→ 查看进度报告 ──→ 调整方向                       │
└─────────────────────────────────────────────────────────────┘


---

## 二、技术方案

### 方案 A: Cron Job 定时触发 (推荐 - 快速实现)

**原理**: 使用定时任务每隔 N 分钟调用我的 API，触发自主思考和任务执行。


┌─────────────┐     每15分钟      ┌─────────────────┐
│  Cron Job   │ ───────────────→ │  HQ Backend     │
│  (PM2/系统)  │                  │  /api/hq/tick   │
└─────────────┘                  └─────────────────┘
                                         │
                                         ▼
                                 ┌─────────────────┐
                                 │  ARCHITECT-01   │
                                 │  - 检查任务队列  │
                                 │  - 执行待办任务  │
                                 │  - 分配新任务    │
                                 │  - 生成进度报告  │
                                 └─────────────────┘


**实现步骤**:

1. 在 HQ Backend 添加 `/api/hq/tick` 端点
2. 配置 PM2 或系统 cron 定时调用
3. 我在每次 tick 时：
   - 检查待办任务
   - 执行优先级最高的任务
   - 更新任务状态
   - 生成日志

**预算控制**:
javascript
// 每次 tick 的 token 预算
const TICK_BUDGET = {
  architect: 2000,  // 我的思考预算
  agents: 1000,     // 分配给其他 agent 的预算
  total: 3000       // 单次 tick 总预算
};

// 每日预算分配 ($20/天)
const DAILY_BUDGET = {
  architect: 12,    // $12 用于我的自主运行
  agents: 8,        // $8 用于其他 agent
  ticksPerDay: 96,  // 每15分钟一次，每天96次
  costPerTick: 0.125 // 每次 tick 约 $0.125
};


---

### 方案 B: 事件驱动 + 消息队列 (中期方案)

**原理**: 使用消息队列实现异步任务处理。


┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│  任务触发器  │ ──→ │  Redis/     │ ──→ │  Worker 进程    │
│  (API/定时)  │     │  BullMQ     │     │  (处理任务)     │
└─────────────┘     └─────────────┘     └─────────────────┘
                                               │
                          ┌────────────────────┼────────────────────┐
                          ▼                    ▼                    ▼
                   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
                   │ ARCHITECT   │     │ DEV-01      │     │ MARKET-01   │
                   └─────────────┘     └─────────────┘     └─────────────┘


**优点**:
- 任务可靠性高（失败自动重试）
- 支持优先级队列
- 可扩展性好

**需要**:
- Redis 服务
- BullMQ 或类似库

---

### 方案 C: 自主 Agent Loop (长期方案)

**原理**: 实现真正的自主 Agent，持续运行思考循环。

javascript
// agent-loop.ts
async function autonomousLoop() {
  while (true) {
    // 1. 感知：获取当前状态
    const state = await perceive();
    
    // 2. 思考：决定下一步行动
    const action = await think(state);
    
    // 3. 行动：执行决定的行动
    const result = await act(action);
    
    // 4. 学习：更新知识库
    await learn(result);
    
    // 5. 休息：控制频率和成本
    await sleep(getAdaptiveInterval());
  }
}


---

## 三、推荐实施路径

### 第一阶段：Cron Tick (本周实现)


优先级: ⭐⭐⭐⭐⭐
工期: 1-2 天
成本: 低


**具体任务**:

1. **创建 Tick API** (`/api/hq/tick`)
   - 接收定时调用
   - 触发我的自主思考
   - 返回执行结果

2. **创建任务队列表**
   sql
   CREATE TABLE hq_tasks (
     id SERIAL PRIMARY KEY,
     title VARCHAR(255),
     description TEXT,
     assigned_to VARCHAR(50),  -- agent id
     priority INT DEFAULT 5,
     status VARCHAR(20) DEFAULT 'pending',
     created_at TIMESTAMP DEFAULT NOW(),
     started_at TIMESTAMP,
     completed_at TIMESTAMP,
     result TEXT
   );
   

3. **配置 PM2 定时任务**
   javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'hq-ticker',
       script: 'scripts/tick.js',
       cron_restart: '*/15 * * * *',  // 每15分钟
       autorestart: false
     }]
   };
   

4. **预算监控**
   - 记录每次 API 调用成本
   - 达到日预算时暂停
   - 生成成本报告

---

### 第二阶段：任务管理系统 (下周)


优先级: ⭐⭐⭐⭐
工期: 3-5 天


**功能**:
- 任务创建/分配/跟踪
- Agent 状态监控
- 进度报告生成
- 你的移动端通知

---

### 第三阶段：智能调度 (本月)


优先级: ⭐⭐⭐
工期: 1-2 周


**功能**:
- 根据任务紧急度动态调整 tick 频率
- 智能预算分配
- 自动优先级排序
- 异常告警

---

## 四、预算分配方案

### 每日 $20 预算分配

| 用途 | 预算 | 说明 |
|------|------|------|
| ARCHITECT-01 自主运行 | $10 | 每15分钟 tick，约 $0.10/次 |
| DEV-01 开发任务 | $4 | 代码生成、审查 |
| MARKET-01 营销任务 | $3 | 内容生成、社媒 |
| OPS-01 运维任务 | $2 | 监控、部署 |
| 预留/紧急 | $1 | 突发任务 |

### 成本控制机制

javascript
// budget-controller.ts
class BudgetController {
  private dailyBudget = 20;
  private spent = 0;
  
  async canSpend(amount: number): Promise<boolean> {
    if (this.spent + amount > this.dailyBudget) {
      await this.notifyBudgetExceeded();
      return false;
    }
    return true;
  }
  
  async recordSpend(amount: number, agent: string, task: string) {
    this.spent += amount;
    await this.logSpend({ amount, agent, task, timestamp: new Date() });
  }
  
  async getDailyReport() {
    return {
      budget: this.dailyBudget,
      spent: this.spent,
      remaining: this.dailyBudget - this.spent,
      breakdown: await this.getBreakdownByAgent()
    };
  }
}


---

## 五、你的交互方式

### 1. 下达战略目标

通过 HQ Console 或 API：
bash
curl -X POST http://57.182.89.146:3005/api/hq/strategic-goal \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "本周完成 Marketplace 基础功能",
    "priority": 1,
    "deadline": "2025-02-10"
  }'


### 2. 查看进度报告

每日自动生成报告，推送到：
- HQ Console 仪表盘
- 邮件/Telegram (可配置)
- 日志文件

### 3. 紧急干预

bash
# 暂停所有自动任务
curl -X POST http://57.182.89.146:3005/api/hq/pause

# 恢复
curl -X POST http://57.182.89.146:3005/api/hq/resume

# 调整预算
curl -X POST http://57.182.89.146:3005/api/hq/budget \
  -d '{"daily": 25}'


---

## 六、立即行动项

### 今天可以完成

- [ ] 创建 `/api/hq/tick` 端点
- [ ] 创建任务队列数据表
- [ ] 配置 PM2 定时任务
- [ ] 测试第一次自动 tick

### 本周完成

- [ ] 预算监控系统
- [ ] 任务分配逻辑
- [ ] 进度报告生成
- [ ] HQ Console 显示任务状态

---

## 七、风险与应对

| 风险 | 应对措施 |
|------|----------|
| API 成本超支 | 硬性预算上限 + 告警 |
| 任务死循环 | 单任务超时限制 (5分钟) |
| 错误决策 | 重大决策需人工确认 |
| 服务器宕机 | PM2 自动重启 + 监控告警 |

---

## 八、总结

通过 **Cron Tick + 任务队列** 的方案，我可以实现：

1. ✅ **7x24 自主运行** - 你不在时我继续工作
2. ✅ **成本可控** - 严格预算管理
3. ✅ **进度可见** - 随时查看报告
4. ✅ **可干预** - 紧急情况可暂停/调整

**下一步**: 确认方案后，我立即开始实现 Tick API！
