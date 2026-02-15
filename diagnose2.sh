#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null || true
chmod 600 "$PEM"
S="ubuntu@57.182.89.146"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no $S"

echo "=========================================="
echo "1. 所有 GEMINI 相关 env 变量"
echo "=========================================="
$SSH "grep -i 'GEMINI' /home/ubuntu/Agentrix-independent-HQ/hq-backend/.env | sed 's/\(=.\{8\}\).*/\1...REDACTED/'"

echo ""
echo "=========================================="
echo "2. GROQ 相关 env 变量"
echo "=========================================="
$SSH "grep -i 'GROQ' /home/ubuntu/Agentrix-independent-HQ/hq-backend/.env | sed 's/\(=.\{8\}\).*/\1...REDACTED/'"

echo ""
echo "=========================================="
echo "3. 所有 AI provider env 变量"
echo "=========================================="
$SSH "grep -iE 'API_KEY|PROVIDER|RELAY|SEARCH' /home/ubuntu/Agentrix-independent-HQ/hq-backend/.env | sed 's/\(=.\{8\}\).*/\1...REDACTED/'"

echo ""
echo "=========================================="
echo "4. 最近100行完整日志 (含成功和失败)"
echo "=========================================="
$SSH "pm2 logs hq-backend --lines 100 --nostream 2>&1 | grep -E 'Gemini|quota|429|key #|Using|trigger|completed|failed' | tail -40"

echo ""
echo "=========================================="
echo "5. 今天的 Tick 执行统计"
echo "=========================================="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT status, tasks_processed, tasks_completed, tasks_failed, duration_ms, start_time FROM tick_executions WHERE start_time > '2026-02-11' ORDER BY start_time DESC;\""

echo ""
echo "=========================================="
echo "6. 按小时统计成功/失败 (最近48h)"
echo "=========================================="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT date_trunc('hour', created_at) as hour, status, count(*) FROM agent_tasks WHERE created_at > NOW() - INTERVAL '48 hours' GROUP BY hour, status ORDER BY hour DESC;\""
