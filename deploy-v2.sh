#!/bin/bash
set -e

REMOTE="ubuntu@57.182.89.146"
KEY="/tmp/agentrix.pem"
SRC_BASE="/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website"
REMOTE_BASE="/home/ubuntu/Agentrix"

echo "=== Copying additional changed files ==="
scp -o StrictHostKeyChecking=no -i "$KEY" \
  "$SRC_BASE/frontend/components/account/UnifiedAccountPanel.tsx" \
  "$REMOTE:$REMOTE_BASE/frontend/components/account/UnifiedAccountPanel.tsx"

scp -o StrictHostKeyChecking=no -i "$KEY" \
  "$SRC_BASE/frontend/components/agent/StructuredResponseCard.tsx" \
  "$REMOTE:$REMOTE_BASE/frontend/components/agent/StructuredResponseCard.tsx"

echo "=== Starting rebuild ==="
ssh -o StrictHostKeyChecking=no -i "$KEY" "$REMOTE" "nohup bash /tmp/rebuild-frontend.sh > /tmp/rebuild-frontend2.log 2>&1 &"
echo "Build started in background"
