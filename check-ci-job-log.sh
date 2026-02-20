#!/bin/bash
TOKEN="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"
REPO="CutaGames/Agentrix-Clawlink"
JOB_ID="64236785258"

curl -sL -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/$REPO/actions/jobs/$JOB_ID/logs" | tail -200
