#!/bin/bash
PEM="/tmp/agentrix.pem"
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. dist中geminiChat函数 (关键行) ==="
$SSH 'grep -n "geminiChat\|fallbackModels\|allFlashModels\|waitForGeminiRateLimit\|GEMINI_MIN_INTERVAL\|quota exhausted for\|LEGAL-01.*gemini\|gemini-1.5-flash-8b" /home/ubuntu/Agentrix-independent-HQ/hq-backend/dist/modules/ai/hq-ai.service.js' | head -30

echo ""
echo "=== 2. dist中agentAIMapping (LEGAL-01) ==="
$SSH 'grep -A1 "LEGAL-01" /home/ubuntu/Agentrix-independent-HQ/hq-backend/dist/modules/ai/hq-ai.service.js' | head -5

echo ""
echo "=== 3. dist中 Gemini model quota exceeded 旧日志 ==="
$SSH 'grep -n "Gemini model.*quota exceeded\|quota exceeded on current key" /home/ubuntu/Agentrix-independent-HQ/hq-backend/dist/modules/ai/hq-ai.service.js' | head -5

echo ""
echo "=== 4. 源码中 Gemini model quota exceeded ==="
$SSH 'grep -rn "Gemini model.*quota exceeded\|quota exceeded on current key" /home/ubuntu/Agentrix-independent-HQ/hq-backend/src/modules/ai/hq-ai.service.ts' | head -5

echo ""
echo "=== 5. dist文件修改时间 ==="
$SSH 'ls -la /home/ubuntu/Agentrix-independent-HQ/hq-backend/dist/modules/ai/hq-ai.service.js'

echo ""
echo "=== 6. 源码文件修改时间 ==="
$SSH 'ls -la /home/ubuntu/Agentrix-independent-HQ/hq-backend/src/modules/ai/hq-ai.service.ts'
