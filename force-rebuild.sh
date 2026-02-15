#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null || true
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. Stop PM2 ==="
$SSH 'pm2 stop hq-backend 2>&1'

echo ""
echo "=== 2. Clean dist ==="
$SSH 'rm -rf /home/ubuntu/Agentrix-independent-HQ/hq-backend/dist'

echo ""
echo "=== 3. Verify source has new code ==="
$SSH 'grep "gemini-1.5-flash-8b" /home/ubuntu/Agentrix-independent-HQ/hq-backend/src/modules/ai/hq-ai.service.ts | wc -l'

echo ""
echo "=== 4. Full rebuild ==="
$SSH 'cd /home/ubuntu/Agentrix-independent-HQ/hq-backend && npx nest build 2>&1'

echo ""
echo "=== 5. Verify dist has new code ==="
echo "--- LEGAL-01 mapping ---"
$SSH 'grep "LEGAL-01" /home/ubuntu/Agentrix-independent-HQ/hq-backend/dist/modules/ai/hq-ai.service.js'
echo ""
echo "--- fallbackModels ---"
$SSH 'grep "fallbackModels" /home/ubuntu/Agentrix-independent-HQ/hq-backend/dist/modules/ai/hq-ai.service.js | head -5'
echo ""
echo "--- new log format ---"
$SSH 'grep "quota exhausted for" /home/ubuntu/Agentrix-independent-HQ/hq-backend/dist/modules/ai/hq-ai.service.js | head -3'

echo ""
echo "=== 6. Restart PM2 ==="
$SSH 'pm2 start hq-backend 2>&1'

echo ""
echo "=== 7. Wait for startup ==="
sleep 8

echo ""
echo "=== 8. Check new PID logs ==="
NEW_PID=$($SSH 'pm2 pid hq-backend 2>/dev/null')
echo "New PID: $NEW_PID"
$SSH "pm2 logs hq-backend --lines 20 --nostream 2>&1" | grep "$NEW_PID" | head -15

echo ""
echo "=== 9. Check PM2 script path ==="
$SSH 'pm2 describe hq-backend 2>&1' | grep -E "script path|exec cwd|node_args|interpreter"
