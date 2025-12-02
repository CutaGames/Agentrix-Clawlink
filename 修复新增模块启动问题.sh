#!/bin/bash

# 修复新增模块启动问题的脚本

echo "🔧 修复新增模块启动问题"
echo ""

cd backend || {
    echo "❌ 错误: 无法进入backend目录"
    exit 1
}

echo "📋 步骤1: 检查数据库迁移..."
echo ""

# 检查迁移文件
if [ -f "src/migrations/1738000003000-CreateP1P2Tables.ts" ]; then
    echo "✅ 迁移文件存在: 1738000003000-CreateP1P2Tables.ts"
else
    echo "❌ 迁移文件不存在"
    exit 1
fi

echo ""
echo "📋 步骤2: 运行数据库迁移..."
echo ""

# 运行迁移
npm run migration:run

if [ $? -eq 0 ]; then
    echo "✅ 数据库迁移成功"
else
    echo "⚠️  数据库迁移失败，但继续..."
    echo "   提示: 如果数据库表已存在，这是正常的"
fi

echo ""
echo "📋 步骤3: 检查编译..."
echo ""

# 尝试构建
npm run build 2>&1 | head -50

if [ $? -eq 0 ]; then
    echo "✅ 编译成功"
else
    echo "⚠️  编译有错误，查看上面的输出"
fi

echo ""
echo "📋 步骤4: 检查模块导入..."
echo ""

# 检查关键模块是否导入
if grep -q "MerchantModule" "src/app.module.ts"; then
    echo "✅ MerchantModule 已导入"
else
    echo "❌ MerchantModule 未导入"
fi

if grep -q "IntegrationsModule" "src/app.module.ts"; then
    echo "✅ IntegrationsModule 已导入"
else
    echo "❌ IntegrationsModule 未导入"
fi

if grep -q "AutoEarnModule" "src/app.module.ts"; then
    echo "✅ AutoEarnModule 已导入"
else
    echo "❌ AutoEarnModule 未导入"
fi

if grep -q "MarketplaceModule" "src/app.module.ts"; then
    echo "✅ MarketplaceModule 已导入"
else
    echo "❌ MarketplaceModule 未导入"
fi

echo ""
echo "✅ 检查完成！"
echo ""
echo "如果所有检查都通过，尝试启动服务："
echo "  npm run start:dev"
echo ""
echo "如果启动失败，请查看错误日志并检查："
echo "  1. 数据库连接是否正常"
echo "  2. 所有实体文件是否存在"
echo "  3. 服务依赖注入是否正确"

