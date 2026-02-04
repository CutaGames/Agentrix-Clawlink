#!/bin/bash

# Script to fix HQ Backend on Tokyo server

# Copy key to WSL with proper permissions
WINDOWS_KEY="/mnt/c/Users/15279/Desktop/agentrix.pem"
KEY_PATH="/tmp/agentrix_key.pem"
SERVER="ubuntu@57.182.89.146"

echo "Copying key with proper permissions..."
cp "$WINDOWS_KEY" "$KEY_PATH"
chmod 600 "$KEY_PATH"

echo "Using key: $KEY_PATH"
echo ""

echo "=== Step 1: Checking current file content at line 41 ==="
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no $SERVER "sed -n '38,44p' /home/ubuntu/Agentrix-independent-HQ/hq-backend/dist/modules/core/hq-core.controller.js"
echo ""

echo "=== Step 2: Applying fix ==="
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no $SERVER 'sed -i '\''s/this\.logger\.debug(" Request body:  + JSON\.stringify(request));/this.logger.debug("Request body: " + JSON.stringify(request));/'\'' /home/ubuntu/Agentrix-independent-HQ/hq-backend/dist/modules/core/hq-core.controller.js'
echo "Fix applied"
echo ""

echo "=== Step 3: Verifying fix ==="
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no $SERVER "sed -n '38,44p' /home/ubuntu/Agentrix-independent-HQ/hq-backend/dist/modules/core/hq-core.controller.js"
echo ""

echo "=== Step 4: Restarting PM2 ==="
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no $SERVER "pm2 restart hq-backend"
echo ""

echo "=== Step 5: Waiting for service to start (5 seconds) ==="
sleep 5
echo ""

echo "=== Step 6: Testing API ==="
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no $SERVER 'curl -s -X POST http://localhost:3005/api/hq/chat/completion -H "Content-Type: application/json" -d '\''{"messages":[{"role":"user","content":"hi"}]}'\'' --max-time 60'
echo ""
echo ""

echo "=== Step 7: Checking logs ==="
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no $SERVER "pm2 logs hq-backend --lines 25 --nostream"
echo ""

echo "=== Done ==="
