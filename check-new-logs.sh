#!/bin/bash
PEM="/tmp/agentrix.pem"
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 新进程(169238)的全部日志 ==="
$SSH 'pm2 logs hq-backend --lines 80 --nostream 2>&1' | grep "169238" | tail -50

echo ""
echo "=== Gemini key 初始化信息 ==="
$SSH 'pm2 logs hq-backend --lines 80 --nostream 2>&1' | grep -i "169238.*gemini\|169238.*mapping\|169238.*key\|169238.*initialized" | tail -20

echo ""
echo "=== 等待下一个 Tick (当前时间) ==="
$SSH 'date'
