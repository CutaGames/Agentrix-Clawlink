#!/bin/bash

# PayMind V3.0 功能测试脚本

echo "=========================================="
echo "🧪 PayMind V3.0 功能测试"
echo "=========================================="
echo ""

cd backend

echo "📋 检查测试环境..."
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📥 安装依赖..."
    npm install
fi

# 运行测试
echo "🚀 运行V3.0功能测试..."
echo ""

npm test -- v3-features.test.ts

echo ""
echo "✅ 测试完成！"
echo ""
echo "📊 测试结果："
echo "   • Agent功能测试"
echo "   • Marketplace功能测试"
echo "   • 支付系统测试"
echo "   • 汇率换算测试"
echo "   • 多链钱包测试"
echo ""

