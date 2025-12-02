# PayMind ChatGPT 快速开始指南

## 🚀 5 分钟快速测试

### Step 1: 启动服务

```bash
cd backend
npm run start:dev
```

确保服务运行在 `http://localhost:3001`

### Step 2: 创建测试商品

```bash
# 方式1：通过脚本（推荐）
cd backend
export TEST_TOKEN=your-auth-token  # 需要先登录获取
npx ts-node scripts/create-test-products-for-chatgpt.ts

# 方式2：通过前端界面
# 访问 http://localhost:3000/app/merchant
# 登录商户账号，创建商品
```

### Step 3: 验证 Functions

```bash
# 获取 Function Schemas
curl http://localhost:3001/api/openai/functions

# 应该返回 3 个 Function：
# - search_paymind_products
# - buy_paymind_product
# - get_paymind_order
```

### Step 4: 测试搜索

```bash
# 快速测试
curl "http://localhost:3001/api/openai/test?query=iPhone"

# 应该返回商品列表
```

### Step 5: 运行完整测试

```bash
cd backend
npx ts-node scripts/test-chatgpt-integration.ts
```

---

## 🤖 ChatGPT 配置

### 方式1：Python 脚本测试（最简单）

创建 `test_chatgpt.py`：

```python
import openai
import json
import requests

OPENAI_API_KEY = "your-openai-api-key"
PAYMIND_API_URL = "http://localhost:3001/api"

# 1. 获取 Functions
response = requests.get(f"{PAYMIND_API_URL}/openai/functions")
functions = [f["function"] for f in response.json()["functions"]]

# 2. 初始化 OpenAI
client = openai.OpenAI(api_key=OPENAI_API_KEY)

# 3. 对话
messages = [
    {"role": "system", "content": "你是 PayMind 购物助手，可以帮助用户搜索和购买商品。"}
]

def chat(user_message):
    global messages
    messages.append({"role": "user", "content": user_message})
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=messages,
        functions=functions,
        function_call="auto"
    )
    
    message = response.choices[0].message
    
    # 处理 Function Call
    if message.function_call:
        func_name = message.function_call.name
        func_args = json.loads(message.function_call.arguments)
        
        print(f"\n🤖 调用: {func_name}")
        print(f"   参数: {func_args}")
        
        # 调用 PayMind
        result = requests.post(
            f"{PAYMIND_API_URL}/openai/function-call",
            json={
                "function": {
                    "name": func_name,
                    "arguments": json.dumps(func_args)
                },
                "context": {"userId": "test-user-123"}
            }
        ).json()
        
        print(f"   结果: {result.get('message', 'Success')}")
        
        # 返回结果给 ChatGPT
        messages.append({
            "role": "function",
            "name": func_name,
            "content": json.dumps(result)
        })
        
        # 继续对话
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            functions=functions
        )
        message = response.choices[0].message
    
    messages.append(message)
    return message.content

# 测试
print("🤖 PayMind 购物助手\n")
print(chat("我要买 iPhone 15"))
print(chat("我要买第一个"))
```

运行：
```bash
python test_chatgpt.py
```

### 方式2：ChatGPT Actions（GPTs）

1. 访问 https://chat.openai.com/gpts
2. 创建新的 GPT
3. 在 Actions 中添加：
   - Schema URL: `http://your-api.com/api/openai/openapi.json`
   - 或手动配置 Functions

---

## ✅ 验证

### 1. 检查 Functions

```bash
curl http://localhost:3001/api/openai/functions | jq '.count'
# 应该返回: 3
```

### 2. 测试搜索

```bash
curl "http://localhost:3001/api/openai/test?query=iPhone" | jq '.total'
# 应该返回商品数量
```

### 3. 测试购买

```bash
curl -X POST http://localhost:3001/api/openai/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "function": {
      "name": "buy_paymind_product",
      "arguments": "{\"product_id\": \"xxx\", \"quantity\": 1, \"shipping_address\": \"测试地址\"}"
    },
    "context": {"userId": "test-user-123"}
  }'
```

---

## 🎉 完成！

现在 ChatGPT 可以：
- ✅ 搜索 PayMind Marketplace 商品
- ✅ 购买商品
- ✅ 查询订单

**开始测试吧！** 🚀

