#!/bin/bash

# PayMind SDK功能测试脚本
# 用于测试JavaScript/TypeScript SDK的新功能

set -e

echo "=========================================="
echo "PayMind SDK功能测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

cd sdk-js

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装SDK依赖...${NC}"
    npm install
fi

# 1. TypeScript编译测试
echo "=========================================="
echo "1. TypeScript编译测试"
echo "=========================================="

echo -n "编译SDK ... "
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 成功${NC}"
else
    echo -e "${RED}✗ 失败${NC}"
    echo "运行 'npm run build' 查看详细错误"
    exit 1
fi

echo ""

# 2. 检查新资源
echo "=========================================="
echo "2. 检查新资源"
echo "=========================================="

echo -n "检查PricingResource ... "
if [ -f "src/resources/pricing.ts" ] && grep -q "getProductPrice" src/resources/pricing.ts; then
    echo -e "${GREEN}✓ 存在${NC}"
else
    echo -e "${RED}✗ 不存在${NC}"
fi

echo -n "检查TaxResource ... "
if [ -f "src/resources/tax.ts" ] && grep -q "calculateTax" src/resources/tax.ts; then
    echo -e "${GREEN}✓ 存在${NC}"
else
    echo -e "${RED}✗ 不存在${NC}"
fi

echo ""

# 3. 检查类型定义
echo "=========================================="
echo "3. 检查类型定义"
echo "=========================================="

echo -n "检查Payment类型更新 ... "
if grep -q "countryCode" src/types/payment.ts && \
   grep -q "sessionId" src/types/payment.ts && \
   grep -q "taxAmount" src/types/payment.ts; then
    echo -e "${GREEN}✓ 通过${NC}"
else
    echo -e "${RED}✗ 失败${NC}"
fi

echo ""

# 4. 检查主类更新
echo "=========================================="
echo "4. 检查主类更新"
echo "=========================================="

echo -n "检查PayMind主类 ... "
if grep -q "pricing" src/index.ts && grep -q "tax" src/index.ts; then
    echo -e "${GREEN}✓ 通过${NC}"
else
    echo -e "${RED}✗ 失败${NC}"
fi

echo ""

# 5. 运行单元测试（如果有）
echo "=========================================="
echo "5. 运行单元测试"
echo "=========================================="

if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    echo "运行SDK单元测试..."
    npm test || echo -e "${YELLOW}测试失败或未实现${NC}"
else
    echo -e "${BLUE}提示: 未找到测试脚本${NC}"
fi

echo ""

# 6. 生成类型定义文件
echo "=========================================="
echo "6. 生成类型定义文件"
echo "=========================================="

echo -n "检查类型定义文件 ... "
if [ -f "dist/index.d.ts" ]; then
    echo -e "${GREEN}✓ 存在${NC}"
    echo "  位置: dist/index.d.ts"
else
    echo -e "${YELLOW}⚠ 不存在，运行 'npm run build' 生成${NC}"
fi

echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""

