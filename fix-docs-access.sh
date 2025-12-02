#!/bin/bash

# 修复API文档和SDK文档访问问题

echo "=========================================="
echo "  修复API文档和SDK文档访问"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取WSL IP
WSL_IP=$(hostname -I | awk '{print $1}')
echo -e "${BLUE}🌐 WSL IP地址: $WSL_IP${NC}"
echo ""

# 检查后端服务
echo "=========================================="
echo "  检查后端服务 (端口 3001)"
echo "=========================================="
echo ""

BACKEND_RUNNING=false
if netstat -tlnp 2>/dev/null | grep -q ":3001" || ss -tlnp 2>/dev/null | grep -q ":3001"; then
    echo -e "${GREEN}✅ 后端服务正在监听端口 3001${NC}"
    BACKEND_RUNNING=true
else
    echo -e "${RED}❌ 后端服务未在监听端口 3001${NC}"
    echo -e "${YELLOW}正在检查后端进程...${NC}"
    
    if ps aux | grep -E "nest start" | grep -v grep > /dev/null; then
        echo -e "${YELLOW}⚠️  后端进程存在，但可能还在启动中...${NC}"
        echo -e "${YELLOW}等待30秒后重试...${NC}"
        sleep 30
        
        if netstat -tlnp 2>/dev/null | grep -q ":3001" || ss -tlnp 2>/dev/null | grep -q ":3001"; then
            echo -e "${GREEN}✅ 后端服务已启动${NC}"
            BACKEND_RUNNING=true
        else
            echo -e "${RED}❌ 后端服务启动失败${NC}"
            echo -e "${YELLOW}查看日志: tail -f /tmp/agentrix-backend.log${NC}"
        fi
    else
        echo -e "${RED}❌ 后端进程不存在${NC}"
        echo -e "${YELLOW}启动后端服务: cd backend && npm run start:dev${NC}"
    fi
fi

# 测试API文档
if [ "$BACKEND_RUNNING" = true ]; then
    echo ""
    echo -e "${BLUE}测试API文档访问...${NC}"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/docs 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ API文档可访问 (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${YELLOW}⚠️  API文档响应异常 (HTTP $HTTP_CODE)${NC}"
        echo -e "${YELLOW}可能还在启动中，请稍等...${NC}"
    fi
fi

echo ""
echo "=========================================="
echo "  检查SDK文档服务 (端口 3002)"
echo "=========================================="
echo ""

SDK_DOCS_RUNNING=false
if netstat -tlnp 2>/dev/null | grep -q ":3002" || ss -tlnp 2>/dev/null | grep -q ":3002"; then
    echo -e "${GREEN}✅ SDK文档服务正在监听端口 3002${NC}"
    SDK_DOCS_RUNNING=true
else
    echo -e "${RED}❌ SDK文档服务未在监听端口 3002${NC}"
fi

# 检查SDK文档是否已生成
if [ ! -d "sdk-js/docs" ]; then
    echo -e "${YELLOW}⚠️  SDK文档目录不存在，正在生成...${NC}"
    cd sdk-js
    
    # 修复TypeScript配置
    if ! grep -q '"DOM"' tsconfig.json; then
        echo -e "${YELLOW}修复TypeScript配置...${NC}"
        sed -i 's/"lib": \["ES2020"\]/"lib": ["ES2020", "DOM"]/' tsconfig.json
    fi
    
    # 安装typedoc（如果未安装）
    if [ ! -d "node_modules/typedoc" ]; then
        echo -e "${YELLOW}安装TypeDoc...${NC}"
        npm install --save-dev typedoc 2>&1 | tail -5
    fi
    
    # 生成文档
    echo -e "${YELLOW}生成SDK文档...${NC}"
    npm run docs:generate 2>&1 | tail -20
    
    if [ -d "docs" ]; then
        echo -e "${GREEN}✅ SDK文档生成成功${NC}"
        
        # 启动文档服务
        if ! netstat -tlnp 2>/dev/null | grep -q ":3002" && ! ss -tlnp 2>/dev/null | grep -q ":3002"; then
            echo -e "${YELLOW}启动SDK文档服务...${NC}"
            npx serve docs -p 3002 > /tmp/agentrix-sdk-docs.log 2>&1 &
            sleep 2
            if netstat -tlnp 2>/dev/null | grep -q ":3002" || ss -tlnp 2>/dev/null | grep -q ":3002"; then
                echo -e "${GREEN}✅ SDK文档服务已启动${NC}"
                SDK_DOCS_RUNNING=true
            fi
        fi
    else
        echo -e "${RED}❌ SDK文档生成失败${NC}"
        echo -e "${YELLOW}查看错误信息: 检查上面的输出${NC}"
    fi
    
    cd ..
fi

# 测试SDK文档
if [ "$SDK_DOCS_RUNNING" = true ]; then
    echo ""
    echo -e "${BLUE}测试SDK文档访问...${NC}"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ SDK文档可访问 (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${YELLOW}⚠️  SDK文档响应异常 (HTTP $HTTP_CODE)${NC}"
    fi
fi

echo ""
echo "=========================================="
echo "  访问地址"
echo "=========================================="
echo ""

if [ "$BACKEND_RUNNING" = true ]; then
    echo -e "${BLUE}📍 API文档：${NC}"
    echo -e "  WSL: ${GREEN}http://localhost:3001/api/docs${NC}"
    echo -e "  Windows: ${GREEN}http://$WSL_IP:3001/api/docs${NC}"
    echo ""
fi

if [ "$SDK_DOCS_RUNNING" = true ]; then
    echo -e "${BLUE}📍 SDK文档：${NC}"
    echo -e "  WSL: ${GREEN}http://localhost:3002${NC}"
    echo -e "  Windows: ${GREEN}http://$WSL_IP:3002${NC}"
    echo ""
fi

echo -e "${YELLOW}💡 如果想使用 localhost，请运行：${NC}"
echo "  .\\setup-all-ports.ps1"
echo ""

