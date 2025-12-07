#!/bin/bash
# 修复缺失文件问题

echo "=== 问题分析 ==="
echo "1. tsconfig.json 不存在 - 构建需要此文件"
echo "2. src/config/data-source.ts 不存在 - 迁移需要此文件"
echo "3. src 目录被删除 - 导致所有源代码丢失"
echo ""
echo "=== 立即修复方案（在服务器上执行）==="
echo ""
cat << 'EOF'
# 方法1：从备份恢复 src 目录（推荐）
cd /var/www/agentrix-website/backend
BACKUP_DIR="/var/www/agentrix-website-backup-20251204-125130"

if [ -d "$BACKUP_DIR/src" ]; then
    echo "✅ 从备份恢复 src 目录"
    cp -r "$BACKUP_DIR/src" .
    
    # 检查 tsconfig.json
    if [ ! -f "tsconfig.json" ] && [ -f "$BACKUP_DIR/tsconfig.json" ]; then
        cp "$BACKUP_DIR/tsconfig.json" .
    fi
    
    # 检查 nest-cli.json
    if [ ! -f "nest-cli.json" ] && [ -f "$BACKUP_DIR/nest-cli.json" ]; then
        cp "$BACKUP_DIR/nest-cli.json" .
    fi
    
    echo "✅ 文件恢复完成"
else
    echo "❌ 备份中没有 src 目录，使用方法2"
fi

# 方法2：重新解压（如果方法1失败）
# 注意：这次不要删除 src 目录
cd /var/www/agentrix-website/backend
rm -rf *.ts *.md .env 2>/dev/null || true
# ⚠️ 不要删除 src 目录！
tar -xzf /tmp/backend.tar.gz

# 验证关键文件
if [ ! -f "tsconfig.json" ]; then
    echo "❌ tsconfig.json 仍然不存在"
    echo "请检查打包是否包含此文件"
    exit 1
fi

if [ ! -f "src/config/data-source.ts" ]; then
    echo "❌ src/config/data-source.ts 仍然不存在"
    echo "请检查打包是否包含此文件"
    exit 1
fi

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
echo "=== 检查打包是否包含必要文件 ==="
cat << 'EOF2'
# 在本地检查打包内容
cd backend
tar -tzf ../backend.tar.gz | grep -E "(tsconfig.json|nest-cli.json|src/config/data-source.ts)" | head -20

# 如果这些文件不在打包中，需要重新打包
EOF2

