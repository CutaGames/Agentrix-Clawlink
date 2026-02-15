#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. Find psql ==="
$SSH "which psql 2>&1; find /usr/lib/postgresql -name psql 2>/dev/null; dpkg -l | grep postgresql 2>&1 | head -5"

echo ""
echo "=== 2. Check if DB is in Docker ==="
$SSH "docker ps 2>&1"

echo ""
echo "=== 3. PM2 current status ==="
$SSH "pm2 list 2>&1"

echo ""
echo "=== 4. Recent startup logs ==="
$SSH "pm2 logs hq-backend --lines 30 --nostream 2>&1" | tail -30

echo ""
echo "=== 5. Completed tasks by date ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log | grep '✅.*completed task' | awk -F'/' '{print \$1\"/\"\$2\"/\"\$3}' | awk -F',' '{print \$1}' | sort | uniq -c"

echo ""
echo "=== 6. Feb 11 completed tasks ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log | grep '02/11/2026' | grep '✅.*completed task' | wc -l"

echo ""
echo "=== 7. Feb 12 completed tasks ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log | grep '02/12/2026' | grep '✅.*completed task' | wc -l"

echo ""
echo "=== 8. Feb 11 failed tasks ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log | grep '02/11/2026' | grep '❌.*task failed' | wc -l"

echo ""
echo "=== 9. Feb 12 failed tasks ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log | grep '02/12/2026' | grep '❌.*task failed' | wc -l"

echo ""
echo "=== 10. Feb 11 agent completions ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log | grep '02/11/2026' | grep '✅.*completed task' | sed 's/.*✅ //' | sed 's/ completed.*//' | sort | uniq -c | sort -rn"

echo ""
echo "=== 11. Feb 12 agent completions ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log | grep '02/12/2026' | grep '✅.*completed task' | sed 's/.*✅ //' | sed 's/ completed.*//' | sort | uniq -c | sort -rn"

echo ""
echo "=== 12. Feb 12 failures by agent ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log | grep '02/12/2026' | grep '❌.*task failed' | sed 's/.*❌ //' | sed 's/ task failed.*//' | sort | uniq -c | sort -rn"

echo ""
echo "=== 13. Tick intervals (time between ticks) ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log | grep 'Tick.*完成' | awk -F' - ' '{print \$2}' | awk '{print \$1, \$2}' | tail -20"

echo ""
echo "=== 14. Task execution times ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log | grep 'completed task' | grep -oP 'in \K[0-9.]+s' | sort -n | tail -10"

echo ""
echo "=== 15. Gemini model usage ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log | grep 'Gemini key' | grep 'model:' | grep -oP 'model: \K[^ ]+' | sort | uniq -c | sort -rn"

echo ""
echo "=== 16. Current HQ backend health ==="
$SSH "curl -s http://localhost:3001/health 2>&1 || curl -s http://localhost:3000/health 2>&1 || echo 'No health endpoint responding'"
