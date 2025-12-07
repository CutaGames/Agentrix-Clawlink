#!/bin/bash
# 上传 OpenAI 集成代码到服务器

echo "📤 上传 OpenAI 集成代码到服务器..."
echo ""

SERVER="root@129.226.152.88"
REMOTE_PATH="/var/www/agentrix-website/backend/src/modules/ai-integration/openai"

# 上传文件
echo "上传文件..."
scp backend/src/modules/ai-integration/openai/*.ts $SERVER:$REMOTE_PATH/

echo ""
echo "✅ 上传完成！"
echo ""
echo "下一步："
echo "1. SSH 到服务器: ssh $SERVER"
echo "2. 进入目录: cd /var/www/agentrix-website/backend"
echo "3. 重新构建: npm run build"
echo "4. 重启服务: pm2 restart agentrix-backend --update-env"
echo "5. 检查路由: pm2 logs agentrix-backend | grep -i 'openai.*chat'"

