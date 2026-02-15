#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. Add port mapping to docker-compose for postgres ==="
# Check current postgres section
$SSH "grep -n -A5 'agentrix-postgres' /home/ubuntu/Agentrix/docker-compose.prod.yml | head -15"

echo ""
echo "=== 2. Add ports: 5432:5432 to postgres service ==="
$SSH "cd /home/ubuntu/Agentrix && sed -i '/container_name: agentrix-postgres/a\\    ports:\\n      - \"127.0.0.1:5432:5432\"' docker-compose.prod.yml"

echo ""
echo "=== 3. Verify change ==="
$SSH "grep -A8 'agentrix-postgres' /home/ubuntu/Agentrix/docker-compose.prod.yml | head -12"

echo ""
echo "=== 4. Recreate only postgres container with new port mapping ==="
$SSH "cd /home/ubuntu/Agentrix && docker compose -f docker-compose.prod.yml up -d postgres 2>&1"

echo ""
echo "=== 5. Wait for postgres ==="
sleep 5

echo ""
echo "=== 6. Verify port is now exposed ==="
$SSH "ss -tlnp | grep 5432"

echo ""
echo "=== 7. Test connection from host ==="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c 'SELECT count(*) as table_count FROM information_schema.tables WHERE table_schema = '\''public'\'';' 2>&1"

echo ""
echo "=== 8. Stop PM2 and restart clean ==="
$SSH "pm2 stop hq-backend 2>&1; sleep 2; pm2 restart hq-backend 2>&1" | tail -5

echo ""
echo "=== 9. Wait for startup ==="
sleep 15

echo ""
echo "=== 10. Check if backend connected to DB ==="
$SSH "pm2 logs hq-backend --lines 20 --nostream 2>&1" | tail -20

echo ""
echo "=== 11. PM2 status ==="
$SSH "pm2 list 2>&1"

echo ""
echo "=== 12. Save PM2 for reboot survival ==="
$SSH "pm2 save 2>&1"
