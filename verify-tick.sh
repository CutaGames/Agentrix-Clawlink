#!/bin/bash
PEM="/tmp/agentrix.pem"
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== Current time ==="
$SSH 'date'

echo ""
echo "=== Waiting for next Tick (up to 12 min) ==="
for i in $(seq 1 72); do
    sleep 10
    LOGS=$($SSH 'pm2 logs hq-backend --lines 40 --nostream 2>&1' | grep "241304" | grep -E "Tick|fallback|gemini-1.5-flash|attempt|LEGAL-01 using|SECURITY-01 using|Agent.*using gemini")
    if echo "$LOGS" | grep -q "Tick.*完成\|attempt"; then
        echo "=== Tick detected after ${i}0 seconds ==="
        echo "$LOGS" | tail -30
        echo ""
        echo "=== Full new process logs ==="
        $SSH 'pm2 logs hq-backend --lines 80 --nostream 2>&1' | grep "241304" | tail -50
        exit 0
    fi
    if [ $((i % 6)) -eq 0 ]; then
        echo "  Still waiting... ($((i*10))s)"
    fi
done

echo "=== Timeout - showing latest logs ==="
$SSH 'pm2 logs hq-backend --lines 40 --nostream 2>&1' | grep "241304" | tail -30
