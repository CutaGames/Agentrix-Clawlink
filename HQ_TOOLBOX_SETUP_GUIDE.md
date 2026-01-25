# Agentrix HQ 增长与商务工具箱配置指南 (Setup Guide)

本指南旨在指导如何完成 "1+N" 总部团队中 **Growth (增长)** 与 **BD (商务)** 专员工具箱的正式接入。目前后端已完成逻辑框架搭建（Mock 模式），需按以下步骤切换为生产环境。

---

## 1. 核心数据源对接 (Data Sources)

### 1.1 全球网页检索 (Web Search)
用于 Growth Agent 检索竞品、跟踪 AI 趋势。
- **推荐服务**: [SerpApi](https://serpapi.com/) 或 [SearchApi](https://www.searchapi.io/)。
- **手动操作**: 
  1. 注册账号并获取 API Key。
  2. 在 `backend/.env` 中添加 `SEARCH_API_KEY=your_key`。
  3. 后续后端将 `hq.service.ts` 中的 `web_search` 逻辑由 Mock 切换为 Axios 请求该 API。

### 1.2 CRM 与商户数据库 (Internal CRM)
用于 BD Agent 管理合作伙伴入驻。
- **集成方式**: 默认使用 Agentrix 自身的 `Merchant` 和 `DeveloperAccount` 数据库表。
- **手动操作**: 
  1. 确保已运行数据库迁移（Account System V2）。
  2. 无内部 CRM 需求时，无需额外配置；如需对接 HubSpot，需获取 API Token。

---

## 2. 社交媒体账号与 API 对接 (Social Connector)

### 2.1 Twitter (X) API
用于 Growth Agent 发布动态和监控社媒。
- **配置**: 在 `.env` 中填入 `TWITTER_CONSUMER_KEY` 等。

### 2.2 Telegram Bot API
用于社区服务和 Bot 交互。
- **开通**: 找 @BotFather 获取 `TELEGRAM_BOT_TOKEN`。
- **对接**: 支持 Growth Agent 自动回复社群提问。

### 2.3 Discord Bot
用于开发者社区和系统通知。
- **开通**: Discord Developer Portal 创建 Bot 获取 `DISCORD_TOKEN`。
- **对接**: 支持将 Agentrix 系统告警或交易信息推送到频道。

### 2.4 其他 (小红书/YouTube)
- **YouTube**: 推荐作为品牌展示窗口，需开通 YouTube Data API。
- **小红书**: 如需深耕国内 AI 工具市场，建议通过第三方社媒管理工具 API 接入或手动运营。

---

## 3. 邮件系统配置 (Business Toolbox)

BD Agent 使用该系统向潜在商户发送邀请。
- **配置方式**: 使用 SMTP 协议。
- **推荐服务**: AWS SES, SendGrid, 或企业邮箱（阿里/腾讯）。
- **环境变量配置**:
  ```dotenv
  SMTP_HOST=smtp.example.com
  SMTP_PORT=587
  SMTP_USER=your_email@domain.com
  SMTP_PASSWORD=your_password
  SMTP_FROM="Agentrix BD <bd@agentrix.com>"
  ```
- **手动验证**:
  1. 在开发环境中使用 [Mailtrap](https://mailtrap.io/) 进行拦截测试，确保模板渲染正确。

---

## 4. 支付与支付网关注册 (Payments)

BD 工具箱涉及自动化佣金和支付链路验证。
- **Stripe (法币)**: 
  - 注册 [Stripe Dashboard](https://dashboard.stripe.com/)。
  - 获取 `STRIPE_SECRET_KEY`。
  - 配置 Webhook 以接收付款成功通知。
- **Transak (法币入金)**: 
  - 注册 [Transak Dashboard](https://dashboard.transak.com/)。
  - 配置 API Key，确保支持 CNY 转换及跳过 KYC 流程（已在代码中优化）。

---

## 5. 手动参与及待办清单 (Manual Tasks Checklist)

| 任务项 | 负责人 | 状态 | 备注 |
| :--- | :--- | :--- | :--- |
| **API Key 收集** | 用户 | ⏳ 待处理 | 包含 Search, Twitter, Stripe |
| **知识库维护** | 用户 | 🔄 持续 | 通过 HQ Console 定期更新 `hq-knowledge-base.md` |
| **环境变量注入** | 用户/AI | ⏳ 待处理 | 将所有 Key 填入 `backend/.env` |
| **系统提示词微调** | 用户 | 🔄 可选 | 如果 Agent 语气不够理想，在 `HqService` 修改 |
| **DNS 记录配置** | 用户 | ⏳ 待部署 | 如果配置真实邮件，需设置 SPF/DKIM 记录 |

---

## 6. 需要更新的环境变量总表

请将以下内容补充或更新至您的 `backend/.env` 文件中：

```dotenv
# --- Growth & BD Tools ---
SEARCH_API_KEY=          # 网页检索 API Key
TWITTER_BEARER_TOKEN=    # Twitter 发布权限

# --- Email System ---
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# --- Payments ---
STRIPE_SECRET_KEY=
TRANSAK_API_KEY=

# --- CRM (If external) ---
HUBSPOT_API_KEY= 
```

---
*本指南由 Agentrix HQ 总部自动生成。如有疑问，请咨询 Architect Agent。*

## 4. ���� RAG ֪ʶ�� (Local Knowledge Base)

- **�洢Ŀ¼**: backend/knowledge/
- **֧�ָ�ʽ**: .pdf, .md, .txt
- **����ԭ��**: ���ĵ������Ŀ¼�󣬺�˻�������ʱ�Զ���������������Agent �ڶԻ�������רҵ��������ʱ����ͨ�� search_local_docs ���߼�����Щ�ļ���

