#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== Latest tick results ==="
$SSH "pm2 logs hq-backend --lines 200 --nostream 2>&1" | grep -E "Tick.*完成|✅.*completed task|❌.*task failed|Gemini key.*model:|All Gemini models exhausted|quota exhausted" | tail -30

echo ""
echo "=== PM2 restart count ==="
$SSH "pm2 list 2>&1"

echo ""
echo "=== PM2 startup command saved? ==="
$SSH "pm2 startup 2>&1 | head -5"
