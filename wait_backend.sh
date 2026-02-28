#!/bin/bash
SERVER="ubuntu@57.182.89.146"
KEY="/home/arthur/.ssh/agentrix-tokyo.pem"

# Wait for backend build, then rebuild frontend and restart both
ssh -i $KEY -o StrictHostKeyChecking=no $SERVER '
while pgrep -f "docker.*backend" > /dev/null 2>&1; do sleep 5; done
echo "Backend build watch done, checking log..."
tail -5 /tmp/backend_build.log
echo "---"
docker images agentrix-backend
'
