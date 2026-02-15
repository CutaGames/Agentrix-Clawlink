#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"
PSQL="docker exec agentrix-postgres psql -U agentrix -d paymind -t -A"

echo "=== 1. Failed tasks by error type (last 3 days) ==="
$SSH "$PSQL -c \"SELECT substring(error_message from 1 for 80) as err, count(*) FROM agent_tasks WHERE status='failed' AND created_at > now() - interval '3 days' GROUP BY err ORDER BY count DESC LIMIT 15;\""

echo ""
echo "=== 2. Agent columns for correct field name ==="
$SSH "$PSQL -c \"SELECT column_name FROM information_schema.columns WHERE table_name='agent_tasks' AND column_name LIKE '%agent%';\""

echo ""
echo "=== 3. Find agent field - sample row ==="
$SSH "$PSQL -c \"SELECT id, title, status, metadata::text FROM agent_tasks LIMIT 1;\"" | head -5

echo ""
echo "=== 4. Check assigned_to_id ==="
$SSH "$PSQL -c \"SELECT assigned_to_id, status, count(*) FROM agent_tasks WHERE created_at > now() - interval '3 days' GROUP BY assigned_to_id, status ORDER BY assigned_to_id, count DESC;\""

echo ""
echo "=== 5. Map assigned_to_id to agent names ==="
$SSH "$PSQL -c \"SELECT a.id, a.code, a.name FROM hq_agents a ORDER BY a.code;\""

echo ""
echo "=== 6. Agent performance with names ==="
$SSH "$PSQL -c \"SELECT ha.code, t.status, count(*) FROM agent_tasks t JOIN hq_agents ha ON t.assigned_to_id = ha.id WHERE t.created_at > now() - interval '3 days' GROUP BY ha.code, t.status ORDER BY ha.code, count DESC;\""

echo ""
echo "=== 7. Current PM2 logs - check if tick is running ==="
$SSH "pm2 logs hq-backend --lines 50 --nostream 2>&1" | grep -E "Tick|✅|❌|completed|failed|Gemini|quota" | tail -25

echo ""
echo "=== 8. HQ agent display mapping (from HqCoreService) ==="
$SSH "pm2 logs hq-backend --lines 100 --nostream 2>&1" | grep -E "COMMANDER|ANALYST|REVENUE|GROWTH|BD|SOCIAL|CONTENT|SUPPORT|DEVREL|SECURITY|LEGAL" | tail -15
