#!/bin/bash
set -e
echo "=== [1/4] Adding DISCORD_CLIENT_SECRET to .env ==="
if grep -q 'DISCORD_CLIENT_SECRET' /home/ubuntu/Agentrix/.env; then
  sed -i 's/^DISCORD_CLIENT_SECRET=.*/DISCORD_CLIENT_SECRET=px-1uYgmHhvJ388TU0dl-SlwTDd4iLwl/' /home/ubuntu/Agentrix/.env
else
  echo 'DISCORD_CLIENT_SECRET=px-1uYgmHhvJ388TU0dl-SlwTDd4iLwl' >> /home/ubuntu/Agentrix/.env
fi
echo "Done. Verifying:"
grep DISCORD_CLIENT_SECRET /home/ubuntu/Agentrix/.env

echo ""
echo "=== [2/4] Stopping system nginx if running ==="
sudo systemctl stop nginx 2>/dev/null || true
sudo systemctl disable nginx 2>/dev/null || true

echo ""
echo "=== [3/4] Recreating all services ==="
cd /home/ubuntu/Agentrix
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "=== [4/4] Waiting 40s for services to start ==="
sleep 40

echo ""
echo "=== Container Status ==="
docker ps -a --format 'table {{.Names}}\t{{.Status}}'

echo ""
echo "=== Backend Health Check ==="
docker exec agentrix-backend wget -qO- http://127.0.0.1:3001/api/health 2>&1 || echo "BACKEND HEALTH FAIL"

echo ""
echo "=== Backend Logs (last 10) ==="
docker logs agentrix-backend --tail 10 2>&1

echo ""
echo "=== Nginx Logs (last 5) ==="
docker logs agentrix-nginx --tail 5 2>&1
