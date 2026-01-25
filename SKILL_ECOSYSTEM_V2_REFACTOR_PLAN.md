# Skill 生态 2.0 重构实施计划

**基于**: AGENTRIX_SKILL_ECOSYSTEM_STRATEGIC_PLAN_V2.md  
**日期**: 2026-01-11  
**状态**: Phase 1-4 已完成

---

## 重构范围概览

### 现有代码分析

| 模块 | 当前状态 | 需要改动 |
| :--- | :--- | :--- |
| `backend/src/entities/skill.entity.ts` | 基础 Skill 实体，缺少 layer/source/resourceType 等字段 | **重构** |
| `backend/src/modules/skill/*` | 基础 CRUD，缺少统一 Marketplace 支持 | **扩展** |
| `backend/src/modules/marketplace/*` | 资产聚合为主，与 Skill 割裂 | **整合** |
| `frontend/pages/marketplace.tsx` | 分 Tab 展示，插件市场独立 | **重构** |
| `frontend/pages/plugins.tsx` | 独立插件页面 | **废弃/合并** |

---

## Phase 1: 后端基础设施 (本次执行)

### 1.1 Skill Entity 升级

**文件**: `backend/src/entities/skill.entity.ts`

新增字段：
- `layer`: 'infra' | 'resource' | 'logic' | 'composite'
- `resourceType`: 'physical' | 'service' | 'digital' | 'data' | 'logic' | null
- `source`: 'native' | 'imported' | 'converted'
- `originalPlatform`: 'claude' | 'openai' | 'third_party' | null
- `humanAccessible`: boolean
- `compatibleAgents`: string[] (JSONB)
- `permissions`: string[] (JSONB)
- `displayName`: string
- `commissionRate`: number (分佣比例)

### 1.2 新增 Entity

**文件**: `backend/src/entities/external-skill-mapping.entity.ts`
- 外部 Skill 映射表

**文件**: `backend/src/entities/product-skill-conversion.entity.ts`
- 商品-Skill 转换关系表

**文件**: `backend/src/entities/skill-analytics.entity.ts`
- Skill 调用统计表

### 1.3 数据库迁移

**文件**: `backend/src/migrations/XXXXXX-SkillEcosystemV2.ts`

### 1.4 Skill Service 扩展

**文件**: `backend/src/modules/skill/skill.service.ts`

新增方法：
- `findUnifiedMarketplace()` - 统一市场搜索
- `convertProductToSkill()` - 商品转 Skill
- `importExternalSkill()` - 导入外部 Skill

### 1.5 Product-to-Skill Converter

**文件**: `backend/src/modules/skill/product-skill-converter.service.ts`

核心功能：
- 商品自动转换为 Skill
- LLM 描述生成
- 多平台 Schema 生成

### 1.6 统一 Marketplace API

**文件**: `backend/src/modules/unified-marketplace/*`

新模块：
- `unified-marketplace.module.ts`
- `unified-marketplace.controller.ts`
- `unified-marketplace.service.ts`

API 端点：
- `GET /api/unified-marketplace/search` - 统一搜索
- `GET /api/unified-marketplace/skills` - Skill 列表
- `GET /api/unified-marketplace/categories` - 分类
- `GET /api/unified-marketplace/trending` - 热门
- `POST /api/unified-marketplace/convert-product` - 商品转 Skill

---

## Phase 2: 前端重构 (后续执行)

### 2.1 统一 Marketplace 页面

**文件**: `frontend/pages/marketplace.tsx` (重构)

- 移除分 Tab 设计
- 统一展示所有 Skill (商品/服务/工具/数据)
- 智能搜索 + 过滤器

### 2.2 A2H 组件库

**目录**: `frontend/components/a2h/*`

组件：
- `SkillCard.tsx` - 统一 Skill 卡片
- `ProductCard.tsx` - 商品卡片 (继承 SkillCard)
- `PaymentConfirm.tsx` - 支付确认
- `AuthorizationRequest.tsx` - 授权请求
- `ProgressIndicator.tsx` - 进度指示

### 2.3 Skill 详情页

**文件**: `frontend/pages/skill/[id].tsx`

---

## 执行顺序

1. ✅ 创建重构计划文档
2. ✅ 后端 Skill Entity 升级 - `backend/src/entities/skill.entity.ts`
3. ✅ 创建新 Entity 文件
   - `backend/src/entities/external-skill-mapping.entity.ts`
   - `backend/src/entities/product-skill-conversion.entity.ts`
   - `backend/src/entities/skill-analytics.entity.ts`
