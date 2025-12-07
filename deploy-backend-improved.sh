#!/bin/bash
# 改进的后端部署脚本 - 避免删除 package.json

echo "=== 1. 打包后端代码 ==="
cd backend
tar -czf ../backend.tar.gz --exclude=node_modules --exclude=dist --exclude=.git --exclude='*.log' .
echo "✅ 打包完成: backend.tar.gz"

echo ""
echo "=== 2. 上传到服务器 ==="
echo "请执行以下命令上传文件："
echo "scp backend.tar.gz root@129.226.152.88:/tmp/"

echo ""
echo "=== 3. 在服务器上执行以下命令 ==="
cat << 'SERVER_CMDS'
#!/bin/bash
# 改进的服务器端部署脚本

cd /var/www/agentrix-website/backend

# 停止服务
pm2 stop agentrix-backend

# 备份
BACKUP_DIR="/var/www/agentrix-website-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r . "$BACKUP_DIR/" 2>/dev/null || true
echo "备份已保存到: $BACKUP_DIR"

# 清理旧文件（⚠️ 注意：不删除 package.json 和 package-lock.json）
echo "清理旧文件..."
rm -rf src scripts *.ts *.md .env 2>/dev/null || true
# 保留：package.json, package-lock.json, node_modules, dist

# 解压新代码
echo "解压新代码..."
tar -xzf /tmp/backend.tar.gz

# 安装依赖
echo "安装依赖..."
npm install

# 构建项目
echo "构建项目..."
npm run build

# 验证构建
if [ ! -f "dist/main.js" ]; then
    echo "❌ 构建失败: dist/main.js 不存在"
    exit 1
fi

# 运行数据库迁移
echo "运行数据库迁移..."
npm run migration:run

# 重启服务
pm2 restart agentrix-backend --update-env

# 查看服务状态
pm2 status

# 查看日志
echo ""
echo "=== 最近 20 行日志 ==="
pm2 logs agentrix-backend --lines 20 --nostream
SERVER_CMDS

