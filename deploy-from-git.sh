#!/bin/bash
# 从 Git 部署到服务器 - 推荐使用此脚本

set -e

# 配置
SERVER_USER="root"
SERVER_HOST="129.226.152.88"
SERVER_PATH="/var/www/agentrix-website/backend"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== 从 Git 部署到服务器 ===${NC}"
echo ""

# 检查本地是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}⚠️  警告: 本地有未提交的更改${NC}"
    echo "请先提交或暂存更改："
    echo "  git add ."
    echo "  git commit -m '你的提交信息'"
    echo "  git push origin main"
    read -p "是否继续部署？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 确保代码已推送到远程
echo -e "${YELLOW}[1/5] 检查 Git 状态...${NC}"
git push origin main || {
    echo -e "${RED}❌ 推送失败，请先解决 Git 问题${NC}"
    exit 1
}
echo -e "${GREEN}✅ 代码已推送到远程仓库${NC}"

# 在服务器上执行部署
echo ""
echo -e "${YELLOW}[2/5] 连接到服务器并部署...${NC}"
ssh "$SERVER_USER@$SERVER_HOST" << 'REMOTE_SCRIPT'
set -e

cd /var/www/agentrix-website/backend

echo "=== 从 Git 部署 ==="

# 停止服务
echo "[1/6] 停止服务..."
pm2 stop agentrix-backend || true

# 备份当前代码
echo "[2/6] 备份当前代码..."
BACKUP_DIR="/var/www/agentrix-website-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r . "$BACKUP_DIR/" 2>/dev/null || true
echo "✅ 备份已保存到: $BACKUP_DIR"

# 拉取最新代码
echo "[3/6] 从 Git 拉取最新代码..."
git fetch origin
git reset --hard origin/main
echo "✅ 代码已更新"

# 安装依赖
echo "[4/6] 安装依赖..."
npm install

# 构建项目
echo "[5/6] 构建项目..."
npm run build

# 验证构建
if [ ! -f "dist/main.js" ]; then
    echo "❌ 构建失败: dist/main.js 不存在"
    exit 1
fi

# 运行数据库迁移
echo "[6/6] 运行数据库迁移..."
npm run migration:run || echo "⚠️  迁移失败或无需迁移"

# 重启服务
echo "重启服务..."
pm2 restart agentrix-backend --update-env

# 查看服务状态
pm2 status

# 查看日志
echo ""
echo "=== 最近 20 行日志 ==="
pm2 logs agentrix-backend --lines 20 --nostream
REMOTE_SCRIPT

echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"

