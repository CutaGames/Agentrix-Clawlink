#!/bin/bash
echo "=== Frontend image info ==="
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedSince}}\t{{.ID}}" | grep frontend

echo ""
echo "=== Running container ID ==="
docker ps | grep frontend
