#!/bin/bash
set -e

PEM=/tmp/agentrix.pem
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null || true
chmod 600 "$PEM"
SERVER="ubuntu@57.182.89.146"

# Find the production source path
echo "=== Probing production source path ==="
for p in \
  "/home/ubuntu/Agentrix-website/backend/src" \
  "/home/ubuntu/agentrix/backend/src" \
  "/app/src" \
  "/var/app/backend/src"; do
  result=$(ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "test -d $p && echo found || echo nope")
  echo "$p: $result"
done

echo ""
echo "=== Running containers ==="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'"

echo ""
echo "=== Backend container paths ==="
CONTAINER=$(ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "docker ps --format '{{.Names}}' | grep -iE 'backend' | head -1")
echo "Container: $CONTAINER"
if [ -n "$CONTAINER" ]; then
  ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "docker exec $CONTAINER ls /app/src/modules/payment/ 2>&1 | head -10 || echo 'No /app path'"
fi
