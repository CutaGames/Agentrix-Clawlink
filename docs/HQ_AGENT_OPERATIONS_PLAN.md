# HQ Agent 7×24 自动化运营计划

> **角色**: CEO + 增长推广负责人视角
> **Version**: 1.0 | **Date**: 2026-02-09
> **目标**: 最大化利用免费 API 资源，让 HQ Agent 团队 7×24 小时工作，驱动 Agentrix 增长

---

## 一、Agent 团队编制与职能定义

### 1.1 团队总览

| Agent Code | 角色 | AI Provider | 模型 | 日配额 | 成本 | 核心职责 |
|------------|------|-------------|------|--------|------|----------|
| ARCHITECT-01 | 架构师 | Bedrock | Claude Sonnet | 30 req | ~$1/天 | 技术架构、Sprint 规划 (付费，按需) |
| CODER-01 | 工程师 | Bedrock | Claude Sonnet | 60 req | ~$1.1/天 | 代码实现、Bug 修复 (付费，按需) |
| **GROWTH-01** | **增长官** | **Groq** | llama-3.3-70b | **4,000 req** | **$0** | 增长策略、用户获取、转化优化 |
| **BD-01** | **BD 经理** | **Groq** | llama-3.3-70b | **3,000 req** | **$0** | 合作伙伴、Grant 申请、资源获取 |
| **CONTENT-01** | **内容官** | **Groq** | llama-3.3-70b | **4,000 req** | **$0** | 内容创作、文档、博客、教程 |
| **ANALYST-01** | **分析师** | **Gemini** | gemini-2.0-flash | **500 req** | **$0** | 数据分析、市场研究、竞品分析 |
| **SOCIAL-01** | **社媒官** | **Gemini** | gemini-2.0-flash | **500 req** | **$0** | Twitter/TG/Discord 运营、KOL 互动 |
| **SUPPORT-01** | **客服** | **DeepSeek** | deepseek-chat | **2,000 req** | **~$0.01/天** | 用户支持、FAQ、知识库维护 |

> **总计**: ~16,000+ 免费请求/天，付费 Agent (ARCHITECT/CODER) 仅按需启用

### 1.2 免费 Agent 是核心战力

ARCHITECT-01 和 CODER-01 是付费模型，**默认不安排常规任务**，仅在以下场景启用：
- 人工指派的关键开发任务
- 紧急 Bug 修复
- 架构决策评审

**其余 6 个 Agent 全部使用免费 API，是 7×24 运营的主力。**

---

## 二、各 Agent 详细职能与任务配置

### 2.1 GROWTH-01 — 增长官 (Groq, 4000 req/天)

**核心 KPI**: 用户增长率、注册转化率、Skill 调用量

**职能清单:**

| 任务类型 | 具体任务 | 频率 | 优先级 |
|----------|----------|------|--------|
| 增长策略 | 制定周度增长实验计划 | 每周一 | HIGH |
| 用户获取 | 分析获客渠道效果，优化投放策略 | 每日 | HIGH |
| 转化优化 | 分析注册→激活→付费漏斗 | 每日 | HIGH |
| A/B 测试 | 设计和分析 A/B 测试方案 | 每周 | NORMAL |
| SEO 审计 | 检查网站 SEO 状态，生成优化建议 | 每周 | NORMAL |
| 竞品监控 | 扫描竞品动态，识别机会和威胁 | 每日 | NORMAL |
| 关键词研究 | 挖掘 AI Agent Commerce 相关关键词 | 每周 | LOW |
| 增长报告 | 生成日/周增长数据报告 | 每日 | HIGH |
| 定价研究 | 分析 Skill 定价策略和市场价格 | 每周 | NORMAL |
| 留存分析 | 分析用户留存和流失原因 | 每周 | HIGH |

**工具权限:**
```json
{
  "tools": [
    "web_search",           // 搜索竞品和市场信息
    "web_scrape",           // 抓取竞品页面数据
    "file_read",            // 读取数据报告
    "file_write",           // 生成分析报告
    "shell_execute",        // 执行数据查询脚本
    "send_email",           // 发送增长报告
    "social_media_post",    // 发布增长相关内容
    "analytics_query",      // 查询分析数据
    "a2a_create_task",      // 委托任务给其他 Agent
    "a2a_review_task"       // 审核其他 Agent 的交付
  ],
  "permissions": [
    "read_metrics",         // 读取业务指标
    "create_experiments",   // 创建增长实验
    "delegate_tasks",       // 委托任务
    "access_analytics"      // 访问分析面板
  ]
}
```

