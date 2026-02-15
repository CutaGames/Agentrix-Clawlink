#!/bin/bash
# Local Build Helper for Agentrix Mobile (Android)
# This script helps set up the local environment and trigger a build.

set -e

echo "🚀 Starting Agentrix Mobile Local Build Process..."

# 1. Detect SDK Path (Common Windows paths from WSL)
POSSIBLE_SDK_PATHS=(
  "/mnt/c/Users/$USER/AppData/Local/Android/Sdk"
  "/mnt/c/Users/Administrator/AppData/Local/Android/Sdk"
)

SDK_PATH=""
for path in "${POSSIBLE_SDK_PATHS[@]}"; do
  if [ -d "$path" ]; then
    SDK_PATH="$path"
    break
  fi
done

if [ -z "$SDK_PATH" ]; then
  echo "❌ Error: Android SDK not found automatically."
  echo "Please enter your Windows Android SDK path (e.g., /mnt/c/Users/YourName/AppData/Local/Android/Sdk):"
  read -r SDK_PATH
fi

echo "✅ Using SDK at: $SDK_PATH"

# 2. Create local.properties
echo "sdk.dir=$SDK_PATH" > android/local.properties
echo "✅ Created android/local.properties"

# 3. Clean and Install Dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# 4. Trigger Gradle Build
echo "🏗️ Building APK (Release)..."
cd android
chmod +x gradlew
./gradlew assembleRelease

echo "✨ Build Complete!"
echo "📍 APK Location: mobile-app/android/app/build/outputs/apk/release/app-release.apk"
