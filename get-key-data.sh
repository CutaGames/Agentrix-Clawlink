#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"
PSQL="docker exec agentrix-postgres psql -U agentrix -d paymind -t -A"

echo "=== FAILED TASKS ERROR TYPES ==="
$SSH "$PSQL -c \"SELECT substring(error_message from 1 for 100) as err, count(*) FROM agent_tasks WHERE status='failed' AND created_at > now() - interval '3 days' GROUP BY err ORDER BY count DESC LIMIT 10;\""

echo ""
echo "=== AGENT PERF WITH NAMES ==="
$SSH "$PSQL -c \"SELECT ha.code, t.status, count(*) FROM agent_tasks t JOIN hq_agents ha ON t.assigned_to_id = ha.id WHERE t.created_at > now() - interval '3 days' GROUP BY ha.code, t.status ORDER BY ha.code, count DESC;\""

echo ""
echo "=== FIRST TICK AFTER RESTART ==="
$SSH "pm2 logs hq-backend --lines 80 --nostream 2>&1" | grep -E "Tick|✅|❌|completed task|task failed|Gemini key|quota|attempt" | tail -30

echo ""
echo "=== HQ AGENT MODEL DISPLAY ==="
$SSH "grep -A2 'agentAIDisplay\|modelDisplay\|getAgentDisplay' /home/ubuntu/hq-backend/src/hq/hq-core.service.ts 2>/dev/null | head -20"
$SSH "grep 'Gemini' /home/ubuntu/hq-backend/src/hq/hq-core.service.ts 2>/dev/null | head -15"
