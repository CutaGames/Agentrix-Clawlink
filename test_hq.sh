#!/bin/bash

curl -X POST http://localhost:8080/api/hq/chat \
  -H 'Content-Type: application/json' \
  -d @hq_chat_test.json
