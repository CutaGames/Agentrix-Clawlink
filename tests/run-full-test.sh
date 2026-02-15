#!/bin/bash
# 完整的服务启动和测试脚本

set -e

echo "╔════════════════════════════════════════════════════╗"
echo "║  Agentrix Workbench 完整测试流程                    ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 项目根目录
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# 步骤 1: 停止现有服务
echo -e "${BLUE}[步骤 1/6]${NC} 停止现有服务..."
pkill -f "ts-node.*main" 2>/dev/null || true
pkill -f "node.*dist/main" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 2
echo -e "${GREEN}✓${NC} 已清理旧进程"
echo ""

# 步骤 2: 构建后端
echo -e "${BLUE}[步骤 2/6]${NC} 构建后端..."
cd "$BACKEND_DIR"
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} 后端构建成功"
else
    echo -e "${RED}✗${NC} 后端构建失败"
    exit 1
fi
echo ""

# 步骤 3: 启动后端服务
echo -e "${BLUE}[步骤 3/6]${NC} 启动后端服务..."
cd "$BACKEND_DIR"
nohup npm run start:dev > backend.log 2>&1 &
BACKEND_PID=$!
echo "后端 PID: $BACKEND_PID"

# 等待后端启动
echo -n "等待后端启动"
for i in {1..30}; do
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "\n${GREEN}✓${NC} 后端服务已启动 (http://localhost:3001)"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "\n${RED}✗${NC} 后端启动超时"
        echo "查看日志: tail -50 $BACKEND_DIR/backend.log"
        exit 1
    fi
done
echo ""

# 步骤 4: 验证后端路由
echo -e "${BLUE}[步骤 4/6]${NC} 运行五类画像验证..."
cd "$ROOT_DIR"
bash tests/verify-persona-flows.sh
VERIFY_RESULT=$?
echo ""

# 步骤 5: 启动前端服务
echo -e "${BLUE}[步骤 5/6]${NC} 启动前端服务..."
cd "$FRONTEND_DIR"
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "前端 PID: $FRONTEND_PID"

# 等待前端启动
echo -n "等待前端启动"
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "\n${GREEN}✓${NC} 前端服务已启动 (http://localhost:3000)"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "\n${YELLOW}⚠${NC} 前端启动超时（可能仍在编译）"
        echo "查看日志: tail -50 $FRONTEND_DIR/frontend.log"
    fi
done
echo ""

# 步骤 6: 运行 E2E 测试
echo -e "${BLUE}[步骤 6/6]${NC} 运行 E2E 测试..."
cd "$ROOT_DIR"

if [ -f "package.json" ] && grep -q "playwright" package.json; then
    echo "正在运行全模块 Commerce E2E 测试..."
    npx playwright test tests/e2e/commerce-all-modules.spec.ts --reporter=html
    E2E_RESULT=$?
    
    if [ $E2E_RESULT -eq 0 ]; then
        echo -e "${GREEN}✓${NC} E2E 测试通过"
    else
        echo -e "${YELLOW}⚠${NC} E2E 测试未完全通过，查看报告:"
        echo "npx playwright show-report"
    fi
else
    echo -e "${YELLOW}⚠${NC} Playwright 未安装，跳过 E2E 测试"
    E2E_RESULT=2
fi
echo ""

# 总结
echo "╔════════════════════════════════════════════════════╗"
echo "║                   测试总结                          ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""
echo -e "后端服务: ${GREEN}运行中${NC} (PID: $BACKEND_PID)"
echo -e "前端服务: ${GREEN}运行中${NC} (PID: $FRONTEND_PID)"
echo ""

if [ $VERIFY_RESULT -eq 0 ]; then
    echo -e "五类画像验证: ${GREEN}✓ 全部通过${NC}"
else
    echo -e "五类画像验证: ${YELLOW}⚠ 部分失败${NC}"
fi

if [ $E2E_RESULT -eq 0 ]; then
    echo -e "E2E 测试: ${GREEN}✓ 全部通过${NC}"
elif [ $E2E_RESULT -eq 2 ]; then
    echo -e "E2E 测试: ${YELLOW}⊘ 跳过${NC}"
else
    echo -e "E2E 测试: ${YELLOW}⚠ 部分失败${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "查看日志:"
echo "  后端: tail -f $BACKEND_DIR/backend.log"
echo "  前端: tail -f $FRONTEND_DIR/frontend.log"
echo ""
echo "停止服务:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "═══════════════════════════════════════════════════"
