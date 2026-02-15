#!/bin/bash
# Deploy to CORRECT path: /home/ubuntu/hq-backend/ (where PM2 actually runs)
# Includes: social-tool.ts try/catch fix + pure Gemini strategy
set -e

PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null || true
chmod 600 "$PEM"
SERVER="ubuntu@57.182.89.146"
RSYNC_SSH="ssh -i $PEM -o StrictHostKeyChecking=no"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no $SERVER"

echo "=== 1. Rsync to /home/ubuntu/hq-backend/ ==="
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.env' \
    --exclude '.git' \
    -e "$RSYNC_SSH" \
    /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/hq-backend/ \
    "$SERVER:/home/ubuntu/hq-backend/" 2>&1 | tail -5

echo ""
echo "=== 2. Verify key changes synced ==="
$SSH 'grep "LEGAL-01" /home/ubuntu/hq-backend/src/modules/ai/hq-ai.service.ts'
$SSH 'grep "try {" /home/ubuntu/hq-backend/src/modules/tools/builtin/social-tool.ts | head -3'

echo ""
echo "=== 3. Stop + clean + rebuild ==="
$SSH 'pm2 stop hq-backend 2>&1' | tail -2
$SSH 'rm -rf /home/ubuntu/hq-backend/dist && cd /home/ubuntu/hq-backend && npx nest build 2>&1'

echo ""
echo "=== 4. Verify dist ==="
$SSH 'grep "LEGAL-01" /home/ubuntu/hq-backend/dist/modules/ai/hq-ai.service.js'
$SSH 'grep "quota exhausted for" /home/ubuntu/hq-backend/dist/modules/ai/hq-ai.service.js | head -2'

echo ""
echo "=== 5. Restart PM2 ==="
$SSH 'pm2 start hq-backend 2>&1' | tail -5

echo ""
sleep 10
echo "=== 6. Verify startup ==="
$SSH 'pm2 logs hq-backend --lines 30 --nostream 2>&1' | grep -E "Agent AI Mappings|HQ AI Service initialized|Gemini initialized" | tail -5

echo ""
echo "=== Done! ==="
