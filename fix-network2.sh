#!/bin/bash
PEM=/tmp/agentrix.pem
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null || true
chmod 600 "$PEM"
SERVER="ubuntu@57.182.89.146"

ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "
  echo '=== Current docker ps ==='
  docker ps

  echo ''
  echo '=== Connect postgres and redis to the network ==='
  docker network connect agentrix_agentrix-network agentrix-postgres 2>&1 || echo 'postgres already on network or failed'
  docker network connect agentrix_agentrix-network agentrix-redis 2>&1 || echo 'redis already on network or failed'

  echo ''
  echo '=== Wait 10s for backend to reconnect to DB ==='
  sleep 10

  echo '=== Health check ==='
  curl -fs http://localhost:3001/api/health 2>&1 | head -c 300 || echo 'still failing'

  echo ''
  echo '=== Backend logs (last 20) ==='
  docker logs agentrix-backend 2>&1 | tail -20
"
