#!/bin/bash
# 服务器端部署命令 - 在服务器上执行

# 进入后端目录（重要！必须先切换目录）
cd /var/www/agentrix-website/backend

# 停止服务
pm2 stop agentrix-backend

# 备份当前代码
BACKUP_DIR="/var/www/agentrix-website-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r . "$BACKUP_DIR/" 2>/dev/null || true
echo "备份已保存到: $BACKUP_DIR"

# 清理旧文件（保留 node_modules 和 dist，稍后重新构建）
rm -rf src scripts *.ts *.json *.md .env 2>/dev/null || true

# 解压新代码
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

