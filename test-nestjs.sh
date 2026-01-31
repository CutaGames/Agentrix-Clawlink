#!/bin/bash
# Test if NestJS loads properly in Agentrix backend vs HQ backend

echo "=== Testing NestJS Loading ==="

echo ""
echo "1. Testing in Agentrix backend directory:"
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend
timeout 10 node -e "console.log('Start'); require('@nestjs/common'); console.log('NestJS loaded successfully');" 2>&1
echo "Exit code: $?"

echo ""
echo "2. Testing in HQ backend directory:"
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/hq-backend
timeout 10 node -e "console.log('Start'); require('@nestjs/common'); console.log('NestJS loaded successfully');" 2>&1
echo "Exit code: $?"

echo ""
echo "=== Test Complete ==="
