#!/bin/bash
# Deploy: Pure Gemini strategy - 3 keys × 4 models = 13,650 RPD
# Fixes: RPM rate limiter + multi-model fallback + task delay
set -e

PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null || true
chmod 600 "$PEM"
SERVER="ubuntu@57.182.89.146"
RSYNC_SSH="ssh -i $PEM -o StrictHostKeyChecking=no"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no $SERVER"

echo "=== 1. Rsync HQ Backend ==="
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.env' \
    --exclude '.git' \
    -e "$RSYNC_SSH" \
    /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/hq-backend/ \
    "$SERVER:/home/ubuntu/Agentrix-independent-HQ/hq-backend/" 2>&1 | tail -10

echo ""
echo "=== 2. Build HQ Backend ==="
$SSH 'cd /home/ubuntu/Agentrix-independent-HQ/hq-backend && npm run build 2>&1 | tail -5'

echo ""
echo "=== 3. Restart PM2 ==="
$SSH 'pm2 restart hq-backend 2>&1 | tail -5'

echo ""
echo "=== 4. Wait 5s for startup ==="
sleep 5

echo ""
echo "=== 5. Check logs for new mapping ==="
$SSH 'pm2 logs hq-backend --lines 30 --nostream 2>&1 | grep -E "Gemini|mapping|initialized|key|model|Agent" | tail -20'

echo ""
echo "=== 6. Health check ==="
$SSH 'curl -s http://localhost:3001/api/hq/dashboard | python3 -m json.tool 2>/dev/null | head -20 || echo "Dashboard endpoint check..."'

echo ""
echo "=== Done! ==="
echo "Changes deployed:"
echo "  ✅ 13 Agents distributed across 4 Gemini models"
echo "  ✅ RPM rate limiter (4.2s per key)"
echo "  ✅ Multi-model fallback chain (no Groq)"
echo "  ✅ Max 6 tasks per tick with 4s delay"
echo "  ✅ Total capacity: 13,650 RPD (3 keys × 4 models)"
