#!/usr/bin/env bash
# build-local.sh — Build ClawLink APK locally (debug or release)
# Usage:
#   ./build-local.sh            → release APK (unsigned)
#   ./build-local.sh debug      → debug APK (signed with debug key)
#   ./build-local.sh clean      → clean prebuild cache then release
# -------------------------------------------------------------------
set -euo pipefail

PROFILE="${1:-release}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== ClawLink Local Build ==="
echo "Profile : $PROFILE"
echo "Dir     : $SCRIPT_DIR"
echo ""

# ── 1. Install JS deps ───────────────────────────────────────────────
echo "▶ Installing JS dependencies..."
npm install

# ── 2. Expo prebuild (generates native android/ folder) ─────────────
if [[ "$PROFILE" == "clean" || ! -d "android" ]]; then
  echo "▶ Running expo prebuild --clean..."
  npx expo prebuild --platform android --clean
  PROFILE="release"
else
  echo "▶ android/ already exists — skipping prebuild (use 'clean' to regenerate)"
fi

# ── 3. Build with Gradle ─────────────────────────────────────────────
cd android

if [[ "$PROFILE" == "debug" ]]; then
  echo "▶ Building debug APK..."
  ./gradlew assembleDebug --no-daemon
  APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
else
  echo "▶ Building release APK (unsigned)..."
  ./gradlew assembleRelease --no-daemon
  APK_PATH="app/build/outputs/apk/release/app-release-unsigned.apk"
fi

cd "$SCRIPT_DIR"

# ── 4. Copy to output ────────────────────────────────────────────────
mkdir -p build-output
DEST="build-output/ClawLink-$(date +%Y%m%d-%H%M)-${PROFILE}.apk"
cp "android/${APK_PATH}" "$DEST"

echo ""
echo "✅ Build complete!"
echo "   APK → $DEST"
echo ""
echo "Install on device:"
echo "   adb install -r \"$DEST\""
