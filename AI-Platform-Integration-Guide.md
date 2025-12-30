# Agentrix AI 平台集成指南

本文档详细说明如何将 Agentrix 的 MCP (Model Context Protocol) 工具集成到各大 AI 平台中，包括 ChatGPT、Claude、Gemini 和 Grok。

## 目录

1. [支持的平台](#支持的平台)
2. [ChatGPT 集成](#chatgpt-集成)
3. [Claude 集成](#claude-集成)
4. [Gemini 集成](#gemini-集成)
5. [Grok 集成](#grok-集成)
6. [REST API 桥接](#rest-api-桥接)
7. [可用工具列表](#可用工具列表)
8. [故障排除](#故障排除)

---

## 支持的平台

| 平台 | 接入方式 | 状态 | 备注 |
|------|---------|------|------|
| ChatGPT | MCP SSE + OAuth | ✅ Ready | GPTs Actions |
| Claude | MCP SSE | ✅ Ready | Claude Desktop / API |
| Gemini | OpenAPI Extensions | ✅ Ready | Google AI Studio |
| Grok | OpenAPI Tools | ✅ Ready | xAI API |

---

## ChatGPT 集成

### 方式一：GPTs Actions（推荐）

1. **创建 GPT**
   - 打开 https://chat.openai.com/gpts/create
   - 在 "Configure" 标签页中设置 GPT 基本信息

2. **添加 Action**
   - 点击 "Create new action"
   - 导入 OpenAPI Schema：
   ```
   https://api.agentrix.top/api/mcp/openapi.json
   ```

3. **身份验证配置**
   - 认证类型选择 "None"（无需认证）
   - 或选择 "OAuth"，将使用以下端点：
     - Authorization URL: `https://api.agentrix.top/api/auth/mcp/authorize`
     - Token URL: `https://api.agentrix.top/api/auth/mcp/token`

4. **测试**
   - 保存并测试 GPT
   - 尝试："帮我搜索 Agentrix 市场上的 NFT 商品"

### 方式二：MCP Server（高级）

1. **MCP SSE 端点**
   ```
   https://api.agentrix.top/api/mcp/sse
   ```

2. **OAuth Discovery 端点**
   ```
   https://api.agentrix.top/.well-known/oauth-authorization-server
   https://api.agentrix.top/.well-known/openid-configuration
   ```

3. **在 ChatGPT 开发者平台添加 MCP Server**
   - 选择 "MCP Server" 类型
   - 输入 SSE 端点
   - 身份验证选择 "无需授权" 或 "OAuth"

---

## Claude 集成

### 方式一：Claude Desktop（本地 MCP）

1. **安装 Claude Desktop**
   - 下载：https://claude.ai/desktop

2. **配置 MCP Server**
   
   编辑配置文件：
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "agentrix": {
         "url": "https://api.agentrix.top/api/mcp/sse",
         "transport": "sse"
       }
     }
   }
   ```

3. **重启 Claude Desktop**
   - 重启后，Agentrix 工具将在对话中可用
   - 尝试："使用 Agentrix 搜索市场上的商品"

### 方式二：Claude API（云端 MCP）

```python
import anthropic
import httpx

client = anthropic.Anthropic()

# MCP 连接配置
mcp_config = {
    "name": "agentrix",
    "url": "https://api.agentrix.top/api/mcp/sse",
    "transport": "sse"
}

# 使用 MCP 工具的对话
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    tools=[
        {
            "type": "mcp",
            "server": mcp_config
        }
    ],
    messages=[
        {"role": "user", "content": "帮我搜索 Agentrix 上的 NFT"}
    ]
)
```

### 方式三：使用 SDK 创建本地 MCP Server

如果你想在本地开发时使用 Agentrix 的能力：

```typescript
import { AIEcosystemIntegration } from '@agentrix/sdk';

// 创建本地 MCP Server
const server = AIEcosystemIntegration.createMcpServer({
  name: 'my-agentrix-agent',
  version: '1.0.0'
});

// 启动（将通过 stdio 与 Claude Desktop 通信）
server.start();
```

---

## Gemini 集成

### 方式一：Google AI Studio Extensions

1. **获取 OpenAPI Schema**
   ```
   https://api.agentrix.top/api/mcp/openapi.json
   ```

2. **在 Google AI Studio 中创建 Extension**
   - 打开 https://aistudio.google.com/
   - 创建新的 Extension
   - 导入上述 OpenAPI Schema

3. **配置身份验证**
   - 选择 "No Auth" 或配置 OAuth

### 方式二：Vertex AI Extensions（企业版）

```python
from google.cloud import aiplatform
from google.cloud.aiplatform import initializer

# 初始化
aiplatform.init(project="your-project", location="us-central1")

# 创建 Extension
extension = aiplatform.Extension.create(
    display_name="Agentrix Tools",
    manifest={
        "name": "agentrix-tools",
        "description": "Agentrix marketplace and payment tools",
        "api_spec": {
            "open_api_gcs_uri": "gs://your-bucket/agentrix-openapi.json"
            # 或直接使用 URL
        }
    }
)
```

### 方式三：Gemini API Function Calling

```python
import google.generativeai as genai

# 定义工具
tools = [
    {
        "function_declarations": [
            {
                "name": "search_products",
                "description": "Search products in Agentrix Marketplace",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search query"},
                        "assetType": {"type": "string", "enum": ["physical", "service", "nft", "ft"]},
                        "limit": {"type": "number"}
                    },
                    "required": ["query"]
                }
            }
        ]
    }
]

model = genai.GenerativeModel('gemini-pro', tools=tools)

# 当模型调用工具时，通过 REST API 执行
# POST https://api.agentrix.top/api/mcp/tool/search_products
```

---

## Grok 集成

### 方式一：xAI API Function Calling

```python
import requests

# xAI API 配置
XAI_API_KEY = "your-xai-api-key"
XAI_API_URL = "https://api.x.ai/v1/chat/completions"

# 定义工具
tools = [
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "Search products in Agentrix Marketplace",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "assetType": {"type": "string"}
                },
                "required": ["query"]
            }
        }
    }
]

