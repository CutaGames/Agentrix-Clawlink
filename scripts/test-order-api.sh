#!/bin/bash
# Test order API with skillId
curl -s -X POST https://api.agentrix.top/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"skillId":"test-id","amount":10,"currency":"CNY"}'
echo ""
echo "---"
echo "Test complete"
