#!/bin/bash
TOKEN=$(grep AWS_BEARER_TOKEN_BEDROCK /home/ubuntu/Agentrix-independent-HQ/hq-backend/.env | cut -d= -f2)
echo "Token length: ${#TOKEN}"
echo "Testing Bedrock API..."

curl -s -X POST "https://bedrock-runtime.us-east-1.amazonaws.com/model/us.anthropic.claude-sonnet-4-5-20250929-v1%3A0/invoke" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"anthropic_version":"bedrock-2023-05-31","max_tokens":100,"messages":[{"role":"user","content":"hi"}]}' \
  --max-time 60

echo ""
echo "Done"
