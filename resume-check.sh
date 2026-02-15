#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. Docker postgres status ==="
$SSH "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep postgres"

echo ""
echo "=== 2. Test DB connection ==="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c 'SELECT now();' 2>&1"

echo ""
echo "=== 3. HQ backend connects to DB via Docker network or localhost? ==="
$SSH "grep DB_HOST /home/ubuntu/hq-backend/.env"
$SSH "docker network inspect agentrix_default 2>/dev/null | grep -A5 postgres | head -8"

echo ""
echo "=== 4. Check if port 5432 is exposed to host ==="
$SSH "docker port agentrix-postgres 2>&1"
$SSH "ss -tlnp | grep 5432"

echo ""
echo "=== 5. PM2 status ==="
$SSH "pm2 list 2>&1"

echo ""
echo "=== 6. PM2 logs ==="
$SSH "pm2 logs hq-backend --lines 15 --nostream 2>&1" | tail -15

echo ""
echo "=== 7. DB task stats (via docker exec) ==="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT status, count(*) FROM hq_task GROUP BY status ORDER BY count DESC;\" 2>&1"

echo ""
echo "=== 8. Recent tasks ==="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT agent_code, status, count(*) FROM hq_task WHERE created_at > now() - interval '3 days' GROUP BY agent_code, status ORDER BY agent_code, count DESC;\" 2>&1"

echo ""
echo "=== 9. Task results sample ==="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT id, title, status, agent_code, created_at::date as date FROM hq_task WHERE status='completed' ORDER BY created_at DESC LIMIT 20;\" 2>&1"
