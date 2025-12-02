#!/bin/bash

# PayMind 前端组件完整性验证脚本

echo "🔍 开始验证前端组件完整性..."
echo ""

# 检查目录
FRONTEND_DIR="paymindfrontend"
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ 错误: 找不到 $FRONTEND_DIR 目录"
    exit 1
fi

cd "$FRONTEND_DIR"

echo "📁 检查组件文件..."
echo ""

# 检查组件文件
COMPONENTS=(
    "components/marketplace/AgentMarketplacePanel.tsx"
    "components/auto-earn/ArbitragePanel.tsx"
    "components/auto-earn/LaunchpadPanel.tsx"
    "components/auto-earn/StrategyPanel.tsx"
    "components/merchant/MerchantAutomationPanel.tsx"
)

for component in "${COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        echo "✅ $component"
    else
        echo "❌ 缺失: $component"
    fi
done

echo ""
echo "📁 检查API客户端文件..."
echo ""

# 检查API文件
API_FILES=(
    "lib/api/agent-marketplace.api.ts"
    "lib/api/auto-earn-advanced.api.ts"
    "lib/api/merchant.api.ts"
)

for api_file in "${API_FILES[@]}"; do
    if [ -f "$api_file" ]; then
        echo "✅ $api_file"
    else
        echo "❌ 缺失: $api_file"
    fi
done

echo ""
echo "📁 检查页面文件中的导入..."
echo ""

# 检查导入
if grep -q "AgentMarketplacePanel" "pages/marketplace.tsx" 2>/dev/null; then
    echo "✅ marketplace.tsx 已导入 AgentMarketplacePanel"
else
    echo "❌ marketplace.tsx 未导入 AgentMarketplacePanel"
fi

if grep -q "ArbitragePanel\|LaunchpadPanel\|StrategyPanel" "components/agent/AutoEarnPanel.tsx" 2>/dev/null; then
    echo "✅ AutoEarnPanel.tsx 已导入高级组件"
else
    echo "❌ AutoEarnPanel.tsx 未导入高级组件"
fi

if grep -q "MerchantAutomationPanel" "pages/app/merchant/index.tsx" 2>/dev/null; then
    echo "✅ merchant/index.tsx 已导入 MerchantAutomationPanel"
else
    echo "❌ merchant/index.tsx 未导入 MerchantAutomationPanel"
fi

echo ""
echo "📦 检查依赖..."
echo ""

# 检查package.json
if [ -f "package.json" ]; then
    echo "✅ package.json 存在"
    
    # 检查关键依赖
    if grep -q "\"react\"" "package.json"; then
        echo "✅ React 依赖存在"
    else
        echo "❌ React 依赖缺失"
    fi
    
    if grep -q "\"next\"" "package.json"; then
        echo "✅ Next.js 依赖存在"
    else
        echo "❌ Next.js 依赖缺失"
    fi
else
    echo "❌ package.json 不存在"
fi

echo ""
echo "🔍 检查TypeScript配置..."
echo ""

if [ -f "tsconfig.json" ]; then
    echo "✅ tsconfig.json 存在"
else
    echo "❌ tsconfig.json 不存在"
fi

echo ""
echo "✅ 验证完成！"
echo ""
echo "如果发现任何 ❌ 错误，请检查对应的文件。"

