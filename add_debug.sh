#!/bin/bash
# Add debug logging to hq-ai.service.js
cd /home/ubuntu/Agentrix-independent-HQ/hq-backend/dist/modules/ai
cp hq-ai.service.js hq-ai.service.js.bak2

# Add debug after line 176 (after body is built)
sed -i '176a\        console.log("DEBUG Bedrock body:", JSON.stringify(body));' hq-ai.service.js

echo "Modified. Showing context:"
sed -n '174,180p' hq-ai.service.js

# Restart
pm2 restart hq-backend
