#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null || true
chmod 600 "$PEM"
SERVER="ubuntu@57.182.89.146"

echo "=========================================="
echo "1. 最近50行错误日志"
echo "=========================================="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" 'pm2 logs hq-backend --err --lines 50 --nostream 2>&1'

echo ""
echo "=========================================="
echo "2. 最近的Tick执行记录"
echo "=========================================="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "PGPASSWORD=agentrix_secure_2024 docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT id, tick_id, triggered_by, status, tasks_processed, tasks_completed, tasks_failed, duration_ms, start_time FROM tick_executions ORDER BY start_time DESC LIMIT 20;\""

echo ""
echo "=========================================="
echo "3. 最近失败的任务"
echo "=========================================="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT id, title, type, status, error_message, created_at FROM agent_tasks WHERE status = 'failed' ORDER BY created_at DESC LIMIT 20;\""

echo ""
echo "=========================================="
echo "4. 任务状态统计"
echo "=========================================="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT status, count(*) FROM agent_tasks GROUP BY status ORDER BY count DESC;\""

echo ""
echo "=========================================="
echo "5. Agent状态"
echo "=========================================="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT code, name, status, is_active, provider, model FROM hq_agents ORDER BY code;\""

echo ""
echo "=========================================="
echo "6. Gemini API key配置检查"
echo "=========================================="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" 'grep -E "GEMINI_API_KEY|GROQ_API_KEY|TICK_ENABLED" /home/ubuntu/Agentrix-independent-HQ/hq-backend/.env | sed "s/=.\{20\}/=***REDACTED***/"'

echo ""
echo "=========================================="
echo "7. 最近成功的任务"
echo "=========================================="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT id, title, type, status, created_at FROM agent_tasks WHERE status = 'completed' ORDER BY created_at DESC LIMIT 10;\""

echo ""
echo "=========================================="
echo "8. 最近的错误消息分类"
echo "=========================================="
ssh -i "$PEM" -o StrictHostKeyChecking=no "$SERVER" "docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT error_message, count(*) as cnt FROM agent_tasks WHERE status = 'failed' AND error_message IS NOT NULL GROUP BY error_message ORDER BY cnt DESC LIMIT 15;\""
