#!/bin/bash
# Deploy migration 1776700000003 to production and run it

REMOTE="ubuntu@57.182.89.146"
KEY="/tmp/agentrix.pem"
SRC_BASE="/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website"
REMOTE_BASE="/home/ubuntu/Agentrix"

echo "=== Copying new backend migration ==="
scp -o StrictHostKeyChecking=no -i "$KEY" \
  "$SRC_BASE/backend/src/migrations/1776700000003-ConvertPayIntentEnumsToVarchar.ts" \
  "$REMOTE:$REMOTE_BASE/backend/src/migrations/1776700000003-ConvertPayIntentEnumsToVarchar.ts"

echo "=== Running migration on production DB ==="
ssh -o StrictHostKeyChecking=no -i "$KEY" "$REMOTE" "
  docker exec agentrix-backend sh -c 'cd /app && npx typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts 2>&1 | tail -20'
"

echo "=== Done ==="
