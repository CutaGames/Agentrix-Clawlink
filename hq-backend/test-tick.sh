#!/bin/bash
# Test Tick System

echo "=== Testing Tick System ==="
echo ""

# Check if backend is running
echo "1. Checking backend health..."
HEALTH=$(curl -s http://localhost:3005/api/health 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Backend is not running on port 3005"
    echo "Please start it with: npm run start:dev"
    exit 1
fi
echo "✅ Backend is running"
echo ""

# Get current status
echo "2. Getting current tick status..."
curl -s http://localhost:3005/api/hq/tick/status | jq '.'
echo ""

# Trigger a manual tick
echo "3. Triggering manual tick..."
curl -s -X POST http://localhost:3005/api/hq/tick \
  -H "Content-Type: application/json" \
  -d '{"triggeredBy": "test-script"}' | jq '.'
echo ""

echo "=== Tick Test Complete ==="
