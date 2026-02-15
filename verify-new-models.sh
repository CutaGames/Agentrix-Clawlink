#!/bin/bash
PEM="/tmp/agentrix.pem"
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== Current time ==="
$SSH 'date'

echo ""
echo "=== Waiting for next Tick with PID 284180 (up to 12 min) ==="
for i in $(seq 1 72); do
    sleep 10
    LOGS=$($SSH 'pm2 logs hq-backend --lines 60 --nostream 2>&1' | grep "284180" | grep -E "Tick.*完成|attempt|using gemini|2.0-flash-lite|2.5-flash|2.5-pro|fallback|completed")
    if echo "$LOGS" | grep -q "Tick.*完成"; then
        echo "=== Tick completed after ${i}0 seconds ==="
        echo ""
        echo "=== Key logs ==="
        $SSH 'pm2 logs hq-backend --lines 100 --nostream 2>&1' | grep "284180" | grep -E "using gemini|model:|attempt|fallback|completed|failed|quota|Rate limit" | tail -40
        echo ""
        echo "=== Tick summary ==="
        $SSH 'pm2 logs hq-backend --lines 100 --nostream 2>&1' | grep "284180" | grep -E "Tick|tasks_" | tail -10
        exit 0
    fi
    if [ $((i % 6)) -eq 0 ]; then
        echo "  Still waiting... ($((i*10))s)"
    fi
done

echo "=== Timeout - latest logs ==="
$SSH 'pm2 logs hq-backend --lines 60 --nostream 2>&1' | grep "284180" | tail -40
