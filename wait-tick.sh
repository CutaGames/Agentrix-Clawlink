#!/bin/bash
PEM="/tmp/agentrix.pem"
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 当前时间 ==="
$SSH 'date'

echo ""
echo "=== 等待新Tick (最多等5分钟) ==="
for i in $(seq 1 30); do
    sleep 10
    # 检查是否有新进程176605的Tick日志
    RESULT=$($SSH 'pm2 logs hq-backend --lines 20 --nostream 2>&1' | grep "176605" | grep -E "Tick|fallback|gemini-1.5-flash|attempt|Rate limit|model:" | tail -5)
    if [ -n "$RESULT" ]; then
        echo "=== 发现新Tick日志 (${i}0秒后) ==="
        echo "$RESULT"
        echo ""
        echo "=== 完整新进程日志 ==="
        $SSH 'pm2 logs hq-backend --lines 60 --nostream 2>&1' | grep "176605" | tail -40
        exit 0
    fi
    echo "  等待中... (${i}0秒)"
done

echo "=== 超时，查看最新日志 ==="
$SSH 'pm2 logs hq-backend --lines 40 --nostream 2>&1' | grep "176605" | tail -30
