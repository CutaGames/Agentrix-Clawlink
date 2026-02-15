#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. Check what DB user/password the docker postgres expects ==="
$SSH "docker exec agentrix-postgres env | grep POSTGRES"

echo ""
echo "=== 2. Check existing databases ==="
$SSH "docker exec agentrix-postgres psql -U postgres -c '\l' 2>&1"

echo ""
echo "=== 3. Check if paymind DB exists with correct user ==="
$SSH "docker exec agentrix-postgres psql -U postgres -d paymind -c '\dt' 2>&1 | head -30"

echo ""
echo "=== 4. Check the docker-compose file location ==="
$SSH "ls -la /home/ubuntu/Agentrix/docker-compose*.yml 2>&1"

echo ""
echo "=== 5. Expose postgres port via iptables/socat workaround ==="
# Since we can't easily change docker-compose without restarting all containers,
# use socat to forward localhost:5432 to the docker container's IP
$SSH "docker inspect agentrix-postgres --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'"
