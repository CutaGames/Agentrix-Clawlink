# Agentrix Skill生态系统完善计划

## 一、现状分析

### 1.1 Skill市场现状

**已实现的功能：**
- ✅ 统一市场服务 (UnifiedMarketplaceService) - 整合所有Skill搜索
- ✅ 四种定价模式：FREE, PER_CALL, SUBSCRIPTION, REVENUE_SHARE
- ✅ 多来源Skill：NATIVE(原生), CONVERTED(转换), IMPORTED(导入)
- ✅ 三层架构：CAPABILITY(能力), RESOURCE(资源), WORKFLOW(工作流)
- ✅ 外部生态导入：Claude MCP, ChatGPT Actions, OpenAPI
- ✅ 基本的审批发布流程

**存在的问题：**
- ❌ 所有Skill默认免费，缺乏有效的付费激励机制
- ❌ 缺少开发者收益分成自动结算系统
- ❌ 缺乏Skill质量评估和认证体系
- ❌ 缺少SDK/CLI工具方便开发者快速发布
- ❌ 跨协议可发现性不完整

### 1.2 支付系统现状

**已实现的支付方式：**
- ✅ Stripe（信用卡/借记卡）
- ✅ PayPal
- ✅ Google Pay
- ✅ X402协议（加密支付）
- ✅ Session Key授权支付
- ✅ UCP标准支持

**存在的问题：**
- ❌ Skill购买和Product购买的支付路径不统一
- ❌ 缺少按调用次数的微支付结算
- ❌ X402支付仅支持Product，不支持Skill
- ❌ UCP checkout未与Skill直接集成

### 1.3 跨协议可发现性现状

**已实现：**
- ✅ `/.well-known/ucp` - UCP业务发现端点
- ✅ UCP checkout session API
- ✅ MCP SSE传输端点
- ✅ Skill实体有ucpEnabled, x402Enabled字段

**存在的问题：**
- ❌ 商户/开发者发布Skill后，不会自动注册到UCP产品目录
- ❌ 缺少X402服务发现端点（`/.well-known/x402`）
- ❌ MCP tools列表不自动同步Skill
- ❌ 缺少统一的跨协议元数据同步机制

---

## 二、差异化竞争策略

### 2.1 为什么开发者会选择Agentrix？

| 竞品 | 定位 | Agentrix差异化优势 |
|-----|------|-------------------|
| LangChain Tools | 开源免费 | **付费变现**：开发者可以通过Skill获得收益 |
| OpenAI Plugins | 平台封闭 | **跨平台兼容**：一次发布，多平台可用 |
| Claude MCP | 协议标准 | **商业闭环**：内置支付、结算、分账 |
| Zapier | SaaS集成 | **AI原生**：专为AI Agent设计的能力市场 |

### 2.2 核心差异化特性

1. **收益变现闭环**
   - 开发者发布付费Skill
   - 用户/Agent调用自动扣费
   - 平台自动分账（例如85%给开发者）
   
2. **多协议原生支持**
   - 一个Skill自动生成：MCP Tool、OpenAI Function、UCP Product、X402 Service
   
3. **AI Agent友好**
   - Session Key授权：Agent可以自主购买和使用Skill
   - 微支付支持：按次/按量计费

---

## 三、完善计划优先级

### P0 - 核心功能（✅ 本次已完成大部分）

#### P0.1 支付系统统一
- [ ] 统一Skill和Product的支付流程
- [x] 支持通过UCP协议购买Skill - `GET /ucp/v1/products` 和 `GET /ucp/v1/skills` 已实现
- [x] 支持通过X402协议购买Skill - `GET /.well-known/x402` 已实现

#### P0.2 跨协议自动注册 ✅ 已完成
- [x] Skill发布后自动注册到UCP产品目录 - `skill.service.ts` publish() 自动设置 ucpEnabled/x402Enabled
- [x] 创建 `/.well-known/x402` 端点列出所有X402 Skill - `x402-discovery.controller.ts`
- [x] UCP产品目录端点 - `ucp.controller.ts` 新增 `/ucp/v1/products` 和 `/ucp/v1/skills`
- [ ] MCP tools列表自动包含已发布Skill (需要动态加载机制)

#### P0.3 开发者收益 ✅ 已完成
- [x] 实现Skill调用计费记录 - `developer-revenue.service.ts`
- [x] 实现开发者收益查看API - `developer-revenue.controller.ts`
- [x] 开发者仪表盘API - `GET /api/developer/dashboard`

#### P0.4 外部UCP扫描适配层 (Headless UCP Scanner) ✅ 新增
- [x] 多种扫描方法: direct, headless, proxy
- [x] 已知站点配置管理
- [x] 自动导入外部产品为Skill
- [x] 定时扫描任务 (每6小时)

#### P0.5 买家服务费逻辑 ✅ 新增
- [x] 外部商品自动计算2%服务费
- [x] 内部商品免服务费
- [x] 合作伙伴白名单
- [x] VIP用户折扣

#### P0.6 语义搜索降级处理 ✅ 新增
- [x] 内部搜索结果不足时自动降级
- [x] 外部UCP站点搜索
- [x] Web搜索Skill集成
- [x] 搜索建议生成

### P0 实现详情（2025-01-15）

**新增文件：**
1. `backend/src/modules/x402/x402-discovery.controller.ts` - X402服务发现端点
2. `backend/src/modules/x402/x402-discovery.module.ts` - X402发现模块

