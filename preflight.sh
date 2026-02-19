#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  ClawLink Mobile — Pre-flight CI Simulation
#  Run this in WSL before pushing to GitHub to catch build failures locally.
#
#  Usage:
#    ./preflight.sh                   # Full run (clean → lint → tests → build → UI)
#    ./preflight.sh --no-clean        # Skip gradlew clean (faster on re-runs)
#    ./preflight.sh --no-tests        # Skip unit tests
#    ./preflight.sh --no-maestro      # Skip Maestro UI tests even if emulator found
#    ./preflight.sh --quick           # Shortcut: --no-clean --no-tests
#    ./preflight.sh --help
#
#  Requirements (WSL / Linux):
#    - Node 20+, Java 17+, ANDROID_HOME or ANDROID_SDK_ROOT set
#    - Maestro CLI installed (optional — skipped if not found)
#    - Android emulator running (optional — skipped if not found)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── ANSI colours ──────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

header()  { echo -e "\n${BOLD}${BLUE}╔══ $* ══╗${RESET}"; }
ok()      { echo -e "  ${GREEN}✅ $*${RESET}"; }
warn()    { echo -e "  ${YELLOW}⚠️  $*${RESET}"; }
fail()    { echo -e "  ${RED}❌ $*${RESET}"; }
info()    { echo -e "  ${CYAN}ℹ  $*${RESET}"; }

# ── Parse flags ───────────────────────────────────────────────────────────────
DO_CLEAN=true
DO_TESTS=true
DO_MAESTRO=true

for arg in "$@"; do
  case "$arg" in
    --no-clean)   DO_CLEAN=false ;;
    --no-tests)   DO_TESTS=false ;;
    --no-maestro) DO_MAESTRO=false ;;
    --quick)      DO_CLEAN=false; DO_TESTS=false ;;
    --help|-h)
      sed -n '/^#/!q;/^#!/d;s/^# \{0,2\}//p' "$0"
      exit 0 ;;
    *) echo "Unknown flag: $arg (use --help)"; exit 1 ;;
  esac
done

# ── Result tracking ───────────────────────────────────────────────────────────
declare -A RESULTS   # step_name → "PASS" | "FAIL" | "SKIP" | "WARN"
OVERALL_PASS=true

track_result() {
  local step="$1" status="$2"
  RESULTS["$step"]="$status"
  [[ "$status" == "FAIL" ]] && OVERALL_PASS=false
}

# ── 0. Prerequisites ──────────────────────────────────────────────────────────
header "0. Checking prerequisites"

# Java 17+
if command -v java &>/dev/null; then
  JAVA_VER=$(java -version 2>&1 | grep -oP '(?<=version ")[\d]+' | head -1)
  if [[ "${JAVA_VER:-0}" -ge 17 ]]; then
    ok "Java ${JAVA_VER}"
  else
    warn "Java ${JAVA_VER} found — Java 17+ recommended"
  fi
else
  fail "Java not found. Install: sudo apt install openjdk-17-jdk"
  exit 1
fi

# Node 20+
if command -v node &>/dev/null; then
  NODE_VER=$(node -e "process.stdout.write(process.version.replace('v','').split('.')[0])")
  if [[ "${NODE_VER:-0}" -ge 20 ]]; then
    ok "Node ${NODE_VER}"
  else
    warn "Node ${NODE_VER} found — Node 20+ recommended"
  fi
else
  fail "Node.js not found"
  exit 1
fi

# Android SDK
ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [[ -n "$ANDROID_HOME" && -d "$ANDROID_HOME" ]]; then
  ok "ANDROID_HOME = $ANDROID_HOME"
else
  fail "ANDROID_HOME / ANDROID_SDK_ROOT not set or directory missing"
  echo "  Set it in ~/.bashrc: export ANDROID_HOME=\$HOME/Android/Sdk"
  exit 1
fi

# Maestro (optional)
MAESTRO_AVAILABLE=false
if command -v maestro &>/dev/null; then
  ok "Maestro $(maestro --version 2>/dev/null | head -1)"
  MAESTRO_AVAILABLE=true
else
  warn "Maestro CLI not found — UI tests will be skipped"
  warn "Install: curl -Ls 'https://get.maestro.mobile.dev' | bash"
fi

echo ""

