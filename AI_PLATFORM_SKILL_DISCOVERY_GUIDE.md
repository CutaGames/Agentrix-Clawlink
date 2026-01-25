# AI平台Skill发现机制完全指南

## 核心问题解答

### Q1: 用户在Claude Desktop中不安装MCP能发现Agentrix skills吗？

**答案：❌ 不能**

Claude Desktop **必须手动配置** MCP Server才能发现和调用Agentrix skills。

**原因**：
- MCP (Model Context Protocol) 不是自动发现协议
- Claude Desktop需要在配置文件中明确指定MCP Server地址
- 这是技术架构设计，确保安全和用户控制

**例外情况**：
- 如果Anthropic官方将Agentrix列入预置MCP Servers列表，用户只需一键启用
- 类似Chrome扩展商店的"官方推荐"机制

---

### Q2: 资源类商品skill也需要配置MCP吗？

**答案：是的，通过MCP访问时需要配置**

但有**其他发现途径**：

#### 途径1: 直接访问Agentrix Marketplace
用户访问 https://agentrix.top/marketplace 可直接浏览和购买所有skills（包括商品类），无需任何配置。

#### 途径2: UCP协议自动发现 (理论支持)
```
GET https://agentrix.top/.well-known/ucp
```
返回所有可购买的skills列表，但**需要AI平台实现UCP客户端**。

#### 途径3: X402支付协议 (需平台支持)
```
GET https://agentrix.top/api/skills/12345
Response: 402 Payment Required
X-Payment-Method: UCP
X-Payment-Url: https://agentrix.top/api/ucp/checkout/12345
```

---

### Q3: ChatGPT/Gemini可以直接检索并交易Agentrix skills吗？

**简短答案：目前需要手动配置，未来可能支持自动发现**

让我详细说明各平台情况：

---

## 各AI平台Skill发现机制对比

### 1. ChatGPT (OpenAI GPTs)

#### 当前状态：❌ 需要手动配置

