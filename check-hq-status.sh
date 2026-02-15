#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. PM2 Status ==="
$SSH "pm2 list 2>&1"

echo ""
echo "=== 2. PM2 saved list ==="
$SSH "pm2 resurrect 2>&1; pm2 list 2>&1"

echo ""
echo "=== 3. Check hq-backend directory ==="
$SSH "ls -la /home/ubuntu/hq-backend/dist/main.js 2>&1"

echo ""
echo "=== 4. Recent PM2 logs (last 200 lines) ==="
$SSH "pm2 logs hq-backend --lines 200 --nostream 2>&1" | tail -100

echo ""
echo "=== 5. Check if process crashed ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-error.log 2>&1" | tail -50

echo ""
echo "=== 6. Server uptime and disk ==="
$SSH "uptime; df -h / 2>&1"
