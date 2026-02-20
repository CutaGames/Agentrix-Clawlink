#!/bin/bash
set -e

PEM=/tmp/agentrix.pem
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null || true
chmod 600 "$PEM"
SERVER="ubuntu@57.182.89.146"

echo "=== Restart just the agentrix-backend container ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "
  cd /home/ubuntu/Agentrix

  # Get current run command + env from existing container (if alive)
  # Simply restart with docker run using same settings as before

  # Find and note the network
  echo 'Current networks:'
  docker network ls | grep agentrix

  # Stop backend only
  docker stop agentrix-backend 2>&1 || true
  # Wait for clean stop
  sleep 3
  docker rm agentrix-backend 2>&1 || true

  # Get env file path
  ENV_FILE='/home/ubuntu/Agentrix/backend/.env'
  if [ ! -f \"\$ENV_FILE\" ]; then
    ENV_FILE='/home/ubuntu/Agentrix/.env'
  fi
  echo 'Using env file:' \"\$ENV_FILE\"

  # Start using docker-compose (only backend service)
  docker-compose up -d backend 2>&1 | tail -10
"

echo ""
echo "=== Wait 20s ==="
sleep 20

echo ""
echo "=== Health check ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "
  docker ps | grep agentrix-backend
  curl -fs http://localhost:3001/api/health | head -c 200 || echo 'health check failed - checking logs'
  docker logs agentrix-backend 2>&1 | tail -15
"
