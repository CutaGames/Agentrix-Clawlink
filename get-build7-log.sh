#!/usr/bin/env bash
set -euo pipefail

TOKEN="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"
REPO="CutaGames/Agentrix-Clawlink"

# Get job #7 build job ID
RUN_ID=22178492775
JOB_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/$REPO/actions/runs/$RUN_ID/jobs" | \
  python3 -c "import json,sys; jobs=json.load(sys.stdin)['jobs']; print([j['id'] for j in jobs if 'Build APK' in j['name']][0])")

echo "Fetching logs for job $JOB_ID..."
curl -s -L -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/$REPO/actions/jobs/$JOB_ID/logs" \
  -o /tmp/build7.log

echo "=== Last 80 lines of build log ==="
tail -80 /tmp/build7.log | cat

echo ""
echo "=== Key lines (FAILED/error/BUILD) ==="
grep -E "FAILED|> Task|error:|BUILD (FAILED|SUCCESS)|Timeout|Kotlin compil|expo-image|GlideUrl|CANCELLED" /tmp/build7.log | tail -50
