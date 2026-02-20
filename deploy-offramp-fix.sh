#!/bin/bash
set -e

PEM=/tmp/agentrix.pem
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null || true
chmod 600 "$PEM"
SERVER="ubuntu@57.182.89.146"
REMOTE_SRC="/home/ubuntu/Agentrix/backend/src"

echo "=== 1. Copying modified files to production ==="

scp -i "$PEM" -o StrictHostKeyChecking=no \
  /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend/src/modules/payment/transak-provider.service.ts \
  "$SERVER:$REMOTE_SRC/modules/payment/transak-provider.service.ts"

scp -i "$PEM" -o StrictHostKeyChecking=no \
  /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend/src/modules/payment/payment.controller.ts \
  "$SERVER:$REMOTE_SRC/modules/payment/payment.controller.ts"

scp -i "$PEM" -o StrictHostKeyChecking=no \
  /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend/src/migrations/1776700000002-AddMetadataToRiskAssessments.ts \
  "$SERVER:$REMOTE_SRC/migrations/1776700000002-AddMetadataToRiskAssessments.ts"

echo "Files copied."

echo ""
echo "=== 2. Rebuilding backend on production ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "
  cd /home/ubuntu/Agentrix/backend
  npm run build 2>&1 | tail -10
"

echo ""
echo "=== 3. Rebuilding Docker image ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "
  cd /home/ubuntu/Agentrix
  docker build -f backend/Dockerfile -t agentrix-backend ./backend 2>&1 | tail -10
"

echo ""
echo "=== 4. Restarting backend container ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "
  docker stop agentrix-backend
  docker rm agentrix-backend
  cd /home/ubuntu/Agentrix
  docker-compose up -d agentrix-backend 2>&1 | tail -10
"

echo ""
echo "=== 5. Waiting 15s for startup ==="
sleep 15

echo ""
echo "=== 6. Health check ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "docker ps | grep agentrix-backend"
