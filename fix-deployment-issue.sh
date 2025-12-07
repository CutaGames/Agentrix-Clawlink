#!/bin/bash
# 修复部署问题 - package.json 被删除

echo "=== 问题分析 ==="
echo "1. 删除命令 'rm -rf *.json' 误删了 package.json"
echo "2. 解压后没有 package.json，导致 npm 命令失败"
echo "3. 缺少依赖，服务无法启动"
echo ""
echo "=== 立即修复命令（在服务器上执行）==="
echo ""
cat << 'EOF'
# 方法1：从备份恢复 package.json
BACKUP_DIR="/var/www/agentrix-website-backup-20251204-125130"
if [ -f "$BACKUP_DIR/package.json" ]; then
    echo "✅ 从备份恢复 package.json"
    cp "$BACKUP_DIR/package.json" /var/www/agentrix-website/backend/
    cd /var/www/agentrix-website/backend
    npm install
    npm run build
    npm run migration:run
    pm2 restart agentrix-backend --update-env
else
    echo "❌ 备份中没有 package.json"
    echo "需要重新解压（不删除 package.json）"
fi

# 方法2：重新解压（推荐）
cd /var/www/agentrix-website/backend
# 只删除特定文件，保留 package.json
rm -rf src scripts *.ts *.md .env 2>/dev/null || true
# 重新解压
tar -xzf /tmp/backend.tar.gz
# 安装依赖
npm install
# 构建
npm run build
# 迁移
npm run migration:run
# 重启
pm2 restart agentrix-backend --update-env
EOF

echo ""
echo "=== 改进后的部署脚本（下次使用）==="
cat << 'EOF2'
#!/bin/bash
# 改进的部署脚本 - 避免删除 package.json

cd /var/www/agentrix-website/backend

# 停止服务
pm2 stop agentrix-backend

# 备份
BACKUP_DIR="/var/www/agentrix-website-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r . "$BACKUP_DIR/" 2>/dev/null || true
echo "备份已保存到: $BACKUP_DIR"

# 清理旧文件（⚠️ 注意：不删除 package.json）
rm -rf src scripts *.ts *.md .env 2>/dev/null || true
# 保留：package.json, package-lock.json, node_modules, dist

# 解压新代码
tar -xzf /tmp/backend.tar.gz

# 安装依赖
npm install

# 构建项目
npm run build

# 验证构建
if [ ! -f "dist/main.js" ]; then
    echo "❌ 构建失败: dist/main.js 不存在"
    exit 1
fi

# 运行数据库迁移
npm run migration:run

# 重启服务
pm2 restart agentrix-backend --update-env

# 查看状态
pm2 status
pm2 logs agentrix-backend --lines 20 --nostream
EOF2

