#!/bin/bash
curl -s -X POST http://localhost:3005/api/hq/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId":"CODER-01","messages":[{"role":"user","content":"hello from test script"}]}'
