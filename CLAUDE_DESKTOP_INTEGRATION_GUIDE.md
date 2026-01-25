# Claude Desktop 调用 Agentrix Skills 配置指南

## 概述

Claude Desktop 通过 MCP (Model Context Protocol) 可以调用外部工具。Agentrix 提供了完整的 MCP Server 实现，使您刚发布的 skill 可以被 Claude Desktop 直接调用。

---

## 前置条件

1. **已安装 Claude Desktop**: 从 [claude.ai](https://claude.ai/download) 下载最新版本
2. **已发布 Skill**: 在 Agentrix Workbench 成功发布至少一个 skill
3. **Agentrix 后端运行中**: 确保后端服务在 `http://localhost:3001` 或生产域名可用

---

## 配置步骤

### 步骤 1: 找到 Claude Desktop 配置文件

配置文件位置因操作系统而异：

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```bash
~/.config/Claude/claude_desktop_config.json
```

如果文件不存在，手动创建一个空的 JSON 文件。

---

### 步骤 2: 编辑配置文件

打开配置文件并添加 Agentrix MCP Server 配置：

```json
{
  "mcpServers": {
    "agentrix": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch@latest"
      ],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3001/api/mcp"
      }
    }
  }
}
```

**生产环境配置**（如果使用 agentrix.top）：
```json
{
  "mcpServers": {
    "agentrix": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch@latest"
      ],
      "env": {
        "MCP_SERVER_URL": "https://api.agentrix.top/api/mcp"
      }
    }
  }
}
```

---

### 步骤 3: 添加认证（如果需要）

如果您的 skill 需要认证，添加 Authorization header：

```json
{
  "mcpServers": {
    "agentrix": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch@latest"
      ],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3001/api/mcp",
        "MCP_AUTH_TOKEN": "YOUR_ACCESS_TOKEN_HERE"
      }
    }
  }
}
```

**获取 Access Token**:
1. 登录 Agentrix (http://localhost:3000)
2. 打开浏览器开发者工具 (F12)
3. 进入 Application/Storage → Local Storage → `access_token`
4. 复制 token 值替换上面的 `YOUR_ACCESS_TOKEN_HERE`

---

### 步骤 4: 重启 Claude Desktop

1. 完全退出 Claude Desktop (确保进程终止)
2. 重新启动 Claude Desktop
3. 等待几秒让 MCP 服务器初始化

---

### 步骤 5: 验证连接

在 Claude Desktop 中发送测试消息：

```
你好！请列出你能调用的 Agentrix skills。
```

Claude 应该能看到您发布的 skills 并显示类似：

```
我可以调用以下 Agentrix skills:
1. expert_consultation - 行业咨询服务
2. weather_data - 实时天气数据
...
```

---

## 使用示例

### 调用您发布的 Skill

假设您发布了一个名为 `expert_consultation` 的 skill:

**用户输入**:
```
请使用 expert_consultation skill 帮我分析一下电商行业的趋势
```

**Claude 响应**:
```
好的，我将调用 expert_consultation skill。

[调用 expert_consultation]
输入: {"query": "电商行业趋势分析"}

结果:
根据最新数据分析，电商行业呈现以下三大趋势...
(skill 返回的专业分析内容)
```

---

## 高级配置

### 配置多个 MCP Server

如果您想同时使用 Agentrix 和其他 MCP servers:

```json
{
  "mcpServers": {
    "agentrix": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch@latest"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3001/api/mcp"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem@latest", "/path/to/allowed/dir"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github@latest"],
      "env": {
        "GITHUB_TOKEN": "your_github_token"
      }
    }
  }
}
```

### 配置代理（中国用户）

如果您在中国且需要代理访问 NPM:

```json
{
  "mcpServers": {
    "agentrix": {
      "command": "npx",
      "args": [
        "--registry=https://registry.npmmirror.com",
        "-y",
        "@modelcontextprotocol/server-fetch@latest"
      ],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3001/api/mcp",
        "HTTP_PROXY": "http://127.0.0.1:7890",
        "HTTPS_PROXY": "http://127.0.0.1:7890"
      }
    }
  }
}
```

---

## 故障排查

### 问题 1: Claude Desktop 看不到 Agentrix skills

**可能原因**:
- MCP Server 未正确启动
- 配置文件格式错误
- 后端服务未运行

**解决方法**:
1. 检查配置文件 JSON 格式是否正确 (使用 JSONLint.com 验证)
2. 确认后端服务运行: `curl http://localhost:3001/api/health`
3. 检查 Claude Desktop 日志:
   - macOS: `~/Library/Logs/Claude/mcp.log`
   - Windows: `%APPDATA%\Claude\Logs\mcp.log`

### 问题 2: 调用 skill 时返回 401 Unauthorized

**解决方法**:
- 确保配置了正确的 `MCP_AUTH_TOKEN`
- Token 可能过期，重新获取 access_token
- 检查 skill 的 `ucpEnabled` 和 `x402Enabled` 是否为 true

### 问题 3: Skill 执行超时

**解决方法**:
- 检查 skill 的 `executor.endpoint` 是否可访问
- 如果是 HTTP skill，确认外部 API 响应时间
- 考虑增加超时配置（在 Agentrix 后端 `skill.service.ts` 中调整）

---

## Agentrix MCP API 端点

Agentrix 提供以下 MCP 相关端点：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/mcp/sse` | GET | MCP SSE 连接 (Server-Sent Events) |
| `/api/mcp/sse` | POST | MCP 消息发送 |
| `/api/mcp/tool/:name` | POST | 直接调用指定 skill |
| `/api/mcp/openapi.json` | GET | MCP OpenAPI 规范 |

---

## 进阶：自定义 Skill 参数

如果您的 skill 需要复杂参数，可以在 Claude Desktop 中这样调用：

**用户输入**:
```
请调用 weather_data skill，查询北京的天气。参数: {"city": "Beijing", "units": "metric"}
```

Claude 会自动解析并传递参数到您的 skill。

---

## 相关资源

- **Agentrix Workbench**: http://localhost:3000/workbench
- **Skill Marketplace**: http://localhost:3000/marketplace
- **MCP Official Docs**: https://modelcontextprotocol.io
- **Claude Desktop**: https://claude.ai/download

---

## 下一步

1. ✅ 配置完成后，发布更多 skills 到 Agentrix
2. ✅ 尝试在 Claude Desktop 中组合多个 skills 完成复杂任务
3. ✅ 探索 Agentrix 的订阅制 skills (每月固定费用)
4. ✅ 查看 skill 调用统计: http://localhost:3000/workbench → My Skills

---

**恭喜！您已成功将 Agentrix skills 集成到 Claude Desktop!** 🎉

现在 Claude 可以直接调用您在 Agentrix 上发布的所有 skills，包括数据查询、专家咨询、API集成等各类能力。
