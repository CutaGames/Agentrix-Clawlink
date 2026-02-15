#!/bin/bash
PEM="/tmp/agentrix.pem"
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. 检查源码是否同步 ==="
$SSH 'grep -n "gemini-1.5-flash-8b\|纯 Gemini\|fallbackModels\|waitForGeminiRateLimit\|GEMINI_MIN_INTERVAL" /home/ubuntu/Agentrix-independent-HQ/hq-backend/src/modules/ai/hq-ai.service.ts | head -20'

echo ""
echo "=== 2. 检查编译后的dist ==="
$SSH 'grep -n "gemini-1.5-flash-8b\|fallbackModels\|waitForGeminiRateLimit\|GEMINI_MIN_INTERVAL" /home/ubuntu/Agentrix-independent-HQ/hq-backend/dist/modules/ai/hq-ai.service.js 2>/dev/null | head -20'

echo ""
echo "=== 3. 重新build ==="
$SSH 'cd /home/ubuntu/Agentrix-independent-HQ/hq-backend && npm run build 2>&1 | tail -10'

echo ""
echo "=== 4. 再次检查dist ==="
$SSH 'grep -n "gemini-1.5-flash-8b\|fallbackModels\|waitForGeminiRateLimit\|GEMINI_MIN_INTERVAL" /home/ubuntu/Agentrix-independent-HQ/hq-backend/dist/modules/ai/hq-ai.service.js 2>/dev/null | head -20'

echo ""
echo "=== 5. 重启PM2 ==="
$SSH 'pm2 restart hq-backend 2>&1'

echo ""
echo "=== 6. 等待启动 ==="
sleep 8

echo ""
echo "=== 7. 检查新进程初始化日志 ==="
$SSH 'pm2 logs hq-backend --lines 30 --nostream 2>&1' | grep -E "Gemini initialized|Agent AI|mapping|HQ AI Service" | tail -10

echo ""
echo "=== 8. 检查tick.service.ts中的RPM guard ==="
$SSH 'grep -n "RPM guard\|tasksProcessed >= 6\|sleep(4000)\|await new Promise.*4000" /home/ubuntu/Agentrix-independent-HQ/hq-backend/src/hq/tick/tick.service.ts | head -10'
