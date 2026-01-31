#!/bin/bash
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend
export HQ_PORT=3005
export HTTP_PROXY=""
export HTTPS_PROXY=""
export http_proxy=""
export https_proxy=""
fuser -k 3005/tcp
echo "Starting HQ Backend on port 3005..."
npm run start:hq:dev > hq_clean.log 2>&1 &
echo "HQ Backend started in background. Check hq_clean.log for output."
