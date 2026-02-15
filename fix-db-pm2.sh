#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. Check if PostgreSQL is in Docker or native ==="
$SSH "docker ps -a --format '{{.Names}} {{.Status}}' | grep -i postgres"
$SSH "sudo systemctl list-units --type=service | grep postgres"

echo ""
echo "=== 2. Check docker-compose files ==="
$SSH "ls -la /home/ubuntu/Agentrix/docker-compose*.yml 2>/dev/null; ls -la /home/ubuntu/hq-backend/docker-compose*.yml 2>/dev/null"

echo ""
echo "=== 3. Check if DB was in a docker-compose stack ==="
$SSH "docker ps -a --format '{{.Names}} {{.Image}} {{.Status}}' 2>&1"

echo ""
echo "=== 4. Start PostgreSQL - try docker first ==="
$SSH "docker start agentrix-postgres 2>&1 || docker start postgres 2>&1 || echo 'No postgres container found'"

echo ""
echo "=== 5. If no docker postgres, check native ==="
$SSH "sudo systemctl start postgresql 2>&1; sudo systemctl status postgresql 2>&1 | head -8"

echo ""
echo "=== 6. Wait for DB ==="
sleep 5

echo ""
echo "=== 7. Test DB connection ==="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c 'SELECT 1;' 2>&1 || echo 'Docker psql failed'"

echo ""
echo "=== 8. Stop crashing PM2 and restart clean ==="
$SSH "pm2 delete all 2>&1; sleep 2; cd /home/ubuntu/hq-backend && pm2 start dist/main.js --name hq-backend 2>&1" | tail -10

echo ""
echo "=== 9. Wait for startup ==="
sleep 15

echo ""
echo "=== 10. Check if backend started successfully ==="
$SSH "pm2 logs hq-backend --lines 15 --nostream 2>&1" | tail -15

echo ""
echo "=== 11. PM2 status ==="
$SSH "pm2 list 2>&1"
