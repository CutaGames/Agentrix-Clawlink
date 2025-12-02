# ChatGPT 使用 PayMind Marketplace 说明

## ✅ 当前状态

**后端已完全就绪**，ChatGPT 可以通过以下方式查询 PayMind Marketplace 的商品：

### 已实现的功能

1. ✅ **商品搜索** - `search_paymind_products`
2. ✅ **比价服务** - `compare_paymind_prices`
3. ✅ **加入购物车** - `add_to_paymind_cart`
4. ✅ **查看购物车** - `view_paymind_cart`
5. ✅ **结算购物车** - `checkout_paymind_cart`
6. ✅ **购买商品** - `buy_paymind_product`
7. ✅ **查询订单** - `get_paymind_order`
8. ✅ **支付订单** - `pay_paymind_order`
9. ✅ **物流查询** - `track_paymind_logistics`

### API 端点

- `GET /api/openai/functions` - 获取所有 Function Schemas
- `POST /api/openai/function-call` - 执行 Function Call
- `GET /api/openai/test?query={query}` - 快速测试搜索

---

## 🚀 如何使用

### 方式1：通过 OpenAI API（开发测试）

#### Step 1: 获取 Function Schemas

```python
import requests

PAYMIND_API_URL = "http://localhost:3001/api"  # 或你的生产环境地址

# 获取 Functions
response = requests.get(f"{PAYMIND_API_URL}/openai/functions")
functions = response.json()["functions"]
print(f"找到 {len(functions)} 个 Functions")
```

#### Step 2: 配置 OpenAI Client

```python
import openai
import json

client = openai.OpenAI(api_key="your-openai-api-key")

# 提取 Function Schemas
function_schemas = [f["function"] for f in functions]
```

#### Step 3: 对话测试

```python
messages = [
    {"role": "system", "content": "你是 PayMind 购物助手，可以帮助用户搜索和购买商品。"},
    {"role": "user", "content": "我要买 AI 咨询服务"}
]

response = client.chat.completions.create(
    model="gpt-4",
    messages=messages,
    functions=function_schemas,
    function_call="auto"
)

message = response.choices[0].message

# 如果 ChatGPT 调用了 Function
if message.function_call:
    func_name = message.function_call.name
    func_args = json.loads(message.function_call.arguments)
    
    print(f"ChatGPT 调用: {func_name}")
    print(f"参数: {func_args}")
    
    # 调用 PayMind API
    result = requests.post(
        f"{PAYMIND_API_URL}/openai/function-call",
        json={
            "function": {
                "name": func_name,
                "arguments": json.dumps(func_args)
            },
            "context": {
                "userId": "test-user-123"  # 可选
            }
        }
    ).json()
    
    print(f"结果: {result}")
    
    # 将结果返回给 ChatGPT
    messages.append({
        "role": "function",
        "name": func_name,
        "content": json.dumps(result)
    })
    
    # ChatGPT 继续处理
    response = client.chat.completions.create(
        model="gpt-4",
        messages=messages,
        functions=function_schemas
    )
    
    print(f"ChatGPT 回复: {response.choices[0].message.content}")
```

---

### 方式2：通过 ChatGPT Actions（GPTs）（生产环境）

#### Step 1: 准备公开 API 地址

确保你的 API 可以通过公网访问：
- 开发环境：可以使用 ngrok 等工具
- 生产环境：部署到服务器并配置域名

#### Step 2: 创建 GPT

1. 访问 https://chat.openai.com/gpts
2. 点击 "Create" 创建新的 GPT
3. 在 "Actions" 部分点击 "Create new action"

#### Step 3: 配置 Actions

**选项A：使用 OpenAPI Schema（推荐）**

1. 选择 "Import from URL"
2. 输入：`https://your-api.com/api/openai/openapi.json`
3. 系统会自动导入所有 Functions

**选项B：手动配置**

1. Schema URL: `https://your-api.com/api/openai/functions`
2. Function Call URL: `https://your-api.com/api/openai/function-call`
3. Authentication: 根据需要配置（API Key、OAuth 等）

#### Step 4: 测试

在 ChatGPT 对话框中输入：
- "我要买 AI 咨询服务"
- "帮我找耳机"
- "比价一下手机"

ChatGPT 会自动调用 PayMind Functions 并返回结果。

---

## 🧪 快速验证

### 1. 检查 Functions 是否可用

```bash
# 在 WSL 中
cd backend
curl http://localhost:3001/api/openai/functions | jq '.count'
```

**预期结果**：应该返回 >= 7（包括系统级能力）

### 2. 测试搜索

```bash
curl "http://localhost:3001/api/openai/test?query=AI服务"
```

**预期结果**：返回商品列表，包含：
- `success: true`
- `data.products` - 商品数组（包含图片、价格、比价信息）
- `data.total` - 商品总数

### 3. 测试 Function Call

```bash
curl -X POST http://localhost:3001/api/openai/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "function": {
      "name": "search_paymind_products",
      "arguments": "{\"query\": \"AI服务\"}"
    },
    "context": {}
  }'
```

**预期结果**：
```json
{
  "success": true,
  "data": {
    "products": [...],
    "query": "AI服务",
    "total": 5,
    "priceComparison": {
      "cheapest": {...},
      "mostExpensive": {...},
      "averagePrice": 100.5
    }
  },
  "message": "找到 5 个相关商品"
}
```

---

## 📊 返回数据格式

### 商品搜索返回格式

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product-id",
        "name": "商品名称",
        "description": "商品描述",
        "price": 899.00,
        "currency": "CNY",
        "priceDisplay": "¥899.00",
        "stock": 10,
        "inStock": true,
        "category": "电子产品",
        "productType": "physical",
        "image": "https://...",
        "images": ["https://..."],
        "score": 0.95,
        "index": 1
      }
    ],
    "query": "AI服务",
    "total": 5,
    "priceComparison": {
      "cheapest": {
        "id": "...",
        "name": "...",
        "price": 50.00,
        "priceDisplay": "¥50.00"
      },
      "mostExpensive": {
        "id": "...",
        "name": "...",
        "price": 200.00,
        "priceDisplay": "¥200.00"
      },
      "averagePrice": 125.50,
      "priceRange": {
        "min": 50.00,
        "max": 200.00
      },
      "totalProducts": 5
    }
  },
  "message": "找到 5 个相关商品"
}
```

---

## ✅ 总结

**是的，ChatGPT 现在可以查询 PayMind Marketplace 的商品了！**

### 已就绪的部分：
- ✅ 后端 API 完全实现
- ✅ 统一执行器已创建并集成
- ✅ Function Schemas 已注册
- ✅ 商品数据格式统一（包含图片、价格、比价）

### 需要配置的部分：
- ⚠️ ChatGPT Actions（GPTs）：需要在 ChatGPT 中配置 Actions
- ⚠️ 公开 API 地址：生产环境需要可访问的 URL
- ⚠️ 认证配置：根据需要配置 API Key 或 OAuth

### 测试方法：
1. 使用 `GET /api/openai/test?query=xxx` 快速测试
2. 使用 Python 脚本通过 OpenAI API 测试
3. 配置 ChatGPT Actions 进行完整测试

**现在就可以开始测试了！** 🚀

