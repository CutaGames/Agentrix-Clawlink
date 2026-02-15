#!/bin/bash
set -e

echo "=== Rebuilding frontend Docker image ==="
cd /home/ubuntu/Agentrix

# Verify the updated files are in place
echo "--- Checking updated files ---"
head -3 frontend/components/ui/MobileMenu.tsx
echo "..."
grep "href.*marketplace" frontend/components/ui/MobileMenu.tsx || true
grep "href.*marketplace" frontend/components/ui/Navigation.tsx || true
echo "--- unified-marketplace should not exist ---"
ls frontend/pages/unified-marketplace.tsx 2>/dev/null && echo "STILL EXISTS" || echo "DELETED OK"

# Clean old images to save space
echo "--- Cleaning old frontend images ---"
sudo docker image prune -f 2>/dev/null || true

# Build frontend only
echo "--- Starting frontend build ---"
sudo docker compose build --no-cache frontend 2>&1

echo "--- Restarting frontend ---"
sudo docker compose up -d frontend 2>&1

echo "=== Frontend rebuild complete ==="
sudo docker ps --format '{{.Names}} {{.Status}}' | grep -i front