**配置方式**：
1. 打开 GPT Builder (https://chatgpt.com/gpts/editor)
2. 点击 "Configure" → "Actions"
3. 添加Agentrix OpenAPI Schema:
   ```
   Schema URL: https://agentrix.top/api/mcp/openapi.json
   ```
4. 配置Authentication (如需要):
   ```
   Authentication Type: Bearer Token
   Token: YOUR_ACCESS_TOKEN
   ```

**用户体验**：
- ❌ **不能**在对话框直接检索Agentrix skills
- ✅ **可以**创建自定义GPT后永久使用
- ✅ 配置一次，所有用户可用（如果GPT是公开的）

#### 未来可能性：✅ OpenAI Plugin Discovery (已废弃，但理念可参考)

OpenAI曾有Plugin Store自动发现机制，但已转向GPT Actions。如果重新引入类似机制：

```json
// ChatGPT可能扫描的发现端点
GET https://agentrix.top/.well-known/ai-plugin.json
{
  "schema_version": "v1",
  "name_for_human": "Agentrix Skills",
  "name_for_model": "agentrix",
  "description_for_human": "Browse and use AI skills from Agentrix marketplace",
  "description_for_model": "Access 1000+ skills including data, commerce, tools",
  "auth": {
    "type": "oauth",
    "authorization_url": "https://agentrix.top/api/oauth/authorize"
  },
  "api": {
    "type": "openapi",
    "url": "https://agentrix.top/api/mcp/openapi.json"
  }
}
```

但**目前OpenAI不支持此自动发现**。

---

### 2. Claude Desktop (Anthropic)

#### 当前状态：❌ 需要手动配置

**配置方式**：见 [CLAUDE_DESKTOP_INTEGRATION_GUIDE.md](./CLAUDE_DESKTOP_INTEGRATION_GUIDE.md)

**用户体验**：
- ❌ **不能**在对话框直接检索
- ✅ 配置后Claude可看到所有published skills
- ✅ 可调用skill并查看实时结果

#### 未来可能性：🟡 MCP Registry (社区呼声高)

MCP社区正在讨论建立Registry：

```
https://mcp-registry.org/servers/agentrix
{
  "name": "Agentrix Skills",
  "description": "1000+ AI skills marketplace",
  "url": "https://agentrix.top/api/mcp",
  "stars": 1234,
  "verified": true
}
```

用户在Claude Desktop中可能实现：
1. 打开Settings → MCP Servers → Browse Registry
2. 搜索 "Agentrix"
3. 一键安装

**但当前不存在此机制**。

---

### 3. Google Gemini

#### 当前状态：❌ 完全不支持自动发现

**原因**：Gemini API没有插件/扩展系统，仅支持：
- Function Calling (需在代码中硬编码函数定义)
- Grounding (Google Search集成)

**配置方式**：需要在应用代码中定义：

```python
# Python SDK示例
import google.generativeai as genai

# 必须手动定义每个skill的function schema
search_news_function = genai.protos.FunctionDeclaration(
    name="search_news",
    description="Search latest news from Agentrix",
    parameters={
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Search query"}
        }
    }
)

# 用户无法在Gemini对话框直接调用Agentrix skills
# 需要开发者构建自定义应用
```

**用户体验**：
- ❌ **不能**在Google AI Studio对话框直接使用
- ❌ **不能**自动发现Agentrix skills
- ⚠️  需要开发者为每个skill编写wrapper代码

#### 未来可能性：🔴 短期内不太可能

Google目前专注于Vertex AI企业方案，个人用户的插件生态不是优先级。

---

### 4. Microsoft Copilot (Bing Chat)

#### 当前状态：🟡 部分支持Plugin发现

**机制**：Copilot Plugins (类似ChatGPT Plugins)

**配置方式**：
1. 提交插件到Microsoft Partner Center
2. 审核通过后，用户可在Copilot中启用
3. 需要提供：
   - OpenAPI manifest
   - OAuth配置
   - 隐私政策

**用户体验**：
- ✅ 可能支持对话框内发现（如果Agentrix提交并通过审核）
- ✅ 用户可在Settings → Plugins中启用Agentrix
- ❌ 但需要Agentrix主动申请成为Official Plugin

**参考**：https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/

---

### 5. Perplexity AI

#### 当前状态：❌ 无插件系统

Perplexity专注于搜索增强，没有skill/plugin生态。

---

### 6. Claude API (Anthropic API，非Desktop)

#### 当前状态：✅ 支持Function Calling (需硬编码)

```python
import anthropic

client = anthropic.Anthropic(api_key="YOUR_API_KEY")

# 必须手动定义工具
response = client.messages.create(
    model="claude-3-opus-20240229",
    tools=[
        {
            "name": "search_news",
            "description": "Search Agentrix skills marketplace for news",
            "input_schema": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"}
                }
            }
        }
    ],
    messages=[{"role": "user", "content": "Find AI news"}]
)
```

**用户体验**：
- ❌ **不能**自动发现
- ⚠️  开发者需逐个定义skill为tool

---

## 协议标准对比

### UCP (Unified Checkout Protocol)

**设计目标**：AI Agent可自动发现并购买商品/服务

**发现端点**：
```
GET https://agentrix.top/.well-known/ucp
```

**响应示例**：
```json
{
  "version": "1.0",
  "merchant": {
    "name": "Agentrix",
    "id": "agentrix-001"
  },
  "products": [
    {
      "id": "skill-123",
      "name": "Expert Consultation",
      "price": 29.00,
      "currency": "USD",
      "checkout_url": "https://agentrix.top/api/ucp/checkout/skill-123"
    }
  ]
}
```

**平台支持情况**：
| 平台 | UCP支持 | 说明 |
|------|---------|------|
| ChatGPT | ❌ | 需OpenAI实现UCP客户端 |
| Claude | ❌ | 需Anthropic支持 |
| Gemini | ❌ | 无插件生态 |
| 自定义Agent | ✅ | 可自行实现UCP解析 |

**现实情况**：UCP是新兴标准，主流AI平台**尚未**支持自动UCP发现。

---

### X402 (Payment Required HTTP Status)

**设计目标**：通过HTTP 402状态码标识付费资源

**工作流程**：
```
1. AI Agent: GET https://agentrix.top/api/skills/123
2. Server: 402 Payment Required
   Headers:
     X-Payment-Protocol: UCP
     X-Payment-Url: https://agentrix.top/api/ucp/checkout/123
     X-Price: 29.00
     X-Currency: USD
3. AI Agent: 自动跳转支付流程
```

**平台支持情况**：
| 平台 | X402支持 | 说明 |
|------|---------|------|
| ChatGPT | ❌ | 不识别402状态 |
| Claude Desktop | ❌ | 不支持自动支付 |
| 标准HTTP客户端 | ✅ | 可正确接收402 |

**现实情况**：X402是RFC扩展提案，主流AI平台**未实现**自动支付逻辑。

---

### MCP (Model Context Protocol)

**设计目标**：AI与外部工具的标准化通信协议

**发现机制**：
- ❌ **不支持**自动发现
- ✅ **支持**配置文件手动添加
- 🟡 **可能**未来有Registry

**Agentrix MCP实现**：
```
SSE Endpoint: https://agentrix.top/api/mcp/sse
Tools: 自动暴露所有published skills
Schema: https://agentrix.top/api/mcp/openapi.json
```

**优势**：
- ✅ Claude Desktop原生支持
- ✅ 社区活跃，可能成为事实标准
- ✅ 开源协议，任何平台都能实现

**劣势**：
- ❌ 需要用户手动配置
- ❌ 不是Web标准(非W3C/RFC)

---

## 实际使用场景对比

### 场景1: 普通用户想在ChatGPT中使用Agentrix skills

**当前路径**：
1. 访问 https://agentrix.top/marketplace
2. 浏览并选择skill
3. 点击"购买"或"安装"
4. 返回ChatGPT，**手动输入**skill信息

**或者**：
1. 创建自定义GPT
2. 配置Agentrix Actions
3. 发布GPT供他人使用

**用户体验评分**: ⭐⭐☆☆☆ (需要多步操作)

---

### 场景2: 开发者构建自定义AI Agent

**当前路径**：
1. 调用Agentrix API: `GET /api/skills/marketplace`
2. 解析skill列表
3. 在Agent中实现skill调用逻辑
4. 用户输入 → Agent选择skill → 调用Agentrix API → 返回结果

**用户体验评分**: ⭐⭐⭐⭐⭐ (对终端用户透明)

**示例代码**：
```python
import requests

# 自动发现skills
skills = requests.get("https://agentrix.top/api/unified-marketplace/search").json()

# Agent决策调用哪个skill
skill_to_use = agent.decide_skill(user_query, skills)

# 执行skill
result = requests.post(
    f"https://agentrix.top/api/skills/{skill_to_use['id']}/execute",
    json={"query": user_query},
    headers={"Authorization": f"Bearer {access_token}"}
)
```

---

### 场景3: Claude Desktop用户

**当前路径**：
1. 配置 `claude_desktop_config.json`
2. 重启Claude Desktop
3. 直接在对话框输入："帮我查询最新AI新闻"
4. Claude自动调用Agentrix的`search_news` skill

**用户体验评分**: ⭐⭐⭐⭐☆ (一次配置，永久使用)

---

## 未来趋势预测

### 短期 (3-6个月)

**可能发生**：
1. ✅ MCP社区建立非官方Registry
2. ✅ Claude Desktop增加"推荐MCP Servers"功能
3. 🟡 OpenAI重新考虑Plugin Discovery机制

**Agentrix应做**：
- 提交到MCP社区列表
- 创建官方GPT (ChatGPT)
- 优化OpenAPI文档质量

---

### 中期 (6-12个月)

**可能发生**：
1. 🟡 UCP 1.0规范定稿
2. 🟡 主流AI平台之一实现UCP客户端
3. ✅ Microsoft Copilot扩大Plugin生态

**Agentrix应做**：
- 深度参与UCP/X402标准制定
- 申请成为Microsoft Official Plugin
- 建立skill认证体系

---

### 长期 (12+个月)

**可能发生**：
1. ✅ AI Agent自动发现成为行业标准
2. ✅ 跨平台skill调用协议统一
3. ✅ 用户无需任何配置即可使用第三方skills

**理想状态**：
用户在ChatGPT/Claude/Gemini中输入：
```
"帮我订一张去纽约的机票"
```

AI自动：
1. 发现Agentrix的`book_flight` skill
2. 调用skill获取航班信息
3. 引导用户完成支付
4. 返回订单确认

**现实阻碍**：
- 安全性担忧(AI滥用第三方API)
- 商业利益冲突(平台更愿意用户使用自家服务)
- 技术复杂度(跨平台认证、支付、隐私)

---

## 结论与建议

### 对用户

**如果您想现在就用Agentrix skills**：
1. ✅ **推荐**：配置Claude Desktop MCP (一次配置，永久便利)
2. ✅ 备选：访问Agentrix Marketplace网页版直接购买
3. ⚠️  不推荐：等待AI平台自动支持(时间不确定)

### 对Agentrix平台

**应对策略**：
1. **短期**：优化MCP/OpenAPI文档，主动推广Claude Desktop集成
2. **中期**：参与UCP/MCP标准制定，申请各平台官方认证
3. **长期**：建立跨平台skill分发网络，成为AI工具的"NPM/PyPI"

### 核心要点

❌ **不能**在ChatGPT/Gemini对话框直接检索Agentrix skills(需配置)
✅ **能**通过Claude Desktop MCP配置后便捷使用
✅ **能**访问Agentrix Marketplace网页直接浏览购买
🟡 **未来可能**支持自动发现(但需AI平台实现UCP/类似协议)

---

**最后更新**: 2026-01-25  
**相关文档**: [CLAUDE_DESKTOP_INTEGRATION_GUIDE.md](./CLAUDE_DESKTOP_INTEGRATION_GUIDE.md)
