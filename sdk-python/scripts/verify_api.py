#!/usr/bin/env python3
"""
API Verification Script

This script verifies that the SDK can successfully connect to the backend API
and perform basic operations.
"""

import os
import sys
from agentrix import Agentrix


def verify_api():
    api_key = os.getenv("AGENTRIX_API_KEY", "test-api-key")
    api_url = os.getenv("AGENTRIX_API_URL", "http://localhost:3001/api")

    print("🔍 Agentrix SDK API 验证")
    print("=" * 24)
    print(f"API URL: {api_url}")
    print(f"API Key: {api_key[:10]}...")
    print()

    agentrix = Agentrix(api_key=api_key, base_url=api_url)

    results = {"passed": 0, "failed": 0, "errors": []}

    # Test 1: Get Payment Routing
    print("📋 Test 1: 获取支付路由建议...")
    try:
        routing = agentrix.payments.get_routing(
            amount=100, currency="USD", user_country="US", merchant_country="CN"
        )
        print("✅ 成功")
        print(f"   推荐方式: {routing['recommendedMethod']}")
        print(f"   原因: {routing['reason']}")
        results["passed"] += 1
    except Exception as e:
        print("❌ 失败")
        print(f"   错误: {str(e)}")
        results["failed"] += 1
        results["errors"].append(f"路由测试: {str(e)}")
    print()

    # Test 2: Create Payment Intent
    print("📋 Test 2: 创建支付意图...")
    try:
        intent = agentrix.payments.create_intent(
            {"amount": 100, "currency": "USD", "paymentMethod": "stripe"}
        )
        print("✅ 成功")
        print(f"   Payment Intent ID: {intent['paymentIntentId']}")
        results["passed"] += 1
    except Exception as e:
        print("❌ 失败")
        print(f"   错误: {str(e)}")
        results["failed"] += 1
        results["errors"].append(f"支付意图测试: {str(e)}")
    print()

    # Test 3: Get X402 Authorization
    print("📋 Test 3: 查询X402授权状态...")
    try:
        auth = agentrix.agents.get_auto_pay_grant()
        print("✅ 成功")
        if auth:
            print(f"   授权ID: {auth['id']}")
            print(f"   状态: {'激活' if auth['isActive'] else '未激活'}")
        else:
            print("   无授权记录")
        results["passed"] += 1
    except Exception as e:
        print("❌ 失败")
        print(f"   错误: {str(e)}")
        results["failed"] += 1
        results["errors"].append(f"X402授权测试: {str(e)}")
    print()

    # Test 4: List Products
    print("📋 Test 4: 查询商品列表...")
    try:
        products = agentrix.merchants.list_products(page=1, limit=10)
        print("✅ 成功")
        print(f"   商品数量: {len(products.get('data', []))}")
        results["passed"] += 1
    except Exception as e:
        print("❌ 失败")
        print(f"   错误: {str(e)}")
        results["failed"] += 1
        results["errors"].append(f"商品列表测试: {str(e)}")
    print()

    # Summary
    print("📊 测试结果汇总")
    print("=" * 16)
    print(f"✅ 通过: {results['passed']}")
    print(f"❌ 失败: {results['failed']}")
    total = results["passed"] + results["failed"]
    if total > 0:
        success_rate = (results["passed"] / total) * 100
        print(f"📈 成功率: {success_rate:.1f}%")
    print()

    if results["errors"]:
        print("⚠️  错误详情:")
        for i, error in enumerate(results["errors"], 1):
            print(f"   {i}. {error}")

    if results["failed"] == 0:
        print("🎉 所有测试通过！SDK可以正常使用。")
        sys.exit(0)
    else:
        print("⚠️  部分测试失败，请检查后端API是否正常运行。")
        sys.exit(1)


if __name__ == "__main__":
    try:
        verify_api()
    except Exception as e:
        print(f"❌ 验证过程出错: {e}")
        sys.exit(1)