**System Prompt 核心:**
```
你是 Agentrix 的增长官 (Growth Lead)。你的核心目标是驱动用户增长和产品使用量。
你需要：
1. 每日分析增长数据，识别增长机会
2. 设计和跟踪增长实验
3. 优化用户获取和转化漏斗
4. 监控竞品动态，快速响应市场变化
5. 与 CONTENT-01、SOCIAL-01、BD-01 协作，形成增长合力
你的决策必须基于数据，每个建议都要有数据支撑。
```

---

### 2.2 BD-01 — BD 经理 (Groq, 3000 req/天)

**核心 KPI**: 合作伙伴数量、Grant 获取金额、免费资源获取量

**职能清单:**

| 任务类型 | 具体任务 | 频率 | 优先级 |
|----------|----------|------|--------|
| **Grant 猎手** | 搜索并申请云计算 Credits 和公链 Grant | 每日 | **CRITICAL** |
| **免费资源扫描** | 寻找免费 API、云服务、工具 | 每日 | **CRITICAL** |
| 合作伙伴研究 | 识别潜在合作伙伴 (AI 平台、支付商) | 每日 | HIGH |
| 提案撰写 | 撰写 Grant 申请和合作提案 | 按需 | HIGH |
| 跟进管理 | 跟进已提交的申请和合作意向 | 每日 | HIGH |
| 生态映射 | 绘制 AI Agent 生态图谱 | 每周 | NORMAL |
| 投资人研究 | 研究 AI + Crypto 领域投资人 | 每周 | NORMAL |
| CRM 更新 | 更新合作伙伴和 Lead 数据库 | 每日 | NORMAL |
| 市场进入 | 分析新市场进入策略 | 每月 | LOW |

**7×24 免费资源猎手任务模板:**

```yaml
# Grant 和免费资源自动扫描任务
task_templates:
  grant-research:
    title: "扫描新的 Grant 和免费资源机会"
    description: |
      搜索以下类别的免费资源和 Grant 机会：
      
      1. 云计算 Credits:
         - Google Cloud for Startups (https://cloud.google.com/startup)
         - Microsoft for Startups (https://startups.microsoft.com)
         - AWS Activate (https://aws.amazon.com/activate)
         - DigitalOcean Hatch (https://www.digitalocean.com/hatch)
         - Oracle for Startups
         - IBM Cloud Credits
      
      2. 公链基金/Grant:
         - BNB Chain Grants (https://www.bnbchain.org/en/developers/developer-programs)
         - Polygon Grants
         - Ethereum Foundation Grants
         - Solana Foundation Grants
         - Optimism RPGF
         - Arbitrum Grants
         - Gitcoin Grants
         - Filecoin Grants
      
      3. AI/ML 免费资源:
         - Hugging Face Pro (免费 GPU)
         - Google Colab Pro
         - Lambda Labs Credits
         - Together AI Credits
         - Anthropic API Credits
         - OpenAI API Credits
      
      4. 开发者工具:
         - Vercel Pro (开源项目免费)
         - Cloudflare Workers (免费额度)
         - Supabase (免费额度)
         - PlanetScale (免费额度)
         - Railway ($5/月免费)
      
      5. 加速器/孵化器:
         - Y Combinator
         - Techstars
         - 500 Startups
         - Web3 加速器
      
      输出格式：
      - 资源名称
      - 预估价值
      - 申请链接
      - 申请截止日期
      - 申请要求
      - 推荐优先级 (1-10)
    type: RESEARCH
    priority: CRITICAL
    frequency: daily
    
  partnership-scan:
    title: "扫描潜在合作伙伴"
    description: |
      搜索以下类别的潜在合作伙伴：
      1. AI Agent 平台 (Dify, Coze, FastGPT, etc.)
      2. 支付服务商 (Stripe, PayPal, Transak, MoonPay)
      3. MCP 生态项目
      4. Web3 项目 (DeFi, NFT 平台)
      5. 开发者工具公司
      
      评估合作价值和接触方式。
    type: MARKETING
    priority: HIGH
    frequency: daily
```

**工具权限:**
```json
{
  "tools": [
    "web_search",           // 搜索 Grant 和合作机会
    "web_scrape",           // 抓取申请页面信息
    "file_read",            // 读取提案模板
    "file_write",           // 撰写申请文档
    "send_email",           // 发送合作邮件
    "shell_execute",        // 执行自动化脚本
    "a2a_create_task",      // 委托 CONTENT-01 撰写提案
    "social_media_search"   // 搜索潜在合作伙伴社交信息
  ],
  "permissions": [
    "send_outreach_emails", // 发送外联邮件
    "submit_applications",  // 提交 Grant 申请
    "manage_crm",           // 管理 CRM
    "delegate_tasks"        // 委托任务
  ]
}
```

