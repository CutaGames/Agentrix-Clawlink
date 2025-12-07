#!/bin/bash
# 从服务器同步代码到本地

set -e

# 配置
SERVER_USER="root"
SERVER_HOST="129.226.152.88"
SERVER_PATH="/var/www/agentrix-website/backend"
LOCAL_BACKEND_DIR="backend"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== 从服务器同步代码到本地 ===${NC}"
echo ""

# 检查是否在项目根目录
if [ ! -d "$LOCAL_BACKEND_DIR" ]; then
    echo "❌ 错误: 未找到 backend 目录"
    echo "   请在项目根目录执行此脚本"
    exit 1
fi

echo -e "${YELLOW}[1/4] 从服务器下载修改的文件...${NC}"

# 创建临时目录
TMP_DIR="/tmp/agentrix-sync-$(date +%s)"
mkdir -p "$TMP_DIR"

# 从服务器下载修改的文件
echo "下载修改的文件..."

# 下载整个 src 目录（或只下载修改的文件）
rsync -avz --progress \
    "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/src/" \
    "$TMP_DIR/src/" \
    --exclude="node_modules" \
    --exclude="*.js" \
    --exclude="*.js.map" \
    --exclude="*.d.ts" || {
    echo "⚠️  rsync 不可用，使用 scp..."
    
    # 使用 scp 下载关键文件
    scp -r "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/src/modules/ai-integration" \
        "$TMP_DIR/src/modules/" 2>/dev/null || true
    
    scp -r "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/src/entities" \
        "$TMP_DIR/src/" 2>/dev/null || true
    
    scp -r "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/src/migrations" \
        "$TMP_DIR/src/" 2>/dev/null || true
}

# 或者只下载特定修改的文件
echo ""
echo -e "${YELLOW}[2/4] 同步关键文件...${NC}"

# 下载 Gemini 集成文件
scp "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/src/modules/ai-integration/gemini/gemini-integration.service.ts" \
    "$LOCAL_BACKEND_DIR/src/modules/ai-integration/gemini/" 2>/dev/null && \
    echo "✅ 已同步 gemini-integration.service.ts" || \
    echo "⚠️  同步 gemini-integration.service.ts 失败"

# 下载实体文件（如果有修改）
scp "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/src/entities/admin-role.entity.ts" \
    "$LOCAL_BACKEND_DIR/src/entities/" 2>/dev/null && \
    echo "✅ 已同步 admin-role.entity.ts" || \
    echo "⚠️  同步 admin-role.entity.ts 失败（可能文件不存在）"

# 下载迁移文件
echo ""
echo -e "${YELLOW}[3/4] 同步迁移文件...${NC}"
scp "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/src/migrations/*.ts" \
    "$LOCAL_BACKEND_DIR/src/migrations/" 2>/dev/null && \
    echo "✅ 已同步迁移文件" || \
    echo "⚠️  同步迁移文件失败"

# 下载配置文件（如果有修改）
if scp "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/.env" \
    "$LOCAL_BACKEND_DIR/.env.server" 2>/dev/null; then
    echo "✅ 已下载服务器 .env 文件（保存为 .env.server）"
    echo "   请手动对比并合并到本地 .env"
fi

echo ""
echo -e "${YELLOW}[4/4] 同步完成！${NC}"
echo ""
echo "已同步的文件："
echo "  - src/modules/ai-integration/gemini/gemini-integration.service.ts"
echo "  - src/entities/admin-role.entity.ts（如果存在）"
echo "  - src/migrations/*.ts"
echo ""
echo "下一步："
echo "  1. 检查同步的文件是否正确"
echo "  2. 提交到 Git（如果需要）"
echo "  3. 继续本地开发"

