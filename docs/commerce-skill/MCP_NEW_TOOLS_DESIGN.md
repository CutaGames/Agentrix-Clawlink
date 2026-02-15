# MCP Commerce 新工具接口设计

> **设计人**: ARCHITECT-01 | **日期**: 2026-02-08
> **目标**: 补全 MCP Commerce 工具，让外部 AI 生态可完整使用 Commerce Skill
> **优先级**: P0 — 阻塞上线

---

## 一、当前已有工具（5 个）

| 工具名 | 功能 | 状态 |
|--------|------|------|
| `commerce` | 统一执行入口（30+ actions） | ✅ |
| `split_plan` | 分佣计划 CRUD | ✅ |
| `budget_pool` | 预算池管理 | ✅ |
| `milestone` | 里程碑管理 | ✅ |
| `calculate_commerce_fees` | 费用计算 | ✅ |

## 二、新增工具设计（3 个）

### 工具 1: `publish_to_marketplace`

**用途**: 将 Skill/商品/服务/任务发布到 Agentrix Marketplace

**为什么需要**: 当前 MCP 中没有发布工具，外部 AI 无法帮用户发布内容到市场


{
  "name": "publish_to_marketplace",
  "description": "Publish a skill, product, service, or task to Agentrix Marketplace. Supports automatic split plan creation and budget pool setup. Platform fee: 0.3% on transactions.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": ["skill", "product", "service", "task"],
        "description": "Type of item to publish"
      },
      "name": {
        "type": "string",
        "description": "Name of the item (3-100 chars)"
      },
      "description": {
        "type": "string",
        "description": "Detailed description (10-5000 chars)"
      },
      "category": {
        "type": "string",
        "enum": ["payment", "commerce", "data", "utility", "integration", "ai", "defi", "nft", "social", "other"],
        "description": "Category for marketplace listing"
      },
      "pricing": {
        "type": "object",
        "properties": {
          "model": {
            "type": "string",
            "enum": ["free", "per_call", "subscription", "one_time", "revenue_share"],
            "description": "Pricing model"
          },
          "price": {
            "type": "number",
            "description": "Price in USD (0 for free)"
          },
          "currency": {
            "type": "string",
            "default": "USD",
            "description": "Currency (USD, USDC, USDT)"
          }
        },
        "required": ["model"]
      },
      "splitPlan": {
        "type": "object",
        "description": "Optional: auto-create a split plan for revenue sharing",
        "properties": {
          "template": {
            "type": "string",
            "enum": ["physical", "service", "virtual", "nft", "skill", "agent_task"],
            "description": "Split plan template"
          },
          "rules": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "role": { "type": "string" },
                "percentage": { "type": "number", "minimum": 0, "maximum": 100 }
              }
            },
            "description": "Custom split rules (must sum to 100%)"
          }
        }
      },
      "budgetPool": {
        "type": "object",
        "description": "Optional: create a budget pool (for tasks with milestones)",
        "properties": {
          "totalBudget": { "type": "number", "description": "Total budget in USD" },
          "currency": { "type": "string", "default": "USDC" },
          "milestones": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "title": { "type": "string" },
                "description": { "type": "string" },
                "percentOfPool": { "type": "number", "description": "% of total budget" }
              }
            }
          }
        }
      },
      "tags": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Tags for discoverability"
      },
      "visibility": {
        "type": "string",
        "enum": ["public", "private", "unlisted"],
        "default": "public"
      }
    },
    "required": ["type", "name", "description"]
  }
}


**后端实现路由**:

MCP handler → CommercePublishService.publishCommerceSkill()
            → 自动创建 Skill + SplitPlan + BudgetPool
            → 返回 { skillId, marketplaceUrl, splitPlanId?, budgetPoolId? }


**安全要求**:
- userId 从 callToolWithContext 获取，不从参数读取
- 发布前校验: name/description 非空，pricing 合法
- 费率: 交易金额的 0.3% 平台抽佣

---

### 工具 2: `search_marketplace`

**用途**: 搜索 Agentrix Marketplace 中的 Skill/商品/服务/任务

**为什么需要**: 当前 MCP 有 `search_products` 但只搜商品，不搜 Skill/任务