---

### 2.3 CONTENT-01 — 内容官 (Groq, 4000 req/天)

**核心 KPI**: 内容产出量、内容互动率、SEO 排名

**职能清单:**

| 任务类型 | 具体任务 | 频率 | 优先级 |
|----------|----------|------|--------|
| 博客文章 | 撰写技术博客 (英文+中文) | 每周 2-3 篇 | HIGH |
| 教程文档 | 编写 SDK/API 使用教程 | 每周 1-2 篇 | HIGH |
| Twitter 内容 | 生成推文草稿 (Thread + 单条) | 每日 3-5 条 | HIGH |
| Changelog | 生成版本更新日志 | 每次发版 | HIGH |
| 白皮书 | 撰写/更新白皮书章节 | 每月 | NORMAL |
| 案例研究 | 撰写用户案例和成功故事 | 每月 | NORMAL |
| Newsletter | 编写周报/月报 | 每周 | NORMAL |
| Landing Page | 撰写落地页文案 | 按需 | HIGH |
| SEO 内容 | 针对目标关键词创作内容 | 每周 | NORMAL |
| 文档更新 | 更新 API 文档和 README | 每日 | NORMAL |
| 视频脚本 | 撰写 Demo 视频脚本 | 每月 | LOW |
| 社交内容批量 | 批量生成一周的社交内容 | 每周日 | HIGH |

**内容日历模板:**
```yaml
content_calendar:
  monday:
    - { type: "blog", topic: "技术教程", lang: "en+zh", target: "Dev.to, 掘金" }
    - { type: "twitter_thread", topic: "产品功能深度解析" }
    - { type: "telegram_post", topic: "周一产品更新" }
  tuesday:
    - { type: "twitter_posts", count: 3, topics: ["行业洞察", "用户故事", "产品 tip"] }
    - { type: "discord_post", topic: "技术讨论话题" }
  wednesday:
    - { type: "blog", topic: "行业分析/对比", lang: "en", target: "Medium" }
    - { type: "twitter_thread", topic: "AI Agent 经济趋势" }
  thursday:
    - { type: "tutorial", topic: "SDK 使用教程", target: "docs site" }
    - { type: "twitter_posts", count: 3 }
  friday:
    - { type: "changelog", topic: "本周更新汇总" }
    - { type: "newsletter", topic: "周报" }
    - { type: "twitter_thread", topic: "本周亮点回顾" }
  saturday:
    - { type: "batch_social", count: 15, platforms: ["twitter", "telegram", "discord"] }
    - { type: "seo_content", topic: "长尾关键词文章" }
  sunday:
    - { type: "content_plan", topic: "下周内容计划" }
    - { type: "content_review", topic: "审核本周内容效果" }
```

**工具权限:**
```json
{
  "tools": [
    "file_read",            // 读取项目代码和文档
    "file_write",           // 写入内容文件
    "web_search",           // 搜索话题和素材
    "social_media_post",    // 发布到社交平台
    "shell_execute",        // 执行文档构建
    "a2a_create_task"       // 委托 SOCIAL-01 发布
  ],
  "permissions": [
    "write_docs",           // 写入文档
    "publish_blog",         // 发布博客
    "create_content",       // 创建内容
    "manage_content_calendar" // 管理内容日历
  ]
}
```

---

### 2.4 ANALYST-01 — 分析师 (Gemini, 500 req/天)

**核心 KPI**: 报告准确率、洞察可行性、数据覆盖率

**职能清单:**

| 任务类型 | 具体任务 | 频率 | 优先级 |
|----------|----------|------|--------|
| 日报 | 生成每日业务指标报告 | 每日 | HIGH |
| 周报 | 生成周度趋势分析报告 | 每周 | HIGH |
| 竞品分析 | 深度竞品分析报告 | 每月 | HIGH |
| 市场研究 | AI Agent 市场规模和趋势 | 每月 | NORMAL |
| 异常检测 | 监控指标异常并告警 | 每日 | CRITICAL |
| 用户行为 | 分析用户使用路径和行为模式 | 每周 | HIGH |
| 收入预测 | 基于趋势预测收入 | 每月 | NORMAL |
| ROI 计算 | 计算各渠道 ROI | 每周 | HIGH |
| 成本分析 | 分析运营成本和优化空间 | 每周 | NORMAL |

