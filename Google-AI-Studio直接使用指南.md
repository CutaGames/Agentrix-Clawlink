# Google AI Studio 直接使用指南

## 🎯 目标

**让用户可以在 Google AI Studio 中直接输入自然语言（如"我要买 iPhone 15"），无需任何代码！**

## ✅ 已完成的工作

1. ✅ **API 端点已实现**
   - `GET /api/gemini/functions` - 返回 26 个 Functions
   - `POST /api/gemini/function-call` - 执行 Function Call
   - `POST /api/gemini/chat` - 完整对话接口（自动处理 Function Calling）

2. ✅ **HTTPS 已配置**
   - API 地址：`https://api.agentrix.top/api`
   - 可以正常访问

3. ✅ **Functions 已就绪**
   - 26 个 Functions 包括：电商、空投、交易、策略等

## ⚠️ 关键问题

**Google AI Studio 的限制：**

根据 Google AI Studio 的当前功能，它**不支持直接配置外部 Function Execution URL**。这意味着：

- ✅ 可以在 AI Studio 中配置 Function Schemas（定义）
- ❌ 但无法自动执行外部 API 的 Functions

## 🚀 解决方案

### 方案 A：使用我们的对话接口（推荐，最简单）

**用户不需要在 AI Studio 中配置任何东西！**

用户只需要：
1. 访问我们的网站或使用我们的 API
2. 直接输入自然语言
3. 系统自动处理所有 Function Calling

**使用方式：**

```bash
curl -X POST https://api.agentrix.top/api/gemini/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "我要买 iPhone 15"}
    ],
    "geminiApiKey": "用户的-Gemini-API-Key",
    "context": {
      "sessionId": "user-session-123"
    }
  }'
```

**优点：**
- ✅ 无需配置 AI Studio
- ✅ 自动处理所有 Function Calling
- ✅ 完整的会话管理
- ✅ 支持用户自己的 Gemini API Key

### 方案 B：在 AI Studio 中手动配置（需要用户操作）

如果用户想在 AI Studio 中直接使用，需要：

#### Step 1: 获取 Function Schemas

访问：`https://api.agentrix.top/api/gemini/functions`

复制返回的 JSON 数据。

#### Step 2: 在 AI Studio 中配置 Functions

