#!/bin/bash
set -e

PEM=/tmp/agentrix.pem
chmod 600 "$PEM"
SERVER="ubuntu@57.182.89.146"

echo "=== Build new frontend image ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "
  cd /home/ubuntu/Agentrix
  docker build -f frontend/Dockerfile -t agentrix-frontend ./frontend 2>&1 | tail -5
"

echo ""
echo "=== Restart frontend ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "
  cd /home/ubuntu/Agentrix
  docker-compose up -d --no-deps frontend 2>&1 | tail -5
"

echo ""
sleep 25
echo "=== Status ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "docker ps | grep frontend"