**关键指标追踪:**
```yaml
metrics_tracking:
  growth:
    - total_users           # 总用户数
    - daily_signups         # 日注册数
    - activation_rate       # 激活率
    - retention_d7          # 7日留存
    - retention_d30         # 30日留存
  commerce:
    - total_skills          # Skill 总数
    - active_skills         # 活跃 Skill 数
    - daily_skill_calls     # 日 Skill 调用
    - gmv_daily             # 日 GMV
    - a2a_tasks_daily       # 日 A2A 任务数
  social:
    - twitter_followers     # Twitter 粉丝
    - twitter_engagement    # Twitter 互动率
    - telegram_members      # TG 成员数
    - discord_members       # Discord 成员数
    - github_stars          # GitHub Stars
  developer:
    - registered_devs       # 注册开发者
    - active_devs           # 活跃开发者
    - sdk_downloads         # SDK 下载量
    - api_calls_daily       # 日 API 调用
```

**工具权限:**
```json
{
  "tools": [
    "web_search",           // 搜索市场数据
    "web_scrape",           // 抓取竞品数据
    "file_read",            // 读取数据文件
    "file_write",           // 生成报告
    "shell_execute",        // 执行数据查询
    "analytics_query",      // 查询分析数据库
    "send_email"            // 发送报告
  ],
  "permissions": [
    "read_all_metrics",     // 读取所有指标
    "access_database",      // 访问数据库 (只读)
    "generate_reports",     // 生成报告
    "send_alerts"           // 发送告警
  ]
}
```

---

### 2.5 SOCIAL-01 — 社媒官 (Gemini, 500 req/天)

**核心 KPI**: 粉丝增长率、互动率、社区活跃度

**职能清单:**

| 任务类型 | 具体任务 | 频率 | 优先级 |
|----------|----------|------|--------|
| **Twitter 发帖** | 发布推文 (产品更新、技术洞察、互动) | 每日 3-4 条 | **CRITICAL** |
| **Twitter 互动** | 回复评论、转发、点赞相关推文 | 每日 20+ 次 | **CRITICAL** |
| **KOL 互动** | 与 AI/Crypto KOL 互动 | 每日 5-10 次 | **HIGH** |
| Telegram 运营 | 发布公告、回复问题、维护社区 | 每日 | HIGH |
| Discord 运营 | 发布内容、回答问题、管理频道 | 每日 | HIGH |
| 趋势监控 | 监控 AI Agent 领域热点话题 | 每日 | HIGH |
| 内容排期 | 安排一周社交内容发布时间 | 每周 | NORMAL |
| 互动分析 | 分析哪些内容互动率高 | 每周 | NORMAL |
| 社区活动 | 策划 AMA、Giveaway 等活动 | 每月 | NORMAL |
| GitHub 维护 | 回复 Issue、更新 README | 每日 | NORMAL |

**Twitter 互动策略:**
```yaml
twitter_strategy:
  daily_posts:
    - time: "09:00 UTC"
      type: "product_update"
      template: "🚀 {feature_name} is now live on Agentrix! {description} Try it: {link}"
    - time: "13:00 UTC"
      type: "tech_insight"
      template: "🧵 Thread: {topic} ..."
    - time: "17:00 UTC"
      type: "industry_comment"
      template: "Interesting development in {topic}. Here's how it relates to Agent Commerce: ..."
    - time: "21:00 UTC"
      type: "community"
      template: "What's your biggest challenge with AI Agent payments? 🤔 Drop your thoughts below 👇"
  
  kol_targets:
    tier_1:  # 直接互动，评论他们的推文
      - handle: "@AnthropicAI"
        topic: "MCP, Claude, Agent capabilities"
      - handle: "@OpenAI"
        topic: "GPTs, function calling, Agent economy"
      - handle: "@GoogleAI"
        topic: "Gemini, Extensions, AI commerce"
    tier_2:  # 引用推文，技术讨论
      - handle: "@swyx"
        topic: "AI engineering, Agent frameworks"
      - handle: "@jxnlco"
        topic: "LLM applications, structured output"
      - handle: "@kaboroevich"
        topic: "AI agents, autonomous systems"
    tier_3:  # 回复、点赞
      - handle: "@langaborchain"
        topic: "LangChain, Agent tools"
      - handle: "@craborewai"
        topic: "CrewAI, multi-agent"
  
  engagement_rules:
    - "每条推文发布后 1 小时内回复前 5 条评论"
    - "每天至少转发 3 条相关行业推文并加评论"
    - "每天至少回复 10 条 AI Agent 相关推文"
    - "追踪 #AIAgent #MCP #AgentCommerce 标签"
    - "周末发布轻松内容 (meme, poll)"
```