1. 打开 [Google AI Studio](https://aistudio.google.com/)
2. 创建新的 Prompt
3. 在代码编辑器中，手动添加 Functions：

```python
import google.generativeai as genai
import requests
import json

# 配置你的 Gemini API Key
genai.configure(api_key="YOUR_GEMINI_API_KEY")

# 获取 Function Schemas
response = requests.get("https://api.agentrix.top/api/gemini/functions")
functions_data = response.json()
functions = functions_data["functions"]

# 创建模型并配置 Functions
model = genai.GenerativeModel(
    model_name="gemini-3-pro",
    tools=[{
        "function_declarations": functions
    }]
)

# 开始对话
chat = model.start_chat(history=[])

# 发送消息
response = chat.send_message("我要买 iPhone 15")

# 处理 Function Calls
if response.function_calls:
    for call in response.function_calls:
        # 调用 Agentrix API
        result = requests.post(
            "https://api.agentrix.top/api/gemini/function-call",
            json={
                "function": {
                    "name": call.name,
                    "arguments": call.args
                },
                "context": {"sessionId": "user-session-123"}
            }
        )
        
        # 将结果发送回 Gemini
        response = chat.send_message(result.json())
        
print(response.text)
```

#### Step 3: 在 AI Studio 中运行

在 AI Studio 的代码编辑器中运行上述代码，然后就可以直接输入自然语言了。

## 📋 还需要完成的工作

### 1. 创建用户友好的前端界面（可选但推荐）

创建一个简单的 Web 界面，让用户：
- 输入他们的 Gemini API Key
- 直接输入自然语言
- 查看对话结果

**实现位置：** `frontend/app/gemini-chat/page.tsx` 或类似

### 2. 创建 AI Studio 代码模板

创建一个可以直接在 AI Studio 中使用的代码模板：

**文件：** `gemini-ai-studio-template.py`

```python
import google.generativeai as genai
import requests
import json

# ===== 配置 =====
GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE"  # 用户填入
AGENTRIX_API_URL = "https://api.agentrix.top/api"
SESSION_ID = "user-session-123"  # 可以自动生成

# ===== 初始化 =====
genai.configure(api_key=GEMINI_API_KEY)

# 获取 Function Schemas
print("📥 获取 Functions...")
response = requests.get(f"{AGENTRIX_API_URL}/gemini/functions")
functions_data = response.json()
functions = functions_data["functions"]
print(f"✅ 已加载 {len(functions)} 个 Functions")

# 创建模型
model = genai.GenerativeModel(
    model_name="gemini-3-pro",
    tools=[{
        "function_declarations": functions
    }]
)

# ===== 对话函数 =====
def chat(user_message):
    """与 Gemini 对话，自动处理 Function Calls"""
    chat_session = model.start_chat(history=[])
    
    response = chat_session.send_message(user_message)
    
    # 处理 Function Calls
    while response.function_calls:
        print(f"\n🔧 检测到 {len(response.function_calls)} 个 Function Calls")
        
        for call in response.function_calls:
            print(f"  调用: {call.name}")
            print(f"  参数: {json.dumps(call.args, indent=2, ensure_ascii=False)}")
            
            # 调用 Agentrix API
            try:
                result = requests.post(
                    f"{AGENTRIX_API_URL}/gemini/function-call",
                    json={
                        "function": {
                            "name": call.name,
                            "arguments": call.args
                        },
                        "context": {"sessionId": SESSION_ID}
                    },
                    timeout=10
                )
                result.raise_for_status()
                function_result = result.json()
                
                print(f"  ✅ 执行成功")
                
                # 将结果发送回 Gemini
                response = chat_session.send_message(function_result)
                
            except Exception as e:
                print(f"  ❌ 执行失败: {e}")
                response = chat_session.send_message({
                    "success": False,
                    "error": str(e)
                })
    
    return response.text

# ===== 使用示例 =====
if __name__ == "__main__":
    print("=" * 60)
    print("🤖 Agentrix Gemini 对话助手")
    print("=" * 60)
    print()
    
    # 示例对话
    user_input = input("请输入您的问题: ")
    result = chat(user_input)
    print(f"\n💬 Gemini 回复:\n{result}")
```

### 3. 创建 Web 界面（推荐）

创建一个简单的聊天界面，让用户可以直接使用：

**功能：**
- 输入 Gemini API Key（可选，如果后端已配置）
- 输入自然语言
- 显示对话历史
- 自动处理 Function Calls

### 4. 更新文档

更新 `Gemini-Studio集成指南.md`，添加：
- AI Studio 代码模板
- Web 界面使用说明
- 常见问题解答

## 🧪 测试清单

- [ ] 测试 `/api/gemini/chat` 接口
- [ ] 测试 Function Call 自动执行
- [ ] 创建 AI Studio 代码模板
- [ ] 测试在 AI Studio 中运行代码模板
- [ ] 创建 Web 界面（可选）
- [ ] 更新用户文档

## 🎯 推荐实施顺序

1. **立即可以做的：** 使用 `/api/gemini/chat` 接口（已实现）
2. **下一步：** 创建 AI Studio 代码模板
3. **可选：** 创建 Web 界面
4. **最后：** 更新文档

## 📝 总结

**当前状态：**
- ✅ 后端 API 已完全实现
- ✅ Functions 已就绪
- ✅ HTTPS 已配置

**还需要：**
- ⚠️ 创建 AI Studio 代码模板（让用户可以直接复制使用）
- ⚠️ 创建用户使用指南
- ⚠️ （可选）创建 Web 界面

**关键点：**
Google AI Studio 本身不支持直接配置外部 Function Execution URL，所以需要：
- 要么使用我们的 `/api/gemini/chat` 接口（最简单）
- 要么在 AI Studio 中使用代码模板（需要用户复制代码）

