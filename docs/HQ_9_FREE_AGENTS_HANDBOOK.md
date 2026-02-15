# HQ 9 Free Agents 运营手册

> 9 个免费 Agent 7×24 自主运行，驱动增长、营收和资源获取  
> 模型：Groq (Llama 3.3 70B) + Gemini 2.5 Flash — **$0/天**  
> 付费 Agent (ARCHITECT-01, CODER-01) 仅人工按需启用

---

## 一、Agent 总览

| # | Agent Code | 名称 | AI 模型 | 免费额度 | 核心职能 |
|---|-----------|------|---------|---------|---------|
| 1 | GROWTH-01 | 增长官 | Groq Llama 3.3 70B | 14,400 req/day | 增长策略、竞品监控、转化优化 |
| 2 | BD-01 | BD经理 + 资源猎手 | Groq Llama 3.3 70B | 14,400 req/day | Grant 申请、免费资源搜索、合作伙伴 |
| 3 | ANALYST-01 | 业务分析师 | Gemini 2.5 Flash | 1,500 req/day | 数据报告、市场研究、成本优化 |
| 4 | SOCIAL-01 | 社媒运营官 | Gemini 2.5 Flash | 1,500 req/day | Twitter/TG/Discord 运营、KOL 互动 |
| 5 | CONTENT-01 | 内容创作官 | Groq Llama 3.3 70B | 14,400 req/day | 博客、教程、文档、社交内容 |
| 6 | SUPPORT-01 | 客户成功经理 | Groq Llama 3.3 70B | 14,400 req/day | Issue 响应、FAQ、用户反馈 |
| 7 | SECURITY-01 | 安全审计官 | Gemini 2.5 Flash | 1,500 req/day | 漏洞扫描、合规检查、安全审计 |
| 8 | DEVREL-01 | 开发者关系 | Gemini 2.5 Flash | 1,500 req/day | GitHub 社区、SDK 文档、框架集成 |
| 9 | LEGAL-01 | 合规顾问 | Gemini 2.5 Flash | 1,500 req/day | 法规监控、Grant 合规审查 |

---

## 二、各 Agent 详细职能与任务清单

### 1. GROWTH-01 — 增长官

**核心目标**: 驱动用户增长和产品使用量，一切以数据为依据

**任务清单**:
| 任务 | 类型 | 优先级 | 频率 | 预期交付物 |
|------|------|--------|------|-----------|
| Daily growth metrics check | ANALYSIS | HIGH | 每日 | 增长指标日报（流量、Stars、下载量） |
| Competitor scan and opportunity analysis | RESEARCH | NORMAL | 每日 | 竞品情报报告 |
| SEO keyword research | MARKETING | NORMAL | 每周 | 关键词列表 + 内容建议 |
| Design growth experiment | PLANNING | HIGH | 每周 | 实验方案（假设、指标、执行计划） |
| User acquisition channel analysis | ANALYSIS | NORMAL | 每周 | 渠道效果分析报告 |
| Conversion funnel optimization | ANALYSIS | HIGH | 每周 | 漏斗分析 + 优化建议 |

**协作关系**:
- → CONTENT-01: 委托内容创作
- → SOCIAL-01: 委托社交发布
- → ANALYST-01: 请求数据分析
- ← SUPPORT-01: 接收用户反馈行动项
- ← ANALYST-01: 接收数据洞察

---

### 2. BD-01 — BD经理 + 资源猎手

**核心目标**: 寻找免费资源（云 Credits、Grant、免费 API）和建立合作伙伴关系

**任务清单**:
| 任务 | 类型 | 优先级 | 频率 | 预期交付物 |
|------|------|--------|------|-----------|
| Hunt free cloud credits and grants | RESEARCH | CRITICAL | 每日 | 资源/机会列表（名称、价值、截止日期、链接） |
| Scan free API resources | RESEARCH | HIGH | 每周 | 免费 API 清单 + 节省分析 |
| Partnership outreach research | MARKETING | NORMAL | 每周 | 合作伙伴候选列表 + 提案草稿 |
| Draft grant application | MARKETING | HIGH | 按需 | Grant 申请文档 |
| Follow up on pending applications | OPERATIONS | NORMAL | 每日 | 申请状态更新 |
| Ecosystem mapping update | RESEARCH | LOW | 每月 | AI Agent 生态地图 |

**协作关系**:
- → CONTENT-01: 委托提案撰写
- → LEGAL-01: 委托合规审查
- → GROWTH-01: 共享市场机会
- ← DEVREL-01: 接收框架集成机会

---

### 3. ANALYST-01 — 业务分析师

**核心目标**: 提供数据驱动的业务洞察，支持团队决策