response = requests.post(
    XAI_API_URL,
    headers={"Authorization": f"Bearer {XAI_API_KEY}"},
    json={
        "model": "grok-beta",
        "messages": [{"role": "user", "content": "搜索 NFT 商品"}],
        "tools": tools,
        "tool_choice": "auto"
    }
)

# 当 Grok 调用工具时，执行 REST 调用
# POST https://api.agentrix.top/api/mcp/tool/search_products
```

### 方式二：导入 OpenAPI Schema

1. 下载 OpenAPI Schema
   ```bash
   curl https://api.agentrix.top/api/mcp/openapi.json -o agentrix-tools.json
   ```

2. 在 xAI 控制台中导入

---

## REST API 桥接

对于不直接支持 MCP 的平台，可以使用 REST API 桥接：

### 端点格式
```
POST https://api.agentrix.top/api/mcp/tool/{tool_name}
Content-Type: application/json

{
  "参数名": "参数值"
}
```

### 示例：搜索商品
```bash
curl -X POST https://api.agentrix.top/api/mcp/tool/search_products \
  -H "Content-Type: application/json" \
  -d '{"query": "NFT", "limit": 5}'
```

### 示例：创建支付意图
```bash
curl -X POST https://api.agentrix.top/api/mcp/tool/create_pay_intent \
  -H "Content-Type: application/json" \
  -d '{"productId": "prod_xxx", "quantity": 1}'
