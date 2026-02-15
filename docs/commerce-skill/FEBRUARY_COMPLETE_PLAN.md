# Agentrix 2026年2月完整工作计划

> **制定人**: ARCHITECT-01 (CEO/CFO/架构师/HQ灵魂)
> **日期**: 2026-02-08
> **核心目标**: Commerce Skill 2/15 上线，2月底前产生首笔收入
> **预算**: $50/天 × 28天 = $1,400
> **域名**: www.agentrix.top

---

## 一、本月三大目标

| # | 目标 | 衡量标准 | 截止日 |
|---|------|---------|--------|
| 1 | Commerce Skill 上线 | Claude/ChatGPT/Cursor 可调用 | 2/15 |
| 2 | 获取首批用户 | 10+ 开发者接入 | 2/28 |
| 3 | 提交 3+ Grant 申请 | AWS/BSC/Base 申请材料提交 | 2/28 |

---

## 二、Agent 团队编制（11人）

| 代号 | 角色 | AI 模型 | 日预算 | 月预算 | 核心KPI |
|------|------|---------|--------|--------|--------|
| ARCHITECT-01 | CEO/总指挥 | Claude Opus 4.6 | $15 | $420 | 架构决策、Code Review、团队管理 |
| CODER-01 | 主力开发 | Claude Sonnet 4.5 | $8 | $224 | MCP工具、安全修复、生态接入 |
| CODER-02 | 合约开发 | Claude Sonnet 4.5 | $6 | $168 | BudgetPool部署、链上测试 |
| GROWTH-01 | 增长/BD | Gemini 2.5 Flash | $4 | $112 | GTM策略、Grant申请、生态提交 |
| CONTENT-01 | 内容/文档 | Gemini 2.5 Flash | $0 | $0 | 技术文档、博客、Quick Start |
| SOCIAL-01 | 社交运营 | Gemini 2.5 Flash | $0 | $0 | Twitter/Discord/Telegram |
| ANALYST-01 | 研究/分析 | Gemini 2.5 Flash | $0 | $0 | 竞品研究、数据分析 |
| DEVREL-01 | 开发者关系 | Gemini 2.5 Flash | $0 | $0 | 教程、Demo、GitHub |
| SECURITY-01 | 安全审计 | Claude Haiku | $2 | $56 | MCP安全、合约审计 |
| SUPPORT-01 | 客户支持 | Claude Haiku | $1 | $28 | FAQ、用户反馈 |
| RESOURCE-01 | 资源猎手 | Gemini 2.5 Flash | $0 | $0 | 免费API、Grant、云计划 |
| **总计** | | | **$36** | **$1,008** | 预算余量$392 |

---

## 三、月度时间线


第1周 (2/8-14)     第2周 (2/15-21)      第3周 (2/22-28)
┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ 开发冲刺      │  │ 🚀上线+宣发       │  │ 运营+迭代+Grant   │
│ 安全修复      │  │ 生态提交          │  │ 用户获取          │
│ 合约部署      │  │ 社交媒体全面启动   │  │ 数据分析          │
│ 文档准备      │  │ 首批用户获取      │  │ 3月规划           │
└──────────────┘  └──────────────────┘  └──────────────────┘


---

## 四、第1周详细计划 (2/8-2/14) — 开发冲刺

### ARCHITECT-01 (我)

| 日期 | 任务 | 产出 | 状态 |
|------|------|------|------|
| 2/8 | 制定全局计划 + MCP新工具设计 + 费率修复 | 计划文档+代码 | ✅ 完成 |
| 2/9 | ai-plugin.json + OpenAPI + MCP配置指南 | 3个文件 | ✅ 完成 |
| 2/10 | 设计Streamable HTTP MCP方案 | 技术方案 | 🔜 |
| 2/11 | Code Review: userId修复 + 合约部署 | 审查意见 | 🔜 |
| 2/12 | 端到端测试: Claude Desktop + Cursor | 测试报告 | 🔜 |
| 2/13 | Go/No-Go决策 + 整体质量评审 | 决策文档 | 🔜 |
| 2/14 | 监督部署 + 上线准备确认 | 上线报告 | 🔜 |

### CODER-01

| 日期 | 任务 | 优先级 |
|------|------|--------|
| 2/8-9 | P0: userId安全修复 — 所有MCP工具走callToolWithContext | 🔴 |
| 2/10 | P1: Streamable HTTP MCP端点实现 | 🟠 |
| 2/11 | P1: ChatGPT Actions对接（OAuth流程） | 🟠 |
| 2/12 | P1: 发布后自动注册到MCP tools/list | 🟠 |
| 2/13 | Bug修复 + 全链路回归测试 | 🔴 |
| 2/14 | 生产环境部署 + 冒烟测试 | 🔴 |