**任务清单**:
| 任务 | 类型 | 优先级 | 频率 | 预期交付物 |
|------|------|--------|------|-----------|
| Daily business metrics report | ANALYSIS | HIGH | 每日 | 结构化日报（注册、调用、GMV、API 用量） |
| Market size and trend analysis | RESEARCH | NORMAL | 每周 | 市场分析报告 |
| Cost optimization analysis | ANALYSIS | HIGH | 每周 | 成本分析 + 优化建议 |
| Competitive intelligence report | RESEARCH | NORMAL | 每周 | 单一竞品深度分析 |
| Weekly KPI trend analysis | ANALYSIS | HIGH | 每周 | 周趋势报告（WoW 增长率） |

**协作关系**:
- → GROWTH-01: 输出数据洞察驱动增长策略
- → CONTENT-01: 提供数据支撑内容创作
- ← SUPPORT-01: 接收用户反馈数据

---

### 4. SOCIAL-01 — 社媒运营官

**核心目标**: 增加社交媒体粉丝、互动率和品牌影响力

**任务清单**:
| 任务 | 类型 | 优先级 | 频率 | 预期交付物 |
|------|------|--------|------|-----------|
| Compose and post tweets | MARKETING | CRITICAL | 每日 3-4 条 | 已发布推文（含 Tweet ID） |
| KOL engagement on Twitter | MARKETING | HIGH | 每日 | 5-10 条 KOL 互动记录 |
| Telegram community update | MARKETING | HIGH | 每日 | TG 频道更新消息 |
| Discord community maintenance | OPERATIONS | NORMAL | 每日 | Discord 消息 + 问题回复 |
| Monitor AI Agent trending topics | RESEARCH | NORMAL | 每日 | 热点话题报告 + 建议回应 |

**协作关系**:
- ← CONTENT-01: 接收待发布内容
- ← GROWTH-01: 接收增长实验分发任务
- → GROWTH-01: 反馈社交互动数据

---

### 5. CONTENT-01 — 内容创作官

**核心目标**: 持续产出高质量内容，驱动 SEO 流量和品牌认知

**任务清单**:
| 任务 | 类型 | 优先级 | 频率 | 预期交付物 |
|------|------|--------|------|-----------|
| Write technical blog post | MARKETING | HIGH | 每周 2 篇 | 800-1200 字 Markdown 博客 |
| Create SDK tutorial | MARKETING | HIGH | 每周 | 步骤式教程（含代码示例） |
| Generate Twitter thread draft | MARKETING | NORMAL | 每周 | 5-8 条 Thread 草稿 |
| Update documentation | OPERATIONS | NORMAL | 每周 | 更新后的文档文件 |
| Batch social content generation | MARKETING | HIGH | 每周 | 15 tweets + 5 TG + 3 Discord |
| Write changelog and release notes | OPERATIONS | NORMAL | 按需 | Changelog 文档 |

**协作关系**:
- → SOCIAL-01: 委托内容发布
- ← GROWTH-01: 接收内容需求
- ← BD-01: 接收提案撰写需求
- ← ANALYST-01: 接收数据支撑

---

### 6. SUPPORT-01 — 客户成功经理

**核心目标**: 快速响应用户问题，提升用户满意度和留存

**任务清单**:
| 任务 | 类型 | 优先级 | 频率 | 预期交付物 |
|------|------|--------|------|-----------|
| Triage and respond to user feedback | OPERATIONS | HIGH | 每日 | Issue 回复 + Bug 上报 |
| Update FAQ and knowledge base | OPERATIONS | NORMAL | 每周 | 更新后的 FAQ 文档 |
| Create onboarding guide improvement | OPERATIONS | NORMAL | 每月 | 优化后的入门文档 |
| Compile daily feedback summary | ANALYSIS | HIGH | 每日 | 反馈汇总报告（Bug/需求/好评/投诉） |

**协作关系**:
- → GROWTH-01: 反馈用户痛点和行动项
- → CODER-01: 上报 Bug（人工触发）
- ← DEVREL-01: 协助开发者问题

---

### 7. SECURITY-01 — 安全审计官

**核心目标**: 确保系统安全，防范风险

**任务清单**:
| 任务 | 类型 | 优先级 | 频率 | 预期交付物 |
|------|------|--------|------|-----------|
| Security posture check | OPERATIONS | HIGH | 每日 | 安全状态报告 |
| Dependency vulnerability scan | OPERATIONS | HIGH | 每周 | CVE 漏洞报告 |
| Compliance checklist review | OPERATIONS | NORMAL | 每月 | 合规状态 + 行动项 |

**协作关系**:
- → CODER-01: 上报安全漏洞（人工触发）
- → LEGAL-01: 协调合规问题

---

### 8. DEVREL-01 — 开发者关系

**核心目标**: 吸引开发者使用 Agentrix，建设开发者社区

