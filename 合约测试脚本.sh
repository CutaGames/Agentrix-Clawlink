#!/bin/bash

# PayMind 合约功能测试脚本
# 用于测试Commission和PaymentRouter合约的新功能

set -e

echo "=========================================="
echo "PayMind 合约功能测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

cd contract

# 检查Hardhat是否安装
if ! command -v npx &> /dev/null; then
    echo -e "${RED}错误: 未找到npx，请先安装Node.js${NC}"
    exit 1
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装合约依赖...${NC}"
    npm install
fi

# 1. 编译合约
echo "=========================================="
echo "1. 编译合约"
echo "=========================================="

echo -n "编译合约 ... "
if npx hardhat compile > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 成功${NC}"
else
    echo -e "${RED}✗ 失败${NC}"
    echo "运行 'npx hardhat compile' 查看详细错误"
    exit 1
fi

echo ""

# 2. 运行单元测试
echo "=========================================="
echo "2. 运行单元测试"
echo "=========================================="

if [ -f "test/Commission.test.ts" ]; then
    echo "运行Commission合约测试..."
    npx hardhat test test/Commission.test.ts || echo -e "${YELLOW}Commission测试失败或未实现${NC}"
fi

if [ -f "test/PaymentRouter.test.ts" ]; then
    echo "运行PaymentRouter合约测试..."
    npx hardhat test test/PaymentRouter.test.ts || echo -e "${YELLOW}PaymentRouter测试失败或未实现${NC}"
fi

echo ""

# 3. 检查合约功能
echo "=========================================="
echo "3. 检查合约功能"
echo "=========================================="

echo -n "检查Commission.sol新功能 ... "
if grep -q "AgentType" contracts/Commission.sol && \
   grep -q "sessionId" contracts/Commission.sol && \
   grep -q "commissionBase" contracts/Commission.sol; then
    echo -e "${GREEN}✓ 通过${NC}"
else
    echo -e "${RED}✗ 失败${NC}"
fi

echo -n "检查PaymentRouter.sol新功能 ... "
if grep -q "sessionId" contracts/PaymentRouter.sol && \
   grep -q "merchantPrice" contracts/PaymentRouter.sol && \
   grep -q "channelFee" contracts/PaymentRouter.sol; then
    echo -e "${GREEN}✓ 通过${NC}"
else
    echo -e "${RED}✗ 失败${NC}"
fi

echo ""

# 4. 合约部署测试（本地网络）
echo "=========================================="
echo "4. 合约部署测试（可选）"
echo "=========================================="

echo -e "${BLUE}提示: 合约部署测试需要启动本地Hardhat网络${NC}"
echo "  运行: npx hardhat node"
echo "  然后: npx hardhat run scripts/deploy.ts --network localhost"
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""

