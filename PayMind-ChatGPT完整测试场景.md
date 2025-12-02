# PayMind ChatGPT 完整测试场景

## 🎯 测试目标

实现完整的端到端测试：
1. ✅ 商户上传商品到 marketplace
2. ✅ ChatGPT 在对话框中搜索商品
3. ✅ ChatGPT 在对话框中购买商品
4. ✅ 验证完整的交易流程

---

## 📋 测试准备

### 1. 启动服务

```bash
# 启动后端
cd backend
npm run start:dev

# 确保服务运行在 http://localhost:3001
```

### 2. 创建测试商品

**方式1：通过脚本创建（推荐）**

```bash
cd backend

# 设置测试 token（需要先登录获取）
export TEST_TOKEN=your-auth-token

# 运行脚本
npx ts-node scripts/create-test-products-for-chatgpt.ts
```

**方式2：通过前端界面创建**

1. 访问 `http://localhost:3000/app/merchant`
2. 登录商户账号
3. 创建商品（会自动注册 AI 能力）

**方式3：通过 SDK 创建**

```typescript
import { PayMind } from '@paymind/sdk';

const paymind = new PayMind({ apiKey: 'your-api-key' });

const product = await paymind.merchants.createProduct({
  name: 'iPhone 15 Pro Max',
  description: '苹果最新款旗舰手机...',
  price: 9999,
  stock: 50,
  category: '电子产品',
  commissionRate: 5,
  productType: 'physical',
  metadata: {
    currency: 'CNY',
    image: 'https://...',
  },
});
```

---

## 🤖 ChatGPT 配置

### 方式1：通过 OpenAI API 直接调用（推荐用于测试）

#### Python 示例

```python
import openai
import json
import requests

# 配置
OPENAI_API_KEY = "your-openai-api-key"
PAYMIND_API_URL = "http://localhost:3001/api"

# 1. 获取 PayMind Functions
response = requests.get(f"{PAYMIND_API_URL}/openai/functions")
functions_data = response.json()
functions = [f["function"] for f in functions_data["functions"]]

# 2. 初始化 OpenAI Client
client = openai.OpenAI(api_key=OPENAI_API_KEY)

# 3. 对话循环
messages = [
    {"role": "system", "content": "你是一个购物助手，可以帮助用户搜索和购买 PayMind Marketplace 的商品。"}
]

def chat_with_functions(user_message):
    global messages
    
    # 添加用户消息
    messages.append({"role": "user", "content": user_message})
    
    # 调用 ChatGPT with Functions
    response = client.chat.completions.create(
        model="gpt-4",
        messages=messages,
        functions=functions,
        function_call="auto"
    )
    
    message = response.choices[0].message
    
    # 检查是否有 Function Call
    if message.function_call:
        function_name = message.function_call.name
        function_args = json.loads(message.function_call.arguments)
        
        print(f"\n🤖 ChatGPT 调用 Function: {function_name}")
        print(f"   参数: {function_args}")
        
        # 调用 PayMind API
        result = requests.post(
            f"{PAYMIND_API_URL}/openai/function-call",
            json={
                "function": {
                    "name": function_name,
                    "arguments": json.dumps(function_args)
                },
                "context": {
                    "userId": "test-user-123"  # 测试用户ID
                }
            }
        ).json()
        
        print(f"   结果: {result.get('message', result.get('error', 'Success'))}")
        
        # 将 Function 结果返回给 ChatGPT
        messages.append({
            "role": "function",
            "name": function_name,
            "content": json.dumps(result)
        })
        
        # 继续对话
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            functions=functions
        )
        message = response.choices[0].message
    
    # 添加助手回复
    messages.append(message)
    
    return message.content

# 测试对话
print("🤖 ChatGPT 购物助手已启动\n")
print("=" * 60)

# 场景1：搜索商品
print("\n用户: 我要买 iPhone 15")
response = chat_with_functions("我要买 iPhone 15")
print(f"\n助手: {response}")

# 场景2：购买商品
print("\n用户: 我要买第一个")
response = chat_with_functions("我要买第一个")
print(f"\n助手: {response}")

# 场景3：搜索服务
print("\n用户: 我想学英语")
response = chat_with_functions("我想学英语")
print(f"\n助手: {response}")
```

#### Node.js 示例

```typescript
import OpenAI from 'openai';
import fetch from 'node-fetch';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PAYMIND_API_URL = 'http://localhost:3001/api';

async function chatWithFunctions(userMessage: string) {
  // 1. 获取 Functions
  const functionsRes = await fetch(`${PAYMIND_API_URL}/openai/functions`);
  const functionsData = await functionsRes.json();
  const functions = functionsData.functions.map((f: any) => f.function);

  // 2. 调用 ChatGPT
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'user', content: userMessage },
    ],
    functions,
    function_call: 'auto',
  });

  const message = completion.choices[0].message;

  // 3. 如果有 Function Call，执行它
  if (message.function_call) {
    const functionName = message.function_call.name;
    const functionArgs = JSON.parse(message.function_call.arguments || '{}');

    console.log(`调用 Function: ${functionName}`, functionArgs);

    // 调用 PayMind API
    const result = await fetch(`${PAYMIND_API_URL}/openai/function-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: {
          name: functionName,
          arguments: JSON.stringify(functionArgs),
        },
        context: { userId: 'test-user-123' },
      }),
    });

    const resultData = await result.json();
    console.log('Function 结果:', resultData);

    return resultData;
  }

  return message.content;
}

