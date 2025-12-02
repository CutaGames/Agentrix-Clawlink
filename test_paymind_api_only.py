#!/usr/bin/env python3
"""
Agentrix API 测试脚本（不需要 OpenAI API Key）
只测试 Agentrix 的 Function Schemas 和 Function Call 接口
"""

import requests
import json
import sys

AGENTRIX_API_URL = "http://localhost:3001/api"

def test_get_functions():
    """测试获取 Function Schemas"""
    print("=" * 60)
    print("测试 1: 获取 Function Schemas")
    print("=" * 60)
    
    try:
        response = requests.get(f"{AGENTRIX_API_URL}/openai/functions", timeout=5)
        response.raise_for_status()
        data = response.json()
        
        functions = data.get("functions", [])
        print(f"✅ 成功获取 {len(functions)} 个 Functions:\n")
        
        for i, func_data in enumerate(functions, 1):
            func = func_data.get("function", {})
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
        # 调用 search_agentrix_products
        response = requests.post(
            f"{AGENTRIX_API_URL}/openai/function-call",
            json={
                "function": {
                    "name": "search_agentrix_products",
                    "arguments": json.dumps({
                        "query": "iPhone"
                    })
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
            f"{AGENTRIX_API_URL}/openai/test",
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

def test_openapi_schema():
    """测试 OpenAPI Schema"""
    print("=" * 60)
    print("测试 4: OpenAPI Schema")
    print("=" * 60)
    
    try:
        response = requests.get(f"{AGENTRIX_API_URL}/openai/openapi.json", timeout=5)
        response.raise_for_status()
        schema = response.json()
        
        print("✅ OpenAPI Schema 可用!")
        print(f"\n基本信息:")
        print(f"  标题: {schema.get('info', {}).get('title', 'N/A')}")
        print(f"  版本: {schema.get('info', {}).get('version', 'N/A')}")
        print(f"  路径数量: {len(schema.get('paths', {}))}")
        
        return schema
        
    except requests.exceptions.RequestException as e:
        print(f"❌ 请求失败: {e}")
        return None
    except Exception as e:
        print(f"❌ 处理失败: {e}")
        return None

def main():
    print("=" * 60)
    print("🤖 Agentrix API 测试（不需要 OpenAI API Key）")
    print("=" * 60)
    print()
    
    # 检查 API 是否可用
    print("🔍 检查 Agentrix API 连接...")
    try:
        response = requests.get(f"{AGENTRIX_API_URL}/openai/functions", timeout=5)
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
    
    test_openapi_schema()
    print()
    
    print("=" * 60)
    print("✅ 测试完成!")
    print("=" * 60)
    print()
    print("📝 说明:")
    print("   这些测试只验证 Agentrix API 是否正常工作")
    print("   不需要 OpenAI API Key")
    print()
    print("🚀 下一步:")
    print("   1. 如果测试通过，说明 Agentrix API 正常")
    print("   2. 可以在 ChatGPT 中配置 Actions（需要 OpenAI API Key，但由 ChatGPT 用户自己提供）")
    print("   3. 或者使用 Python 脚本完整测试（需要 OpenAI API Key）")

if __name__ == "__main__":
    main()

