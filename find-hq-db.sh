#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. All docker containers with ports ==="
$SSH "docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'"

echo ""
echo "=== 2. Check docker-compose files for HQ ==="
$SSH "cat /home/ubuntu/Agentrix/docker-compose.prod.yml 2>/dev/null | grep -A10 postgres"
echo "---"
$SSH "cat /home/ubuntu/Agentrix/docker-compose.hq.yml 2>/dev/null | grep -A10 postgres"

echo ""
echo "=== 3. Check if there was a separate HQ postgres ==="
$SSH "docker ps -a --format '{{.Names}} {{.Image}}' | grep -i 'hq\|postgres'"

echo ""
echo "=== 4. Check agentrix-postgres databases ==="
$SSH "docker exec agentrix-postgres psql -U agentrix -c '\l' 2>&1"

echo ""
echo "=== 5. Check agentrix-hq-pilot for DB config ==="
$SSH "docker exec agentrix-hq-pilot env 2>/dev/null | grep -i 'DB\|POSTGRES\|DATABASE'"

echo ""
echo "=== 6. Check if HQ uses the same postgres container ==="
$SSH "docker inspect agentrix-postgres 2>/dev/null | grep -A5 'PortBindings'"

echo ""
echo "=== 7. Check network config ==="
$SSH "docker network ls 2>&1"
$SSH "docker network inspect agentrix_default 2>/dev/null | grep -B2 -A5 'IPv4'"

echo ""
echo "=== 8. Previous working config - how was PM2 hq-backend connecting? ==="
$SSH "cat /home/ubuntu/hq-backend/.env | grep -E 'DB_|PORT|HOST'"

echo ""
echo "=== 9. Check if there was a native postgresql ==="
$SSH "dpkg -l | grep postgresql 2>&1"
$SSH "ls /etc/postgresql/ 2>&1"

echo ""
echo "=== 10. Check listening ports ==="
$SSH "ss -tlnp | grep -E '5432|3001|3000'"
