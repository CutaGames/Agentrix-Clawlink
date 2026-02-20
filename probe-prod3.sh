#!/bin/bash
set -e

PEM=/tmp/agentrix.pem
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null || true
chmod 600 "$PEM"
SERVER="ubuntu@57.182.89.146"

echo "=== Check docker-compose location ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "find /home/ubuntu -maxdepth 3 -name 'docker-compose*' 2>/dev/null | head -10"

echo ""
echo "=== Check how containers are started ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "cat /home/ubuntu/Agentrix/docker-compose.yml 2>/dev/null | head -50 || cat /home/ubuntu/docker-compose.yml 2>/dev/null | head -50 || echo 'no docker-compose.yml found'"

echo ""
echo "=== Check if Dockerfile exists for backend ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "ls /home/ubuntu/Agentrix/backend/Dockerfile 2>/dev/null && echo found || echo not_found"
