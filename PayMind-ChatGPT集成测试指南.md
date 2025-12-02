# PayMind ChatGPT 集成测试指南

## 🎯 测试目标

实现完整的测试场景：
1. 商户上传商品到 marketplace（通过界面或SDK）
2. ChatGPT 在对话框中搜索和交易这些商品
3. 验证完整的交易流程

---

## 📋 前置准备

### 1. 环境配置

```bash
# 设置环境变量
export API_BASE_URL=http://localhost:3001/api
export TEST_TOKEN=your-auth-token  # 需要先登录获取
```

### 2. 启动后端服务

```bash
cd backend
npm run start:dev
```

---

## 🚀 测试步骤

### Step 1: 创建测试商品

```bash
# 方式1：通过脚本创建
cd backend
npx ts-node scripts/create-test-products-for-chatgpt.ts

# 方式2：通过前端界面创建
# 访问 http://localhost:3000/app/merchant
# 登录商户账号，创建商品
```

**脚本会自动**：
- ✅ 创建多个测试商品（实物、服务、NFT）
- ✅ 自动注册 AI 能力
- ✅ 验证 OpenAI Functions 可用性
- ✅ 测试搜索功能

### Step 2: 验证 OpenAI Functions

```bash
# 获取 Function Schemas
curl http://localhost:3001/api/openai/functions
```

**应该返回**：
```json
{
  "functions": [
    {
      "type": "function",
      "function": {
        "name": "search_paymind_products",
        "description": "搜索 PayMind Marketplace 中的商品...",
        "parameters": { ... }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "buy_paymind_product",
        "description": "购买 PayMind Marketplace 中的商品...",
        "parameters": { ... }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "get_paymind_order",
        "description": "查询 PayMind 订单状态和详情...",
        "parameters": { ... }
      }
    }
  ],
  "count": 3
}
```

### Step 3: 测试搜索功能

```bash
# 快速测试搜索
curl "http://localhost:3001/api/openai/test?query=iPhone"
```

### Step 4: 运行完整测试脚本

```bash
cd backend
npx ts-node scripts/test-chatgpt-integration.ts
```

**测试场景**：
1. ✅ 搜索商品（"我要买 iPhone 15"）
2. ✅ 购买商品（"我要买第一个"）
3. ✅ 搜索服务（"我想学英语"）
4. ✅ 预约服务（"我想预约明天的课程"）

---

## 🤖 ChatGPT 配置

### 方式1：通过 OpenAI API 直接调用

```python
import openai
import json

# 配置 OpenAI Client
client = openai.OpenAI(api_key="your-openai-api-key")

# 1. 获取 PayMind Functions
response = requests.get("http://your-api.com/api/openai/functions")
functions = response.json()["functions"]

# 2. 调用 ChatGPT with Functions
messages = [
    {"role": "user", "content": "我要买 iPhone 15"}
]

response = client.chat.completions.create(
    model="gpt-4",
    messages=messages,
    functions=[f["function"] for f in functions],
    function_call="auto"
)

# 3. 处理 Function Call
if response.choices[0].message.function_call:
    function_name = response.choices[0].message.function_call.name
    function_args = json.loads(response.choices[0].message.function_call.arguments)
    
    # 调用 PayMind API
    result = requests.post(
        "http://your-api.com/api/openai/function-call",
        json={
            "function": {
                "name": function_name,
                "arguments": json.dumps(function_args)
            },
            "context": {
                "userId": "user-123"
            }
        }
    )
    
    # 将结果返回给 ChatGPT
    messages.append({
        "role": "function",
        "name": function_name,
        "content": json.dumps(result.json())
    })
    
    # 继续对话
    response = client.chat.completions.create(
        model="gpt-4",
        messages=messages,
        functions=[f["function"] for f in functions]
    )
```

### 方式2：通过 ChatGPT Actions（GPTs）

1. **创建 GPT**
   - 访问 https://chat.openai.com/gpts
   - 点击 "Create" 创建新的 GPT

2. **配置 Actions**
   - 在 "Actions" 部分点击 "Create new action"
   - 选择 "Import from URL"
   - 输入：`http://your-api.com/api/openai/openapi.json`（需要实现 OpenAPI 规范）

