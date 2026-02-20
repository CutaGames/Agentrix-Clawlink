#!/bin/bash
set -e
cd /home/ubuntu/Agentrix

echo "=== Building frontend ==="
docker build -t agentrix-frontend:latest -f frontend/Dockerfile ./frontend 2>&1 | tail -15

echo "=== Restarting frontend ==="
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate frontend
sleep 5
docker ps | grep frontend
echo "Done"
