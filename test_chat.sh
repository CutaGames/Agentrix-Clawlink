#!/bin/bash
cd hq-backend
echo "Starting HQ Backend..."
node dist/main.js > hq_test.log 2>&1 &
PID=$!
echo "Server PID: $PID"

# Wait for server to be ready
echo "Waiting for server to start..."
MAX_RETRIES=60
COUNT=0
READY=0

while [ $COUNT -lt $MAX_RETRIES ]; do
  if grep -q "Nest application successfully started" hq_test.log; then
    echo "Server is ready!"
    READY=1
    break
  fi
  sleep 1
  COUNT=$((COUNT+1))
done

if [ $READY -eq 0 ]; then
  echo "Server failed to start within 60 seconds."
  cat hq_test.log
  kill $PID
  exit 1
fi

echo "Sending chat request..."
RESPONSE=$(curl -s -X POST http://localhost:3005/api/hq/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId": "ARCHITECT-01", "messages": [{"role": "user", "content": "Hello!"}]}')

echo "Response:"
echo "$RESPONSE"

echo "Stopping server..."
kill $PID
