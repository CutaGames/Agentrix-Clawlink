#!/usr/bin/env bash
set -euo pipefail

TOKEN="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"
REPO="CutaGames/Agentrix-Clawlink"
RUN_ID=22181608638

JOB_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/$REPO/actions/runs/$RUN_ID/jobs" | \
  python3 -c "import json,sys; jobs=json.load(sys.stdin)['jobs']; print([j['id'] for j in jobs if 'Build APK' in j['name']][0])")

echo "Fetching build #8 log for job $JOB_ID..."
curl -s -L -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/$REPO/actions/jobs/$JOB_ID/logs" \
  -o /tmp/build8.log

echo "=== Step timing ==="
grep -E "Patch android|expo prebuild|Build Debug|Build Release|##\[error\]|CANCELLED|assembleDebug|assembleRelease|GlideUrl" /tmp/build8.log | grep -v "^w:" | cat

echo ""
echo "=== Last 20 lines ==="
tail -20 /tmp/build8.log | cat
