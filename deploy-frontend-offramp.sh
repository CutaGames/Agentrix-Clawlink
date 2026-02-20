#!/bin/bash
set -e

PEM=/tmp/agentrix.pem
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null || true
chmod 600 "$PEM"
SERVER="ubuntu@57.182.89.146"
REMOTE_FRONTEND_SRC="/home/ubuntu/Agentrix/frontend"

echo "=== 1. Check frontend source path ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "ls $REMOTE_FRONTEND_SRC/components/agent/StructuredResponseCard.tsx 2>/dev/null && echo found || echo not_found"

echo ""
echo "=== 2. Copy modified frontend files ==="
scp -i "$PEM" -o StrictHostKeyChecking=no \
  /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend/components/agent/StructuredResponseCard.tsx \
  "$SERVER:$REMOTE_FRONTEND_SRC/components/agent/StructuredResponseCard.tsx"

scp -i "$PEM" -o StrictHostKeyChecking=no \
  /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend/lib/api/payment.api.ts \
  "$SERVER:$REMOTE_FRONTEND_SRC/lib/api/payment.api.ts"

echo "Files copied."

echo ""
echo "=== 3. Rebuild frontend Docker image ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "
  cd /home/ubuntu/Agentrix
  docker build -f frontend/Dockerfile -t agentrix-frontend ./frontend 2>&1 | tail -10
"

echo ""
echo "=== 4. Restart frontend container ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "
  cd /home/ubuntu/Agentrix
  docker-compose up -d --no-deps frontend 2>&1 | tail -5
"

echo ""
echo "=== Wait 20s ==="
sleep 20

echo ""
echo "=== 5. Check status ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "docker ps | grep agentrix-frontend"
