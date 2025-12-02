# PayMind 接入 ChatGPT 生态 - 完整步骤

## 📋 前置条件

### 1. 确认后端服务运行
```bash
cd backend
npm run start:dev
```

确保服务运行在 `http://localhost:3001`

### 2. 验证 API 端点可用

```bash
# 检查 Functions 端点
curl http://localhost:3001/api/openai/functions

# 应该返回 JSON，包含 functions 数组
```

---

## 🚀 方式一：测试 PayMind API（不需要 OpenAI API Key，推荐先测试）

### 为什么需要 OpenAI API Key？

**重要说明**：
- `test_chatgpt_integration.py` 需要 OpenAI API Key 是因为它**模拟 ChatGPT 的行为**
- 它调用真实的 ChatGPT API 来测试 ChatGPT 如何调用 PayMind Functions
- **这只是测试脚本，不是必需的**

**实际上**：
- PayMind API 本身**不需要 OpenAI API Key**
- 如果只想验证 PayMind API 是否正常工作，可以使用 `test_paymind_api_only.py`（不需要 OpenAI API Key）

### 方案A：只测试 PayMind API（不需要 OpenAI API Key）✅ 推荐

运行 `test_paymind_api_only.py`：

```bash
python3 test_paymind_api_only.py
```

这个脚本会测试：
- ✅ 获取 Function Schemas
- ✅ 执行 Function Call（商品搜索）
- ✅ 快速搜索接口
- ✅ OpenAPI Schema

**完全不需要 OpenAI API Key！**

---

## 🚀 方式二：完整测试（需要 OpenAI API Key，模拟 ChatGPT 行为）

### Step 1: 创建测试脚本

创建文件 `test_chatgpt_integration.py`：

```python
import openai
import json
import requests
import os

# 配置
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "your-openai-api-key")
PAYMIND_API_URL = "http://localhost:3001/api"  # 本地开发
# PAYMIND_API_URL = "https://your-api.com/api"  # 生产环境

# 1. 获取 PayMind Functions
print("📡 获取 PayMind Functions...")
response = requests.get(f"{PAYMIND_API_URL}/openai/functions")
functions_data = response.json()
functions = [f["function"] for f in functions_data["functions"]]
print(f"✅ 找到 {len(functions)} 个 Functions:")
for f in functions:
    print(f"   - {f['name']}")

# 2. 初始化 OpenAI Client
client = openai.OpenAI(api_key=OPENAI_API_KEY)

# 3. 对话消息历史
messages = [
    {
        "role": "system", 
        "content": "你是 PayMind 购物助手，可以帮助用户搜索和购买商品。当用户想要搜索或购买商品时，使用 PayMind 的 Functions。"
    }
]

def chat(user_message):
    """与 ChatGPT 对话，自动处理 Function Calls"""
    global messages
    
    # 添加用户消息
    messages.append({"role": "user", "content": user_message})
    print(f"\n👤 用户: {user_message}")
    
    # 调用 ChatGPT
    response = client.chat.completions.create(
        model="gpt-4",  # 或 "gpt-4-turbo-preview"
        messages=messages,
        functions=functions,
        function_call="auto"
    )
    
    message = response.choices[0].message
    
    # 处理 Function Call
    if message.function_call:
        func_name = message.function_call.name
        func_args = json.loads(message.function_call.arguments)
        
        print(f"\n🤖 ChatGPT 调用 Function: {func_name}")
        print(f"   参数: {json.dumps(func_args, indent=2, ensure_ascii=False)}")
        
        # 调用 PayMind API
        try:
            result = requests.post(
                f"{PAYMIND_API_URL}/openai/function-call",
                json={
                    "function": {
                        "name": func_name,
                        "arguments": json.dumps(func_args)
                    },
                    "context": {
                        "userId": "test-user-123"  # 测试用户ID
                    }
                }
            ).json()
            
            print(f"✅ PayMind 返回结果:")
            print(f"   {json.dumps(result, indent=2, ensure_ascii=False)}")
            
            # 将结果返回给 ChatGPT
            messages.append({
                "role": "function",
                "name": func_name,
                "content": json.dumps(result, ensure_ascii=False)
            })
            
            # ChatGPT 继续处理结果
            response = client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                functions=functions
            )
            message = response.choices[0].message
            
        except Exception as e:
            print(f"❌ 调用 PayMind API 失败: {e}")
            return f"抱歉，调用 PayMind 服务时出错: {str(e)}"
    
    # 添加助手回复到消息历史
    messages.append(message)
    
    return message.content

# 4. 测试对话
if __name__ == "__main__":
    print("=" * 60)
    print("🤖 PayMind ChatGPT 集成测试")
    print("=" * 60)
    
    # 测试场景1：搜索商品
    print("\n" + "=" * 60)
    print("测试场景1: 搜索商品")
    print("=" * 60)
    result1 = chat("我要买 iPhone 15")
    print(f"\n🤖 ChatGPT: {result1}")
    
    # 测试场景2：购买商品
    # print("\n" + "=" * 60)
    # print("测试场景2: 购买商品")
    # print("=" * 60)
    # result2 = chat("我要买第一个商品")
    # print(f"\n🤖 ChatGPT: {result2}")
    
    # 测试场景3：查询订单
    # print("\n" + "=" * 60)
    # print("测试场景3: 查询订单")
    # print("=" * 60)
    # result3 = chat("查看我的订单")
    # print(f"\n🤖 ChatGPT: {result3}")
```