# ── 1. npm install ────────────────────────────────────────────────────────────
header "1. npm install"
if npm install --prefer-offline 2>&1 | tail -3; then
  ok "npm install"
  track_result "npm_install" "PASS"
else
  fail "npm install failed"
  track_result "npm_install" "FAIL"
  exit 1
fi

# ── 2. Patch expo-image for Kotlin 2.x ───────────────────────────────────────
header "2. Patch expo-image (Kotlin 2.x Null-Safety)"
GLIDE_FILE="node_modules/expo-image/android/src/main/java/expo/modules/image/okhttp/GlideUrlWrapperLoader.kt"
if [[ -f "$GLIDE_FILE" ]]; then
  python3 - << 'PYEOF'
import re, os, sys
filepath = 'node_modules/expo-image/android/src/main/java/expo/modules/image/okhttp/GlideUrlWrapperLoader.kt'
with open(filepath, 'r') as f:
    content = f.read()
fixed = re.sub(r'\.body\(\)(?!!)', '.body()!!', content)
if fixed == content:
    print("  [ok] Already patched — no changes needed")
else:
    with open(filepath, 'w') as f:
        f.write(fixed)
    import re as _re
    n = len(_re.findall(r'\.body\(\)!!', fixed))
    print(f"  [patched] Added !! null-assertion to {n} .body() call(s)")
PYEOF
  track_result "expo_image_patch" "PASS"
else
  warn "GlideUrlWrapperLoader.kt not found — expo-image may already be updated"
  track_result "expo_image_patch" "SKIP"
fi

# ── 3. Expo prebuild ──────────────────────────────────────────────────────────
header "3. expo prebuild (Android)"
if npx expo prebuild --platform android --clean --no-install 2>&1 | tail -5; then
  ok "expo prebuild"
  track_result "prebuild" "PASS"
else
  fail "expo prebuild failed"
  track_result "prebuild" "FAIL"
  exit 1
fi

chmod +x android/gradlew

# ── 4. Gradle clean ───────────────────────────────────────────────────────────
if [[ "$DO_CLEAN" == "true" ]]; then
  header "4. Gradle clean"
  if (cd android && ./gradlew clean --no-build-cache --no-daemon 2>&1 | tail -5); then
    ok "Gradle clean"
    track_result "gradle_clean" "PASS"
  else
    warn "Gradle clean failed (non-fatal)"
    track_result "gradle_clean" "WARN"
  fi
else
  info "4. Gradle clean — skipped (--no-clean)"
  track_result "gradle_clean" "SKIP"
fi

# ── 5. Gradle lint ────────────────────────────────────────────────────────────
header "5. Gradle lint (warn-only)"
LINT_PASS=true
if ! (cd android && ./gradlew lintDebug --no-daemon \
      -Dorg.gradle.jvmargs="-Xmx2g" 2>&1 | tail -10); then
  warn "Lint found issues (see android/app/build/reports/lint-results-debug.html)"
  LINT_PASS=false
fi
if [[ "$LINT_PASS" == "true" ]]; then
  ok "Lint clean"
  track_result "lint" "PASS"
else
  track_result "lint" "WARN"
fi

# ── 6. Unit tests ─────────────────────────────────────────────────────────────
if [[ "$DO_TESTS" == "true" ]]; then
  header "6. Unit tests (testDebugUnitTest)"
  if (cd android && ./gradlew testDebugUnitTest --no-daemon \
      -Dorg.gradle.jvmargs="-Xmx2g" 2>&1 | tail -10); then
    ok "Unit tests passed"
    track_result "unit_tests" "PASS"
  else
    fail "Unit tests failed"
    track_result "unit_tests" "FAIL"
  fi
else
  info "6. Unit tests — skipped (--no-tests)"
  track_result "unit_tests" "SKIP"
fi

# ── 7. Build Debug APK ────────────────────────────────────────────────────────
header "7. assembleDebug — Build APK"
if (cd android && ./gradlew assembleDebug --no-daemon \
    -Dorg.gradle.jvmargs="-Xmx4g -Dorg.gradle.daemon=false" 2>&1); then
  # Locate the APK
  APK_PATH=$(find android/app/build/outputs/apk/debug -name "*.apk" 2>/dev/null | head -1)
  if [[ -n "$APK_PATH" ]]; then
    APK_SIZE=$(du -sh "$APK_PATH" | cut -f1)
    ok "APK built: $APK_PATH ($APK_SIZE)"
    track_result "assemble_debug" "PASS"
  else
    warn "Gradle succeeded but APK not found"
    track_result "assemble_debug" "WARN"
  fi