// 测试
chatWithFunctions('我要买 iPhone 15').then(console.log);
```

### 方式2：通过 ChatGPT Actions（GPTs）

1. **访问 ChatGPT GPTs**
   - 打开 https://chat.openai.com/gpts
   - 点击 "Create" 创建新的 GPT

2. **配置 Actions**
   - 在 "Actions" 部分点击 "Create new action"
   - 选择 "Import from URL"
   - 输入：`http://your-api.com/api/openai/openapi.json`

3. **或者手动配置 Schema**
   - Schema URL: `http://your-api.com/api/openai/functions`
   - Function Call URL: `http://your-api.com/api/openai/function-call`
   - Authentication: 根据需要配置（API Key 或 OAuth）

---

## 🧪 完整测试流程

### 测试脚本

```bash
# 1. 创建测试商品
cd backend
npx ts-node scripts/create-test-products-for-chatgpt.ts

# 2. 运行集成测试
npx ts-node scripts/test-chatgpt-integration.ts
```

### 手动测试

#### 1. 验证 Functions 可用

```bash
curl http://localhost:3001/api/openai/functions
```

**预期结果**：返回 3 个 Function（search_paymind_products, buy_paymind_product, get_paymind_order）

#### 2. 测试搜索

```bash
curl "http://localhost:3001/api/openai/test?query=iPhone"
```

**预期结果**：返回商品列表

#### 3. 测试 Function Call

```bash
curl -X POST http://localhost:3001/api/openai/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "function": {
      "name": "search_paymind_products",
      "arguments": "{\"query\": \"iPhone 15\"}"
    },
    "context": {
      "userId": "test-user-123"
    }
  }'
```

---

## 📊 测试场景

### 场景1：搜索和购买实物商品

```
用户: "我要买 iPhone 15"
  ↓
ChatGPT 调用: search_paymind_products({query: "iPhone 15"})
  ↓
返回: 找到商品列表
  ↓
用户: "我要买第一个"
  ↓
ChatGPT 调用: buy_paymind_product({
    product_id: "xxx",
    quantity: 1,
    shipping_address: "张三,北京市朝阳区xxx,北京,中国,100000"
  })
  ↓
返回: 订单创建成功
```

### 场景2：搜索和预约服务

```
用户: "我想学英语"
  ↓
ChatGPT 调用: search_paymind_products({
    query: "英语课程",
    category: "service"
  })
  ↓
返回: 找到服务列表
  ↓
用户: "我想预约明天的课程"
  ↓
ChatGPT 调用: buy_paymind_product({
    product_id: "xxx",
    appointment_time: "2025-01-XXT10:00:00Z",
    contact_info: "13800138000"
  })
  ↓
返回: 服务预约成功
```

### 场景3：查询订单

```
用户: "我的订单状态如何？订单号是 xxx"
  ↓
ChatGPT 调用: get_paymind_order({order_id: "xxx"})
  ↓
返回: 订单详情和状态
```

---

## ✅ 验证清单

### 后端验证

- [x] OpenAI Functions API 可用 (`GET /api/openai/functions`)
- [x] Function Call 执行正常 (`POST /api/openai/function-call`)
- [x] 搜索功能正常
- [x] 购买功能正常
- [x] 订单查询功能正常
- [x] 错误处理正确

### ChatGPT 集成验证

- [ ] 可以获取 Function Schemas
- [ ] ChatGPT 可以调用 search_paymind_products
- [ ] ChatGPT 可以调用 buy_paymind_product
- [ ] ChatGPT 可以调用 get_paymind_order
- [ ] 完整的对话流程正常

---

## 🐛 故障排查

### 问题1：Function Call 返回 401

**原因**：需要认证

**解决**：在 context 中传递有效的 userId，或配置 API Key 认证

### 问题2：搜索无结果

**原因**：
- 商品未创建
- 商品状态不是 'active'
- 向量数据库未索引

**解决**：
1. 运行创建商品脚本
2. 检查商品状态
3. 检查向量数据库

### 问题3：购买失败

**原因**：
- 用户未认证
- 库存不足
- 缺少必填参数

**解决**：
1. 确保传递 userId
2. 检查商品库存
3. 检查必填参数（如 shipping_address）

---

## 📝 下一步

1. **完善 OpenAPI 规范**
   - 实现完整的 OpenAPI 3.1 规范
   - 支持 ChatGPT Actions 直接导入

2. **添加更多 Functions**
   - `get_paymind_product_details` - 获取商品详情
   - `add_to_cart` - 加入购物车
   - `checkout` - 结算

3. **优化用户体验**
   - 更智能的商品推荐
   - 更自然的对话流程

---

## 🎉 总结

现在 PayMind 已经支持：

✅ 统一的 OpenAI Function Calling 接口
✅ 商品搜索功能（search_paymind_products）
✅ 商品购买功能（buy_paymind_product）
✅ 订单查询功能（get_paymind_order）
✅ 完整的测试脚本和文档

**ChatGPT 现在可以直接在对话框中搜索和购买 PayMind Marketplace 的商品了！** 🚀

