#!/usr/bin/env bash
set -euo pipefail

TOKEN="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"
REPO="CutaGames/Agentrix-Clawlink"

# Get latest run
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/$REPO/actions/runs?per_page=1" \
  > /tmp/ci_latest.json

python3 << 'EOF'
import json
d = json.load(open('/tmp/ci_latest.json'))
r = d['workflow_runs'][0]
print(f"#{r['run_number']}  status={r['status']}  conclusion={r['conclusion']}  id={r['id']}")
EOF

RUN_ID=$(python3 -c "import json; print(json.load(open('/tmp/ci_latest.json'))['workflow_runs'][0]['id'])")

# Get jobs
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/$REPO/actions/runs/$RUN_ID/jobs" \
  > /tmp/ci_jobs.json

python3 << 'EOF'
import json
d = json.load(open('/tmp/ci_jobs.json'))
for job in d['jobs']:
    print(f"\nJob: {job['name']}  conclusion={job['conclusion']}")
    for step in job['steps']:
        c = step.get('conclusion') or step.get('status','?')
        marker = '  FAIL' if c == 'failure' else ('  CANCEL' if c == 'cancelled' else '')
        print(f"  [{c:12}] {step['name']}{marker}")
EOF

# Fetch log of build job
JOB_ID=$(python3 -c "
import json
d = json.load(open('/tmp/ci_jobs.json'))
for job in d['jobs']:
    if 'Build' in job['name']:
        print(job['id'])
        break
")
echo ""
echo "=== Build job log (key lines) ==="
curl -s -L -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/$REPO/actions/jobs/$JOB_ID/logs" \
  -o /tmp/ci_build.log

grep -E "FAILED|##\[error\]|error:|BUILD FAILED|Exception|CANCELLED|> Task :app:|assembleRelease|Patch|abiFilter|GlideUrl|patched|skip" /tmp/ci_build.log | grep -v "^w:" | cat

echo ""
echo "=== Last 30 lines ==="
tail -30 /tmp/ci_build.log | cat
