#!/bin/bash
PEM=/tmp/agentrix.pem
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null || true
chmod 600 "$PEM"
SERVER="ubuntu@57.182.89.146"

ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "
  echo '=== Networks for backend ==='
  docker inspect agentrix-backend --format '{{json .NetworkSettings.Networks}}' 2>/dev/null | python3 -m json.tool 2>/dev/null | grep -E 'network|NetworkID|Gateway' || echo 'could not inspect'

  echo ''
  echo '=== Networks for postgres ==='
  docker inspect agentrix-postgres --format '{{json .NetworkSettings.Networks}}' 2>/dev/null | python3 -m json.tool 2>/dev/null | grep -E 'network|NetworkID|Gateway' || echo 'could not inspect'

  echo ''
  echo '=== Connect backend to agentrix-network ==='
  docker network connect agentrix_agentrix-network agentrix-backend 2>&1 || true
  docker network connect agentrix_agentrix-network agentrix-postgres 2>&1 || true
  docker network connect agentrix_agentrix-network agentrix-redis 2>&1 || true

  echo ''
  echo '=== Verify ==='
  docker inspect agentrix-backend --format '{{json .NetworkSettings.Networks}}' 2>/dev/null | python3 -c \"import sys,json; d=json.load(sys.stdin); print(list(d.keys()))\"

  echo ''
  echo '=== Wait 15s for backend to reconnect ==='
  sleep 15

  echo '=== Health check ==='
  curl -fs http://localhost:3001/api/health | head -c 200 || echo 'health still failing'
  docker ps | grep agentrix-backend
"