3. **或者手动配置**
   - Schema URL: `http://your-api.com/api/openai/functions`
   - Function Call URL: `http://your-api.com/api/openai/function-call`
   - Authentication: 根据需要配置

---

## 📊 API 端点说明

### 1. 获取 Function Schemas

```
GET /api/openai/functions
```

**响应**：返回所有可用的 Function Schemas

### 2. 执行 Function Call

```
POST /api/openai/function-call
{
  "function": {
    "name": "search_paymind_products",
    "arguments": "{\"query\": \"iPhone 15\"}"
  },
  "context": {
    "userId": "user-123"
  }
}
```

**支持的 Functions**：
- `search_paymind_products` - 搜索商品
- `buy_paymind_product` - 购买商品
- `get_paymind_order` - 查询订单

### 3. 快速测试

```
GET /api/openai/test?query={query}
```

---

## 🧪 测试场景示例

### 场景1：搜索和购买实物商品

```
用户: "我要买 iPhone 15"
  ↓
ChatGPT 调用: search_paymind_products({query: "iPhone 15"})
  ↓
返回商品列表
  ↓
用户: "我要买第一个"
  ↓
ChatGPT 调用: buy_paymind_product({product_id: "xxx", quantity: 1, shipping_address: "..."})
  ↓
返回订单信息
```

### 场景2：搜索和预约服务

```
用户: "我想学英语"
  ↓
ChatGPT 调用: search_paymind_products({query: "英语课程", category: "service"})
  ↓
返回服务列表
  ↓
用户: "我想预约明天的课程"
  ↓
ChatGPT 调用: buy_paymind_product({product_id: "xxx", appointment_time: "...", contact_info: "..."})
  ↓
返回预约信息
```

### 场景3：搜索 NFT

```
用户: "我想买数字艺术品"
  ↓
ChatGPT 调用: search_paymind_products({query: "数字艺术 NFT"})
  ↓
返回 NFT 列表
  ↓
用户: "我要买第一个"
  ↓
ChatGPT 调用: buy_paymind_product({product_id: "xxx", wallet_address: "0x...", chain: "ethereum"})
  ↓
返回订单信息
```

---

## ✅ 验证清单

### 后端验证

- [x] OpenAI Functions API 可用
- [x] Function Call 执行正常
- [x] 搜索功能正常
- [x] 购买功能正常
- [x] 错误处理正确

### ChatGPT 集成验证

- [ ] 可以获取 Function Schemas
- [ ] ChatGPT 可以调用 search_paymind_products
- [ ] ChatGPT 可以调用 buy_paymind_product
- [ ] 完整的对话流程正常

---

## 🐛 常见问题

### 1. Function Call 返回错误

**问题**：`USER_NOT_AUTHENTICATED`

**解决**：确保在 context 中传递 userId

```json
{
  "context": {
    "userId": "user-123"
  }
}
```

### 2. 搜索无结果

**问题**：搜索返回空列表

**解决**：
- 检查商品是否已创建
- 检查商品状态是否为 'active'
- 检查向量数据库是否已索引商品

### 3. 购买失败

**问题**：购买时提示库存不足或其他错误

**解决**：
- 检查商品库存
- 检查必填参数（如 shipping_address 对于实物商品）
- 检查用户是否已登录

---

## 📝 下一步

1. **完善 OpenAPI 规范**
   - 实现 `/api/openai/openapi.json` 端点
   - 支持 ChatGPT Actions 直接导入

2. **添加更多 Functions**
   - `get_paymind_product_details` - 获取商品详情
   - `add_to_cart` - 加入购物车
   - `checkout` - 结算

3. **优化推荐理由**
   - 集成 LLM 生成更自然的推荐理由

---

## 🎉 总结

现在 PayMind 已经支持：

✅ 统一的 OpenAI Function Calling 接口
✅ 商品搜索功能
✅ 商品购买功能
✅ 订单查询功能
✅ 完整的测试脚本

**ChatGPT 现在可以直接在对话框中搜索和购买 PayMind Marketplace 的商品了！** 🚀

