#!/bin/bash
PEM="/tmp/agentrix.pem"
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. Full error logs for model not available ==="
$SSH 'pm2 logs hq-backend --err --lines 50 --nostream 2>&1' | grep -i "not available\|not found\|404\|1.5-flash\|flash-8b" | tail -20

echo ""
echo "=== 2. All logs from PID 241304 with model info ==="
$SSH 'pm2 logs hq-backend --lines 100 --nostream 2>&1' | grep "241304" | grep -i "model\|flash\|not available\|error\|failed" | tail -30

echo ""
echo "=== 3. Check proxy config ==="
$SSH 'grep -i "proxy\|HTTPS_PROXY\|HTTP_PROXY" /home/ubuntu/hq-backend/.env 2>/dev/null'

echo ""
echo "=== 4. Check @google/generative-ai version ==="
$SSH 'cat /home/ubuntu/hq-backend/node_modules/@google/generative-ai/package.json 2>/dev/null | grep version | head -1'

echo ""
echo "=== 5. Test model via node directly ==="
$SSH 'cd /home/ubuntu/hq-backend && node -e "
const { GoogleGenerativeAI } = require(\"@google/generative-ai\");
const key = process.env.GEMINI_API_KEY || require(\"dotenv\").config().parsed.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(key);
async function test() {
  for (const m of [\"gemini-2.0-flash\", \"gemini-1.5-flash\", \"gemini-1.5-flash-8b\", \"gemini-1.5-pro\"]) {
    try {
      const model = genAI.getGenerativeModel({ model: m });
      const r = await model.generateContent(\"say hi in 3 words\");
      console.log(m + \": OK - \" + r.response.text().substring(0, 30));
    } catch(e) {
      console.log(m + \": ERROR - \" + e.message.substring(0, 80));
    }
  }
}
test();
" 2>&1'
