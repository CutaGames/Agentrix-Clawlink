#!/bin/bash
set -e
cd /home/ubuntu/Agentrix
echo "=== Rebuilding backend Docker image ===" 
docker-compose -f docker-compose.prod.yml build backend 2>&1 | tail -20
echo "=== Restarting backend container ==="
docker-compose -f docker-compose.prod.yml up -d --no-deps backend 2>&1
echo "=== Sleeping 15 ==="
sleep 15
echo "=== Health check ==="
curl -sf http://localhost:3001/api/health && echo " OK" || echo " FAIL"
