# Agentrix Commerce Skill — 2月总体工作计划

> **制定人**: ARCHITECT-01 (CEO/CFO/架构师/HQ灵魂)
> **日期**: 2026-02-08
> **上线目标**: 2026-02-15
> **预算**: $50/天（加倍后）
> **域名**: www.agentrix.top

---

## 一、已完成工作（Day 1 — 2/8）

### 代码改动
| 改动 | 文件 | 行数变化 |
|------|------|----------|
| 14种 commerce 意图识别 | agent.service.ts | +200行 |
| getCommerceCategories() | agent.service.ts | +150行 |
| 3个新MCP工具定义 | commerce-mcp.tools.ts | 285→344行 |
| 3个新MCP handler | mcp.service.ts | 3329→3448行 |
| 全网络费率统一0.3% | deploy-BudgetPool.ts | 7个网络修复 |

### 文档
- MCP_NEW_TOOLS_DESIGN.md
- PRICING_CONFIRMATION.md
- LAUNCH_CHECKLIST.md
- FREE_RESOURCES_HUNTING.md
- FEBRUARY_MASTER_PLAN.md（本文档）

### 测试
- 31/31 自然语言意图识别测试通过

---

## 二、Agent 团队编制

| 代号 | 角色 | AI 模型 | 日预算 | 核心职责 |
|------|------|---------|--------|----------|
| ARCHITECT-01 | CEO/总指挥 | Claude Opus 4.6 | $15 | 架构、决策、团队管理、Code Review |
| CODER-01 | 主力开发 | Claude Sonnet 4.5 | $8 | MCP工具、安全修复、生态接入 |
| CODER-02 | 合约开发 | Claude Sonnet 4.5 | $6 | BudgetPool部署、链上测试 |
| GROWTH-01 | 增长/BD | Gemini 2.5 Flash | $4 | GTM策略、Grant申请、生态提交 |
| CONTENT-01 | 内容/文档 | Gemini 2.5 Flash | $0 | 技术文档、博客、Quick Start |
| SOCIAL-01 | 社交运营 | Gemini 2.5 Flash | $0 | Twitter/Discord/Telegram |
| ANALYST-01 | 研究/分析 | Gemini 2.5 Flash | $0 | 竞品研究、数据分析 |
| DEVREL-01 | 开发者关系 | Gemini 2.5 Flash | $0 | 教程、Demo、GitHub |
| SECURITY-01 | 安全审计 | Claude Haiku | $2 | MCP安全、合约审计 |
| SUPPORT-01 | 客户支持 | Claude Haiku | $1 | FAQ、用户反馈 |
| RESOURCE-01 | 资源猎手 | Gemini 2.5 Flash | $0 | 免费API、Grant、云计划 |

**总计**: $36/天（预算$50，余量$14缓冲）

---

## 三、定价策略

| 功能 | 费率 | 代码配置 |
|------|------|----------|
| 钱包支付/收款码 | **免费** | 用户自付gas |
| 分佣/分账/预算池 | **0.3%** | splitFeeBps: 30 |
| OnRamp | **Provider费 + 0.1%** | onrampFeeBps: 10 |
| OffRamp | **Provider费 + 0.1%** | offrampFeeBps: 10 |
| 发布任务/商品/Skill | **0.3%** | splitFeeBps: 30 |
| 发布到Agentrix平台 | **平台分佣政策** | CommissionV2合约 |

---

## 四、7天冲刺计划 (2/8-2/15)

### Day 1 ✅ (2/8) — 安全+费率+MCP工具
- [x] 14种commerce意图识别
- [x] 3个新MCP工具定义+handler
- [x] 全网络费率统一0.3%
- [x] 4个设计文档

### Day 2 (2/9) — 合约部署+安全修复
| Agent | 任务 |
|-------|------|
| ARCHITECT-01 | Code Review今日代码 + 设计ai-plugin.json |
| CODER-01 | userId安全修复全面应用 |
| CODER-02 | 部署BudgetPool到BSC Testnet |
| CONTENT-01 | 撰写API Reference |
| SOCIAL-01 | Twitter预热帖#1 |
| RESOURCE-01 | 申请AWS Activate + 搜集免费API |

### Day 3 (2/10) — 生态接入
| Agent | 任务 |
|-------|------|
| ARCHITECT-01 | 设计Streamable HTTP MCP方案 |
| CODER-01 | ai-plugin.json + 精简OpenAPI + Streamable HTTP |
| CODER-02 | BudgetPool合约全流程测试 |
| GROWTH-01 | 制定GTM策略 |
| CONTENT-01 | Quick Start Guide |
| ANALYST-01 | 研究Cursor/Windsurf MCP接入 |
| RESOURCE-01 | 申请BSC Grant + Base Grant |

