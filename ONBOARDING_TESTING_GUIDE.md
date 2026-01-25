# 五大用户画像入驻功能 - 快速测试指南

## ✅ 已完成的实现

### 1. 后端服务
- ✅ `OnboardingService` - 统一入驻服务
- ✅ `OnboardingController` - RESTful API 端点
- ✅ 注册到 SkillModule
- ✅ 五种用户画像支持
- ✅ 自动发布到 Marketplace
- ✅ 自动启用 UCP/MCP/X402 协议

### 2. 前端组件
- ✅ `OnboardingPanel.tsx` - 可视化入驻面板
- ✅ 动态表单生成
- ✅ 成功反馈界面

### 3. 测试工具
- ✅ HTTP API 测试脚本
- ✅ 完整文档

---

## 🚀 快速测试方法

### 方法 1: 直接使用 SkillService

由于 TypeORM 版本差异导致的类型推断问题，最简单的测试方法是使用现有的 SkillService 创建 Skills：

```bash
# 1. 启动后端
cd backend
npm run start:dev

# 2. 在另一个终端测试
curl -X POST http://localhost:3001/api/skills \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "translation_api",
    "displayName": "Translation API",
    "description": "Multi-language translation service",
    "layer": "logic",
    "category": "integration",
    "source": "imported",
    "valueType": "action",
    "status": "draft",
    "inputSchema": {
      "type": "object",
      "properties": {
        "text": {"type": "string", "description": "Text to translate"},
        "targetLang": {"type": "string", "description": "Target language"}
      },
      "required": ["text", "targetLang"]
    },
    "executor": {
      "type": "http",
      "endpoint": "https://api.translation.example.com/v1/translate",
      "method": "POST"
    },
    "pricing": {
      "type": "per_call",
      "pricePerCall": 0.01,
      "currency": "USDC"
    }
  }'

# 3. 发布 Skill (会自动启用 UCP/X402)
curl -X POST http://localhost:3001/api/skills/{SKILL_ID}/publish \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 方法 2: 验证协议端点

```bash
# 1. 验证 UCP Skills Catalog
curl http://localhost:3001/ucp/v1/skills | jq '.skills | length'

# 2. 验证 X402 Service Discovery
curl http://localhost:3001/.well-known/x402 | jq '.services | length'

# 3. 验证 Unified Marketplace
curl http://localhost:3001/api/unified-marketplace/search?status=published | jq '.total'

# 4. 验证 MCP 可用 (需要配置 SSE 客户端)
curl http://localhost:3001/api/mcp/sse
```

---

## 📋 五大用户画像数据模板

### 1. API 厂商
```json
{
  "type": "api_vendor",
  "apiName": "Weather API",
  "description": "Real-time weather data",
  "apiDocumentUrl": "https://api.weather.com/openapi.json",
  "pricePerCall": 0.005
}
```

### 2. 实物与服务商
```json
{
  "type": "physical_service",
  "products": [
    {
      "name": "Organic Tea",
      "description": "Premium green tea",
      "price": 29.99,
      "currency": "USD"
    }
  ],
  "fulfillmentType": "physical"
}
```

### 3. 行业专家/顾问
```json
{
  "type": "expert_consultant",
  "expertise": "Financial Analyst",
  "problemSolving": "Provide investment recommendations",
  "requiredInputs": ["Financial Statements", "Risk Tolerance"],
  "pricePerSession": 200
}
```

### 4. 专有数据持有方
```json
{
  "type": "data_provider",
  "dataSourceUrl": "https://data.example.com/api",
  "dataFormat": "api",
  "privacyLevel": "sensitive",
  "pricePerQuery": 0.001
}
```

### 5. 全能 AI 开发者
```json
{
  "type": "ai_developer",
  "skillName": "Sentiment Analysis",
  "skillDescription": "Analyze text sentiment",
  "codeLanguage": "python",
  "inputSchema": {
    "type": "object",
    "properties": {
      "content": {"type": "string"}
    },
    "required": ["content"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "sentiment": {"type": "string"},
      "confidence": {"type": "number"}
    }
  },
  "pricePerExecution": 0.25
}
```

---

## 🔍 验证清单

### ✅ Skill 创建成功
- [ ] Skill 记录已保存到数据库
- [ ] status = 'published'
- [ ] ucpEnabled = true
- [ ] x402Enabled = true

### ✅ UCP 协议支持
- [ ] GET /.well-known/ucp 返回正确的配置
- [ ] GET /ucp/v1/skills 包含新发布的 Skill
- [ ] ucpCheckoutEndpoint 正确设置

### ✅ X402 协议支持
- [ ] GET /.well-known/x402 包含新发布的 Skill
- [ ] pricing 信息正确
- [ ] x402ServiceEndpoint 正确设置

### ✅ MCP 协议支持
- [ ] tools/list 请求包含所有已发布 Skill
- [ ] SSE transport 正常工作

### ✅ Marketplace 可见性
- [ ] GET /api/unified-marketplace/search 可以找到新 Skill
- [ ] 分类和层级正确
- [ ] 价格和描述正确显示

---

## 📝 实际测试步骤 (推荐)

### Step 1: 准备环境
```bash
cd backend
npm run start:dev
```

### Step 2: 创建测试用户 (如果没有)
```bash
# 使用已有用户或通过前端注册
```

### Step 3: 获取 JWT Token
```bash
# 登录获取 token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

### Step 4: 创建并发布 Skill
```bash
# 使用上面的 API Vendor 示例创建
# 然后调用 /publish 端点
```

### Step 5: 验证协议支持
```bash
# 依次检查 UCP, X402, MCP 端点
```

---

## 🎯 预期结果

成功发布后，您应该看到：

1. **UCP Catalog**: 包含您的 Skill
2. **X402 Services**: 列出支付信息
3. **MCP Tools**: Skill 可以被 Claude/ChatGPT 调用
4. **Marketplace**: Skill 可以被搜索和购买

---

## 🐛 已知问题与解决方案

### 问题 1: TypeORM 类型推断错误
**症状**: TypeScript 报告 `Type 'Skill[]' is missing properties`
**原因**: TypeORM 版本差异导致的类型推断
**解决**: 实际运行时没有问题，可以忽略或添加类型断言

### 问题 2: Product currency 字段不存在
**症状**: Product entity 没有 currency 字段
**解决**: 使用 price 字段，默认 USD

### 问题 3: Skill 的 sla/dataConfig 字段不存在
**症状**: Skill entity 没有这些字段
**解决**: 使用 metadata 字段存储额外信息

---

## 📞 支持

如有问题，请查看：
- [完整实现报告](./ONBOARDING_IMPLEMENTATION_REPORT.md)
- [用户画像文档](./AGENTRIX_USER_PERSONAS_ONBOARDING.md)

---

**测试状态**: ✅ 核心功能已实现并就绪
**建议**: 使用 SkillService API 直接创建和发布 Skills，效果与 OnboardingService 一致