**任务清单**:
| 任务 | 类型 | 优先级 | 频率 | 预期交付物 |
|------|------|--------|------|-----------|
| GitHub community engagement | OPERATIONS | HIGH | 每日 | Issue/PR 回复 + 标签管理 |
| SDK and integration improvement | DEVELOPMENT | NORMAL | 每周 | 改进后的文档/示例 |
| Developer outreach on forums | MARKETING | NORMAL | 每周 | 论坛回答记录 |
| Framework integration research | RESEARCH | HIGH | 每周 | 集成机会报告 |

**协作关系**:
- → BD-01: 共享合作伙伴机会
- → CONTENT-01: 委托开发者内容
- → SUPPORT-01: 协助开发者问题

---

### 9. LEGAL-01 — 合规顾问

**核心目标**: 确保业务合规，防范法律风险

**任务清单**:
| 任务 | 类型 | 优先级 | 频率 | 预期交付物 |
|------|------|--------|------|-----------|
| Regulatory update scan | RESEARCH | NORMAL | 每周 | 法规更新简报 |
| Grant application legal review | OPERATIONS | NORMAL | 按需 | 合规审查意见 |
| Terms of service and privacy policy review | OPERATIONS | LOW | 每月 | ToS/隐私政策更新建议 |

**协作关系**:
- ← BD-01: 接收 Grant 申请合规审查
- → SECURITY-01: 协调合规问题

---

## 三、工具使用能力矩阵

| 工具 | GROWTH | BD | ANALYST | SOCIAL | CONTENT | SUPPORT | SECURITY | DEVREL | LEGAL |
|------|--------|-----|---------|--------|---------|---------|----------|--------|-------|
| `web_search` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `http_request` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `read_file` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `write_file` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `twitter_post` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `twitter_search` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `twitter_engage` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `telegram_send` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `discord_send` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `send_email` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `github_action` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `social_publish` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `shell` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**工具权限映射说明**:
- `growth` 角色 → 全部社交工具 (GROWTH-01, SOCIAL-01, CONTENT-01)
- `bd` 角色 → send_email, github_action, web_search (BD-01, DEVREL-01)
- `analyst` 角色 → twitter_search, github_action, web_search (ANALYST-01, SECURITY-01, LEGAL-01)
- `support` 角色 → 全部社交工具 (SUPPORT-01)
- 无 `allowedRoles` 限制的工具 → 所有 Agent 可用 (web_search, http_request, read/write_file, shell)

### 关于 Groq 网页搜索能力

**Groq 本身不提供网页搜索功能**，但通过 HQ 的 function calling 机制，所有 Agent（包括 Groq Agent）都可以使用 `web_search` 工具：

1. Agent（Groq/Gemini）生成 function call 请求：`web_search({ query: "..." })`
2. HQ 后端的 `AgentExecutorService` 拦截并执行该工具调用
3. `webSearchToolExecutor` 调用 Google Custom Search API 或 SearXNG
4. 搜索结果返回给 Agent 继续处理

**所需环境变量**:
```env
GOOGLE_SEARCH_API_KEY=xxx    # Google Custom Search API Key
GOOGLE_SEARCH_CX=xxx         # Google Custom Search Engine ID
# 或备用
SEARX_URL=https://searx.be   # SearXNG 实例 URL
```

---

## 四、交付物存储位置

### 当前存储方式

Agent 的所有任务输出存储在 **PostgreSQL 数据库** 的 `agent_tasks` 表中：

| 字段 | 类型 | 说明 |
|------|------|------|
| `result` | TEXT | Agent 的完整输出文本（报告、分析、内容等） |
| `metadata` | JSONB | 执行元数据（模型、token 用量、pipeline ID 等） |
| `status` | ENUM | 任务状态（completed/failed） |
| `completed_at` | TIMESTAMP | 完成时间 |

### 查看交付物的方式

1. **HQ Console UI**: 访问 `http://57.182.89.146:8080` → Tasks 页面
2. **API 查询**:
   ```bash
   # 查看已完成任务
   curl http://57.182.89.146:8080/api/hq/tasks?status=completed
   
   # 查看特定 Agent 的任务
   curl http://57.182.89.146:8080/api/hq/tasks?agentCode=GROWTH-01&status=completed
   ```
3. **数据库直查**:
   ```sql
   SELECT title, result, completed_at 
   FROM agent_tasks 
   WHERE status = 'completed' 
   ORDER BY completed_at DESC 
   LIMIT 20;
   ```

### 文件级交付物

当 Agent 使用 `write_file` 工具时，文件会写入服务器文件系统：
- 服务器路径: `/home/ubuntu/Agentrix-independent-HQ/` (或 Docker 挂载的 workspace)
- 常见输出位置: `docs/`, `reports/`, 项目根目录

---

## 五、协作流水线 (Collaboration Pipelines)

系统内置 6 条自动化协作流水线：

