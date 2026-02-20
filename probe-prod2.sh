#!/bin/bash
set -e

PEM=/tmp/agentrix.pem
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null || true
chmod 600 "$PEM"
SERVER="ubuntu@57.182.89.146"

echo "=== Probing backend container structure ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "docker exec agentrix-backend ls / 2>&1 | head -20"
echo ""
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "docker exec agentrix-backend ls /app 2>&1"
echo ""
echo "=== Checking for dist files ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "docker exec agentrix-backend ls /app/dist 2>&1 | head -10"
echo ""
echo "=== Checking image build context ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "find /home/ubuntu -name 'transak-provider.service.ts' 2>/dev/null | head -5"
