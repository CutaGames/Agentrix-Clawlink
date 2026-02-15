# Agentrix Commerce Skill — MCP 接入指南

> **版本**: 1.0 | **日期**: 2026-02-08
> **MCP 端点**: `https://www.agentrix.top/api/mcp/sse`

---

## Claude Desktop 配置

在 `~/.config/claude/claude_desktop_config.json` 中添加：


{
  "mcpServers": {
    "agentrix-commerce": {
      "url": "https://www.agentrix.top/api/mcp/sse",
      "description": "Agentrix Commerce Skill: payment, revenue splitting, budget pools, marketplace"
    }
  }
}


## Cursor IDE 配置

在 `.cursor/mcp.json` 中添加：


{
  "mcpServers": {
    "agentrix-commerce": {
      "url": "https://www.agentrix.top/api/mcp/sse",
      "env": {}
    }
  }
}


## VS Code (Copilot) 配置

在 `.vscode/mcp.json` 中添加：


{
  "servers": {
    "agentrix-commerce": {
      "type": "sse",
      "url": "https://www.agentrix.top/api/mcp/sse"
    }
  }
}


## Windsurf 配置

在 `~/.windsurf/mcp_config.json` 中添加：


{
  "mcpServers": {
    "agentrix-commerce": {
      "serverUrl": "https://www.agentrix.top/api/mcp/sse"
    }
  }
}


---

## 可用工具（8 个）

| 工具名 | 功能 | 需认证 |
|--------|------|--------|
| `commerce` | 统一执行入口（30+ actions） | ✅ |
| `split_plan` | 分佣计划 CRUD | ✅ |
| `budget_pool` | 预算池管理 | ✅ |
| `milestone` | 里程碑管理 | ✅ |
| `calculate_commerce_fees` | 费用计算 | ❌ |
| `publish_to_marketplace` | 发布到市场 | ✅ |
| `search_marketplace` | 搜索市场 | ❌ |
| `execute_skill` | 执行 Skill | ✅ |

## 费率

| 功能 | 费率 |
|------|------|
| 钱包支付/收款码 | **免费**（用户自付 gas） |
| 分佣/分账/预算池 | **0.3%** |
| OnRamp（法币→加密） | **Provider 费 + 0.1%** |
| OffRamp（加密→法币） | **Provider 费 + 0.1%** |
| 发布任务/商品/Skill | **0.3%** |

## 快速示例

### 创建分账方案

User: 帮我创建一个分账方案，平台5%，商户85%，代理10%
AI → calls split_plan tool with action: create


### 搜索市场

User: 搜索支付相关的 Skill
AI → calls search_marketplace tool with query: "payment"


### 发布 Skill

User: 发布一个数据分析 Skill，每次调用 $0.05
AI → calls publish_to_marketplace tool

