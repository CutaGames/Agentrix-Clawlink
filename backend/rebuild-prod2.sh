#!/bin/bash
cd /home/ubuntu/Agentrix
echo "=== Rebuilding backend Docker image ===" | tee /tmp/rebuild-result.log
docker-compose -f docker-compose.prod.yml build backend 2>&1 | tail -20 | tee -a /tmp/rebuild-result.log
echo "=== Restarting backend container ===" | tee -a /tmp/rebuild-result.log
docker-compose -f docker-compose.prod.yml up -d --no-deps backend 2>&1 | tee -a /tmp/rebuild-result.log
echo "=== Waiting for health check ===" | tee -a /tmp/rebuild-result.log
sleep 15
curl -sf http://localhost:3001/api/health 2>&1 | tee -a /tmp/rebuild-result.log && echo " ✅ Backend healthy" | tee -a /tmp/rebuild-result.log || echo " ❌ Backend health check failed" | tee -a /tmp/rebuild-result.log
cat /tmp/rebuild-result.log
