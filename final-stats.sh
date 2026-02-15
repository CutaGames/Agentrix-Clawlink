#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"
PSQL="docker exec agentrix-postgres psql -U agentrix -d paymind -t -A"

echo "=== TASK STATUS SUMMARY ==="
$SSH "$PSQL -c \"SELECT status, count(*) FROM agent_tasks GROUP BY status ORDER BY count DESC;\""

echo ""
echo "=== TASKS BY DATE (last 5 days) ==="
$SSH "$PSQL -c \"SELECT created_at::date as day, status, count(*) FROM agent_tasks WHERE created_at > now() - interval '5 days' GROUP BY day, status ORDER BY day DESC, status;\""

echo ""
echo "=== AGENT PERFORMANCE (last 3 days) ==="
$SSH "$PSQL -c \"SELECT assigned_agent as agent, status, count(*) FROM agent_tasks WHERE created_at > now() - interval '3 days' GROUP BY assigned_agent, status ORDER BY assigned_agent, count DESC;\""

echo ""
echo "=== COMPLETED TASK TITLES (last 3 days, unique) ==="
$SSH "$PSQL -c \"SELECT DISTINCT title FROM agent_tasks WHERE status='completed' AND created_at > now() - interval '3 days' ORDER BY title;\""

echo ""
echo "=== FAILED TASK DETAILS (last 3 days) ==="
$SSH "$PSQL -c \"SELECT assigned_agent, title, substring(error_message from 1 for 100) as err FROM agent_tasks WHERE status='failed' AND created_at > now() - interval '3 days' ORDER BY created_at DESC LIMIT 15;\""

echo ""
echo "=== TICK STATS (last 3 days) ==="
$SSH "$PSQL -c \"SELECT created_at::date as day, count(*) as ticks, sum(tasks_completed) as completed, sum(tasks_failed) as failed FROM tick_executions WHERE created_at > now() - interval '5 days' GROUP BY day ORDER BY day DESC;\""

echo ""
echo "=== AGENT_TASKS COLUMNS ==="
$SSH "$PSQL -c \"SELECT column_name FROM information_schema.columns WHERE table_name='agent_tasks' ORDER BY ordinal_position;\""

echo ""
echo "=== CURRENT PM2 + TICK STATUS ==="
$SSH "pm2 logs hq-backend --lines 40 --nostream 2>&1" | grep -E "Tick|✅|❌|completed|failed|Gemini" | tail -20
