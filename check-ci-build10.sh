#!/bin/bash
TOKEN="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"
REPO="CutaGames/Agentrix-Clawlink"

# Get latest runs
echo "=== Latest runs ==="
curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/$REPO/actions/runs?per_page=5" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
for r in data['workflow_runs']:
    print(r['id'], r['run_number'], r['status'], r['conclusion'], r['created_at'])
"

# Get jobs for latest run
echo ""
echo "=== Jobs for latest run ==="
RUN_ID=$(curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/$REPO/actions/runs?per_page=1" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['workflow_runs'][0]['id'])")

echo "Run ID: $RUN_ID"

curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/$REPO/actions/runs/$RUN_ID/jobs" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
for job in data['jobs']:
    print('JOB:', job['name'], job['status'], job['conclusion'])
    for step in job.get('steps', []):
        status = step.get('conclusion', step.get('status', '?'))
        print('  STEP:', step['number'], step['name'], '->', status)
"

echo ""
echo "=== Fetching logs for failed job ==="
FAILED_JOB=$(curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/$REPO/actions/runs/$RUN_ID/jobs" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
for job in data['jobs']:
    if job['conclusion'] == 'failure':
        print(job['id'])
        break
")

if [ -n "$FAILED_JOB" ]; then
  echo "Failed job ID: $FAILED_JOB"
  curl -s -H "Authorization: token $TOKEN" \
    "https://api.github.com/repos/$REPO/actions/jobs/$FAILED_JOB/logs" \
    | tail -150
fi
