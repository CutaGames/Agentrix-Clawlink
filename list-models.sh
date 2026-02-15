#!/bin/bash
PEM="/tmp/agentrix.pem"
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== List all available Gemini models via Node SDK ==="
$SSH 'cd /home/ubuntu/hq-backend && node -e "
require(\"dotenv\").config();
const { GoogleGenerativeAI } = require(\"@google/generative-ai\");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
async function list() {
  try {
    // Use REST API via node https
    const https = require(\"https\");
    const key = process.env.GEMINI_API_KEY;
    const url = \"https://generativelanguage.googleapis.com/v1beta/models?key=\" + key;
    https.get(url, (res) => {
      let data = \"\";
      res.on(\"data\", (chunk) => data += chunk);
      res.on(\"end\", () => {
        try {
          const models = JSON.parse(data).models || [];
          const genModels = models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes(\"generateContent\"));
          console.log(\"Models supporting generateContent (\" + genModels.length + \"):\");
          genModels.forEach(m => {
            console.log(\"  \" + m.name + \" | \" + m.displayName);
          });
        } catch(e) {
          console.log(\"Parse error:\", e.message);
          console.log(\"Raw:\", data.substring(0, 500));
        }
      });
    }).on(\"error\", (e) => console.log(\"Request error:\", e.message));
  } catch(e) {
    console.log(\"Error:\", e.message);
  }
}
list();
" 2>&1'
