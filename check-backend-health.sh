#!/bin/bash
PEM=/tmp/agentrix.pem
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null || true
chmod 600 "$PEM"
SERVER="ubuntu@57.182.89.146"

sleep 20

ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "
  echo '=== Backend container status ==='
  docker ps | grep agentrix-backend

  echo ''
  echo '=== Health check ==='
  curl -fs http://localhost:3001/api/health | head -c 300 || echo 'health failed'

  echo ''
  echo '=== Start logs ==='
  docker logs agentrix-backend 2>&1 | grep -E 'Application is running|NestApplication|error|Error|started|migration' | tail -15
"