**工具权限:**
```json
{
  "tools": [
    "social_media_post",    // 发布到 Twitter/TG/Discord
    "social_media_search",  // 搜索社交媒体内容
    "social_media_engage",  // 互动 (回复、点赞、转发)
    "web_search",           // 搜索热点话题
    "file_read",            // 读取内容草稿
    "send_telegram",        // 发送 Telegram 消息
    "send_discord",         // 发送 Discord 消息
    "github_interact"       // GitHub Issue/PR 互动
  ],
  "permissions": [
    "post_twitter",         // 发布 Twitter
    "manage_telegram",      // 管理 Telegram
    "manage_discord",       // 管理 Discord
    "engage_social",        // 社交互动
    "manage_github_issues"  // 管理 GitHub Issues
  ]
}
```

---

### 2.6 SUPPORT-01 — 客服 (DeepSeek, 2000 req/天)

**核心 KPI**: 响应时间、解决率、用户满意度

**职能清单:**

| 任务类型 | 具体任务 | 频率 | 优先级 |
|----------|----------|------|--------|
| Ticket 响应 | 回复用户 Ticket 和问题 | 实时 | CRITICAL |
| FAQ 维护 | 更新 FAQ 和知识库 | 每日 | HIGH |
| 文档改进 | 根据用户反馈改进文档 | 每日 | HIGH |
| 反馈汇总 | 汇总用户反馈和功能请求 | 每日 | HIGH |
| 知识库更新 | 更新知识库文章 | 每周 | NORMAL |
| 自动回复优化 | 优化自动回复模板 | 每周 | NORMAL |
| 满意度分析 | 分析用户满意度趋势 | 每周 | NORMAL |
| 入门引导 | 创建和优化新用户引导 | 每月 | NORMAL |
| Bug 上报 | 将用户报告的 Bug 转为 Ticket | 实时 | HIGH |

**工具权限:**
```json
{
  "tools": [
    "file_read",            // 读取文档和知识库
    "file_write",           // 更新文档
    "web_search",           // 搜索解决方案
    "send_email",           // 回复用户邮件
    "send_telegram",        // 回复 TG 消息
    "send_discord",         // 回复 Discord 消息
    "a2a_create_task",      // 上报 Bug 给 CODER
    "shell_execute"         // 执行诊断脚本
  ],
  "permissions": [
    "read_tickets",         // 读取 Ticket
    "respond_tickets",      // 回复 Ticket
    "update_knowledge_base",// 更新知识库
    "escalate_issues"       // 升级问题
  ]
}
```

---

## 三、任务系统与 Ticket 分配

### 3.1 任务自动生成规则

任务由 `AutoTaskGeneratorService` 根据以下规则自动生成：