### Step 2: 安装依赖

```bash
pip install openai requests
```

### Step 3: 设置环境变量

```bash
export OPENAI_API_KEY="sk-your-openai-api-key"
```

### Step 4: 运行测试

```bash
python test_chatgpt_integration.py
```

---

## 🌐 方式二：通过 ChatGPT Actions（GPTs）（生产环境）

### Step 1: 准备公网可访问的 API

#### 选项A：使用 ngrok（开发测试）

```bash
# 安装 ngrok
# Windows: 下载 https://ngrok.com/download
# Linux/Mac: brew install ngrok 或下载

# 启动 ngrok 隧道
ngrok http 3001

# 会得到一个公网地址，例如：https://abc123.ngrok.io
```

#### 选项B：部署到服务器（生产环境）

- 部署后端服务到服务器
- 配置域名和 SSL 证书
- 确保 API 可以通过 HTTPS 访问

### Step 2: 创建 GPT

1. 访问 https://chat.openai.com/gpts
2. 点击 **"Create"** 创建新的 GPT
3. 填写基本信息：
   - **Name**: PayMind Shopping Assistant
   - **Description**: AI shopping assistant powered by PayMind marketplace
   - **Instructions**: 
     ```
     你是 PayMind 购物助手，可以帮助用户搜索和购买商品。
     当用户想要搜索或购买商品时，使用 PayMind 的 Functions。
     ```

### Step 3: 配置 Actions

#### 选项A：使用 OpenAPI Schema（推荐）

1. 在 GPT 编辑页面，点击 **"Actions"** 标签
2. 点击 **"Create new action"**
3. 选择 **"Import from URL"**
4. 输入 OpenAPI Schema URL：
   ```
   https://your-api.com/api/openai/openapi.json
   ```
   或使用 ngrok 地址：
   ```
   https://abc123.ngrok.io/api/openai/openapi.json
   ```
5. 系统会自动导入所有 Functions

#### 选项B：手动配置

如果 OpenAPI Schema 不可用，可以手动配置：

1. 在 Actions 页面，选择 **"Manual"**
2. 配置以下信息：

**Schema URL**:
```
https://your-api.com/api/openai/functions
```

**Function Call URL**:
```
https://your-api.com/api/openai/function-call
```

**Authentication** (可选):
- 如果 API 需要认证，选择认证方式（API Key、OAuth 等）
- 配置相应的认证信息

### Step 4: 测试 GPT

1. 保存 GPT 配置
2. 在 ChatGPT 对话框中测试：
   - "我要买 iPhone 15"
   - "帮我找耳机"
   - "比价一下手机"
   - "查看我的订单"

ChatGPT 应该会自动调用 PayMind Functions 并返回结果。

---

## ✅ 验证步骤

### 1. 检查 Functions 是否可用

```bash
curl http://localhost:3001/api/openai/functions | jq '.count'
# 应该返回 Function 数量（应该 >= 7）
```

### 2. 测试搜索功能

```bash
curl "http://localhost:3001/api/openai/test?query=iPhone" | jq '.total'
# 应该返回商品数量
```

### 3. 测试 Function Call

```bash
curl -X POST http://localhost:3001/api/openai/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "function": {
      "name": "search_paymind_products",
      "arguments": "{\"query\": \"iPhone\"}"
    },
    "context": {
      "userId": "test-user-123"
    }
  }' | jq
```

---

## 📚 可用的 Functions

根据文档，以下 Functions 已实现：

1. **search_paymind_products** - 搜索商品
2. **compare_paymind_prices** - 比价服务
3. **add_to_paymind_cart** - 加入购物车
4. **view_paymind_cart** - 查看购物车
5. **checkout_paymind_cart** - 结算购物车
6. **buy_paymind_product** - 购买商品
7. **get_paymind_order** - 查询订单
8. **pay_paymind_order** - 支付订单
9. **track_paymind_logistics** - 物流查询

---

## 🔧 故障排查

### 问题1: Functions 端点返回 404

**解决**：
- 确认后端服务正在运行
- 检查路由配置：`backend/src/modules/ai-integration/openai/openai-integration.module.ts`

### 问题2: ChatGPT 不调用 Functions

**解决**：
- 检查 Function Schema 是否正确
- 确认系统提示词中提到了使用 Functions
- 尝试更明确的用户指令，如"使用 PayMind 搜索 iPhone"

### 问题3: Function Call 返回错误

**解决**：
- 检查后端日志
- 确认参数格式正确
- 验证数据库中有测试商品数据

---

## 🎯 下一步

1. ✅ 完成基础集成测试
2. 🔄 创建测试商品数据
3. 🔄 测试完整购物流程
4. 🔄 配置生产环境
5. 🔄 优化 Function Schemas
6. 🔄 添加更多功能

---

## 📝 相关文档

- `PayMind-ChatGPT快速开始.md` - 快速开始指南
- `PayMind-ChatGPT使用说明.md` - 详细使用说明
- `PayMind-ChatGPT集成测试指南.md` - 测试指南
- `PayMind-ChatGPT集成实施完成报告.md` - 实施报告