### CODER-02

| 日期 | 任务 | 优先级 |
|------|------|--------|
| 2/8-9 | 确认BudgetPool合约编译 + 准备部署 | 🔴 |
| 2/10 | 部署BudgetPool到BSC Testnet（费率0.3%） | 🔴 |
| 2/11 | 合约全流程测试（创建→注资→里程碑→释放→claim） | 🔴 |
| 2/12 | 后端对接合约（可选，如时间允许） | 🟡 |
| 2/13 | 合约emergency pause测试 + 费率验证 | 🟠 |
| 2/14 | 合约状态最终确认 | 🔴 |

### SECURITY-01

| 日期 | 任务 |
|------|------|
| 2/8-10 | 审计所有MCP工具的userId处理 → 安全报告 |
| 2/11-12 | 审计HTTP Skill出站白名单 + 写操作策略拦截 |
| 2/13 | 合约安全审计（BudgetPool） |
| 2/14 | 最终安全确认 |

### CONTENT-01

| 日期 | 任务 | 产出 |
|------|------|------|
| 2/8-9 | API Reference文档 | 技术文档 |
| 2/10-11 | Quick Start Guide（5分钟接入） | 快速入门 |
| 2/12 | Use Case文档（3个场景） | 场景文档 |
| 2/13 | 博客: "Introducing Agentrix Commerce Skill" | 博客草稿 |
| 2/14 | Product Hunt发布帖准备 | 发布帖 |

### SOCIAL-01

| 日期 | 平台 | 内容 |
|------|------|------|
| 2/9 | Twitter | 预热帖#1: "Building the future of AI Commerce" |
| 2/11 | Twitter | 预热帖#2: 技术架构预览 |
| 2/12 | Telegram | 社区预热 + 开发者频道 |
| 2/13 | Twitter | 预热帖#3: 功能预览GIF |
| 2/14 | 全平台 | 准备上线日素材包（定时发布） |

### GROWTH-01

| 日期 | 任务 | 产出 |
|------|------|------|
| 2/10-11 | 制定GTM策略 | GTM文档 |
| 2/12 | 准备Anthropic MCP官方提交材料 | 申请材料 |
| 2/13 | 准备Cursor Marketplace提交材料 | 申请材料 |
| 2/14 | 准备ChatGPT Store提交材料 | 申请材料 |

### ANALYST-01

| 日期 | 任务 | 产出 |
|------|------|------|
| 2/8-10 | 研究竞品Commerce Skill（Stripe MCP等） | 竞品报告 |
| 2/11-12 | 研究Cursor/Windsurf/VS Code MCP接入 | IDE接入指南 |
| 2/13-14 | 研究OpenClaw接入规范 | 接入指南 |

### DEVREL-01

| 日期 | 任务 | 产出 |
|------|------|------|
| 2/10-12 | "Build Your First Commerce Skill" 教程 | 教程文章 |
| 2/13 | Demo视频脚本（3分钟） | 视频脚本 |
| 2/14 | GitHub README + 示例代码 | 开源材料 |

### RESOURCE-01

| 日期 | 任务 | 产出 |
|------|------|------|
| 2/8-9 | 搜集所有可申请免费资源清单 | 资源清单 |
| 2/10 | 申请AWS Activate | 申请记录 |
| 2/11 | 申请Anthropic API免费额度 | 申请记录 |
| 2/12 | 申请Google Cloud for Startups | 申请记录 |
| 2/13 | 准备BSC Grant申请材料 | 申请草案 |
| 2/14 | 准备Base Grant申请材料 | 申请草案 |

### SUPPORT-01

| 日期 | 任务 |
|------|------|
| 2/13-14 | 准备FAQ文档 + 常见问题应答模板 |

---

## 五、第2周详细计划 (2/15-2/21) — 上线+宣发

### 🚀 2/15 上线日

| 时间 | 动作 | 负责 |
|------|------|------|
| 08:00 | 最终系统确认 | ARCHITECT-01 |
| 09:00 | 正式上线公告 | SOCIAL-01 |
| 09:00 | Twitter + Telegram + Discord 同步 | SOCIAL-01 |
| 10:00 | Product Hunt 发布 | CONTENT-01 |
| 10:00 | Hacker News 发布 | DEVREL-01 |
| 全天 | 系统监控 + 用户回复 | ARCHITECT-01 + SUPPORT-01 |

### ARCHITECT-01

| 日期 | 任务 |
|------|------|
| 2/15 | 上线监控 + 首批用户反馈收集 |
| 2/16-17 | 根据反馈制定迭代计划 |
| 2/18-19 | Code Review: 迭代修复 |
| 2/20-21 | 评估OpenClaw接入可行性 |

