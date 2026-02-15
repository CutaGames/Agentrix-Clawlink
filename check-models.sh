#!/bin/bash
PEM="/tmp/agentrix.pem"
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. Get Gemini API key from env ==="
GEMINI_KEY=$($SSH 'grep "^GEMINI_API_KEY=" /home/ubuntu/hq-backend/.env | head -1 | cut -d= -f2')
echo "Key prefix: ${GEMINI_KEY:0:10}..."

echo ""
echo "=== 2. List available models ==="
$SSH "curl -s 'https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}' | python3 -m json.tool 2>/dev/null | grep -E '\"name\"|\"displayName\"' | head -40"

echo ""
echo "=== 3. Test gemini-1.5-flash specifically ==="
$SSH "curl -s -o /dev/null -w '%{http_code}' 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}' -H 'Content-Type: application/json' -d '{\"contents\":[{\"parts\":[{\"text\":\"hi\"}]}]}'"
echo ""

echo ""
echo "=== 4. Test gemini-1.5-flash-8b ==="
$SSH "curl -s -o /dev/null -w '%{http_code}' 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${GEMINI_KEY}' -H 'Content-Type: application/json' -d '{\"contents\":[{\"parts\":[{\"text\":\"hi\"}]}]}'"
echo ""

echo ""
echo "=== 5. Test gemini-2.0-flash ==="
$SSH "curl -s -o /dev/null -w '%{http_code}' 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}' -H 'Content-Type: application/json' -d '{\"contents\":[{\"parts\":[{\"text\":\"hi\"}]}]}'"
echo ""

echo ""
echo "=== 6. Full error for gemini-1.5-flash ==="
$SSH "curl -s 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}' -H 'Content-Type: application/json' -d '{\"contents\":[{\"parts\":[{\"text\":\"hi\"}]}]}'"
echo ""