```typescript
// 扩展 ROLE_TASK_TEMPLATES
const ENHANCED_ROLE_TEMPLATES = {
  growth: [
    // 每日必做
    { title: '每日增长数据检查', type: 'ANALYSIS', priority: 'HIGH', frequency: 'daily' },
    { title: '竞品动态扫描', type: 'RESEARCH', priority: 'NORMAL', frequency: 'daily' },
    { title: '用户获取渠道分析', type: 'ANALYSIS', priority: 'HIGH', frequency: 'daily' },
    // 每周
    { title: '周度增长实验规划', type: 'PLANNING', priority: 'HIGH', frequency: 'weekly' },
    { title: 'SEO 审计报告', type: 'ANALYSIS', priority: 'NORMAL', frequency: 'weekly' },
    { title: '转化漏斗优化', type: 'ANALYSIS', priority: 'HIGH', frequency: 'weekly' },
  ],
  bd: [
    // 每日必做 — 免费资源猎手
    { title: '扫描 Grant 和免费资源', type: 'RESEARCH', priority: 'CRITICAL', frequency: 'daily' },
    { title: '合作伙伴跟进', type: 'COMMUNICATION', priority: 'HIGH', frequency: 'daily' },
    { title: '生态项目扫描', type: 'RESEARCH', priority: 'NORMAL', frequency: 'daily' },
    // 每周
    { title: '撰写 Grant 申请', type: 'COMMUNICATION', priority: 'HIGH', frequency: 'weekly' },
    { title: '合作提案更新', type: 'PLANNING', priority: 'NORMAL', frequency: 'weekly' },
  ],
  content: [
    // 每日
    { title: '生成 Twitter 内容', type: 'MARKETING', priority: 'HIGH', frequency: 'daily' },
    { title: '文档更新检查', type: 'OPERATIONS', priority: 'NORMAL', frequency: 'daily' },
    // 每周
    { title: '撰写技术博客', type: 'MARKETING', priority: 'HIGH', frequency: 'biweekly' },
    { title: '教程文档编写', type: 'MARKETING', priority: 'HIGH', frequency: 'weekly' },
    { title: '周报/Changelog', type: 'MARKETING', priority: 'HIGH', frequency: 'weekly' },
    { title: '批量社交内容生成', type: 'MARKETING', priority: 'HIGH', frequency: 'weekly' },
  ],
  analyst: [
    // 每日
    { title: '每日指标报告', type: 'ANALYSIS', priority: 'HIGH', frequency: 'daily' },
    { title: '异常检测扫描', type: 'ANALYSIS', priority: 'CRITICAL', frequency: 'daily' },
    // 每周
    { title: '周度趋势分析', type: 'ANALYSIS', priority: 'HIGH', frequency: 'weekly' },
    { title: '竞品深度分析', type: 'RESEARCH', priority: 'NORMAL', frequency: 'monthly' },
    { title: 'ROI 计算报告', type: 'ANALYSIS', priority: 'HIGH', frequency: 'weekly' },
  ],
  social: [
    // 每日
    { title: 'Twitter 发帖 (3-4 条)', type: 'MARKETING', priority: 'CRITICAL', frequency: 'daily' },
    { title: 'Twitter KOL 互动', type: 'MARKETING', priority: 'HIGH', frequency: 'daily' },
    { title: 'Telegram 社区维护', type: 'COMMUNICATION', priority: 'HIGH', frequency: 'daily' },
    { title: 'Discord 社区维护', type: 'COMMUNICATION', priority: 'HIGH', frequency: 'daily' },
    { title: 'GitHub Issue 回复', type: 'COMMUNICATION', priority: 'NORMAL', frequency: 'daily' },
    // 每周
    { title: '社交媒体互动分析', type: 'ANALYSIS', priority: 'NORMAL', frequency: 'weekly' },
    { title: '热点话题追踪', type: 'RESEARCH', priority: 'HIGH', frequency: 'daily' },
  ],
  support: [
    // 实时
    { title: 'Ticket 响应', type: 'COMMUNICATION', priority: 'CRITICAL', frequency: 'realtime' },
    // 每日
    { title: 'FAQ 更新', type: 'OPERATIONS', priority: 'HIGH', frequency: 'daily' },
    { title: '用户反馈汇总', type: 'ANALYSIS', priority: 'HIGH', frequency: 'daily' },
    { title: 'Bug 上报整理', type: 'OPERATIONS', priority: 'HIGH', frequency: 'daily' },
    // 每周
    { title: '知识库更新', type: 'OPERATIONS', priority: 'NORMAL', frequency: 'weekly' },
    { title: '满意度分析', type: 'ANALYSIS', priority: 'NORMAL', frequency: 'weekly' },
  ],
};
```

### 3.2 Ticket 分配流程

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ 任务来源     │     │ 分配引擎      │     │ Agent 执行    │
├─────────────┤     ├──────────────┤     ├──────────────┤
│ ① Cron 自动 │────▶│ 1. 按角色匹配 │────▶│ Agent 领取    │
│ ② 人工创建  │     │ 2. 按优先级排 │     │ 执行任务      │
│ ③ Agent 委托│     │ 3. 检查配额   │     │ 提交结果      │
│ ④ 事件触发  │     │ 4. 负载均衡   │     │ 更新状态      │
└─────────────┘     └──────────────┘     └──────────────┘
                           │
                    ┌──────▼──────┐
                    │ 升级/委托    │
                    │ 超时 → 重分配│
                    │ 失败 → 重试  │
                    └─────────────┘
