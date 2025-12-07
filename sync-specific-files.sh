#!/bin/bash
# 同步特定文件从服务器到本地

SERVER_USER="root"
SERVER_HOST="129.226.152.88"
SERVER_PATH="/var/www/agentrix-website/backend"
LOCAL_BACKEND="backend"

echo "=== 从服务器同步特定文件到本地 ==="
echo ""

# 要同步的文件列表
FILES=(
    "src/modules/ai-integration/gemini/gemini-integration.service.ts"
    "src/entities/admin-role.entity.ts"
    "src/migrations/1769000000000-CreateAdminTables.ts"
)

for file in "${FILES[@]}"; do
    echo "同步: $file"
    
    # 确保本地目录存在
    local_dir=$(dirname "$LOCAL_BACKEND/$file")
    mkdir -p "$local_dir"
    
    # 下载文件
    if scp "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/$file" \
        "$LOCAL_BACKEND/$file" 2>/dev/null; then
        echo "  ✅ 成功"
    else
        echo "  ⚠️  失败（文件可能不存在）"
    fi
done

echo ""
echo "=== 同步完成 ==="

