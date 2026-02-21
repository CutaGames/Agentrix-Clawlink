#!/bin/bash
TOKEN="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"

echo "=== Agentrix-Clawlink CI runs (APK Build) ==="
curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/CutaGames/Agentrix-Clawlink/actions/runs?per_page=5" \
  > /tmp/runs_clawlink.json
python3 -c "
import json
data = json.load(open('/tmp/runs_clawlink.json'))
for r in data.get('workflow_runs', []):
    print(r['run_number'], r['name'][:40], r['status'], r['conclusion'] or 'in_progress', r['created_at'][:19])
"

echo ""
echo "=== CutaGames/Agentrix CI runs (Website) ==="
curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/CutaGames/Agentrix/actions/runs?per_page=5" \
  > /tmp/runs_agentrix.json
python3 -c "
import json
data = json.load(open('/tmp/runs_agentrix.json'))
for r in data.get('workflow_runs', []):
    print(r['run_number'], r['name'][:40], r['status'], r['conclusion'] or 'in_progress', r['created_at'][:19])
"
