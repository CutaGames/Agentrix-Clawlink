#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. Rsync updated HQ code ==="
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.env' \
    --exclude '.git' \
    -e "ssh -i $PEM -o StrictHostKeyChecking=no" \
    /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/hq-backend/ \
    ubuntu@57.182.89.146:/home/ubuntu/hq-backend/ 2>&1 | tail -5

echo ""
echo "=== 2. Verify key changes synced ==="
$SSH "grep 'Blue Verified' /home/ubuntu/hq-backend/src/modules/tools/builtin/social-tool.ts | head -1"
$SSH "grep 'Hunt free AI API' /home/ubuntu/hq-backend/src/hq/tick/auto-task-generator.service.ts | head -1"
$SSH "grep 'high-quality tweet' /home/ubuntu/hq-backend/src/hq/tick/auto-task-generator.service.ts | head -1"
$SSH "grep 'EVERY_30_MINUTES' /home/ubuntu/hq-backend/src/hq/tick/tick.service.ts | head -1"

echo ""
echo "=== 3. Rebuild ==="
$SSH "pm2 stop hq-backend 2>&1" | tail -2
$SSH "cd /home/ubuntu/hq-backend && rm -rf dist && npx nest build 2>&1" | tail -5

echo ""
echo "=== 4. Restart ==="
$SSH "pm2 start hq-backend 2>&1" | tail -5

echo ""
sleep 12
echo "=== 5. Verify startup ==="
$SSH "pm2 logs hq-backend --lines 10 --nostream 2>&1" | tail -10

echo ""
echo "=== 6. Save PM2 ==="
$SSH "pm2 save 2>&1"
echo "=== Done ==="
