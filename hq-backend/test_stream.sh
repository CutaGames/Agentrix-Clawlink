#!/bin/bash
curl -s -N -X POST http://localhost:3005/api/hq/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"agentId":"ANALYST-01","messages":[{"role":"user","content":"Say hello in one sentence"}]}' \
  --max-time 30 2>&1 | head -20
