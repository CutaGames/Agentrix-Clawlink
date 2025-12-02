#!/bin/bash

# BSC测试网快速部署脚本
# 钱包地址: 0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3

set -e

echo "🚀 开始部署ERC8004SessionManager到BSC测试网..."
echo ""

# 检查环境变量
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ 错误: 未设置 PRIVATE_KEY 环境变量"
    echo "请在 contract/.env 文件中设置 PRIVATE_KEY"
    exit 1
fi

# 进入合约目录
cd contract

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 部署合约
echo "📝 部署合约到BSC测试网..."
echo "钱包地址: 0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3"
echo "USDT地址: 0x337610d27c682E347C9cD60BD4b3b107C9d34dDd"
echo ""

npx hardhat run scripts/deploy-erc8004.ts --network bscTestnet

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 下一步："
echo "1. 记录合约地址（从上方输出中获取）"
echo "2. 更新 backend/.env 文件："
echo "   - ERC8004_CONTRACT_ADDRESS=<合约地址>"
echo "   - USDC_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd"
echo "   - RELAYER_PRIVATE_KEY=<你的私钥>"
echo "   - RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545"
echo "3. 启动后端服务验证连接"