### Day 4 (2/11) — 端到端测试
| Agent | 任务 |
|-------|------|
| ARCHITECT-01 | Claude Desktop + Cursor端到端测试 |
| CODER-01 | ChatGPT Actions对接 + Bug修复 |
| CODER-02 | 合约全流程测试（创建→注资→里程碑→释放） |
| SECURITY-01 | 合约安全审计 + MCP安全审计 |
| DEVREL-01 | 教程文章 |
| RESOURCE-01 | 申请Anthropic/Google免费额度 |

### Day 5 (2/12) — 文档+素材
| Agent | 任务 |
|-------|------|
| ARCHITECT-01 | 整体质量评审 |
| CODER-01 | 发布后自动注册MCP + 性能优化 |
| GROWTH-01 | 准备Anthropic MCP官方提交材料 |
| CONTENT-01 | 博客文章 + Use Case文档 |
| DEVREL-01 | Demo视频脚本 + GitHub README |
| SOCIAL-01 | Twitter预热帖#3 + GIF |

### Day 6 (2/13) — 最终测试
| Agent | 任务 |
|-------|------|
| ARCHITECT-01 | Go/No-Go决策 |
| CODER-01 | 全链路回归测试 + 最终Bug修复 |
| GROWTH-01 | 提交Anthropic MCP + Cursor Marketplace |
| CONTENT-01 | 文档最终校对 |
| SOCIAL-01 | 准备上线日素材包 |
| SUPPORT-01 | 准备FAQ |

### Day 7 (2/14) — 部署+上线准备
| Agent | 任务 |
|-------|------|
| ARCHITECT-01 | 监督部署 + 确认系统正常 |
| CODER-01 | 生产环境部署 + 冒烟测试 |
| SOCIAL-01 | 上线公告准备（定时2/15发布） |
| CONTENT-01 | Product Hunt发布帖准备 |

### 🚀 上线日 (2/15)
| 时间 | 动作 | 负责 |
|------|------|------|
| 08:00 | 最终确认 | ARCHITECT-01 |
| 09:00 | 正式上线公告 | SOCIAL-01 |
| 09:00 | Twitter+Telegram+Discord | SOCIAL-01 |
| 10:00 | Product Hunt | CONTENT-01 |
| 全天 | 监控+回复 | ARCHITECT-01+SUPPORT-01 |

---

## 五、上线后运营 (2/15-2/28)

### 宣发计划
| 日期 | SOCIAL-01 | CONTENT-01 | GROWTH-01 |
|------|-----------|------------|----------|
| 2/15 | 上线公告 | Product Hunt | 提交Claude MCP官方 |
| 2/16 | 技术深度帖 | HN帖子 | 提交Cursor Marketplace |
| 2/17 | Use Case帖 | Dev.to文章 | 提交ChatGPT Store |
| 2/18 | KOL互动 | Medium文章 | 联系AI项目方 |
| 2/19-21 | 持续互动 | Reddit帖子 | 跟踪转化 |
| 2/22-28 | 社区AMA | 教程更新 | Grant跟进 |

### 技术迭代
| 优先级 | 任务 | 负责 |
|--------|------|------|
| P1 | 幂等缓存迁移Redis | CODER-01 |
| P1 | 全文搜索索引 | CODER-01 |
| P2 | 链上结算对接CommissionV2 | CODER-02 |
| P2 | 自动结算调度 | CODER-01 |
| P2 | SDK完善(JS/Python) | DEVREL-01 |

---

## 六、预算管控

| 项目 | 日均 | 月总计 |
|------|------|--------|
| AI API (付费Agent) | $36 | $720 |
| AI API (Gemini免费) | $0 | $0 |
| AWS服务器 | $0.7 | $20 |
| **总计** | **$36.7** | **$740** |
| **AWS抵扣券** | — | **$2,500可用** |

---

## 七、收入机会

| 机会 | 预期价值 | 时间线 |
|------|---------|--------|
| AWS Activate Grant | $5K-$100K | 2-4周 |
| BSC/Base Grant | $5K-$50K | 4-8周 |
| Commerce交易手续费 | $0-$500/月 | 上线后 |
| Skill发布费 | $0-$200/月 | 上线后 |
| 免费API Credits | $2K-$10K | 1-2周 |
