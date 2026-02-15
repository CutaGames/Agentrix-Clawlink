#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. Start PostgreSQL ==="
$SSH "sudo systemctl start postgresql 2>&1; sudo systemctl status postgresql 2>&1 | head -5"

echo ""
echo "=== 2. Verify DB connection ==="
$SSH "PGPASSWORD=agentrix_secure_2024 psql -h localhost -U agentrix -d paymind -c 'SELECT count(*) FROM information_schema.tables;' 2>&1"

echo ""
echo "=== 3. Start PM2 hq-backend ==="
$SSH "cd /home/ubuntu/hq-backend && pm2 start dist/main.js --name hq-backend 2>&1" | tail -10

echo ""
echo "=== 4. Wait for startup ==="
sleep 15

echo ""
echo "=== 5. Verify running ==="
$SSH "pm2 list 2>&1"

echo ""
echo "=== 6. Check startup logs ==="
$SSH "pm2 logs hq-backend --lines 20 --nostream 2>&1" | tail -20

echo ""
echo "=== 7. Task completion details (Feb 11-12) ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log 2>&1 | grep -E '✅.*completed task' | awk -F' - ' '{print \$1}' | awk '{print \$NF}' | sort | uniq -c | sort -rn | head -20"

echo ""
echo "=== 8. Completed tasks with timestamps ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log 2>&1 | grep '✅.*completed task' | tail -30"

echo ""
echo "=== 9. Task cost summary ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log 2>&1 | grep 'cost:' | tail -30"

echo ""
echo "=== 10. Quota exhaustion timeline ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log 2>&1 | grep 'All Gemini models exhausted' | head -20"

echo ""
echo "=== 11. Check DB for task records ==="
$SSH "PGPASSWORD=agentrix_secure_2024 psql -h localhost -U agentrix -d paymind -c \"SELECT status, count(*) FROM hq_task GROUP BY status ORDER BY count DESC;\" 2>&1"

echo ""
echo "=== 12. Recent tasks from DB ==="
$SSH "PGPASSWORD=agentrix_secure_2024 psql -h localhost -U agentrix -d paymind -c \"SELECT id, title, status, agent_code, created_at FROM hq_task ORDER BY created_at DESC LIMIT 30;\" 2>&1"

echo ""
echo "=== 13. Agent performance from DB ==="
$SSH "PGPASSWORD=agentrix_secure_2024 psql -h localhost -U agentrix -d paymind -c \"SELECT agent_code, status, count(*) FROM hq_task WHERE created_at > now() - interval '3 days' GROUP BY agent_code, status ORDER BY agent_code, status;\" 2>&1"
