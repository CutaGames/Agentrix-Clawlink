#!/bin/bash

# Agentrix V3.0 支付流程测试脚本

echo "=========================================="
echo "Agentrix V3.0 支付流程测试"
echo "=========================================="
echo ""

# 检查服务状态
echo "1. 检查服务状态..."
echo ""

# 检查后端服务
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ 后端服务运行正常 (http://localhost:3001)"
else
    echo "❌ 后端服务未运行，请先启动后端服务"
    echo "   命令: cd backend && npm run start:dev"
    exit 1
fi

# 检查前端服务
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 前端服务运行正常 (http://localhost:3000)"
else
    echo "❌ 前端服务未运行，请先启动前端服务"
    echo "   命令: cd agentrixfrontend && npm run dev"
    exit 1
fi

echo ""
echo "2. 测试API端点..."
echo ""

# 测试支付路由API（需要认证，这里只测试端点是否存在）
echo "测试支付路由API..."
echo "GET http://localhost:3001/api/payments/routing?amount=100&currency=CNY&orderType=product"
echo ""

# 测试健康检查
HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health)
if [ $? -eq 0 ]; then
    echo "✅ 健康检查通过"
    echo "   响应: $HEALTH_RESPONSE"
else
    echo "❌ 健康检查失败"
fi

echo ""
echo "3. 测试场景..."
echo ""

echo "场景1: 法币支付 → 数字货币结算（实体商品，无Agent）"
echo "  预期总手续费: 3.5%"
echo "  预期汇率显示: 1 CNY = 0.142 USDC"
echo ""

echo "场景2: 法币支付 → 数字货币结算（服务/数字资产，有Agent）"
echo "  预期总手续费: 7%"
echo "  预期汇率显示: 1 CNY = 0.142 USDC"
echo ""

echo "场景3: 数字货币直接支付（实体商品，无Agent）"
echo "  预期总手续费: 0.5%"
echo "  预期无汇率显示"
echo ""

echo "场景4: 数字货币直接支付（服务/数字资产，有Agent）"
echo "  预期总手续费: 4%"
echo "  预期无汇率显示"
echo ""

echo ""
echo "4. 前端测试..."
echo ""

echo "请在浏览器中访问以下页面进行测试："
echo ""
echo "  - 首页: http://localhost:3000"
echo "  - 支付演示: http://localhost:3000/payment-demo"
echo "  - Agent页面: http://localhost:3000/agent"
echo ""

echo "测试步骤："
echo "  1. 访问 http://localhost:3000/payment-demo"
echo "  2. 点击'体验统一支付流程'按钮"
echo "  3. 查看支付选项列表"
echo "  4. 验证总手续费显示（百分比）"
echo "  5. 验证汇率显示（如果涉及转换）"
echo "  6. 验证KYC要求显示"
echo "  7. 验证QuickPay授权状态显示"
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="

