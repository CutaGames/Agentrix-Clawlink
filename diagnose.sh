#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null || true
chmod 600 "$PEM"
S="ubuntu@57.182.89.146"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no $S"

echo "=========================================="
echo "1. 任务状态统计"
echo "=========================================="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c 'SELECT status, count(*) FROM agent_tasks GROUP BY status ORDER BY count DESC;'"

echo ""
echo "=========================================="
echo "2. 失败任务错误分类 (TOP 15)"
echo "=========================================="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT LEFT(error_message, 120) as error, count(*) as cnt FROM agent_tasks WHERE status = 'failed' AND error_message IS NOT NULL GROUP BY LEFT(error_message, 120) ORDER BY cnt DESC LIMIT 15;\""

echo ""
echo "=========================================="
echo "3. 最近20条Tick执行记录"
echo "=========================================="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c 'SELECT tick_id, status, tasks_processed, tasks_completed, tasks_failed, duration_ms, start_time FROM tick_executions ORDER BY start_time DESC LIMIT 20;'"

echo ""
echo "=========================================="
echo "4. Agent状态"
echo "=========================================="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c 'SELECT code, status, is_active, provider, model FROM hq_agents ORDER BY code;'"

echo ""
echo "=========================================="
echo "5. Gemini API key 配置"
echo "=========================================="
$SSH "grep -c 'GEMINI_API_KEY' /home/ubuntu/Agentrix-independent-HQ/hq-backend/.env; grep 'GEMINI_API_KEY' /home/ubuntu/Agentrix-independent-HQ/hq-backend/.env | sed 's/=.\{10\}\(.*\)/=***\1/' | sed 's/\(.\{40\}\).*/\1...REDACTED/'"

echo ""
echo "=========================================="
echo "6. TICK_ENABLED 和 Cron 配置"
echo "=========================================="
$SSH "grep -E 'TICK_ENABLED|CRON' /home/ubuntu/Agentrix-independent-HQ/hq-backend/.env || echo 'No TICK config found'"

echo ""
echo "=========================================="
echo "7. 最近成功的任务 (TOP 10)"
echo "=========================================="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT title, type, created_at FROM agent_tasks WHERE status = 'completed' ORDER BY created_at DESC LIMIT 10;\""

echo ""
echo "=========================================="
echo "8. 每日任务执行量 (最近7天)"
echo "=========================================="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT DATE(created_at) as day, status, count(*) FROM agent_tasks WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY DATE(created_at), status ORDER BY day DESC, status;\""

echo ""
echo "=========================================="
echo "9. RPM分析 - 每分钟请求数"
echo "=========================================="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT date_trunc('hour', created_at) as hour, count(*) as tasks FROM agent_tasks WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY hour ORDER BY hour DESC LIMIT 24;\""
