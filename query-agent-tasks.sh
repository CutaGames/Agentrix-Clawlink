#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"
PSQL="docker exec agentrix-postgres psql -U agentrix -d paymind -t"

echo "=== 1. agent_tasks columns ==="
$SSH "$PSQL -c \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='agent_tasks' ORDER BY ordinal_position;\" 2>&1"

echo ""
echo "=== 2. Task status summary ==="
$SSH "$PSQL -c \"SELECT status, count(*) FROM agent_tasks GROUP BY status ORDER BY count DESC;\" 2>&1"

echo ""
echo "=== 3. Tasks by date (last 5 days) ==="
$SSH "$PSQL -c \"SELECT created_at::date as day, status, count(*) FROM agent_tasks WHERE created_at > now() - interval '5 days' GROUP BY day, status ORDER BY day DESC, count DESC;\" 2>&1"

echo ""
echo "=== 4. Agent performance last 3 days ==="
$SSH "$PSQL -c \"SELECT agent_code, status, count(*) FROM agent_tasks WHERE created_at > now() - interval '3 days' GROUP BY agent_code, status ORDER BY agent_code, count DESC;\" 2>&1"

echo ""
echo "=== 5. Recent completed tasks ==="
$SSH "$PSQL -c \"SELECT title, agent_code, created_at::timestamp(0) FROM agent_tasks WHERE status='completed' AND created_at > now() - interval '3 days' ORDER BY created_at DESC LIMIT 40;\" 2>&1"

echo ""
echo "=== 6. Recent failed tasks ==="
$SSH "$PSQL -c \"SELECT title, agent_code, created_at::timestamp(0), error_message FROM agent_tasks WHERE status='failed' AND created_at > now() - interval '3 days' ORDER BY created_at DESC LIMIT 20;\" 2>&1"

echo ""
echo "=== 7. Tick executions ==="
$SSH "$PSQL -c \"SELECT column_name FROM information_schema.columns WHERE table_name='tick_executions' ORDER BY ordinal_position;\" 2>&1"

echo ""
echo "=== 8. Recent tick executions ==="
$SSH "$PSQL -c \"SELECT * FROM tick_executions ORDER BY created_at DESC LIMIT 10;\" 2>&1" || \
$SSH "$PSQL -c \"SELECT id, status, tasks_completed, tasks_failed, created_at::timestamp(0) FROM tick_executions ORDER BY created_at DESC LIMIT 10;\" 2>&1"

echo ""
echo "=== 9. Task result samples (what agents actually produced) ==="
$SSH "$PSQL -c \"SELECT agent_code, title, substring(result from 1 for 200) as result_preview FROM agent_tasks WHERE status='completed' AND result IS NOT NULL AND created_at > now() - interval '3 days' ORDER BY created_at DESC LIMIT 10;\" 2>&1"

echo ""
echo "=== 10. Current tick status ==="
$SSH "pm2 logs hq-backend --lines 30 --nostream 2>&1" | grep -E "Tick|completed|failed|agent" | tail -15