4. ✅ 创建数据库迁移 - `backend/src/migrations/1736570400000-SkillEcosystemV2.ts`
5. ✅ 创建 Product-to-Skill Converter - `backend/src/modules/skill/product-skill-converter.service.ts`
6. ✅ 创建统一 Marketplace 模块
   - `backend/src/modules/unified-marketplace/unified-marketplace.module.ts`
   - `backend/src/modules/unified-marketplace/unified-marketplace.service.ts`
   - `backend/src/modules/unified-marketplace/unified-marketplace.controller.ts`
7. ✅ 前端 A2H 组件库
   - `frontend/components/a2h/SkillCard.tsx`
   - `frontend/components/a2h/SkillFilters.tsx`
   - `frontend/components/a2h/index.ts`
8. ✅ 前端统一 Marketplace 页面 - `frontend/pages/unified-marketplace.tsx`
9. ✅ 注册新模块到 AppModule - `backend/src/app.module.ts`

---

## 注意事项

1. **向后兼容**: 现有 API 保持可用，新增统一 API
2. **渐进迁移**: 不删除现有代码，通过新模块扩展
3. **数据迁移**: 现有 Skill 数据自动补充新字段默认值

---

## 已完成工作摘要 (2026-01-11)

### 后端重构

1. **Skill Entity 升级**
   - 新增字段: `layer`, `resourceType`, `source`, `originalPlatform`, `displayName`, `humanAccessible`, `compatibleAgents`, `permissions`, `authorInfo`, `productId`, `externalSkillId`
   - 新增枚举: `SkillLayer`, `SkillResourceType`, `SkillSource`, `SkillOriginalPlatform`
   - 新增分类: `identity`, `authorization`, `chain`, `asset`, `algorithm`, `analysis`, `workflow`

2. **新增 Entity**
   - `ExternalSkillMapping`: 外部 Skill 映射表
   - `ProductSkillConversion`: 商品-Skill 转换关系表
   - `SkillAnalytics`: Skill 调用统计表

3. **新增 Service**
   - `ProductSkillConverterService`: 商品自动转换为 Skill
   - `UnifiedMarketplaceService`: 统一市场搜索和管理

4. **新增 API 端点**
   - `GET /api/unified-marketplace/search` - 统一搜索
   - `GET /api/unified-marketplace/trending` - 热门 Skill
   - `GET /api/unified-marketplace/categories` - 分类列表
   - `GET /api/unified-marketplace/stats/layers` - 层级统计
   - `GET /api/unified-marketplace/skills/:id` - Skill 详情
   - `POST /api/unified-marketplace/convert-product` - 商品转 Skill
   - `GET /api/unified-marketplace/schema/:platform` - 平台 Schema

### 前端重构

1. **A2H 组件库**
   - `SkillCard`: 统一的 Skill 卡片组件
   - `SkillFilters`: 搜索过滤器组件

2. **统一 Marketplace 页面**
   - 整合所有类型的 Skill
   - 四层架构可视化
   - 热门 Skill 展示
   - 高级过滤器

---

## Phase 3: 生态聚合 (已完成)

### 3.1 MCP Server Proxy
- ✅ `backend/src/modules/skill/mcp-server-proxy.service.ts`
- 功能: 代理官方 Claude MCP Servers，将其能力聚合到 Agentrix
- 支持: filesystem, github, brave-search, fetch, memory, postgres, puppeteer, slack, google-drive

### 3.2 OpenAPI Importer
- ✅ `backend/src/modules/skill/openapi-importer.service.ts`
- 功能: 从 OpenAPI Schema 导入外部 Skill
- 支持: GPT Actions 导入、第三方 API 导入

---

## Phase 4: 智能化 (已完成)

### 4.1 智能 Skill 推荐
- ✅ `backend/src/modules/skill/skill-recommendation.service.ts`
- 功能: 基于意图、协同过滤、相似性、热门度、互补性的推荐
- API: `getRecommendations()`, `getYouMayAlsoNeed()`, `getAlsoBought()`

### 4.2 Agent 协商引擎
- ✅ `backend/src/modules/skill/agent-negotiation.service.ts`
- 功能: Agent 间自动协商分佣比例
- 支持: 分成协商、任务委派、资源共享

### 4.3 Workflow Composer
- ✅ `backend/src/modules/skill/workflow-composer.service.ts`
- 功能: 多 Skill 组合编排
- 支持: 条件分支、循环、并行执行、人工输入、数据转换
- 模板: smart-shopping, investment-portfolio

---

## 后续工作 (TODO)

### Phase 5: 链上集成
- [ ] 链上 Skill 注册
- [ ] 去中心化 Skill 市场治理
