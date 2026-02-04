#!/bin/bash
# Debug script to trace the request flow

cd /home/ubuntu/Agentrix-independent-HQ/hq-backend/dist/modules/ai

# Add debug logging after line 173 (before the API call)
# Find line with 'const body = {'
LINE=$(grep -n "const body = {" hq-ai.service.js | head -1 | cut -d: -f1)
echo "Found 'const body' at line $LINE"

# Add debug after the body definition (around line 177)
sed -i '177a\        this.logger.debug("Bedrock messages: " + JSON.stringify(claudeMessages));' hq-ai.service.js

echo "Modified. Restarting..."
pm2 restart hq-backend
