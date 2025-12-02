#!/bin/bash

# PayMind 系统性改动测试验证脚本
# 用于验证数据库、后端、合约、SDK和前端的功能

set -e

echo "=========================================="
echo "PayMind 系统性改动测试验证"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果统计
PASSED=0
FAILED=0

# 测试函数
test_check() {
    local name=$1
    local command=$2
    
    echo -n "测试: $name ... "
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 通过${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ 失败${NC}"
        ((FAILED++))
        return 1
    fi
}

# 1. 数据库迁移测试
echo "=========================================="
echo "1. 数据库迁移测试"
echo "=========================================="

cd backend

test_check "检查迁移文件是否存在" "ls src/migrations/1764000000*.ts"
test_check "检查实体文件是否存在" "ls src/entities/product-price.entity.ts src/entities/tax-rate.entity.ts src/entities/asset-aggregation.entity.ts"

echo ""

# 2. 后端服务测试
echo "=========================================="
echo "2. 后端服务测试"
echo "=========================================="

test_check "检查PricingService是否存在" "ls src/modules/pricing/pricing.service.ts"
test_check "检查TaxService是否存在" "ls src/modules/tax/tax.service.ts"
test_check "检查AssetAggregationService是否存在" "ls src/modules/marketplace/asset-aggregation.service.ts"
test_check "检查PaymentService是否已更新" "grep -q 'calculateChannelFee' src/modules/payment/payment.service.ts"
test_check "检查CommissionCalculatorService是否已更新" "grep -q 'getCommissionRates' src/modules/commission/commission-calculator.service.ts"

echo ""

# 3. API控制器测试
echo "=========================================="
echo "3. API控制器测试"
echo "=========================================="

test_check "检查PricingController是否存在" "ls src/modules/pricing/pricing.controller.ts"
test_check "检查TaxController是否存在" "ls src/modules/tax/tax.controller.ts"
test_check "检查AppModule是否包含新模块" "grep -q 'PricingModule' src/app.module.ts && grep -q 'TaxModule' src/app.module.ts"

echo ""

# 4. 合约测试
echo "=========================================="
echo "4. 合约测试"
echo "=========================================="

cd ../contract

test_check "检查Commission.sol是否已更新" "grep -q 'AgentType' contracts/Commission.sol && grep -q 'sessionId' contracts/Commission.sol"
test_check "检查PaymentRouter.sol是否已更新" "grep -q 'sessionId' contracts/PaymentRouter.sol && grep -q 'merchantPrice' contracts/PaymentRouter.sol"

echo ""

# 5. SDK测试
echo "=========================================="
echo "5. SDK测试"
echo "=========================================="

cd ../sdk-js

test_check "检查PricingResource是否存在" "ls src/resources/pricing.ts"
test_check "检查TaxResource是否存在" "ls src/resources/tax.ts"
test_check "检查支付类型是否已更新" "grep -q 'countryCode' src/types/payment.ts && grep -q 'sessionId' src/types/payment.ts"
test_check "检查PayMind主类是否包含新资源" "grep -q 'pricing' src/index.ts && grep -q 'tax' src/index.ts"

echo ""

# 6. 前端测试
echo "=========================================="
echo "6. 前端测试"
echo "=========================================="

cd ../paymindfrontend

test_check "检查pricing.api.ts是否存在" "ls lib/api/pricing.api.ts"
test_check "检查tax.api.ts是否存在" "ls lib/api/tax.api.ts"
test_check "检查payment.api.ts是否已更新" "grep -q 'countryCode' lib/api/payment.api.ts && grep -q 'sessionId' lib/api/payment.api.ts"
test_check "检查UserFriendlyPaymentModalV2是否已更新" "grep -q 'pricingApi' components/payment/UserFriendlyPaymentModalV2.tsx"
test_check "检查PaymentConfirmModal是否已更新" "grep -q 'productPrice' components/payment/PaymentConfirmModal.tsx"

echo ""

# 7. TypeScript编译测试
echo "=========================================="
echo "7. TypeScript编译测试"
echo "=========================================="

cd ../backend
if test_check "后端TypeScript编译" "npm run build"; then
    echo "后端编译成功"
else
    echo "后端编译失败，请检查错误"
fi

cd ../sdk-js
if test_check "SDK TypeScript编译" "npm run build"; then
    echo "SDK编译成功"
else
    echo "SDK编译失败，请检查错误"
fi

echo ""

# 总结
echo "=========================================="
echo "测试总结"
echo "=========================================="
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}有 $FAILED 个测试失败，请检查${NC}"
    exit 1
fi

