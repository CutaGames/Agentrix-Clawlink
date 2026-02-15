#!/bin/bash
PEM="/tmp/agentrix.pem"
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. HQ Backend 启动日志 ==="
$SSH 'pm2 logs hq-backend --lines 60 --nostream 2>&1' | grep -iE "Gemini|mapping|initialized|key|Agent AI|fallback|rate.limit|model" | tail -30

echo ""
echo "=== 2. 最新 Tick 执行 ==="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT tick_id, tasks_processed, tasks_completed, tasks_failed, duration_ms, start_time FROM tick_executions ORDER BY start_time DESC LIMIT 5;\""

echo ""
echo "=== 3. PM2 状态 ==="
$SSH 'pm2 list 2>&1'

echo ""
echo "=== 4. 最近错误 (新部署后) ==="
$SSH 'pm2 logs hq-backend --err --lines 20 --nostream 2>&1' | tail -20
