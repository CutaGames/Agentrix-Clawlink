#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. PostgreSQL status ==="
$SSH "sudo systemctl status postgresql 2>&1 | head -15"

echo ""
echo "=== 2. Docker containers (if DB in docker) ==="
$SSH "docker ps -a 2>&1 | head -10"

echo ""
echo "=== 3. Check all PM2 logs for Feb 11-13 task completions ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log 2>&1 | grep -E 'completed task|✅.*completed' | tail -80"

echo ""
echo "=== 4. Check task failures ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log 2>&1 | grep -E '❌.*failed|task failed' | tail -40"

echo ""
echo "=== 5. Tick summary (completions) ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log 2>&1 | grep -E 'Tick.*完成|Tick.*completed' | tail -40"

echo ""
echo "=== 6. Agent success/failure counts ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log 2>&1 | grep -E '✅.*completed task' | sed 's/.*✅ //' | sed 's/ completed.*//' | sort | uniq -c | sort -rn"

echo ""
echo "=== 7. Agent failure counts ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log 2>&1 | grep -E '❌.*task failed' | sed 's/.*❌ //' | sed 's/ task failed.*//' | sort | uniq -c | sort -rn"

echo ""
echo "=== 8. Unique task titles completed ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-out.log 2>&1 | grep '✅.*completed task' | sed 's/.*completed task \"//' | sed 's/\".*//' | sort -u"

echo ""
echo "=== 9. Error log tail ==="
$SSH "cat /home/ubuntu/.pm2/logs/hq-backend-error.log 2>&1 | tail -30"

echo ""
echo "=== 10. Check .env for DB config ==="
$SSH "grep -E 'DB_|DATABASE|POSTGRES' /home/ubuntu/hq-backend/.env 2>&1 | head -10"
