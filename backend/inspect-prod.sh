#!/bin/bash
echo "=== Backend container mounts ==="
docker inspect agentrix-backend --format '{{range .Mounts}}{{.Type}} {{.Source}} -> {{.Destination}}{{"\n"}}{{end}}' 2>/dev/null
echo "=== Agentrix dir in home ==="
ls /home/ubuntu/Agentrix 2>/dev/null || echo "No Agentrix dir"
echo "=== Docker images ==="
docker images | grep agentrix