**修改文件：**
1. `backend/src/modules/ucp/ucp.controller.ts` - 新增 `/ucp/v1/products` 和 `/ucp/v1/skills`
2. `backend/src/modules/ucp/ucp.service.ts` - 新增 `getProductCatalog()` 和 `getSkillCatalog()` 方法
3. `backend/src/modules/ucp/ucp.module.ts` - 注入 Skill 和 Product Repository
4. `backend/src/modules/skill/skill.service.ts` - publish() 自动设置 UCP/X402 端点
5. `backend/src/modules/skill/skill.module.ts` - 注入 UnifiedMarketplaceModule
6. `backend/src/modules/skill/skill-executor.service.ts` - 注入 UnifiedMarketplaceService
7. `backend/src/app.module.ts` - 注册 X402DiscoveryModule

**新端点：**
- `GET /.well-known/x402` - X402服务发现
- `GET /ucp/v1/products` - UCP产品目录（Product + Skill）
- `GET /ucp/v1/skills` - UCP Skill专用目录

### P1 - 增强功能（下一阶段）

#### P1.1 开发者工具
- [ ] Skill SDK (npm包) - 快速创建Skill
- [ ] CLI工具 - 命令行发布Skill
- [ ] 本地调试模式
- [x] URL-to-Skill 智能解析 - 通过URL自动生成Schema

#### P1.2 质量体系
- [ ] Skill认证标签（官方认证、社区精选）
- [ ] 自动化测试框架
- [ ] 性能监控和SLA保障
- [ ] 调用成功率追踪

#### P1.3 高级定价
- [ ] 订阅套餐支持
- [ ] 用量阶梯定价
- [ ] 免费试用额度
- [x] 收益分成自动结算 (85%开发者, 15%平台)

#### P1.4 UI/UX优化 (参考 AGENTRIX_UI_COMMERCE_OPTIMIZATION_V1.md)
- [ ] 语义化搜索预览 (Magic Preview)
- [ ] Agent预授权UI (AP2 Mandate滑块)
- [ ] 混合支付视图 (X402/Google Pay/Credit Card并排)
- [ ] 买家服务费透明化
- [ ] 支付后动态反馈 ("AI已获得权限...")

### P2 - 生态扩展（远期规划）

#### P2.1 平台集成
- [ ] 第三方平台Skill导入向导
- [ ] Skill组合市场（Workflow模板）
- [ ] 企业私有Skill部署
- [ ] AI Agent专属API

#### P2.2 协议调试器 (Workbench)
- [ ] MCP模式 - 工具调用可视化
- [ ] UCP模式 - 支付session创建可视化
- [ ] X402模式 - 链上交易哈希生成可视化

#### P2.3 开发者仪表盘增强
- [ ] 成交流 (Live Feed) - 实时收益滚动
- [ ] 链路跟踪 - 用户->Agent->Skill->商品
- [ ] 跨协议流量分析 (Claude/Google UCP/内部Marketplace)

#### P2.4 UI风格升级
- [ ] 深邃蓝/赛博紫主题
- [ ] 数据流微动效 (X402实时性)
- [ ] 契约合成动效 (支付成功)

---

## 四、P0执行计划详情

### 4.1 支付系统统一

**目标**：让Skill可以通过UCP和X402协议被购买

**技术方案**：
1. 在 `ucp.service.ts` 中添加 `getSkillProducts()` 方法
2. 在checkout flow中支持skillId参数
3. 创建 `X402SkillService` 支持Skill的X402支付

**代码修改**：
- `backend/src/modules/ucp/ucp.service.ts` - 添加Skill产品列表
- `backend/src/modules/payment/x402-skill.service.ts` - 新建
- `frontend/pages/pay/checkout.tsx` - 已支持skillId

### 4.2 跨协议自动注册

**目标**：发布Skill后自动在UCP/X402/MCP中可发现

**技术方案**：
1. Skill发布时自动生成ucpCheckoutEndpoint
2. 创建 `/.well-known/x402` 端点
3. MCP tools动态加载已发布Skill

**代码修改**：
- `backend/src/modules/skill/skill.service.ts` - publish时设置端点
- `backend/src/modules/ucp/ucp.controller.ts` - 添加产品目录端点
- `backend/src/modules/x402/x402-discovery.controller.ts` - 新建
- `backend/src/modules/mcp/mcp.service.ts` - 动态加载Skill

### 4.3 开发者收益

**目标**：开发者可以看到Skill调用量和收益

**技术方案**：
1. 每次Skill调用记录到SkillAnalytics
2. 按日/周/月聚合收益数据
3. 提供开发者仪表盘API

**代码修改**：
- `backend/src/modules/skill/skill-analytics.service.ts` - 增强
- `backend/src/modules/skill/skill.controller.ts` - 添加收益API
- 前端仪表盘（已有DeveloperModuleV2）

---

## 五、验收标准

### P0.1 支付统一
- [ ] 用户可以通过 `/pay/checkout?skillId=xxx` 购买Skill
- [ ] UCP Agent可以通过标准协议创建Skill的checkout session
- [ ] X402协议可以发现并购买Skill

### P0.2 跨协议注册
- [ ] `GET /.well-known/ucp` 返回的services包含Skill目录
- [ ] `GET /.well-known/x402` 返回所有x402Enabled的Skill
- [ ] MCP `list_tools` 返回已发布的Skill

### P0.3 开发者收益
- [ ] 开发者可以查看每个Skill的调用次数
- [ ] 开发者可以查看预估收益
- [ ] 调用记录正确写入数据库

---

## 六、风险与依赖

### 风险
1. **外部协议兼容性**：UCP/X402标准可能更新
2. **支付合规**：跨境支付和加密货币法规
3. **性能影响**：每次调用记录可能影响响应时间

### 依赖
1. 数据库迁移（如有新字段）
2. 前端组件适配
3. 文档更新

---

*文档创建时间：2026年1月15日*
*下次评审：P0完成后*
