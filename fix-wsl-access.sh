#!/bin/bash

# WSL2 访问修复脚本 - 完整诊断和修复

echo "=========================================="
echo "  Agentrix WSL2 访问修复工具"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取WSL2 IP
WSL_IP=$(hostname -I | awk '{print $1}')
if [ -z "$WSL_IP" ]; then
    echo -e "${RED}❌ 无法获取WSL2 IP地址${NC}"
    exit 1
fi

echo -e "${BLUE}🌐 WSL2 IP地址: $WSL_IP${NC}"
echo ""

# 检查服务状态
echo "=========================================="
echo "  步骤1: 检查服务状态"
echo "=========================================="
echo ""

# 检查前端
FRONTEND_RUNNING=false
if netstat -tuln 2>/dev/null | grep -q ":3000" || ss -tuln 2>/dev/null | grep -q ":3000"; then
    echo -e "${GREEN}✅ 前端服务运行中 (端口 3000)${NC}"
    FRONTEND_RUNNING=true
    
    # 测试前端
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$WSL_IP:3000 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "   ${GREEN}✅ 前端响应正常 (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "   ${YELLOW}⚠️  前端响应异常 (HTTP $HTTP_CODE)${NC}"
    fi
else
    echo -e "${RED}❌ 前端服务未运行${NC}"
    echo -e "   ${YELLOW}启动命令: cd agentrixfrontend && npm run dev${NC}"
fi

echo ""

# 检查后端
BACKEND_RUNNING=false
if netstat -tuln 2>/dev/null | grep -q ":3001" || ss -tuln 2>/dev/null | grep -q ":3001"; then
    echo -e "${GREEN}✅ 后端服务运行中 (端口 3001)${NC}"
    BACKEND_RUNNING=true
    
    # 测试后端
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$WSL_IP:3001/api/health 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "   ${GREEN}✅ 后端响应正常 (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "   ${YELLOW}⚠️  后端响应异常 (HTTP $HTTP_CODE)${NC}"
        echo -e "   ${YELLOW}   后端可能还在启动中，请等待30-60秒后重试${NC}"
    fi
else
    echo -e "${RED}❌ 后端服务未运行${NC}"
    echo -e "   ${YELLOW}启动命令: cd backend && npm run start:dev${NC}"
fi

echo ""
echo "=========================================="
echo "  步骤2: Windows访问配置"
echo "=========================================="
echo ""

if [ "$FRONTEND_RUNNING" = true ] || [ "$BACKEND_RUNNING" = true ]; then
    echo -e "${BLUE}📍 在Windows浏览器中访问：${NC}"
    echo ""
    
    if [ "$FRONTEND_RUNNING" = true ]; then
        echo -e "   ${GREEN}前端: http://$WSL_IP:3000${NC}"
    fi
    
    if [ "$BACKEND_RUNNING" = true ]; then
        echo -e "   ${GREEN}后端: http://$WSL_IP:3001${NC}"
        echo -e "   ${GREEN}API文档: http://$WSL_IP:3001/api/docs${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}💡 如果想使用 localhost 访问，需要配置Windows端口转发：${NC}"
    echo ""
    echo "   在Windows PowerShell中运行（以管理员身份）："
    echo ""
    
    if [ "$FRONTEND_RUNNING" = true ]; then
        echo "   netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$WSL_IP"
    fi
    
    if [ "$BACKEND_RUNNING" = true ]; then
        echo "   netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=$WSL_IP"
    fi
    
    echo ""
    echo "   或者运行已创建的脚本："
    echo "   .\\setup-wsl-port-forward.ps1"
    echo ""
else
    echo -e "${RED}❌ 没有服务在运行，请先启动服务${NC}"
    echo ""
    echo "启动命令："
    echo "  前端: cd agentrixfrontend && npm run dev"
    echo "  后端: cd backend && npm run start:dev"
fi

echo ""
echo "=========================================="
echo "  步骤3: 故障排查"
echo "=========================================="
echo ""

if [ "$FRONTEND_RUNNING" = false ] && [ "$BACKEND_RUNNING" = false ]; then
    echo -e "${YELLOW}⚠️  服务未运行，检查启动日志：${NC}"
    echo ""
    echo "  查看后端日志: tail -f backend.log"
    echo "  查看前端日志: tail -f frontend.log"
    echo ""
fi

echo -e "${BLUE}常见问题排查：${NC}"
echo ""
echo "1. 如果无法访问，检查Windows防火墙："
echo "   - 允许端口3000和3001入站连接"
echo ""
echo "2. 如果返回503，服务可能还在启动："
echo "   - 后端首次启动需要30-60秒"
echo "   - 等待后重试访问"
echo ""
echo "3. 如果端口转发不工作："
echo "   - 确保以管理员身份运行PowerShell"
echo "   - 检查端口转发规则: netsh interface portproxy show v4tov4"
echo ""
echo "4. WSL2 IP地址变化："
echo "   - 重启WSL后IP可能变化"
echo "   - 重新运行此脚本获取新IP"
echo ""