```

**分配规则:**
1. **角色匹配**: 任务类型 → Agent 角色映射
2. **优先级排序**: CRITICAL > HIGH > NORMAL > LOW
3. **配额检查**: 检查 Agent 当日剩余配额
4. **负载均衡**: 优先分配给当前空闲的 Agent
5. **升级机制**: 超时未完成 → 升级到更高级 Agent 或人工

### 3.3 协作流水线

```yaml
collaboration_pipelines:
  # 内容发布流水线
  content-publish:
    stages:
      - agent: CONTENT-01
        task: "撰写内容草稿"
        output: "content_draft"
      - agent: GROWTH-01
        task: "审核内容策略对齐"
        input: "content_draft"
        output: "reviewed_content"
      - agent: SOCIAL-01
        task: "发布到各平台"
        input: "reviewed_content"
  
  # Grant 申请流水线
  grant-application:
    stages:
      - agent: BD-01
        task: "发现 Grant 机会并评估"
        output: "grant_opportunity"
      - agent: CONTENT-01
        task: "撰写 Grant 申请文档"
        input: "grant_opportunity"
        output: "grant_proposal"
      - agent: ANALYST-01
        task: "审核数据和预测"
        input: "grant_proposal"
        output: "final_proposal"
      - agent: BD-01
        task: "提交申请并跟进"
        input: "final_proposal"
  
  # 增长实验流水线
  growth-experiment:
    stages:
      - agent: GROWTH-01
        task: "设计增长实验"
        output: "experiment_plan"
      - agent: ANALYST-01
        task: "设置数据追踪"
        input: "experiment_plan"
      - agent: CONTENT-01
        task: "创建实验所需内容"
        input: "experiment_plan"
      - agent: SOCIAL-01
        task: "执行分发"
        input: "experiment_plan"
      - agent: ANALYST-01
        task: "分析实验结果"
        output: "experiment_results"
      - agent: GROWTH-01
        task: "决策下一步"
        input: "experiment_results"
  
  # 竞品响应流水线
  competitor-response:
    stages:
      - agent: ANALYST-01
        task: "分析竞品动态"
        output: "competitor_analysis"
      - agent: GROWTH-01
        task: "制定应对策略"
        input: "competitor_analysis"
        output: "response_strategy"
      - agent: CONTENT-01
        task: "创建差异化内容"
        input: "response_strategy"
      - agent: SOCIAL-01
        task: "发布和传播"
```

---

## 四、7×24 排班优化

### 4.1 时段策略

| 时段 | UTC 时间 | 免费 Agent 工作模式 | 重点任务 |
|------|----------|-------------------|----------|
| **DAWN** | 00:00-06:00 | BATCH 批量处理 | 数据收集、SEO 审计、Grant 扫描、内容预生成 |
| **MORNING** | 06:00-12:00 | ACTIVE 全力工作 | 发帖、互动、策略制定、报告生成 |
| **AFTERNOON** | 12:00-18:00 | ACTIVE 协作产出 | 内容发布、合作跟进、社区维护 |
| **EVENING** | 18:00-24:00 | ACTIVE + 总结 | 晚间互动、日报生成、明日计划 |

### 4.2 配额分配优化

```
每日总配额: ~16,000 requests

Groq (14,400 free):
├── GROWTH-01:  4,000 req → 每 Tick 3 任务 × 24 Tick/天
├── BD-01:      3,000 req → 每 Tick 2 任务 × 24 Tick/天
└── CONTENT-01: 4,000 req → 每 Tick 3 任务 × 24 Tick/天
    剩余 3,400 作为缓冲

Gemini (1,500 free):
├── ANALYST-01: 500 req → 每 Tick 2 任务 × 12 Tick/天 (高活跃时段)
└── SOCIAL-01:  500 req → 每 Tick 2 任务 × 12 Tick/天 (高活跃时段)
    剩余 500 作为缓冲