else
  fail "assembleDebug failed — see output above"
  track_result "assemble_debug" "FAIL"
fi

# ── 8. Maestro UI tests (only if emulator running + APK built) ───────────────
if [[ "$DO_MAESTRO" == "true" && "$MAESTRO_AVAILABLE" == "true" && \
      "${RESULTS[assemble_debug]}" == "PASS" ]]; then
  header "8. Maestro UI tests"

  # Check for connected device / emulator
  DEVICE_COUNT=$(adb devices 2>/dev/null | grep -c "emulator\|device$" || true)
  if [[ "${DEVICE_COUNT:-0}" -gt 0 ]]; then
    info "Found ${DEVICE_COUNT} connected device(s)"

    # Install APK
    APK_PATH=$(find android/app/build/outputs/apk/debug -name "*.apk" | head -1)
    adb install -r "$APK_PATH" 2>&1 | tail -3

    # Run each Maestro flow
    MAESTRO_PASS=0; MAESTRO_FAIL=0
    mkdir -p maestro-output

    for flow in .maestro/*.yaml; do
      FLOW_NAME=$(basename "$flow" .yaml)
      echo -e "\n  ${CYAN}Running: $flow${RESET}"
      if maestro test "$flow" 2>&1 | tee "maestro-output/${FLOW_NAME}.log"; then
        ok "  PASS: $flow"
        MAESTRO_PASS=$((MAESTRO_PASS + 1))
      else
        fail "  FAIL: $flow  (log: maestro-output/${FLOW_NAME}.log)"
        MAESTRO_FAIL=$((MAESTRO_FAIL + 1))
      fi
    done

    if [[ $MAESTRO_FAIL -eq 0 ]]; then
      ok "All ${MAESTRO_PASS} Maestro flow(s) passed"
      track_result "maestro" "PASS"
    else
      fail "${MAESTRO_FAIL} flow(s) failed, ${MAESTRO_PASS} passed"
      track_result "maestro" "FAIL"
    fi
  else
    warn "No emulator/device detected — skipping Maestro tests"
    info "Start an emulator: emulator -avd Pixel_API30 &"
    track_result "maestro" "SKIP"
  fi
elif [[ "$DO_MAESTRO" == "false" ]]; then
  info "8. Maestro UI tests — skipped (--no-maestro)"
  track_result "maestro" "SKIP"
else
  info "8. Maestro UI tests — skipped (CLI not found or APK build failed)"
  track_result "maestro" "SKIP"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${BLUE}╔═══════════════════════════════╗"
echo -e "║   Pre-flight Summary          ║"
echo -e "╚═══════════════════════════════╝${RESET}"

declare -A STEP_LABELS=(
  [npm_install]="npm install"
  [expo_image_patch]="expo-image patch"
  [prebuild]="expo prebuild"
  [gradle_clean]="Gradle clean"
  [lint]="Gradle lint"
  [unit_tests]="Unit tests"
  [assemble_debug]="assembleDebug"
  [maestro]="Maestro UI tests"
)

STEP_ORDER=(npm_install expo_image_patch prebuild gradle_clean lint unit_tests assemble_debug maestro)

for step in "${STEP_ORDER[@]}"; do
  status="${RESULTS[$step]:-SKIP}"
  label="${STEP_LABELS[$step]:-$step}"
  case "$status" in
    PASS) echo -e "  ${GREEN}✅ PASS${RESET}  $label" ;;
    FAIL) echo -e "  ${RED}❌ FAIL${RESET}  $label" ;;
    WARN) echo -e "  ${YELLOW}⚠️  WARN${RESET}  $label (non-blocking)" ;;
    SKIP) echo -e "  ${CYAN}⏭  SKIP${RESET}  $label" ;;
  esac
done

echo ""
if [[ "$OVERALL_PASS" == "true" ]]; then
  echo -e "${GREEN}${BOLD}🚀 All critical checks passed — safe to push to GitHub!${RESET}"
  exit 0
else
  echo -e "${RED}${BOLD}🛑 Pre-flight FAILED — fix the errors above before pushing.${RESET}"
  exit 1
fi
