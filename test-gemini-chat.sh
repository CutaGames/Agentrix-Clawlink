#!/bin/bash
curl -X POST http://localhost:3005/api/hq/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "AGENT-GROWTH-001",
    "messages": [
      {
        "role": "user",
        "content": "你好，请用一句话介绍你自己"
      }
    ]
  }'
