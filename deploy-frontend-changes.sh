#!/bin/bash
set -e

REMOTE="ubuntu@57.182.89.146"
KEY="/tmp/agentrix.pem"
SRC_BASE="/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website"
REMOTE_BASE="/home/ubuntu/Agentrix"

echo "=== Deploying frontend changes ==="

# Copy changed frontend files
echo "Copying StructuredResponseCard.tsx..."
scp -o StrictHostKeyChecking=no -i "$KEY" \
  "$SRC_BASE/frontend/components/agent/StructuredResponseCard.tsx" \
  "$REMOTE:$REMOTE_BASE/frontend/components/agent/StructuredResponseCard.tsx"

echo "Copying payment.api.ts..."
scp -o StrictHostKeyChecking=no -i "$KEY" \
  "$SRC_BASE/frontend/lib/api/payment.api.ts" \
  "$REMOTE:$REMOTE_BASE/frontend/lib/api/payment.api.ts"

echo "=== Rebuilding frontend Docker image ==="
ssh -o StrictHostKeyChecking=no -i "$KEY" "$REMOTE" "
  cd $REMOTE_BASE
  docker build -t agentrix-frontend:latest -f frontend/Dockerfile ./frontend 2>&1 | tail -20
"

echo "=== Restarting frontend container ==="
ssh -o StrictHostKeyChecking=no -i "$KEY" "$REMOTE" "
  cd $REMOTE_BASE
  docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate frontend
  sleep 3
  docker ps | grep frontend
"

echo "=== Done! ==="
