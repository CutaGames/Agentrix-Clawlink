#!/bin/bash
SERVER="ubuntu@57.182.89.146"
KEY="/home/arthur/.ssh/agentrix-tokyo.pem"

# Wait for both builds to complete, then deploy
ssh -i $KEY -o StrictHostKeyChecking=no $SERVER '
set -e
# Wait for both build processes to finish
echo "Waiting for builds..."
while pgrep -f "docker" | xargs -I{} cat /proc/{}/cmdline 2>/dev/null | grep -q "backend\|frontend"; do
  sleep 15
  echo -n "."
done
echo ""
echo "All builds done!"
echo "=== Backend log (last 5 lines) ==="
tail -5 /tmp/backend_build.log
echo "=== Frontend log (last 5 lines) ==="
tail -5 /tmp/fe_build5.log
echo "=== Docker images ==="
docker images | grep agentrix
'
