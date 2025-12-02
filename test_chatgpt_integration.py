import openai
import json
import requests
import os
import sys

# 配置
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
PAYMIND_API_URL = "http://localhost:3001/api"  # 本地开发

if not OPENAI_API_KEY:
    print("❌ 错误: 请设置 OPENAI_API_KEY 环境变量")
    print("   例如: export OPENAI_API_KEY='sk-your-key'")
    sys.exit(1)

# 1. 获取 PayMind Functions
print("📡 获取 PayMind Functions...")
try:
    response = requests.get(f"{PAYMIND_API_URL}/openai/functions", timeout=5)
    response.raise_for_status()
    functions_data = response.json()
    functions = [f["function"] for f in functions_data["functions"]]
    print(f"✅ 找到 {len(functions)} 个 Functions:")
    for f in functions:
        print(f"   - {f['name']}")
except requests.exceptions.RequestException as e:
    print(f"❌ 无法连接到 PayMind API: {e}")
    print(f"   请确保后端服务运行在 {PAYMIND_API_URL}")
    sys.exit(1)

# 2. 初始化 OpenAI Client
try:
    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    print("✅ OpenAI Client 初始化成功")
except Exception as e:
    print(f"❌ OpenAI Client 初始化失败: {e}")
    sys.exit(1)

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
    try:
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
                    },
                    timeout=10
                )
                result.raise_for_status()
                result_data = result.json()
                
                print(f"✅ PayMind 返回结果:")
                if isinstance(result_data, dict):
                    # 格式化输出
                    if "message" in result_data:
                        print(f"   消息: {result_data['message']}")
                    if "data" in result_data:
                        print(f"   数据: {json.dumps(result_data['data'], indent=2, ensure_ascii=False)[:200]}...")
                    else:
                        print(f"   {json.dumps(result_data, indent=2, ensure_ascii=False)[:500]}")
                else:
                    print(f"   {str(result_data)[:500]}")
                
                # 将结果返回给 ChatGPT
                messages.append({
                    "role": "function",
                    "name": func_name,
                    "content": json.dumps(result_data, ensure_ascii=False)
                })
                
                # ChatGPT 继续处理结果
                response = client.chat.completions.create(
                    model="gpt-4",
                    messages=messages,
                    functions=functions
                )
                message = response.choices[0].message
                
            except requests.exceptions.RequestException as e:
                error_msg = f"调用 PayMind API 失败: {str(e)}"
                print(f"❌ {error_msg}")
                return error_msg
            except Exception as e:
                error_msg = f"处理 PayMind 响应时出错: {str(e)}"
                print(f"❌ {error_msg}")
                return error_msg
        
        # 添加助手回复到消息历史
        messages.append(message)
        
        return message.content if message.content else "无回复内容"
        
    except Exception as e:
        error_msg = f"调用 ChatGPT API 失败: {str(e)}"
        print(f"❌ {error_msg}")
        return error_msg

# 4. 测试对话
if __name__ == "__main__":
    print("=" * 60)
    print("🤖 PayMind ChatGPT 集成测试")
    print("=" * 60)
    
    # 测试场景1：搜索商品
    print("\n" + "=" * 60)
    print("测试场景1: 搜索商品")
    print("=" * 60)
    try:
        result1 = chat("我要买 iPhone 15")
        print(f"\n🤖 ChatGPT: {result1}")
    except Exception as e:
        print(f"❌ 测试失败: {e}")
    
    print("\n" + "=" * 60)
    print("✅ 测试完成")
    print("=" * 60)

