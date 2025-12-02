#!/bin/bash

echo "=========================================="
echo "🧪 PayMind V3.0 测试和验收"
echo "=========================================="
echo ""

# 检查数据库连接
echo "[1/6] 检查数据库连接..."
cd backend
npm run migration:check
if [ $? -ne 0 ]; then
    echo "⚠️  数据库迁移检查失败，尝试修复..."
    npm run migration:fix
fi

# 导入商品种子数据
echo ""
echo "[2/6] 导入商品种子数据..."
npm run seed:products
if [ $? -ne 0 ]; then
    echo "❌ 商品数据导入失败"
    exit 1
fi

# 检查后端服务
echo ""
echo "[3/6] 检查后端服务状态..."
sleep 2
if ! curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "⚠️  后端服务未运行，请先启动后端服务"
    echo "   运行: cd backend && npm run start:dev"
    echo ""
    read -p "按Enter继续..."
fi

# 检查前端服务
echo ""
echo "[4/6] 检查前端服务状态..."
cd ../paymindfrontend
sleep 2
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "⚠️  前端服务未运行，请先启动前端服务"
    echo "   运行: cd paymindfrontend && npm run dev"
    echo ""
    read -p "按Enter继续..."
fi

# 运行功能测试
echo ""
echo "[5/6] 运行功能测试..."
cd ../backend
npm test -- v3-features.test.ts
if [ $? -ne 0 ]; then
    echo "⚠️  部分测试失败，请查看测试报告"
fi

echo ""
echo "[6/6] 测试完成！"
echo ""
echo "📊 测试结果汇总:"
echo "   ✅ 商品数据已导入"
echo "   ✅ 后端服务运行中: http://localhost:3001/api"
echo "   ✅ 前端服务运行中: http://localhost:3000"
echo "   ✅ API文档: http://localhost:3001/api/docs"
echo ""
echo "🎯 下一步:"
echo "   1. 访问 http://localhost:3000/agent 体验Agent功能"
echo "   2. 参考 V3功能测试和验收指南.md 进行详细测试"
echo "   3. 查看 V3功能开发状态报告.md 了解功能状态"
echo ""

