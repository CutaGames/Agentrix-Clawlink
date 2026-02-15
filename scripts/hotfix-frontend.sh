#!/bin/bash
set -e

echo "=== Step 1: Kill any stuck docker compose build ==="
sudo pkill -f 'docker compose build' 2>/dev/null || true
sleep 2

echo "=== Step 2: Clean Docker build cache to free space ==="
sudo docker builder prune -f 2>/dev/null || true

echo "=== Step 3: Copy updated source files into running container ==="
cd /home/ubuntu/Agentrix

# Copy the updated files
sudo docker cp frontend/components/ui/MobileMenu.tsx agentrix-frontend:/app/components/ui/MobileMenu.tsx
sudo docker cp frontend/components/ui/Navigation.tsx agentrix-frontend:/app/components/ui/Navigation.tsx
sudo docker cp frontend/components/marketplace/TaskMarketplace.tsx agentrix-frontend:/app/components/marketplace/TaskMarketplace.tsx
sudo docker cp frontend/services/taskMarketplaceApi.ts agentrix-frontend:/app/services/taskMarketplaceApi.ts

# Remove the deleted unified-marketplace page if it exists
sudo docker exec agentrix-frontend rm -f /app/pages/unified-marketplace.tsx /app/pages/marketplace-v2.tsx /app/pages/marketplace-v3.tsx 2>/dev/null || true

echo "=== Step 4: Check if container has source + can rebuild ==="
HAS_COMPONENTS=$(sudo docker exec agentrix-frontend ls /app/components/ui/MobileMenu.tsx 2>/dev/null && echo "yes" || echo "no")
echo "Components dir exists: $HAS_COMPONENTS"

echo "=== Step 5: Rebuild Next.js inside container ==="
sudo docker exec -w /app agentrix-frontend npx next build 2>&1 | tail -30

echo "=== Step 6: Restart frontend container ==="
sudo docker restart agentrix-frontend

echo "=== DONE ==="
sudo docker ps --format '{{.Names}} {{.Status}}' | grep front