DeepSeek (~unlimited, 极低成本):
└── SUPPORT-01: 2,000 req → 全天候响应
```

---

## 五、KPI 看板与数据驱动

### 5.1 Agent 绩效看板

```
┌──────────────────────────────────────────────────────────────┐
│                   HQ Agent Performance Dashboard             │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│ Agent    │ Tasks/Day│ Success% │ Cost/Day │ Key Output      │
├──────────┼──────────┼──────────┼──────────┼─────────────────┤
│ GROWTH-01│ 72       │ 95%      │ $0       │ 3 experiments   │
│ BD-01    │ 48       │ 90%      │ $0       │ 2 grants found  │
│ CONTENT-01│ 72      │ 92%      │ $0       │ 5 articles      │
│ ANALYST-01│ 24      │ 98%      │ $0       │ 3 reports       │
│ SOCIAL-01│ 24       │ 88%      │ $0       │ 15 posts        │
│ SUPPORT-01│ 48      │ 94%      │ $0.01    │ 30 tickets      │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│ Total: 288 tasks/day | Avg Success: 93% | Total Cost: $0.01│
└──────────────────────────────────────────────────────────────┘
```

### 5.2 增长指标追踪

| 指标类别 | 指标 | 当前值 | 周目标 | 月目标 | 负责 Agent |
|----------|------|--------|--------|--------|-----------|
| **用户** | 注册用户 | — | +50 | +200 | GROWTH-01 |
| **用户** | 活跃开发者 | — | +20 | +100 | GROWTH-01 |
| **商业** | 活跃 Skill | — | +10 | +50 | CONTENT-01 |
| **商业** | Skill 调用/天 | — | 100 | 1,000 | GROWTH-01 |
| **商业** | GMV/月 | — | $100 | $1,000 | BD-01 |
| **社交** | Twitter 粉丝 | — | +200 | +1,000 | SOCIAL-01 |
| **社交** | TG 成员 | — | +100 | +500 | SOCIAL-01 |
| **社交** | Discord 成员 | — | +50 | +300 | SOCIAL-01 |
| **社交** | GitHub Stars | — | +10 | +50 | SOCIAL-01 |
| **资源** | Grant 申请数 | — | 2 | 8 | BD-01 |
| **资源** | 获取 Credits | — | $1K | $10K | BD-01 |

---

## 六、环境变量与 API 配置

### 6.1 必需的 API Keys

```bash
# === 免费 AI Provider ===
GROQ_API_KEY=gsk_xxx              # Groq (免费 14,400 req/day)
GEMINI_API_KEY=AIzaSyxxx          # Google Gemini (免费 1,500 req/day)
DEEPSEEK_API_KEY=sk-xxx           # DeepSeek (极低成本)

# === 社交媒体 ===
TWITTER_API_KEY=xxx               # Twitter API v2
TWITTER_API_SECRET=xxx
TWITTER_ACCESS_TOKEN=xxx
TWITTER_ACCESS_SECRET=xxx
TELEGRAM_BOT_TOKEN=xxx            # Telegram Bot
DISCORD_BOT_TOKEN=xxx             # Discord Bot

# === 付费 AI (按需) ===
AWS_ACCESS_KEY_ID=xxx             # Bedrock (ARCHITECT/CODER)
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1

# === 工具 ===
GITHUB_TOKEN=ghp_xxx              # GitHub API
SENDGRID_API_KEY=SG.xxx           # Email
```

### 6.2 Tick 系统配置

```bash
# Tick 系统
TICK_ENABLED=true                 # 启用自动 Tick
TICK_INTERVAL_MINUTES=10          # 每 10 分钟一次 Tick
BUDGET_ALERT_THRESHOLD=0.8       # 预算告警阈值 80%

# Agent 配额
GROQ_DAILY_LIMIT=14400
GEMINI_DAILY_LIMIT=1500
DEEPSEEK_DAILY_LIMIT=10000
```

---

## 七、实施路线图

| 阶段 | 时间 | 关键行动 | 预期成果 |
|------|------|----------|----------|
| **Phase 1** | Week 1 | 配置所有 Agent 的 System Prompt 和工具权限 | 8 个 Agent 全部上线 |
| **Phase 2** | Week 1-2 | 配置任务模板和自动生成规则 | 每日自动生成 200+ 任务 |
| **Phase 3** | Week 2 | 接入 Twitter/TG/Discord API | 社交媒体自动运营启动 |
| **Phase 4** | Week 2-3 | 配置协作流水线 | Agent 间自动协作 |
| **Phase 5** | Week 3 | 启动 Grant 扫描和申请 | 首批 Grant 申请提交 |
| **Phase 6** | Week 4 | KPI 看板上线 | 数据驱动决策 |
| **持续** | 每日 | 监控、优化、迭代 | 持续增长 |

---

## 八、风险与应对

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| 免费 API 额度用完 | 中 | 高 | 配额监控 + 自动降级到低频模式 |
| 社交账号被限制 | 低 | 高 | 控制发帖频率、避免垃圾内容 |
| Agent 输出质量低 | 中 | 中 | 人工抽检 + 质量评分 + 自动重试 |
| Grant 申请被拒 | 高 | 低 | 批量申请、持续优化提案 |
| API Key 泄露 | 低 | 高 | 环境变量管理、定期轮换 |

---

> **总结**: 通过 6 个免费 Agent 的 7×24 自动化运营，Agentrix 可以在几乎零成本下实现：
> - 每日 288+ 自动化任务执行
> - 每日 15+ 社交媒体内容发布
> - 每日 20+ KOL 互动
> - 每周 2-3 篇技术博客
> - 每周 2+ Grant 申请
> - 持续的社区维护和用户支持
> 
> **核心理念: 让 Agent 做 Agent 最擅长的事 — 7×24 不间断、大规模、数据驱动的增长运营。**
