#!/usr/bin/env bash
# =============================================================================
# pre-push-validate.sh
# Local validation checks run before every git push.
# Catches known crash patterns and type errors WITHOUT touching product code.
#
# Exit codes: 0 = all checks passed, 1 = one or more checks failed
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0

pass() { echo -e "  ${GREEN}✔${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}✘${NC} $1"; FAIL=$((FAIL+1)); }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
section() { echo -e "\n${CYAN}${BOLD}▶ $1${NC}"; }

# ---------------------------------------------------------------------------
# 1. ARM64 CRASH GUARDS
#    Detect side-effect imports that force native-module JSI init at bundle
#    parse time, which crashes on ARM64 real devices before Fabric is ready.
# ---------------------------------------------------------------------------
section "ARM64 crash guard — App.tsx side-effect imports"

# Standalone gesture-handler side-effect import (not a named import)
if grep -qP "^import\s+'react-native-gesture-handler'" "$REPO_ROOT/App.tsx"; then
  fail "App.tsx: bare 'import \"react-native-gesture-handler\"' detected — ARM64 crash risk"
else
  pass "App.tsx: no bare gesture-handler side-effect import"
fi

# Standalone reanimated side-effect import
if grep -qP "^import\s+'react-native-reanimated'" "$REPO_ROOT/App.tsx"; then
  fail "App.tsx: bare 'import \"react-native-reanimated\"' detected — ARM64 crash risk"
else
  pass "App.tsx: no bare reanimated side-effect import"
fi

# GestureHandlerRootView wrapper (signals gesture-handler side-effect was also added)
if grep -q "GestureHandlerRootView" "$REPO_ROOT/App.tsx"; then
  fail "App.tsx: GestureHandlerRootView found — only needed when gesture-handler is a listed peer; verify this is intentional"
else
  pass "App.tsx: no GestureHandlerRootView wrapper"
fi

# ---------------------------------------------------------------------------
# 2. BABEL CONFIG GUARD
#    nativewind/babel + jsxImportSource crashed on New Arch (B58-B67).
# ---------------------------------------------------------------------------
section "babel.config.js — nativewind check"

if grep -q "nativewind" "$REPO_ROOT/babel.config.js"; then
  fail "babel.config.js: 'nativewind' entry detected — caused JSI crash on New Arch (B58-B67)"
else
  pass "babel.config.js: no nativewind"
fi

if grep -q "jsxImportSource" "$REPO_ROOT/babel.config.js"; then
  fail "babel.config.js: 'jsxImportSource' found — paired with nativewind, caused RN 0.81 crash"
else
  pass "babel.config.js: no jsxImportSource"
fi

# ---------------------------------------------------------------------------
# 3. PACKAGE VERSION GUARDS
#    reanimated 3.x breaks RN 0.81.5 (ShadowNode::Shared deprecated, -Werror kills compile).
#    Tilde/caret allows float to incompatible patch. Exact pins required.
# ---------------------------------------------------------------------------
section "package.json — dependency version pins"

REANIMATED_VER=$(node -e "const p=require('./package.json'); console.log(p.dependencies['react-native-reanimated'] || '')")
WORKLETS_VER=$(node -e "const p=require('./package.json'); console.log(p.dependencies['react-native-worklets'] || p.dependencies['react-native-worklets-core'] || '')")

# Must be reanimated 4.x (3.x fails to compile on RN 0.81.5)
REANIMATED_MAJOR=$(echo "$REANIMATED_VER" | grep -oP '\d+' | head -1 || echo "0")
if [[ "$REANIMATED_MAJOR" -lt 4 ]]; then
  fail "react-native-reanimated '$REANIMATED_VER' is < 4.0 — compile error on RN 0.81.5 (ShadowNode::Shared)"
else
  pass "react-native-reanimated '$REANIMATED_VER' is 4.x ✓"
fi

# Warn on floating ranges (~ or ^) — can drift to breaking versions
if echo "$REANIMATED_VER" | grep -qP '^[~^]'; then
  warn "react-native-reanimated '$REANIMATED_VER' uses floating range — recommend exact pin (4.1.1)"
fi
if echo "$WORKLETS_VER" | grep -qP '^[~^]'; then
  warn "react-native-worklets '$WORKLETS_VER' uses floating range — recommend exact pin (0.5.2)"
fi

if [[ -n "$WORKLETS_VER" ]]; then
  pass "react-native-worklets present: '$WORKLETS_VER'"
else
  fail "react-native-worklets missing — required peer dep for reanimated 4.x New Arch"
fi

# ---------------------------------------------------------------------------
# 4. TYPESCRIPT CHECK
#    Catches type errors that would surface in CI or at runtime.
#    Runs with a 60s timeout — if it times out we warn (don't block push),
#    since the fast ARM64/babel/version guards are more critical.
#    Run manually to see full output: npx tsc --noEmit
# ---------------------------------------------------------------------------
section "TypeScript — type check (npx tsc --noEmit, 60s timeout)"

TS_TIMEOUT=60
TS_EXIT=0
TS_OUTPUT=$(timeout "$TS_TIMEOUT" npx tsc --noEmit 2>&1) || TS_EXIT=$?

if [[ "$TS_EXIT" -eq 124 ]]; then
  warn "TypeScript check timed out after ${TS_TIMEOUT}s — run 'npx tsc --noEmit' manually to verify"
elif [[ "$TS_EXIT" -eq 0 ]]; then
  TS_ERRORS=$(echo "$TS_OUTPUT" | grep -cP "error TS" || true)
  if [[ "$TS_ERRORS" -eq 0 ]]; then
    pass "TypeScript: no errors"
  else
    echo "$TS_OUTPUT" | grep "error TS" | head -20
    fail "TypeScript: $TS_ERRORS error(s) — fix before push"
  fi
else
  TS_ERRORS=$(echo "$TS_OUTPUT" | grep -cP "error TS" || true)
  if [[ "$TS_ERRORS" -gt 0 ]]; then
    echo "$TS_OUTPUT" | grep "error TS" | head -20
    fail "TypeScript: $TS_ERRORS error(s) — fix before push"
  else
    warn "TypeScript exited with code $TS_EXIT but no 'error TS' lines found — check manually"
  fi
fi

# ---------------------------------------------------------------------------
# 5. SUMMARY
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [[ "$FAIL" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}  ALL CHECKS PASSED ($PASS passed, 0 failed) — safe to push${NC}"
else
  echo -e "${RED}${BOLD}  BLOCKED: $FAIL check(s) failed, $PASS passed — fix before push${NC}"
fi
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

exit $FAIL
