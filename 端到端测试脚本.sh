#!/bin/bash

# PayMind 端到端测试脚本
# 用于测试完整的支付流程

set -e

echo "=========================================="
echo "PayMind 端到端测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API基础URL
API_URL="${API_URL:-http://localhost:3001}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

echo "=========================================="
echo "测试环境检查"
echo "=========================================="

# 检查后端服务
echo -n "检查后端服务 ... "
if curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 运行中${NC}"
else
    echo -e "${RED}✗ 未运行${NC}"
    echo "  请运行: cd backend && npm run start:dev"
    exit 1
fi

# 检查前端服务
echo -n "检查前端服务 ... "
if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 运行中${NC}"
else
    echo -e "${YELLOW}⚠ 未运行（可选）${NC}"
    echo "  请运行: cd paymindfrontend && npm run dev"
fi

echo ""

# 测试场景
echo "=========================================="
echo "端到端测试场景"
echo "=========================================="

echo -e "${BLUE}1. 产品价格查询测试${NC}"
echo "   - 创建产品"
echo "   - 设置国家价格"
echo "   - 查询产品价格（根据国家）"
echo "   - 验证价格计算"
echo ""

echo -e "${BLUE}2. 税费计算测试${NC}"
echo "   - 设置税费率"
echo "   - 计算税费"
echo "   - 验证税费计算准确性"
echo ""

echo -e "${BLUE}3. 支付流程测试${NC}"
echo "   - 创建支付请求（包含产品ID和国家代码）"
echo "   - 获取产品价格和税费"
echo "   - 计算通道费用"
echo "   - 执行支付"
echo "   - 验证Session ID记录"
echo ""

echo -e "${BLUE}4. 佣金计算测试${NC}"
echo "   - 实体商品支付（3%佣金）"
echo "   - 服务类支付（5%佣金）"
echo "   - 多Agent协作（推荐Agent + 执行Agent）"
echo "   - 验证佣金分配"
echo ""

echo -e "${BLUE}5. 智能路由测试${NC}"
echo "   - 获取路由建议"
echo "   - 验证商户价格设置"
echo "   - 验证QuickPay快速通道"
echo "   - 验证KYC引导流程"
echo ""

echo "=========================================="
echo "手动测试步骤"
echo "=========================================="
echo ""
echo "1. 启动服务："
echo "   cd backend && npm run start:dev"
echo "   cd paymindfrontend && npm run dev"
echo ""
echo "2. 访问前端："
echo "   http://localhost:3000"
echo ""
echo "3. 测试支付流程："
echo "   - 登录账户"
echo "   - 选择商品"
echo "   - 进入支付页面"
echo "   - 验证价格明细显示"
echo "   - 验证税费显示"
echo "   - 选择支付方式"
echo "   - 完成支付"
echo ""
echo "4. 验证后端记录："
echo "   - 检查支付记录（包含Session ID）"
echo "   - 检查佣金记录（包含Agent类型）"
echo "   - 检查价格和税费记录"
echo ""
echo "5. 查看Swagger文档："
echo "   http://localhost:3001/api/docs"
echo ""

echo "=========================================="
echo "自动化测试（待实现）"
echo "=========================================="
echo ""
echo "建议使用以下工具进行自动化测试："
echo "  - Playwright: 前端E2E测试"
echo "  - Jest: 后端单元测试"
echo "  - Hardhat: 合约测试"
echo ""

