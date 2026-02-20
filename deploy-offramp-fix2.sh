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
echo "=== 2. Rebuilding backend Docker image ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "
  cd /home/ubuntu/Agentrix
  docker build -f backend/Dockerfile -t agentrix-backend ./backend 2>&1 | tail -10
"

echo ""
echo "=== 3. Restarting backend container ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "
  cd /home/ubuntu/Agentrix
  docker stop agentrix-backend 2>&1 || true
  docker rm agentrix-backend 2>&1 || true

  # Check if prod compose has env file
  if [ -f /home/ubuntu/Agentrix/docker-compose.prod.yml ]; then
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d backend 2>&1 | tail -5 || true
  fi
  docker-compose up -d backend 2>&1 | tail -5 || true

  # Wait
  sleep 15
  docker ps | grep agentrix-backend
"

echo ""
echo "=== 4. Quick health check ==="
sleep 3
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "curl -fs http://localhost:3001/api/health | head -c 200 || echo 'health check failed'"
