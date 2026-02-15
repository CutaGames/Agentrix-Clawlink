#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. All docker containers (including stopped) ==="
$SSH "docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>&1"

echo ""
echo "=== 2. Start postgres container ==="
$SSH "docker start agentrix-postgres 2>&1"

echo ""
echo "=== 3. Wait for postgres ==="
sleep 5

echo ""
echo "=== 4. Check postgres is running ==="
$SSH "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep postgres 2>&1"

echo ""
echo "=== 5. Test DB connection from host ==="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c 'SELECT now();' 2>&1"

echo ""
echo "=== 6. Restart PM2 hq-backend ==="
$SSH "pm2 restart hq-backend 2>&1" | tail -5

echo ""
echo "=== 7. Wait for startup ==="
sleep 15

echo ""
echo "=== 8. Check startup logs ==="
$SSH "pm2 logs hq-backend --lines 20 --nostream 2>&1" | tail -20

echo ""
echo "=== 9. PM2 status ==="
$SSH "pm2 list 2>&1"

echo ""
echo "=== 10. Setup PM2 startup to survive reboots ==="
$SSH "pm2 save 2>&1"