### CODER-01

| 日期 | 任务 |
|------|------|
| 2/15 | 上线后热修复（如有Bug） |
| 2/16-17 | 幂等缓存迁移Redis + 全文搜索索引 |
| 2/18-19 | 自动结算调度实现 |
| 2/20-21 | SDK完善（JS/Python） |

### CODER-02

| 日期 | 任务 |
|------|------|
| 2/15-16 | 监控合约事件 + 链上数据验证 |
| 2/17-19 | 后端对接CommissionV2合约结算 |
| 2/20-21 | 准备BSC Mainnet部署脚本 |

### SOCIAL-01 — 宣发日历

| 日期 | 平台 | 内容类型 |
|------|------|----------|
| 2/15 | Twitter+TG+Discord | 上线公告 + Demo GIF |
| 2/16 | Twitter | 技术深度帖: "How we built Commerce Skill" |
| 2/17 | Twitter | Use Case帖: "3 ways AI agents use Agentrix" |
| 2/18 | Twitter | 与AI领域KOL互动 |
| 2/19 | Twitter | 用户故事/反馈帖 |
| 2/20 | Twitter | 周报总结帖 |
| 2/21 | Discord | 社区AMA |

### CONTENT-01 — 内容发布日历

| 日期 | 渠道 | 内容 |
|------|------|------|
| 2/15 | Product Hunt | 发布帖 |
| 2/16 | Hacker News | 技术帖 |
| 2/17 | Dev.to | 技术文章 |
| 2/18 | Medium | 深度文章 |
| 2/19 | Reddit | r/artificial + r/ChatGPT |
| 2/20-21 | 官网博客 | 教程更新 |

### GROWTH-01 — 生态提交

| 日期 | 任务 |
|------|------|
| 2/15 | 提交Anthropic MCP官方Server列表 |
| 2/16 | 提交Cursor Marketplace |
| 2/17 | 提交ChatGPT Plugin Store |
| 2/18-19 | 联系5个AI Agent项目方合作 |
| 2/20-21 | 跟踪转化数据 + 优化获客漏斗 |

### RESOURCE-01 — Grant提交

| 日期 | 任务 |
|------|------|
| 2/15-16 | 提交AWS Activate正式申请 |
| 2/17-18 | 提交BSC Grant提案 |
| 2/19-20 | 提交Base Grant提案 |
| 2/21 | 整理所有申请状态报告 |

### ANALYST-01

| 日期 | 任务 |
|------|------|
| 2/15-17 | 监控上线数据（API调用量、用户注册、错误率） |
| 2/18-19 | 竞品动态追踪 |
| 2/20-21 | 周报数据分析 |

### SUPPORT-01

| 日期 | 任务 |
|------|------|
| 2/15-21 | 监控Discord/Telegram用户反馈 |
| 2/15-21 | 维护FAQ + 收集Bug报告 |

---

## 六、第3周详细计划 (2/22-2/28) — 运营+迭代

### ARCHITECT-01

| 日期 | 任务 |
|------|------|
| 2/22-23 | 第一周运营数据复盘 |
| 2/24-25 | 设计Skill SDK架构（JS/Python） |
| 2/26-27 | 制定3月路线图 |
| 2/28 | 2月月度总结 + 复盘 |

### CODER-01

| 日期 | 任务 |
|------|------|
| 2/22-23 | 根据用户反馈修复Top 3 Bug |
| 2/24-25 | Skill SDK v0.1（JS） |
| 2/26-27 | 统一错误协议 + requestId |
| 2/28 | 代码清理 + 技术债务偿还 |

### CODER-02

| 日期 | 任务 |
|------|------|
| 2/22-23 | CommissionV2链上结算对接 |
| 2/24-25 | 自动结算调度测试 |
| 2/26-28 | 准备BSC Mainnet部署（待老板确认） |

### SOCIAL-01

| 日期 | 内容 |
|------|------|
| 2/22 | 用户增长数据帖 |
| 2/23 | 开发者故事帖 |
| 2/24 | 技术更新帖 |
| 2/25 | 与合作伙伴联合帖 |
| 2/26-28 | 持续互动 + 月度总结帖 |

### CONTENT-01

| 日期 | 内容 |
|------|------|
| 2/22-23 | 更新文档（根据用户反馈） |
| 2/24-25 | 新Use Case文章 |
| 2/26-28 | 3月内容日历规划 |

### GROWTH-01

| 日期 | 任务 |
|------|------|
| 2/22-23 | 跟进所有生态提交状态 |
| 2/24-25 | 联系更多AI项目方 |
| 2/26-28 | 月度增长报告 + 3月策略 |

### RESOURCE-01

