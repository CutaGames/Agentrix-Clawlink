#!/bin/bash

# PayMind 后端服务诊断脚本 (WSL/Linux)

echo "=========================================="
echo "🔍 PayMind 后端服务诊断"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# 1. 检查端口占用
echo -e "${YELLOW}[1/5] 检查端口占用...${NC}"
if command -v netstat &> /dev/null; then
    PORT_CHECK=$(netstat -tlnp 2>/dev/null | grep :3001 || true)
elif command -v ss &> /dev/null; then
    PORT_CHECK=$(ss -tlnp 2>/dev/null | grep :3001 || true)
else
    PORT_CHECK=""
fi

if [ -n "$PORT_CHECK" ]; then
    echo -e "${GREEN}✅ 端口 3001 已被占用${NC}"
    echo -e "${GRAY}   $PORT_CHECK${NC}"
else
    echo -e "${RED}❌ 端口 3001 未被占用 - 后端服务未运行${NC}"
fi
echo ""

# 2. 检查Node.js进程
echo -e "${YELLOW}[2/5] 检查Node.js进程...${NC}"
NODE_PROCESSES=$(ps aux | grep -E "node|nest" | grep -v grep || true)
if [ -n "$NODE_PROCESSES" ]; then
    NODE_COUNT=$(echo "$NODE_PROCESSES" | wc -l)
    echo -e "${GREEN}✅ 找到 $NODE_COUNT 个Node.js进程${NC}"
    echo "$NODE_PROCESSES" | while read line; do
        echo -e "${GRAY}   $line${NC}"
    done
else
    echo -e "${RED}❌ 未找到Node.js进程${NC}"
fi
echo ""

# 3. 检查后端日志
echo -e "${YELLOW}[3/5] 检查后端日志...${NC}"
LOG_FILES=(
    "logs/backend.log"
    "backend/logs/app.log"
    "backend.log"
)

FOUND_LOG=false
for log_file in "${LOG_FILES[@]}"; do
    if [ -f "$log_file" ]; then
        echo -e "${GREEN}✅ 找到日志文件: $log_file${NC}"
        echo -e "${GRAY}   最后50行:${NC}"
        tail -n 50 "$log_file" | sed 's/^/   /'
        FOUND_LOG=true
        break
    fi
done

if [ "$FOUND_LOG" = false ]; then
    echo -e "${YELLOW}⚠️  未找到日志文件${NC}"
fi
echo ""

# 4. 测试API连接
echo -e "${YELLOW}[4/5] 测试API连接...${NC}"
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health --max-time 5 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ API健康检查成功${NC}"
        RESPONSE=$(curl -s http://localhost:3001/api/health --max-time 5 2>/dev/null || echo "")
        if [ -n "$RESPONSE" ]; then
            echo -e "${GRAY}   响应: $RESPONSE${NC}"
        fi
    elif [ "$HTTP_CODE" = "000" ]; then
        echo -e "${RED}❌ API连接失败 - 服务未运行或无法连接${NC}"
    else
        echo -e "${YELLOW}⚠️  API返回状态码: $HTTP_CODE${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  curl未安装，跳过API测试${NC}"
fi
echo ""

# 5. 检查环境变量
echo -e "${YELLOW}[5/5] 检查环境配置...${NC}"
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✅ 找到 .env 文件${NC}"
    # 只显示非敏感配置
    grep -E "^[A-Z_]+=" backend/.env | grep -v "PASSWORD\|SECRET\|KEY" | sed 's/^/   /' | head -10
    SENSITIVE_COUNT=$(grep -E "PASSWORD|SECRET|KEY" backend/.env | wc -l)
    if [ "$SENSITIVE_COUNT" -gt 0 ]; then
        echo -e "${GRAY}   ... 还有 $SENSITIVE_COUNT 个敏感配置项${NC}"
    fi
else
    echo -e "${RED}❌ 未找到 .env 文件${NC}"
    echo -e "${YELLOW}   请从 .env.example 复制并配置${NC}"
fi
echo ""

# 总结
echo "=========================================="
echo -e "${YELLOW}📋 诊断总结${NC}"
echo "=========================================="
echo ""

if [ -n "$PORT_CHECK" ]; then
    echo -e "${GREEN}✅ 后端服务似乎正在运行${NC}"
    echo ""
    echo -e "${YELLOW}💡 如果无法访问，请尝试:${NC}"
    echo -e "${GRAY}   1. 检查防火墙设置${NC}"
    echo -e "${GRAY}   2. 查看后端日志: tail -f logs/backend.log${NC}"
    echo -e "${GRAY}   3. 重启服务: cd backend && npm run start:dev${NC}"
else
    echo -e "${RED}❌ 后端服务未运行${NC}"
    echo ""
    echo -e "${YELLOW}💡 启动服务:${NC}"
    echo -e "${GRAY}   cd backend${NC}"
    echo -e "${GRAY}   npm run start:dev${NC}"
fi

echo ""