{
  "name": "search_marketplace",
  "description": "Search Agentrix Marketplace for skills, products, services, and tasks. Supports filtering by category, price range, rating, and more. Returns results optimized for AI agents.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search query (natural language supported)"
      },
      "type": {
        "type": "string",
        "enum": ["all", "skill", "product", "service", "task"],
        "default": "all",
        "description": "Filter by item type"
      },
      "category": {
        "type": "string",
        "enum": ["payment", "commerce", "data", "utility", "integration", "ai", "defi", "nft", "social"],
        "description": "Filter by category"
      },
      "priceRange": {
        "type": "object",
        "properties": {
          "min": { "type": "number" },
          "max": { "type": "number" }
        },
        "description": "Price range filter in USD"
      },
      "sortBy": {
        "type": "string",
        "enum": ["relevance", "popular", "newest", "price_low", "price_high", "rating"],
        "default": "relevance"
      },
      "page": { "type": "number", "default": 1 },
      "limit": { "type": "number", "default": 10, "maximum": 50 }
    },
    "required": ["query"]
  }
}


**后端实现路由**:

MCP handler → UnifiedMarketplaceService.search()
            → PostgreSQL ILIKE + 多维过滤
            → 返回 { results[], total, facets, page }


**返回格式优化（面向 AI Agent）**:

{
  "results": [
    {
      "id": "skill-123",
      "type": "skill",
      "name": "Payment Gateway",
      "description": "Accept crypto payments...",
      "pricing": { "model": "per_call", "price": 0.01 },
      "rating": 4.8,
      "totalCalls": 15000,
      "executeUrl": "/api/commerce/execute",
      "executeAction": "execute_skill"
    }
  ],
  "total": 42,
  "suggestion": "Try also: 'payment processing', 'crypto checkout'"
}


---

### 工具 3: `execute_skill`

**用途**: 执行 Marketplace 中的 Skill

**为什么需要**: 搜索到 Skill 后需要能直接执行


{
  "name": "execute_skill",
  "description": "Execute a skill from Agentrix Marketplace. Handles payment, execution, and result delivery. Free skills execute immediately; paid skills require payment confirmation.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "skillId": {
        "type": "string",
        "description": "Skill ID from marketplace search results"
      },
      "params": {
        "type": "object",
        "description": "Skill-specific input parameters (varies by skill)"
      },
      "paymentMethod": {
        "type": "string",
        "enum": ["wallet", "balance", "x402_auto"],
        "default": "balance",
        "description": "Payment method for paid skills. wallet=crypto wallet, balance=platform balance, x402_auto=automatic X402 payment"
      },
      "maxPrice": {
        "type": "number",
        "description": "Maximum price willing to pay (safety limit)"
      }
    },
    "required": ["skillId"]
  }
}


**后端实现路由**:

MCP handler → SkillExecutorService.execute()
            → 检查定价 → 处理支付 → 执行 Skill → 返回结果
            → 返回 { success, result, cost, transactionId? }


**执行流程**:

1. 查找 Skill → 验证存在且 active
2. 检查定价:
   - free → 直接执行
   - paid → 检查 maxPrice → 扣费/创建支付
3. 执行 Skill:
   - internal → 调用内部 service
   - http → 调用外部 API（需出站白名单）
   - mcp → 代理到 MCP server
4. 记录调用日志 + 更新 analytics
5. 返回结果


---

## 三、实现优先级

| 工具 | 优先级 | 工作量 | 依赖 |
|------|--------|--------|------|
| `search_marketplace` | P0 | 4h | UnifiedMarketplaceService |
| `publish_to_marketplace` | P0 | 6h | CommercePublishService |
| `execute_skill` | P0 | 8h | SkillExecutorService |

**总工作量**: ~18h（CODER-01 Day 2-3 完成）

## 四、安全要求（SECURITY-01 审计清单）

- [ ] 所有工具 userId 从 callToolWithContext 获取
- [ ] publish: 内容审核（敏感词过滤）
- [ ] execute: maxPrice 安全限制
- [ ] execute: HTTP skill 出站白名单
- [ ] search: 防注入（参数化查询）
- [ ] 所有工具: requestId 追踪
- [ ] 所有工具: 统一错误格式 { errorCode, message, requestId }

## 五、测试用例

### search_marketplace

✅ 搜索 "payment" → 返回支付相关 skills
✅ 搜索 + 过滤 type=skill, category=payment → 精确结果
✅ 空查询 → 返回 trending
✅ 分页 page=2, limit=5 → 正确分页


### publish_to_marketplace

✅ 发布 skill + splitPlan → 创建 skill + split plan
✅ 发布 task + budgetPool + milestones → 创建 task + pool + milestones
✅ 缺少 name → 400 错误
✅ 未认证 → 401 错误


### execute_skill

✅ 执行 free skill → 直接返回结果
✅ 执行 paid skill + maxPrice 足够 → 扣费 + 返回结果
✅ 执行 paid skill + maxPrice 不足 → 拒绝 + 返回价格信息
✅ 执行不存在的 skill → 404 错误

