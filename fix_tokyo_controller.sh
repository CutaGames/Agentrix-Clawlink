#!/bin/bash
# One-shot fix for Tokyo server controller.js syntax error

set -e

# Find the pem file
PEM_FILE="/mnt/c/Users/$(ls /mnt/c/Users | grep -vE 'Public|Default|All Users|Default User' | head -1)/Desktop/agentrix.pem"

echo "Using PEM file: $PEM_FILE"

if [ ! -f "$PEM_FILE" ]; then
    echo "ERROR: PEM file not found at $PEM_FILE"
    exit 1
fi

chmod 400 "$PEM_FILE" 2>/dev/null || true

TARGET_FILE="/home/ubuntu/Agentrix-independent-HQ/hq-backend/dist/modules/core/hq-core.controller.js"

echo "=== Step 1: Current content around line 41 ==="
ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no ubuntu@57.182.89.146 "sed -n '38,44p' $TARGET_FILE"

echo ""
echo "=== Step 2: Fixing the syntax error ==="
# The broken line is: this.logger.debug(" Request body:  + JSON.stringify(request));
# It should be: this.logger.debug("Request body: " + JSON.stringify(request));
ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no ubuntu@57.182.89.146 "sed -i 's/this\.logger\.debug(\" Request body:  + JSON\.stringify(request));/this.logger.debug(\"Request body: \" + JSON.stringify(request));/' $TARGET_FILE"

echo "Fix applied"

echo ""
echo "=== Step 3: Verifying the fix ==="
ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no ubuntu@57.182.89.146 "sed -n '38,44p' $TARGET_FILE"

echo ""
echo "=== Step 4: Restarting PM2 ==="
ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no ubuntu@57.182.89.146 "pm2 restart hq-backend"

echo ""
echo "=== Step 5: Waiting 5 seconds for service to start ==="
sleep 5

echo ""
echo "=== Step 6: Testing API ==="
ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no ubuntu@57.182.89.146 "curl -s -X POST http://localhost:3005/api/hq/chat/completion -H 'Content-Type: application/json' -d '{\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}' --max-time 60"

echo ""
echo ""
echo "=== Step 7: Checking PM2 logs ==="
ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no ubuntu@57.182.89.146 "pm2 logs hq-backend --lines 30 --nostream"

echo ""
echo "=== Done ==="
