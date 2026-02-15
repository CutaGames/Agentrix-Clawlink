#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. Fix missing env vars ==="
# social-tool.ts uses SMTP_PASS not SMTP_PASSWORD
$SSH "grep -q 'SMTP_PASS=' /home/ubuntu/hq-backend/.env && echo 'SMTP_PASS already exists' || echo 'SMTP_PASS=642QPtie7yXW9kUv' >> /home/ubuntu/hq-backend/.env && echo 'Added SMTP_PASS'"

# Add TELEGRAM_BOT_USERNAME if missing
$SSH "grep -q 'TELEGRAM_BOT_USERNAME' /home/ubuntu/hq-backend/.env && echo 'TELEGRAM_BOT_USERNAME exists' || (echo 'TELEGRAM_BOT_USERNAME=agentrixnetwork_bot' >> /home/ubuntu/hq-backend/.env && echo 'Added TELEGRAM_BOT_USERNAME')"

# Add TWITTER_CALLBACK_URL if missing
$SSH "grep -q 'TWITTER_CALLBACK_URL' /home/ubuntu/hq-backend/.env && echo 'TWITTER_CALLBACK_URL exists' || (echo 'TWITTER_CALLBACK_URL=https://api.agentrix.top/api/auth/twitter/callback' >> /home/ubuntu/hq-backend/.env && echo 'Added TWITTER_CALLBACK_URL')"

# Add GOOGLE_CLIENT_ID/SECRET if missing
$SSH "grep -q 'GOOGLE_CLIENT_ID' /home/ubuntu/hq-backend/.env && echo 'GOOGLE_CLIENT_ID exists' || (echo -e 'GOOGLE_CLIENT_ID=927105684228-djcpc9m1dtihh5c71ltm90d2hbmdl0r7.apps.googleusercontent.com\nGOOGLE_CLIENT_SECRET=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\nGOOGLE_CALLBACK_URL=https://api.agentrix.top/api/auth/google/callback' >> /home/ubuntu/hq-backend/.env && echo 'Added GOOGLE credentials')"

# Add DISCORD_CLIENT_ID/SECRET if missing
$SSH "grep -q 'DISCORD_CLIENT_ID' /home/ubuntu/hq-backend/.env && echo 'DISCORD_CLIENT_ID exists' || (echo -e 'DISCORD_CLIENT_ID=1463455414359298175\nDISCORD_CLIENT_SECRET=px-1uYgmHhvJ388TU0dl-SlwTDd4iLwl\nDISCORD_CALLBACK_URL=https://api.agentrix.top/api/auth/discord/callback' >> /home/ubuntu/hq-backend/.env && echo 'Added DISCORD credentials')"

echo ""
echo "=== 2. Verify all social keys present ==="
$SSH "grep -cE 'TWITTER_|TELEGRAM_|DISCORD_|GITHUB_|SMTP_|GOOGLE_' /home/ubuntu/hq-backend/.env"

echo ""
echo "=== 3. Check recent Twitter activity from PM2 logs ==="
$SSH "pm2 logs hq-backend --lines 500 --nostream 2>&1" | grep -iE "twitter|tweet|posted|publish.*social" | tail -10

echo ""
echo "=== 4. Check social tool execution history ==="
$SSH "docker exec agentrix-postgres psql -U paymind -d paymind -c \"SELECT at.title, at.status, at.created_at::date, LEFT(at.result::text, 200) FROM agent_tasks at JOIN hq_agents ha ON at.assigned_to_id = ha.id WHERE ha.code IN ('SOCIAL-01','CONTENT-01') AND at.title ILIKE '%twitter%' OR at.title ILIKE '%tweet%' OR at.title ILIKE '%social%publish%' ORDER BY at.created_at DESC LIMIT 10;\" 2>&1"

echo ""
echo "=== 5. Check auto-task-generator templates for SOCIAL-01 ==="
$SSH "grep -A 10 'SOCIAL' /home/ubuntu/hq-backend/src/hq/tick/auto-task-generator.service.ts | head -30"
