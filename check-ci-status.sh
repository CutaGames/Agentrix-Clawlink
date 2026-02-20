#!/usr/bin/env bash
set -euo pipefail

TOKEN="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"
REPO="CutaGames/Agentrix-Clawlink"

# Get latest runs
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/$REPO/actions/runs?per_page=5" \
  > /tmp/ci_runs.json

echo "=== Recent CI Runs ==="
python3 << 'EOF'
import json
d = json.load(open('/tmp/ci_runs.json'))
for r in d['workflow_runs']:
    print(f"  #{r['run_number']}  status={r['status']}  conclusion={r['conclusion']}  created={r['created_at']}  id={r['id']}")
EOF

# Get jobs for the latest run
RUN_ID=$(python3 -c "import json; print(json.load(open('/tmp/ci_runs.json'))['workflow_runs'][0]['id'])")
RUN_NUM=$(python3 -c "import json; print(json.load(open('/tmp/ci_runs.json'))['workflow_runs'][0]['run_number'])")

echo ""
echo "=== Jobs for run #$RUN_NUM (id=$RUN_ID) ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/$REPO/actions/runs/$RUN_ID/jobs" \
  > /tmp/ci_jobs.json

python3 << 'EOF'
import json
d = json.load(open('/tmp/ci_jobs.json'))
for job in d['jobs']:
    print(f"\n  Job: {job['name']}  status={job['status']}  conclusion={job['conclusion']}")
    for step in job['steps']:
        status = step.get('conclusion','…')
        if status in ('failure','cancelled') or step.get('status') == 'in_progress':
            print(f"    STEP [{status.upper()}]: {step['name']}")
EOF

# Get failure logs for the build job if failed
FAILED_JOB_ID=$(python3 -c "
import json
d = json.load(open('/tmp/ci_jobs.json'))
for job in d['jobs']:
    if job['conclusion'] == 'failure':
        print(job['id'])
        break
" 2>/dev/null || true)

if [ -n "$FAILED_JOB_ID" ]; then
    echo ""
    echo "=== Failure log (job $FAILED_JOB_ID) ==="
    curl -s -H "Authorization: Bearer $TOKEN" \
      "https://api.github.com/repos/$REPO/actions/jobs/$FAILED_JOB_ID/logs" \
      -L -o /tmp/ci_fail.log 2>&1
    # Show lines around errors
    grep -E "FAILED|error:|error TS|Exception|BUILD FAILED|error:" /tmp/ci_fail.log | head -30 || \
      tail -50 /tmp/ci_fail.log
fi