```

---

## 可用工具列表

| 工具名 | 描述 | 必填参数 |
|--------|------|---------|
| `search_products` | 搜索市场商品 | query |
| `create_pay_intent` | 创建支付意图 | productId |
| `get_balance` | 获取钱包余额 | userId |
| `agent_authorize` | 创建 Agent 授权 | agentId, userId |
| `airdrop_discover` | 发现空投机会 | userId |
| `autoearn_stats` | 获取自动收益统计 | userId |

### 工具详细说明

#### search_products
搜索 Agentrix 市场中的商品。

**参数：**
- `query` (string, 必填): 搜索关键词
- `assetType` (string, 可选): 资产类型 (physical/service/nft/ft/game_asset/rwa)
- `limit` (number, 可选): 返回数量限制，默认 10

**返回示例：**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"products\": [{\"id\": \"...\", \"name\": \"...\", \"price\": 100}]}"
    }
  ]
}
```

#### create_pay_intent
创建支付意图，用于购买商品。

**参数：**
- `productId` (string, 必填): 商品 ID
- `quantity` (number, 可选): 数量，默认 1

#### get_balance
查询用户钱包余额。

**参数：**
- `userId` (string, 必填): 用户 ID
- `chain` (string, 可选): 区块链网络 (bsc/ethereum)

#### agent_authorize
为 AI Agent 创建支付授权。

**参数：**
- `agentId` (string, 必填): Agent ID
- `userId` (string, 必填): 用户 ID
- `durationDays` (number, 可选): 授权天数，默认 30

---

## 故障排除

### ChatGPT：工具不显示

1. **检查 OAuth Discovery 端点**
   ```bash
   curl https://api.agentrix.top/.well-known/oauth-authorization-server
   ```
   应返回有效的 JSON 配置

2. **尝试"无需授权"模式**
   - 在 Action 配置中选择 "None" 认证

3. **清除缓存并重新添加**
   - 删除现有 Action，重新导入 Schema

### Claude Desktop：连接失败

1. **检查配置文件格式**
   ```json
   {
     "mcpServers": {
       "agentrix": {
         "url": "https://api.agentrix.top/api/mcp/sse",
         "transport": "sse"
       }
     }
   }
   ```

2. **检查网络连接**
   ```bash
   curl -v https://api.agentrix.top/api/mcp/sse
   ```

3. **查看 Claude Desktop 日志**
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\logs\`

### Gemini/Grok：工具调用失败

1. **验证 OpenAPI Schema**
   ```bash
   curl https://api.agentrix.top/api/mcp/openapi.json | jq .
   ```

2. **直接测试 REST 端点**
   ```bash
   curl -X POST https://api.agentrix.top/api/mcp/tool/search_products \
     -H "Content-Type: application/json" \
     -d '{"query": "test"}'
   ```

### 通用问题

1. **CORS 错误**
   - API 服务器已配置 CORS 支持
   - 如果仍有问题，请检查浏览器扩展是否阻止请求

2. **超时问题**
   - SSE 连接需要支持长连接
   - 检查代理/防火墙是否阻断长连接

3. **认证失败**
   - 确认使用 "None" 认证模式进行测试
   - OAuth 模式需要完整的授权流程

---

## 快速验证脚本

```bash
#!/bin/bash
# 验证所有端点

echo "1. 检查 OAuth Discovery..."
curl -s https://api.agentrix.top/.well-known/oauth-authorization-server | jq -r '.issuer'

echo ""
echo "2. 检查 OpenAPI Schema..."
curl -s https://api.agentrix.top/api/mcp/openapi.json | jq -r '.info.title'

echo ""
echo "3. 测试工具调用..."
curl -s -X POST https://api.agentrix.top/api/mcp/tool/search_products \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}' | jq -r '.content[0].type // .error // "Success"'

echo ""
echo "4. 检查 SSE 端点..."
timeout 3 curl -s -H "Accept: application/json" https://api.agentrix.top/api/mcp/sse | jq .
```

---

## 联系支持

如有问题，请通过以下方式联系：

- GitHub Issues: https://github.com/CutaGames/Agentrix/issues
- Email: support@agentrix.top
- 文档: https://docs.agentrix.top

---

*最后更新: 2025-12-30*
