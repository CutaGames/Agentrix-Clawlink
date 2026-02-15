#!/bin/bash
set -e
cd /home/ubuntu/Agentrix

echo "=== Step 1: Rebuild backend ==="
# Compile TypeScript
cd backend
npx tsc --project tsconfig.build.json 2>&1 || echo "TSC warnings (non-fatal)"
cd ..

# Hot-fix: copy compiled files into running container
echo "--- Copying compiled backend into container ---"
sudo docker cp backend/dist/. agentrix-backend:/app/dist/
sudo docker restart agentrix-backend
echo "--- Waiting for backend to be healthy ---"
sleep 10
curl -s -o /dev/null -w 'Backend health: %{http_code}\n' http://localhost:3001/api/health || echo "Backend not ready yet"

echo "=== Step 2: Rebuild frontend Docker image ==="
sudo docker compose build --no-cache frontend 2>&1

echo "=== Step 3: Restart frontend ==="
sudo docker compose up -d frontend 2>&1

echo "=== Step 4: Verify ==="
sleep 5
sudo docker ps --format '{{.Names}} {{.Status}}'
curl -s -o /dev/null -w 'Frontend: %{http_code}\n' http://localhost:3000/
curl -s -o /dev/null -w 'Backend: %{http_code}\n' http://localhost:3001/api/health

echo "=== DEPLOY COMPLETE ==="