### 1. content-publish — 内容发布流水线
```
CONTENT-01 (创作) → GROWTH-01 (策略审核) → SOCIAL-01 (发布)
```

### 2. grant-application — Grant 申请流水线
```
BD-01 (发现机会) → CONTENT-01 (撰写提案) → LEGAL-01 (合规审查) → BD-01 (提交)
```

### 3. growth-experiment — 增长实验流水线
```
GROWTH-01 (设计实验) → CONTENT-01 (创建素材) → SOCIAL-01 (分发) → ANALYST-01 (分析结果)
```

### 4. competitor-response — 竞品响应流水线
```
ANALYST-01 (分析竞品) → GROWTH-01 (制定策略) → CONTENT-01 (差异化内容) → SOCIAL-01 (传播)
```

### 5. market-analysis — 市场分析流水线
```
ANALYST-01 (收集数据) → GROWTH-01 (制定策略) → BD-01 (识别合作机会)
```

### 6. developer-acquisition — 开发者获客流水线
```
DEVREL-01 (研究社区) → CONTENT-01 (创建开发者内容) → SOCIAL-01 (分发) → SUPPORT-01 (跟进)
```

---

## 六、自动任务链 (Chain Rules)

任务完成后自动触发下游任务：

| 触发条件 | 下游任务 | 目标 Agent |
|---------|---------|-----------|
| ANALYST 完成 ANALYSIS 任务 | 基于分析制定增长策略 | GROWTH-01 |
| GROWTH 完成 PLANNING 任务 | 创建营销内容 | CONTENT-01 |
| CONTENT 完成 MARKETING 任务 | 跨平台发布 | SOCIAL-01 |
| BD 完成 RESEARCH 任务 | 撰写提案 | CONTENT-01 |
| SUPPORT 完成 ANALYSIS 任务 | 处理用户反馈 | GROWTH-01 |

---

## 七、排班表 (7×24)

| 时段 | 时间 | 工作模式 | 重点任务 |
|------|------|---------|---------|
| DAWN | 00:00-06:00 | BATCH | 批量研究、数据采集、安全扫描、法规检查 |
| MORNING | 06:00-12:00 | ACTIVE | 社交发帖、KOL 互动、内容创作、Issue 响应 |
| AFTERNOON | 12:00-18:00 | CREATIVE | 增长实验、博客撰写、SDK 教程、合作提案 |
| EVENING | 18:00-24:00 | MONITOR | 日报生成、反馈汇总、社交互动、趋势监控 |

---

## 八、预算与配额

| Agent | 模型 | 日请求配额 | 日成本 | 每 Tick 任务数 |
|-------|------|-----------|--------|--------------|
| GROWTH-01 | Groq | 3,500 | $0 | 2-3 |
| BD-01 | Groq | 3,000 | $0 | 2 |
| CONTENT-01 | Groq | 3,000 | $0 | 2-3 |
| SUPPORT-01 | Groq | 2,000 | $0 | 2 |
| ANALYST-01 | Gemini | 400 | $0 | 1-2 |
| SOCIAL-01 | Gemini | 400 | $0 | 2-3 |
| SECURITY-01 | Gemini | 200 | $0 | 1 |
| DEVREL-01 | Gemini | 300 | $0 | 1-2 |
| LEGAL-01 | Gemini | 200 | $0 | 1 |
| **合计** | | **13,000** | **$0** | **12/tick** |

---

## 九、环境变量要求

```env
# === 社交媒体 API (已配置) ===
TWITTER_API_KEY=xxx
TWITTER_API_SECRET=xxx
TWITTER_ACCESS_TOKEN=xxx
TWITTER_ACCESS_SECRET=xxx
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHANNEL=xxx
DISCORD_BOT_TOKEN=xxx
DISCORD_WEBHOOK_URL=xxx
DISCORD_ANNOUNCE_CHANNEL=xxx

# === 邮件 ===
SENDGRID_API_KEY=xxx
EMAIL_FROM=hello@agentrix.top

# === GitHub ===
GITHUB_TOKEN=xxx

# === 网页搜索 ===
GOOGLE_SEARCH_API_KEY=xxx
GOOGLE_SEARCH_CX=xxx
# 或备用: SEARX_URL=https://searx.be

# === AI 模型 ===
GROQ_API_KEY=xxx
GEMINI_API_KEY=xxx
```

---

## 十、监控与运维

### 查看 Agent 状态
```bash
curl http://57.182.89.146:8080/api/hq/agents
```

### 查看 Tick 执行状态
```bash
curl http://57.182.89.146:8080/api/hq/tick/stats
```

### 查看预算使用
```bash
curl http://57.182.89.146:8080/api/hq/budget/status
```

### PM2 日志
```bash
ssh -i agentrix.pem ubuntu@57.182.89.146 'pm2 logs hq-backend --lines 100'
```
