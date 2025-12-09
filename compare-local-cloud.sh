#!/bin/bash
# 本地 vs 云端全面对比脚本
# 在云端服务器上执行此脚本

echo "=========================================="
echo "  本地 vs 云端全面对比检查"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Git 仓库状态
echo -e "${YELLOW}=== 1. Git 仓库状态 ===${NC}"
echo "Git 仓库位置: /root/Agentrix"
cd /root/Agentrix 2>/dev/null && {
    echo "最新 5 个提交:"
    git log --oneline -5
    echo ""
    echo "当前分支:"
    git branch -v
    echo ""
    echo "未提交的更改:"
    git status --short
} || echo -e "${RED}❌ Git 仓库不存在${NC}"
echo ""

# 2. 前端代码对比
echo -e "${YELLOW}=== 2. 前端代码对比 ===${NC}"
FRONTEND_DEPLOY="/var/www/agentrix-website/frontend"
FRONTEND_SOURCE="/root/Agentrix/frontend"

echo "部署目录: $FRONTEND_DEPLOY"
echo "源码目录: $FRONTEND_SOURCE"
echo ""

# 检查关键文件是否存在
echo "关键文件检查:"
for file in "components/auth/UserMenu.tsx" "components/auth/LoginModal.tsx" "pages/auth/login.tsx" "pages/app/register/merchant.tsx" "pages/admin/login.tsx"; do
    if [ -f "$FRONTEND_DEPLOY/$file" ]; then
        echo -e "  ${GREEN}✅${NC} $file (部署目录)"
    else
        echo -e "  ${RED}❌${NC} $file (部署目录不存在)"
    fi
    
    if [ -f "$FRONTEND_SOURCE/$file" ]; then
        echo -e "  ${GREEN}✅${NC} $file (源码目录)"
    else
        echo -e "  ${RED}❌${NC} $file (源码目录不存在)"
    fi
done
echo ""

# 检查 UserMenu.tsx 内容
echo "UserMenu.tsx 关键内容检查:"
if [ -f "$FRONTEND_DEPLOY/components/auth/UserMenu.tsx" ]; then
    echo "部署目录中的内容:"
    grep -n "注册成为商家\|平台管理员\|register/merchant\|admin/login" "$FRONTEND_DEPLOY/components/auth/UserMenu.tsx" || echo "  ❌ 未找到相关代码"
fi

if [ -f "$FRONTEND_SOURCE/components/auth/UserMenu.tsx" ]; then
    echo "源码目录中的内容:"
    grep -n "注册成为商家\|平台管理员\|register/merchant\|admin/login" "$FRONTEND_SOURCE/components/auth/UserMenu.tsx" || echo "  ❌ 未找到相关代码"
fi
echo ""

# 3. 前端构建状态
echo -e "${YELLOW}=== 3. 前端构建状态 ===${NC}"
if [ -d "$FRONTEND_DEPLOY/.next" ]; then
    echo "构建目录存在"
    echo "构建时间:"
    ls -ld "$FRONTEND_DEPLOY/.next" | awk '{print $6, $7, $8}'
    echo "构建文件数量:"
    find "$FRONTEND_DEPLOY/.next/static" -type f 2>/dev/null | wc -l
else
    echo -e "${RED}❌ 构建目录不存在，需要运行 npm run build${NC}"
fi
echo ""

# 4. 前端依赖对比
echo -e "${YELLOW}=== 4. 前端依赖版本 ===${NC}"
if [ -f "$FRONTEND_DEPLOY/package.json" ]; then
    echo "部署目录 package.json 版本:"
    grep '"version"' "$FRONTEND_DEPLOY/package.json" || echo "未找到版本信息"
fi

if [ -f "$FRONTEND_SOURCE/package.json" ]; then
    echo "源码目录 package.json 版本:"
    grep '"version"' "$FRONTEND_SOURCE/package.json" || echo "未找到版本信息"
fi
echo ""

# 5. 前端环境变量
echo -e "${YELLOW}=== 5. 前端环境变量 ===${NC}"
if [ -f "$FRONTEND_DEPLOY/.env.local" ]; then
    echo "部署目录 .env.local:"
    grep -E "NEXT_PUBLIC_API_URL|NODE_ENV|NEXT_PUBLIC_APP_URL" "$FRONTEND_DEPLOY/.env.local" | sed 's/^/  /'
