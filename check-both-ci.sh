#!/bin/bash
TOKEN="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"

echo "=== Returning to main branch ==="
git -C /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website stash
git -C /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website checkout main 2>&1 || true
echo "Current branch: $(git -C /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website branch --show-current)"

echo ""
echo "=== Agentrix-Clawlink CI runs (APK) ==="
curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/CutaGames/Agentrix-Clawlink/actions/runs?per_page=5" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
for r in data.get('workflow_runs', []):
    print(r['run_number'], r['name'], r['status'], r['conclusion'] or 'running', r['created_at'][:19])
"

echo ""
echo "=== CutaGames/Agentrix CI runs (Website) ==="
curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/CutaGames/Agentrix/actions/runs?per_page=5" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
for r in data.get('workflow_runs', []):
    print(r['run_number'], r['name'], r['status'], r['conclusion'] or 'running', r['created_at'][:19])
"
