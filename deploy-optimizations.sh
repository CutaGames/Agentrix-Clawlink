#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. Rsync updated code ==="
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.env' \
    --exclude '.git' \
    -e "ssh -i $PEM -o StrictHostKeyChecking=no" \
    /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/hq-backend/ \
    ubuntu@57.182.89.146:/home/ubuntu/hq-backend/ 2>&1 | tail -5

echo ""
echo "=== 2. Verify key changes ==="
$SSH "grep 'EVERY_30_MINUTES' /home/ubuntu/hq-backend/src/hq/tick/tick.service.ts"
$SSH "grep 'lastQuotaExhaustedAt' /home/ubuntu/hq-backend/src/hq/tick/tick.service.ts | head -2"
$SSH "grep 'markQuotaExhausted' /home/ubuntu/hq-backend/src/hq/tick/tick.service.ts | head -2"

echo ""
echo "=== 3. Stop + rebuild + restart ==="
$SSH "pm2 stop hq-backend 2>&1" | tail -2
$SSH "rm -rf /home/ubuntu/hq-backend/dist && cd /home/ubuntu/hq-backend && npx nest build 2>&1" | tail -5

echo ""
echo "=== 4. Verify dist ==="
$SSH "grep 'EVERY_30_MINUTES' /home/ubuntu/hq-backend/dist/hq/tick/tick.service.js"
$SSH "grep 'markQuotaExhausted' /home/ubuntu/hq-backend/dist/hq/tick/tick.service.js | head -2"

echo ""
echo "=== 5. Restart ==="
$SSH "pm2 start hq-backend 2>&1" | tail -5

echo ""
sleep 15
echo "=== 6. Verify startup ==="
$SSH "pm2 logs hq-backend --lines 15 --nostream 2>&1" | tail -15

echo ""
echo "=== 7. Save PM2 ==="
$SSH "pm2 save 2>&1"

echo ""
echo "=== Done! ==="
