#!/bin/bash
echo "Testing HQ chat completion API..."
curl -s -X POST "http://57.182.89.146:8080/api/hq/chat/completion" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello, who are you?"}]}'
echo ""
echo "Done."
