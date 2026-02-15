#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. Check current HQ .env for social/API keys ==="
$SSH "grep -E 'TWITTER_|TELEGRAM_|DISCORD_|GITHUB_|SMTP_|GOOGLE_CLIENT' /home/ubuntu/hq-backend/.env 2>/dev/null || echo 'No matches found'"

echo ""
echo "=== 2. Check current HQ .env for Gemini keys ==="
$SSH "grep -E 'GEMINI_' /home/ubuntu/hq-backend/.env 2>/dev/null | sed 's/=.*/=***/' || echo 'No matches'"

echo ""
echo "=== 3. Check .env file location and size ==="
$SSH "ls -la /home/ubuntu/hq-backend/.env 2>/dev/null"
$SSH "wc -l /home/ubuntu/hq-backend/.env 2>/dev/null"

echo ""
echo "=== 4. Check what social tool expects ==="
$SSH "grep -E 'TWITTER_|TELEGRAM_|DISCORD_|GITHUB_TOKEN|SMTP_' /home/ubuntu/hq-backend/src/modules/tools/builtin/social-tool.ts 2>/dev/null | head -20"

echo ""
echo "=== 5. Check HQ core service for agent model display ==="
$SSH "grep -E 'DEVREL|SOCIAL|CONTENT' /home/ubuntu/hq-backend/src/modules/core/hq-core.service.ts 2>/dev/null | head -10"
