#!/usr/bin/env python3
"""
Gemini 电商流程集成测试脚本
测试 Gemini API 与 Agentrix 的集成
"""

import requests
import json
import sys
import os

AGENTRIX_API_URL = "http://localhost:3001/api"

def test_get_functions():
    """测试获取 Function Schemas"""
    print("=" * 60)
    print("测试 1: 获取 Gemini Function Schemas")
    print("=" * 60)
    
    try:
        response = requests.get(f"{AGENTRIX_API_URL}/gemini/functions", timeout=5)
        response.raise_for_status()
        data = response.json()
        
        functions = data.get("functions", [])
        print(f"✅ 成功获取 {len(functions)} 个 Functions:\n")
        
        for i, func in enumerate(functions, 1):
            print(f"{i}. {func.get('name', 'Unknown')}")
            print(f"   描述: {func.get('description', 'N/A')}")
            if 'parameters' in func:
                params = func['parameters'].get('properties', {})
                if params:
                    print(f"   参数: {', '.join(params.keys())}")
            print()
        
        return functions
        
    except requests.exceptions.RequestException as e:
        print(f"❌ 请求失败: {e}")
        return None
    except Exception as e:
        print(f"❌ 解析失败: {e}")
        return None

def test_search_products():
    """测试商品搜索 Function"""
    print("=" * 60)
    print("测试 2: 执行商品搜索 Function")
    print("=" * 60)
    
    try:
        response = requests.post(
            f"{AGENTRIX_API_URL}/gemini/function-call",
            json={
                "function": {
                    "name": "search_agentrix_products",
                    "arguments": {
                        "query": "iPhone"
                    }
                },
                "context": {
                    "userId": "test-user-123"
                }
            },
            timeout=10
        )
        response.raise_for_status()
        result = response.json()
        
        print("✅ 搜索成功!")
        print(f"\n响应数据:")
        print(json.dumps(result, indent=2, ensure_ascii=False)[:500])
        
        # 检查是否有商品数据
        if isinstance(result, dict):
            if "data" in result and "products" in result["data"]:
                products = result["data"]["products"]
                print(f"\n📦 找到 {len(products)} 个商品")
                if products:
                    print(f"\n第一个商品:")
                    print(f"  名称: {products[0].get('name', 'N/A')}")
                    print(f"  价格: {products[0].get('price', 'N/A')} {products[0].get('currency', 'CNY')}")
        
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"❌ 请求失败: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"   响应: {e.response.text[:200]}")
        return None
    except Exception as e:
        print(f"❌ 处理失败: {e}")
        return None

def test_quick_search():
    """测试快速搜索接口"""
    print("=" * 60)
    print("测试 3: 快速搜索接口")
    print("=" * 60)
    
    try:
        response = requests.get(
            f"{AGENTRIX_API_URL}/gemini/test",
            params={"query": "iPhone"},
            timeout=10
        )
        response.raise_for_status()
        result = response.json()
        
        print("✅ 快速搜索成功!")
        print(f"\n响应数据:")
        print(json.dumps(result, indent=2, ensure_ascii=False)[:500])
        
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"❌ 请求失败: {e}")
        return None
    except Exception as e:
        print(f"❌ 处理失败: {e}")
        return None

def test_chat():
    """测试对话接口"""
    print("=" * 60)
    print("测试 4: 对话接口（带 Function Calling）")
    print("=" * 60)
    
    try:
        response = requests.post(
            f"{AGENTRIX_API_URL}/gemini/chat",
            json={
                "messages": [
                    {
                        "role": "user",
                        "content": "我要买 iPhone 15"
                    }
                ],
                "context": {
                    "sessionId": "test-session-123"
                }
            },
            timeout=30
        )
        response.raise_for_status()
        result = response.json()
        
        print("✅ 对话成功!")
        print(f"\n响应数据:")
        print(json.dumps(result, indent=2, ensure_ascii=False)[:500])
        
        if "functionCalls" in result and result["functionCalls"]:
            print(f"\n🤖 Gemini 调用了 {len(result['functionCalls'])} 个 Functions:")
            for call in result["functionCalls"]:
                print(f"   - {call.get('name')}")
        
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"❌ 请求失败: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"   响应: {e.response.text[:200]}")
        return None
    except Exception as e:
        print(f"❌ 处理失败: {e}")
        return None

def main():
    print("=" * 60)
    print("🤖 Gemini 电商流程集成测试")
    print("=" * 60)
    print()
    
    # 检查 API 是否可用
    print("🔍 检查 Agentrix API 连接...")
    try:
        response = requests.get(f"{AGENTRIX_API_URL}/gemini/functions", timeout=5)
        if response.status_code == 200:
            print("✅ Agentrix API 可用\n")
        else:
            print(f"⚠️  API 返回状态码: {response.status_code}\n")
    except Exception as e:
        print(f"❌ 无法连接到 Agentrix API: {e}")
        print(f"   请确保后端服务运行在 {AGENTRIX_API_URL}")
        sys.exit(1)
    
    # 运行测试
    functions = test_get_functions()
    print()
    
    if functions:
        test_search_products()
        print()
    
    test_quick_search()
    print()
    
    # 注意：chat 测试需要 GEMINI_API_KEY，如果未配置会失败
    print("⚠️  对话测试需要后端配置 GEMINI_API_KEY")
    print("   如果未配置，此测试可能会失败\n")
    test_chat()
    print()
    
    print("=" * 60)
    print("✅ 测试完成!")
    print("=" * 60)
    print()
    print("📝 说明:")
    print("   这些测试只验证 Agentrix API 是否正常工作")
    print("   对话测试需要后端配置 GEMINI_API_KEY")
    print()
    print("🚀 下一步:")
    print("   1. 在 backend/.env 中配置 GEMINI_API_KEY")
    print("   2. 重启后端服务")
    print("   3. 在 Gemini Studio 中测试 Function Calling")

if __name__ == "__main__":
    main()

