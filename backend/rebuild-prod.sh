#!/bin/bash
# Deploy updated files and rebuild backend Docker image
set -e
cd /home/ubuntu/Agentrix

echo "=== Updated files received ==="
ls -la backend/src/modules/skill/skill-executor.service.js 2>/dev/null || true
ls -la backend/src/migrations/*CreateEscrows* 2>/dev/null || true

echo "=== Rebuilding backend Docker image ==="
docker-compose -f docker-compose.prod.yml build backend 2>&1 | tail -20

echo "=== Restarting backend container ==="
docker-compose -f docker-compose.prod.yml up -d --no-deps backend

echo "=== Waiting for health check ==="
sleep 10
curl -sf http://localhost:3001/api/health && echo "✅ Backend healthy" || echo "❌ Backend health check failed"
