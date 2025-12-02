#!/bin/bash

# PayMind 访问修复脚本 - 一键修复所有访问问题

echo "=========================================="
echo "  PayMind 访问修复工具"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取WSL2 IP
WSL_IP=$(hostname -I | awk '{print $1}')
if [ -z "$WSL_IP" ]; then
    echo -e "${RED}❌ 无法获取WSL2 IP地址${NC}"
    exit 1
fi

echo -e "${BLUE}🌐 WSL2 IP地址: $WSL_IP${NC}"
echo ""

# 检查并启动服务
echo "=========================================="
echo "  步骤1: 检查服务状态"
echo "=========================================="
echo ""

# 检查前端
FRONTEND_PORT=$(netstat -tlnp 2>/dev/null | grep ":3000" | awk '{print $4}' | cut -d: -f2 || ss -tlnp 2>/dev/null | grep ":3000" | awk '{print $4}' | cut -d: -f2)
if [ -n "$FRONTEND_PORT" ]; then
    echo -e "${GREEN}✅ 前端服务运行中 (端口 3000)${NC}"
    FRONTEND_RUNNING=true
else
    echo -e "${YELLOW}⚠️  前端服务未运行，正在启动...${NC}"
    cd paymindfrontend 2>/dev/null
    if [ $? -eq 0 ]; then
        # 检查是否已有进程
        if pgrep -f "next dev" > /dev/null; then
            echo -e "${YELLOW}   发现已有Next.js进程，请手动检查${NC}"
        else
            echo -e "${BLUE}   启动前端服务...${NC}"
            nohup npm run dev > /tmp/frontend.log 2>&1 &
            sleep 3
            if netstat -tlnp 2>/dev/null | grep -q ":3000" || ss -tlnp 2>/dev/null | grep -q ":3000"; then
                echo -e "${GREEN}   ✅ 前端服务启动成功${NC}"
                FRONTEND_RUNNING=true
            else
                echo -e "${RED}   ❌ 前端服务启动失败，查看日志: tail -f /tmp/frontend.log${NC}"
                FRONTEND_RUNNING=false
            fi
        fi
        cd ..
    else
        echo -e "${RED}   ❌ 无法进入paymindfrontend目录${NC}"
        FRONTEND_RUNNING=false
    fi
fi

echo ""

# 检查后端
BACKEND_PORT=$(netstat -tlnp 2>/dev/null | grep ":3001" | awk '{print $4}' | cut -d: -f2 || ss -tlnp 2>/dev/null | grep ":3001" | awk '{print $4}' | cut -d: -f2)
if [ -n "$BACKEND_PORT" ]; then
    echo -e "${GREEN}✅ 后端服务运行中 (端口 3001)${NC}"
    BACKEND_RUNNING=true
else
    echo -e "${YELLOW}⚠️  后端服务未运行，正在启动...${NC}"
    cd backend 2>/dev/null
    if [ $? -eq 0 ]; then
        # 检查是否已有进程
        if pgrep -f "nest start" > /dev/null; then
            echo -e "${YELLOW}   发现已有NestJS进程，等待启动完成...${NC}"
            sleep 5
            if netstat -tlnp 2>/dev/null | grep -q ":3001" || ss -tlnp 2>/dev/null | grep -q ":3001"; then
                echo -e "${GREEN}   ✅ 后端服务已启动${NC}"
                BACKEND_RUNNING=true
            else
                echo -e "${RED}   ❌ 后端服务启动失败，查看日志: tail -f backend.log${NC}"
                BACKEND_RUNNING=false
            fi
        else
            echo -e "${BLUE}   启动后端服务...${NC}"
            nohup npm run start:dev > /tmp/backend.log 2>&1 &
            sleep 10
            if netstat -tlnp 2>/dev/null | grep -q ":3001" || ss -tlnp 2>/dev/null | grep -q ":3001"; then
                echo -e "${GREEN}   ✅ 后端服务启动成功${NC}"
                BACKEND_RUNNING=true
            else
                echo -e "${RED}   ❌ 后端服务启动失败，查看日志: tail -f /tmp/backend.log${NC}"
                BACKEND_RUNNING=false
            fi
        fi
        cd ..
    else
        echo -e "${RED}   ❌ 无法进入backend目录${NC}"
        BACKEND_RUNNING=false
    fi
fi

echo ""
echo "=========================================="
echo "  步骤2: 测试服务响应"
echo "=========================================="
echo ""

# 测试前端
if [ "$FRONTEND_RUNNING" = true ]; then
    echo -e "${BLUE}测试前端服务...${NC}"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || curl -s -o /dev/null -w "%{http_code}" http://$WSL_IP:3000 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "000" ]; then
        echo -e "${GREEN}✅ 前端服务响应正常${NC}"
    else
        echo -e "${YELLOW}⚠️  前端服务响应异常 (HTTP $HTTP_CODE)${NC}"
        echo -e "   ${YELLOW}可能还在启动中，请等待30秒后重试${NC}"
    fi
fi

