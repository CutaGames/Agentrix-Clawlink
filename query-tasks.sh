#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"
PSQL="docker exec agentrix-postgres psql -U agentrix -d paymind"

echo "=== 1. List HQ tables ==="
$SSH "$PSQL -c \"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;\" 2>&1"

echo ""
echo "=== 2. Task status summary ==="
$SSH "$PSQL -c \"SELECT status, count(*) FROM hq_tasks GROUP BY status ORDER BY count DESC;\" 2>&1" || \
$SSH "$PSQL -c \"SELECT status, count(*) FROM task GROUP BY status ORDER BY count DESC;\" 2>&1" || \
$SSH "$PSQL -c \"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%task%';\" 2>&1"

echo ""
echo "=== 3. Agent performance last 3 days ==="
$SSH "$PSQL -c \"SELECT agent_code, status, count(*) FROM hq_tasks WHERE created_at > now() - interval '3 days' GROUP BY agent_code, status ORDER BY agent_code;\" 2>&1" || \
$SSH "$PSQL -c \"SELECT agent_code, status, count(*) FROM task WHERE created_at > now() - interval '3 days' GROUP BY agent_code, status ORDER BY agent_code;\" 2>&1"

echo ""
echo "=== 4. Recent completed tasks ==="
$SSH "$PSQL -c \"SELECT title, agent_code, status, created_at::timestamp(0) FROM hq_tasks WHERE status='completed' ORDER BY created_at DESC LIMIT 30;\" 2>&1" || \
$SSH "$PSQL -c \"SELECT title, agent_code, status, created_at::timestamp(0) FROM task WHERE status='completed' ORDER BY created_at DESC LIMIT 30;\" 2>&1"

echo ""
echo "=== 5. Wait for first tick ==="
sleep 30
$SSH "pm2 logs hq-backend --lines 30 --nostream 2>&1" | grep -E "Tick|task|agent|completed|failed" | tail -20
