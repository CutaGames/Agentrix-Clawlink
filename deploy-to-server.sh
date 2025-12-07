#!/bin/bash
# 一键部署脚本 - 从本地部署到服务器

set -e  # 遇到错误立即退出

# 配置
SERVER_USER="root"
SERVER_HOST="129.226.152.88"
SERVER_PATH="/var/www/agentrix-website/backend"
BACKEND_DIR="backend"
TAR_FILE="backend.tar.gz"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Agentrix 后端一键部署脚本 ===${NC}"
echo ""

# 检查是否在项目根目录
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ 错误: 未找到 backend 目录${NC}"
    echo "   请在项目根目录执行此脚本"
    exit 1
fi

# 步骤1: 打包
echo -e "${YELLOW}[1/6] 打包后端代码...${NC}"
cd "$BACKEND_DIR"

# 清理旧的打包文件
rm -f "../$TAR_FILE"

# 打包（排除不需要的文件）
tar -czf "../$TAR_FILE" \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git \
    --exclude='*.log' \
    --exclude='*.tsbuildinfo' \
    --exclude=uploads \
    --exclude=backups \
    .

if [ ! -f "../$TAR_FILE" ]; then
    echo -e "${RED}❌ 打包失败${NC}"
    exit 1
fi

FILE_SIZE=$(du -h "../$TAR_FILE" | cut -f1)
echo -e "${GREEN}✅ 打包完成: $TAR_FILE ($FILE_SIZE)${NC}"
cd ..

# 步骤2: 上传
echo ""
echo -e "${YELLOW}[2/6] 上传到服务器...${NC}"
scp "$TAR_FILE" "$SERVER_USER@$SERVER_HOST:/tmp/" || {
    echo -e "${RED}❌ 上传失败${NC}"
    exit 1
}
echo -e "${GREEN}✅ 上传完成${NC}"

# 步骤3: 在服务器上执行部署
echo ""
echo -e "${YELLOW}[3/6] 在服务器上部署...${NC}"
ssh "$SERVER_USER@$SERVER_HOST" << 'REMOTE_SCRIPT'
set -e

cd /var/www/agentrix-website/backend

echo "停止服务..."
pm2 stop agentrix-backend || true

echo "备份当前代码..."
BACKUP_DIR="/var/www/agentrix-website-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r . "$BACKUP_DIR/" 2>/dev/null || true
echo "备份已保存到: $BACKUP_DIR"

echo "清理旧文件（保留 node_modules, dist, package.json）..."
rm -rf src scripts *.ts *.md .env 2>/dev/null || true

echo "解压新代码..."
tar -xzf /tmp/backend.tar.gz

echo "安装依赖（如果需要）..."
npm install

echo "构建项目..."
npm run build

echo "验证构建..."
if [ ! -f "dist/main.js" ]; then
    echo "❌ 构建失败: dist/main.js 不存在"
    exit 1
fi

echo "运行数据库迁移..."
npm run migration:run || echo "⚠️  迁移执行有警告，但继续..."

echo "重启服务..."
pm2 restart agentrix-backend --update-env

echo "等待服务启动..."
sleep 3

echo "检查服务状态..."
pm2 status

echo "测试 API..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ 服务健康检查通过"
else
    echo "⚠️  服务可能未完全启动，请检查日志"
fi

echo ""
echo "=== 部署完成 ==="
echo "查看日志: pm2 logs agentrix-backend"
REMOTE_SCRIPT

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ 部署成功！${NC}"
    echo ""
    echo "服务器信息："
    echo "  - API 地址: http://$SERVER_HOST:3001"
    echo "  - API 文档: http://$SERVER_HOST:3001/api/docs"
    echo "  - 健康检查: http://$SERVER_HOST:3001/api/health"
    echo ""
    echo "查看服务器日志："
    echo "  ssh $SERVER_USER@$SERVER_HOST 'pm2 logs agentrix-backend --lines 50'"
else
    echo ""
    echo -e "${RED}❌ 部署过程中出现错误${NC}"
    exit 1
fi