else
    echo -e "${RED}❌ .env.local 不存在${NC}"
fi
echo ""

# 6. 后端代码对比
echo -e "${YELLOW}=== 6. 后端代码对比 ===${NC}"
BACKEND_DEPLOY="/var/www/agentrix-website/backend"
BACKEND_SOURCE="/root/Agentrix/backend"

echo "部署目录: $BACKEND_DEPLOY"
echo "源码目录: $BACKEND_SOURCE"
echo ""

# 检查关键文件
echo "关键文件检查:"
for file in "src/modules/session/session.service.ts" "src/modules/payment/payment.service.ts" "src/entities/user.entity.ts"; do
    if [ -f "$BACKEND_DEPLOY/$file" ]; then
        echo -e "  ${GREEN}✅${NC} $file (部署目录)"
    else
        echo -e "  ${RED}❌${NC} $file (部署目录不存在)"
    fi
    
    if [ -f "$BACKEND_SOURCE/$file" ]; then
        echo -e "  ${GREEN}✅${NC} $file (源码目录)"
    else
        echo -e "  ${RED}❌${NC} $file (源码目录不存在)"
    fi
done
echo ""

# 7. 后端构建状态
echo -e "${YELLOW}=== 7. 后端构建状态 ===${NC}"
if [ -d "$BACKEND_DEPLOY/dist" ]; then
    echo "构建目录存在"
    echo "构建时间:"
    ls -ld "$BACKEND_DEPLOY/dist" | awk '{print $6, $7, $8}'
    echo "主要文件:"
    ls -lh "$BACKEND_DEPLOY/dist"/*.js 2>/dev/null | head -5
else
    echo -e "${RED}❌ 构建目录不存在，需要运行 npm run build${NC}"
fi
echo ""

# 8. 后端环境变量（不显示敏感信息）
echo -e "${YELLOW}=== 8. 后端环境变量（仅显示配置项名称） ===${NC}"
if [ -f "$BACKEND_DEPLOY/.env" ]; then
    echo "部署目录 .env 配置项:"
    grep -E "^[A-Z_]+=" "$BACKEND_DEPLOY/.env" | cut -d'=' -f1 | sort | sed 's/^/  /'
else
    echo -e "${RED}❌ .env 不存在${NC}"
fi
echo ""

# 9. 服务状态
echo -e "${YELLOW}=== 9. 服务运行状态 ===${NC}"
pm2 status
echo ""

# 10. 数据库连接配置
echo -e "${YELLOW}=== 10. 数据库配置 ===${NC}"
if [ -f "$BACKEND_DEPLOY/.env" ]; then
    echo "数据库配置:"
    grep -E "DB_HOST|DB_PORT|DB_DATABASE|DB_SYNC" "$BACKEND_DEPLOY/.env" | sed 's/=.*/=***/' | sed 's/^/  /'
fi
echo ""

# 11. RPC 和合约配置
echo -e "${YELLOW}=== 11. RPC 和合约配置 ===${NC}"
if [ -f "$BACKEND_DEPLOY/.env" ]; then
    echo "RPC 配置:"
    grep -E "RPC_URL|BSC_TESTNET_RPC_URL|CHAIN_ID" "$BACKEND_DEPLOY/.env" | sed 's/=.*/=***/' | sed 's/^/  /'
    echo "合约地址:"
    grep -E "ERC8004_CONTRACT_ADDRESS|COMMISSION_CONTRACT_ADDRESS" "$BACKEND_DEPLOY/.env" | sed 's/^/  /'
fi
echo ""

# 12. 文件大小对比
echo -e "${YELLOW}=== 12. 关键文件大小对比 ===${NC}"
echo "前端 UserMenu.tsx:"
[ -f "$FRONTEND_DEPLOY/components/auth/UserMenu.tsx" ] && ls -lh "$FRONTEND_DEPLOY/components/auth/UserMenu.tsx" | awk '{print "  部署目录: " $5}'
[ -f "$FRONTEND_SOURCE/components/auth/UserMenu.tsx" ] && ls -lh "$FRONTEND_SOURCE/components/auth/UserMenu.tsx" | awk '{print "  源码目录: " $5}'
echo ""

echo "=========================================="
echo "  对比完成"
echo "=========================================="