| 日期 | 任务 |
|------|------|
| 2/22-23 | 跟进AWS/BSC/Base Grant状态 |
| 2/24-25 | 申请Ethereum Foundation Grant |
| 2/26-27 | 申请Gitcoin Grant |
| 2/28 | 月度资源获取报告 |

---

## 七、定价策略（已确认）

| 功能 | 费率 | 代码位置 |
|------|------|----------|
| 钱包支付/收款码 | **免费** | PaymentService |
| 分佣/分账/预算池 | **0.3%** | splitFeeBps: 30 |
| OnRamp | **Provider费 + 0.1%** | onrampFeeBps: 10 |
| OffRamp | **Provider费 + 0.1%** | offrampFeeBps: 10 |
| 发布任务/商品/Skill | **0.3%** | splitFeeBps: 30 |
| 发布到Agentrix平台 | **平台分佣政策** | CommissionV2 |

---

## 八、预算管控

### 月度预算

| 项目 | 金额 | 说明 |
|------|------|------|
| AI API (付费) | $1,008 | 5个付费Agent |
| AI API (免费) | $0 | 6个Gemini Agent |
| AWS服务器 | $20 | EC2实例 |
| **月总计** | **$1,028** | |
| **预算** | **$1,400** | $50/天×28天 |
| **余量** | **$372** | 缓冲 |
| **AWS抵扣券** | **$2,500** | 可覆盖5个月 |

### 成本优化

| 策略 | 节省 |
|------|------|
| 6个Agent用Gemini免费额度 | ~$240/月 |
| 轻量分析用Haiku | ~$90/月 |
| 非紧急任务攒批处理 | ~$60/月 |
| 只有架构决策用Opus | 控制最贵模型用量 |

---

## 九、收入预期

### 2月（上线月）

| 来源 | 预期 | 概率 |
|------|------|------|
| Commerce交易手续费 | $0-$100 | 20% |
| 免费API Credits获取 | $2K-$10K | 60% |
| AWS Activate | $5K-$25K | 50% |

### 3月（增长月）

| 来源 | 预期 | 概率 |
|------|------|------|
| Commerce交易手续费 | $100-$500 | 40% |
| 公链Grant | $5K-$50K | 30% |
| 开发者Skill发布费 | $50-$200 | 30% |

---

## 十、上线Checklist

### 🔴 P0 必须完成

- [x] 自然语言→Commerce表单 (31/31测试通过)
- [ ] userId安全修复
- [x] MCP publish_to_marketplace
- [x] MCP search_marketplace
- [x] MCP execute_skill
- [ ] BudgetPool合约BSC Testnet部署
- [ ] 合约全流程测试
- [ ] Claude Desktop端到端测试
- [ ] Cursor IDE端到端测试
- [x] 费率验证（全网络0.3%）
- [ ] MCP安全审计
- [ ] 写操作策略拦截

### 🟠 P1 应该完成

- [x] ai-plugin.json
- [x] 精简版OpenAPI
- [ ] Streamable HTTP MCP
- [ ] 发布后自动注册MCP
- [ ] Quick Start Guide
- [ ] API Reference
- [x] MCP配置指南

### 🟡 P2 尽量完成

- [ ] 幂等缓存迁移Redis
- [ ] 全文搜索索引
- [ ] Demo视频
- [ ] Product Hunt发布帖
- [ ] Grant申请提交

---

## 十一、风险管理

| 风险 | 严重性 | 缓解措施 | 负责 |
|------|--------|---------|------|
| userId安全漏洞 | 🔴 高 | Day 3优先修复 | CODER-01 |
| 合约部署失败 | 🟠 中 | 先用数据库版上线 | CODER-02 |
| 生态提交被拒 | 🟠 中 | 准备多个渠道 | GROWTH-01 |
| API成本超预算 | 🟡 低 | Gemini免费额度兜底 | ARCHITECT-01 |
| 上线后无用户 | 🟠 中 | 多渠道宣发+KOL | SOCIAL-01 |

---

## 十二、需老板确认事项

| # | 事项 | 状态 |
|---|------|------|
| 1 | 上线目标2/15 | ✅ 已确认 |
| 2 | 域名www.agentrix.top | ✅ 已确认 |
| 3 | 定价策略 | ✅ 已确认 |
| 4 | 社交API已配置 | ✅ 已确认 |
| 5 | Grant申请优先级 | ✅ 全部申请 |
| 6 | 先专注Claude/ChatGPT/Cursor | ✅ 已确认 |
| 7 | BudgetPool先部署测试网 | ✅ 已确认 |
| 8 | Agent团队全权管理 | ✅ 已确认 |
| 9 | 暂不部署本地模型 | ✅ 已确认 |
