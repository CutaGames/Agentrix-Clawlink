#!/bin/bash
set -e

PEM=/tmp/agentrix.pem
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null || true
chmod 600 "$PEM"
SERVER="ubuntu@57.182.89.146"

ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "
  echo '=== Container status ==='
  docker ps -a | tail -15
  echo ''
  echo '=== Networks ==='
  docker network ls | grep agentrix
  echo ''
  echo '=== Using prod compose to start ONLY backend ==='
  cd /home/ubuntu/Agentrix
  # Use the prod compose if available, otherwise plain
  if [ -f docker-compose.prod.yml ]; then
    docker-compose -f docker-compose.prod.yml up -d backend 2>&1 | tail -10
  else
    docker-compose up -d --no-deps backend 2>&1 | tail -10
  fi
  echo 'done'
  sleep 10
  docker ps | grep -i backend || echo 'backend not found in ps'
"
