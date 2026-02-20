#!/bin/bash
# Fix openclaw gateway on Singapore server

SERVER="ubuntu@18.139.157.116"
KEY="$HOME/.ssh/hq.pem"

ssh -i "$KEY" -o StrictHostKeyChecking=no "$SERVER" << 'ENDSSH'

echo "=== Step1: Kill stale openclaw processes ==="
kill -9 $(pgrep -f "openclaw-gateway" 2>/dev/null) 2>/dev/null
kill -9 $(pgrep -f "openclaw gateway" 2>/dev/null) 2>/dev/null
sleep 2

echo "=== Step2: Free port 18789 ==="
PORT_PID=$(ss -tlnp 2>/dev/null | grep 18789 | grep -oP 'pid=\K[0-9]+')
if [ -n "$PORT_PID" ]; then
  echo "Killing PID $PORT_PID on port 18789"
  kill -9 "$PORT_PID" 2>/dev/null
  sleep 1
fi
ss -tlnp | grep 18789 && echo "WARNING still in use" || echo "Port 18789 free"

echo "=== Step3: Start gateway via PM2 ==="
pm2 delete openclaw-gateway 2>/dev/null
pm2 start /usr/bin/openclaw --name openclaw-gateway -- gateway
sleep 5

echo "=== Step4: Status ==="
pm2 status
ss -tlnp | grep 18789 && echo "LISTENING OK" || echo "ERROR NOT LISTENING"

echo "=== Step5: Logs ==="
pm2 logs openclaw-gateway --lines 30 --nostream

echo "=== Step6: Save PM2 ==="
pm2 save --force

ENDSSH
