#!/bin/bash
echo "=== Docker containers status ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== Frontend container logs (last 20 lines) ==="
docker logs agentrix-frontend --tail 20 2>&1

echo ""
echo "=== Build status check ==="
docker images | grep agentrix-frontend
