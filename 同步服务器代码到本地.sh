#!/bin/bash

# ========================================
# 从服务器同步代码到本地
# 用途：统一代码源，确保本地代码完整
# ========================================

set -e  # 遇到错误立即停止

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================"
echo "  从服务器同步代码到本地"
echo "======================================${NC}"
echo ""

# 检查是否在 backend 目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 请在 backend 目录下运行此脚本${NC}"
    exit 1
fi

SERVER="root@129.226.152.88"
SERVER_PATH="/var/www/agentrix-website/backend"

echo -e "${YELLOW}[1/5] 备份本地 src 目录（如果存在）...${NC}"
if [ -d "src" ]; then
    BACKUP_DIR="src.backup.$(date +%Y%m%d_%H%M%S)"
    echo "备份到: $BACKUP_DIR"
    cp -r src "$BACKUP_DIR"
    echo -e "${GREEN}✓ 备份完成${NC}"
else
    echo -e "${YELLOW}⚠️  src 目录不存在，跳过备份${NC}"
fi
echo ""

echo -e "${YELLOW}[2/5] 创建 src 目录结构...${NC}"
mkdir -p src/{modules,config,common,entities}
echo -e "${GREEN}✓ 目录结构已创建${NC}"
echo ""

echo -e "${YELLOW}[3/5] 从服务器同步 src 目录...${NC}"
echo "正在从服务器同步代码，这可能需要几分钟..."
scp -r "$SERVER:$SERVER_PATH/src/*" ./src/ 2>&1 | while read line; do
    echo "  $line"
done

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 代码同步完成${NC}"
else
    echo -e "${RED}❌ 同步失败，请检查网络连接和服务器地址${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}[4/5] 验证关键文件...${NC}"
MISSING_FILES=()

if [ ! -f "src/main.ts" ]; then
    MISSING_FILES+=("src/main.ts")
fi

if [ ! -f "src/app.module.ts" ]; then
    MISSING_FILES+=("src/app.module.ts")
fi

if [ ! -f "src/app.controller.ts" ]; then
    MISSING_FILES+=("src/app.controller.ts")
fi

if [ ! -f "src/app.service.ts" ]; then
    MISSING_FILES+=("src/app.service.ts")
fi

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ 所有关键文件都存在${NC}"
else
    echo -e "${RED}❌ 以下文件缺失:${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    echo ""
    echo -e "${YELLOW}尝试单独同步这些文件...${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo "同步: $file"
        scp "$SERVER:$SERVER_PATH/$file" "./$file" || echo "  ⚠️  同步失败: $file"
    done
fi
echo ""

echo -e "${YELLOW}[5/5] 检查模块目录...${NC}"
MODULE_COUNT=$(find src/modules -maxdepth 1 -type d 2>/dev/null | wc -l)
if [ "$MODULE_COUNT" -gt 1 ]; then
    echo -e "${GREEN}✓ 找到 $((MODULE_COUNT - 1)) 个模块${NC}"
    echo "模块列表:"
    find src/modules -maxdepth 1 -type d -not -path "src/modules" | sed 's|src/modules/||' | head -10
else
    echo -e "${YELLOW}⚠️  模块目录为空或不存在${NC}"
fi
echo ""

echo -e "${GREEN}========================================"
echo "  同步完成！"
echo "======================================${NC}"
echo ""
echo "📋 下一步操作:"
echo "  1. 检查代码: ls -la src/"
echo "  2. 提交到 Git: git add . && git commit -m 'sync: 从服务器同步代码'"
echo "  3. 启动本地服务器: npm run start:dev"
echo ""




