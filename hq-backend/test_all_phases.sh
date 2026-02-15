#!/bin/bash
# End-to-end test for Phase 1-5
BASE=http://localhost:3005/api

echo "============================================"
echo "  Agentrix HQ - Phase 1-5 E2E Test"
echo "============================================"
echo ""

# Phase 1 & 2: Core tick system, budget, communication
echo "=== Phase 1 & 2: Core Tick System ==="
echo "--- Tick Status ---"
curl -s $BASE/hq/tick/status | python3 -m json.tool 2>/dev/null | head -10
echo ""

echo "--- Budget Status ---"
curl -s $BASE/hq/tick/budget | python3 -m json.tool 2>/dev/null | head -10
echo ""

echo "--- Agent Communication Stats ---"
curl -s $BASE/hq/tick/communication/stats | python3 -m json.tool 2>/dev/null | head -10
echo ""

echo "--- Chat Stream Test ---"
STREAM_RESULT=$(curl -s -N -X POST $BASE/hq/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"agentId":"ANALYST-01","messages":[{"role":"user","content":"Say OK"}]}' \
  --max-time 15 2>&1)
if echo "$STREAM_RESULT" | grep -q "chunk"; then
  echo "✅ Streaming works"
else
  echo "❌ Streaming failed: $STREAM_RESULT"
fi
echo ""

# Phase 3: Auto-task generation, pipelines, decomposition
echo "=== Phase 3: Autonomous Orchestration ==="
echo "--- Pipeline Templates ---"
curl -s $BASE/hq/tick/pipeline/templates | python3 -m json.tool 2>/dev/null
echo ""

echo "--- Active Pipelines ---"
curl -s $BASE/hq/tick/pipeline/active | python3 -m json.tool 2>/dev/null
echo ""

# Phase 4: Metrics, auto-healing
echo "=== Phase 4: Observability & Hardening ==="
echo "--- System Metrics ---"
curl -s $BASE/hq/tick/metrics | python3 -m json.tool 2>/dev/null | head -35
echo ""

echo "--- Agent Metrics (ARCHITECT-01) ---"
curl -s $BASE/hq/tick/metrics/ARCHITECT-01 | python3 -m json.tool 2>/dev/null | head -20
echo ""

echo "--- Auto-Heal ---"
curl -s -X POST $BASE/hq/tick/heal | python3 -m json.tool 2>/dev/null
echo ""

# Phase 5: Learning, skill profiles, knowledge sharing
echo "=== Phase 5: Agent Learning ==="
echo "--- Team Learning Summary ---"
curl -s $BASE/hq/tick/learning/summary | python3 -m json.tool 2>/dev/null | head -25
echo ""

echo "--- Skill Profile (CODER-01) ---"
curl -s $BASE/hq/tick/learning/profile/CODER-01 | python3 -m json.tool 2>/dev/null
echo ""

echo "--- Knowledge Share Test ---"
curl -s -X POST $BASE/hq/tick/learning/share \
  -H "Content-Type: application/json" \
  -d '{"fromAgentCode":"ARCHITECT-01","content":"NestJS modules should always export services they want to share","knowledgeType":"best_practice"}' \
  | python3 -m json.tool 2>/dev/null | head -15
echo ""

echo "--- Share History ---"
curl -s $BASE/hq/tick/learning/history | python3 -m json.tool 2>/dev/null | head -20
echo ""

# Memory system
echo "=== Memory System ==="
echo "--- Memory Stats (ARCHITECT-01) ---"
curl -s $BASE/memory/stats/ARCHITECT-01 | python3 -m json.tool 2>/dev/null
echo ""

echo "============================================"
echo "  All Phase 1-5 Tests Complete"
echo "============================================"
