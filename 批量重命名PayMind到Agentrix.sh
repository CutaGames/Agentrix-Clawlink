#!/bin/bash

# ========================================
# 批量重命名 PayMind → Agentrix
# ========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================"
echo "  批量重命名: PayMind → Agentrix"
echo -e "========================================${NC}"
echo ""

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

echo -e "${YELLOW}此脚本将替换以下内容：${NC}"
echo "  - PayMind → Agentrix"
echo "  - paymind → agentrix"
echo "  - PAYMIND → AGENTRIX"
echo "  - paymindfrontend → agentrixfrontend"
echo ""
echo -e "${RED}注意: 这将修改所有代码文件！${NC}"
echo ""
read -p "确认继续? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo -e "${RED}已取消操作${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}开始批量替换...${NC}"
echo ""

# 计数器
total=0

# 查找并替换（排除 node_modules, .git, dist, build）
echo -e "${BLUE}[1/5] 替换 TypeScript/JavaScript 文件...${NC}"
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
    ! -path "*/node_modules/*" \
    ! -path "*/.git/*" \
    ! -path "*/dist/*" \
    ! -path "*/build/*" \
    -exec sed -i 's/PayMind/Agentrix/g; s/paymind/agentrix/g; s/PAYMIND/AGENTRIX/g' {} + 2>/dev/null || true
echo -e "${GREEN}✓ 完成${NC}"

echo -e "${BLUE}[2/5] 替换 JSON 配置文件...${NC}"
find . -type f -name "*.json" \
    ! -path "*/node_modules/*" \
    ! -path "*/.git/*" \
    ! -path "*/dist/*" \
    ! -path "*/build/*" \
    -exec sed -i 's/PayMind/Agentrix/g; s/paymind/agentrix/g; s/PAYMIND/AGENTRIX/g; s/paymindfrontend/agentrixfrontend/g' {} + 2>/dev/null || true
echo -e "${GREEN}✓ 完成${NC}"

echo -e "${BLUE}[3/5] 替换 Shell 脚本...${NC}"
find . -type f \( -name "*.sh" -o -name "*.bat" -o -name "*.ps1" \) \
    ! -path "*/node_modules/*" \
    ! -path "*/.git/*" \
    -exec sed -i 's/PayMind/Agentrix/g; s/paymind/agentrix/g; s/PAYMIND/AGENTRIX/g; s/paymindfrontend/agentrixfrontend/g' {} + 2>/dev/null || true
echo -e "${GREEN}✓ 完成${NC}"

echo -e "${BLUE}[4/5] 替换 Python 文件...${NC}"
find . -type f -name "*.py" \
    ! -path "*/node_modules/*" \
    ! -path "*/.git/*" \
    -exec sed -i 's/PayMind/Agentrix/g; s/paymind/agentrix/g; s/PAYMIND/AGENTRIX/g' {} + 2>/dev/null || true
echo -e "${GREEN}✓ 完成${NC}"

echo -e "${BLUE}[5/5] 替换 Markdown 文档...${NC}"
find . -type f -name "*.md" \
    ! -path "*/node_modules/*" \
    ! -path "*/.git/*" \
    -exec sed -i 's/PayMind/Agentrix/g; s/paymind/agentrix/g; s/PAYMIND/AGENTRIX/g; s/paymindfrontend/agentrixfrontend/g' {} + 2>/dev/null || true
echo -e "${GREEN}✓ 完成${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 批量替换完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}重要提醒：${NC}"
echo "  1. 文件夹名称需要手动重命名："
echo "     - paymindfrontend/ → agentrixfrontend/"
echo "     - sdk-python/paymind/ → sdk-python/agentrix/"
echo ""
echo "  2. 请检查以下文件是否正确："
echo "     - package.json"
echo "     - backend/package.json"
echo "     - agentrixfrontend/package.json (重命名后)"
echo ""
echo "  3. 建议运行测试确认无问题"
echo ""
echo -e "${BLUE}下一步操作：${NC}"
echo "  # 重命名文件夹"
echo "  mv paymindfrontend agentrixfrontend"
echo "  mv sdk-python/paymind sdk-python/agentrix"
echo ""
echo "  # 重新安装依赖"
echo "  cd backend && npm install"
echo "  cd ../agentrixfrontend && npm install"
echo ""