# 测试后端
if [ "$BACKEND_RUNNING" = true ]; then
    echo -e "${BLUE}测试后端服务...${NC}"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api 2>/dev/null || curl -s -o /dev/null -w "%{http_code}" http://$WSL_IP:3001/api 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "000" ]; then
        echo -e "${GREEN}✅ 后端服务响应正常${NC}"
    else
        echo -e "${YELLOW}⚠️  后端服务响应异常 (HTTP $HTTP_CODE)${NC}"
        echo -e "   ${YELLOW}可能还在启动中，请等待30-60秒后重试${NC}"
    fi
fi

echo ""
echo "=========================================="
echo "  步骤3: 访问地址"
echo "=========================================="
echo ""

if [ "$FRONTEND_RUNNING" = true ] || [ "$BACKEND_RUNNING" = true ]; then
    echo -e "${BLUE}📍 在WSL中访问：${NC}"
    echo ""
    
    if [ "$FRONTEND_RUNNING" = true ]; then
        echo -e "   ${GREEN}前端: http://localhost:3000${NC}"
        echo -e "   ${GREEN}前端: http://$WSL_IP:3000${NC}"
    fi
    
    if [ "$BACKEND_RUNNING" = true ]; then
        echo -e "   ${GREEN}后端: http://localhost:3001${NC}"
        echo -e "   ${GREEN}后端: http://$WSL_IP:3001${NC}"
        echo -e "   ${GREEN}API文档: http://localhost:3001/api/docs${NC}"
        echo -e "   ${GREEN}API文档: http://$WSL_IP:3001/api/docs${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📍 在Windows浏览器中访问：${NC}"
    echo ""
    echo -e "${YELLOW}💡 方法1: 直接使用WSL IP地址${NC}"
    echo ""
    
    if [ "$FRONTEND_RUNNING" = true ]; then
        echo -e "   ${GREEN}前端: http://$WSL_IP:3000${NC}"
    fi
    
    if [ "$BACKEND_RUNNING" = true ]; then
        echo -e "   ${GREEN}后端: http://$WSL_IP:3001${NC}"
        echo -e "   ${GREEN}API文档: http://$WSL_IP:3001/api/docs${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}💡 方法2: 配置Windows端口转发（使用localhost）${NC}"
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
    
    if [ "$FRONTEND_RUNNING" = true ]; then
        echo -e "   配置后访问: ${GREEN}http://localhost:3000${NC}"
    fi
    
    if [ "$BACKEND_RUNNING" = true ]; then
        echo -e "   配置后访问: ${GREEN}http://localhost:3001${NC}"
    fi
else
    echo -e "${RED}❌ 没有服务在运行${NC}"
    echo ""
    echo "手动启动命令："
    echo "  前端: cd paymindfrontend && npm run dev"
    echo "  后端: cd backend && npm run start:dev"
fi

echo ""
echo "=========================================="
echo "  步骤4: 故障排查"
echo "=========================================="
echo ""

if [ "$FRONTEND_RUNNING" = false ] || [ "$BACKEND_RUNNING" = false ]; then
    echo -e "${YELLOW}⚠️  服务启动问题排查：${NC}"
    echo ""
    
    if [ "$FRONTEND_RUNNING" = false ]; then
        echo "前端服务："
        echo "  1. 检查端口3000是否被占用: lsof -i :3000"
        echo "  2. 查看启动日志: tail -f /tmp/frontend.log"
        echo "  3. 手动启动: cd paymindfrontend && npm run dev"
        echo ""
    fi
    
    if [ "$BACKEND_RUNNING" = false ]; then
        echo "后端服务："
        echo "  1. 检查端口3001是否被占用: lsof -i :3001"
        echo "  2. 查看启动日志: tail -f /tmp/backend.log"
        echo "  3. 检查数据库连接: cd backend && cat .env | grep DB_"
        echo "  4. 手动启动: cd backend && npm run start:dev"
        echo ""
    fi
fi

echo -e "${BLUE}常见问题：${NC}"
echo ""
echo "1. 如果Windows浏览器无法访问："
echo "   - 检查Windows防火墙是否允许端口3000和3001"
echo "   - 使用WSL IP地址访问: http://$WSL_IP:3000"
echo "   - 或配置Windows端口转发（见上方）"
echo ""
echo "2. 如果返回503或连接超时："
echo "   - 服务可能还在启动中，等待30-60秒后重试"
echo "   - 检查服务日志确认启动状态"
echo ""
echo "3. 如果端口转发不工作："
echo "   - 确保以管理员身份运行PowerShell"
echo "   - 检查规则: netsh interface portproxy show v4tov4"
echo "   - 删除旧规则: netsh interface portproxy delete v4tov4 listenport=<端口>"
echo ""
echo "4. WSL2 IP地址变化："
echo "   - 重启WSL后IP可能变化"
echo "   - 重新运行此脚本获取新IP"
echo "   - 或重新运行Windows端口转发脚本"
echo ""

echo "=========================================="
echo -e "${GREEN}✅ 修复完成！${NC}"
echo "=========================================="

