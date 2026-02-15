#!/bin/bash
# Final Deployment Script for Tokyo Server

SERVER="ubuntu@57.182.89.146"
PEM_KEY="/mnt/c/Users/15279/Desktop/agentrix.pem"
REMOTE_PATH="/home/ubuntu/hq-backend"
REMOTE_CONSOLE_PATH="/home/ubuntu/hq-console"

echo "=== Agentrix HQ Final Deployment ==="

# Copy PEM to WSL temp directory to fix permissions
LOCAL_PEM="/tmp/agentrix.pem"
cp "$PEM_KEY" "$LOCAL_PEM"
chmod 600 "$LOCAL_PEM"
PEM_KEY="$LOCAL_PEM"

# Create directories on remote if needed
ssh -i "$PEM_KEY" "$SERVER" "mkdir -p $REMOTE_PATH/src/modules/ai $REMOTE_PATH/src/modules/core $REMOTE_PATH/src/hq/tick $REMOTE_PATH/src/entities $REMOTE_PATH/src/modules/tools/builtin $REMOTE_CONSOLE_PATH/src/app/tasks"

# Upload modified backend files
echo "📤 Uploading backend files..."
scp -i "$PEM_KEY" hq-backend/src/modules/ai/hq-ai.service.ts "$SERVER:$REMOTE_PATH/src/modules/ai/"
scp -i "$PEM_KEY" hq-backend/src/modules/core/unified-chat.service.ts "$SERVER:$REMOTE_PATH/src/modules/core/"
scp -i "$PEM_KEY" hq-backend/src/modules/core/hq-core.service.ts "$SERVER:$REMOTE_PATH/src/modules/core/"
scp -i "$PEM_KEY" hq-backend/src/modules/core/prompt-builder.service.ts "$SERVER:$REMOTE_PATH/src/modules/core/"
scp -i "$PEM_KEY" hq-backend/src/hq/tick/auto-task-generator.service.ts "$SERVER:$REMOTE_PATH/src/hq/tick/"
scp -i "$PEM_KEY" hq-backend/src/entities/hq-agent.entity.ts "$SERVER:$REMOTE_PATH/src/entities/"
scp -i "$PEM_KEY" hq-backend/src/modules/tools/builtin/social-tool.ts "$SERVER:$REMOTE_PATH/src/modules/tools/builtin/"

# Upload modified frontend files
echo "📤 Uploading console files..."
scp -i "$PEM_KEY" hq-console/src/app/tasks/page.tsx "$SERVER:$REMOTE_CONSOLE_PATH/src/app/tasks/"

# Remote build
echo "🔨 Remote build and restart..."
ssh -i "$PEM_KEY" "$SERVER" << ENDSSH
cd $REMOTE_PATH
npm run build
pm2 restart hq-backend

cd $REMOTE_CONSOLE_PATH
npm run build
pm2 restart hq-console

echo "✅ Deployment complete!"
pm2 status
ENDSSH
