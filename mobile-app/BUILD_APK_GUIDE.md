# ClawLink — Build APK Guide

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 20 | `node --version` |
| npm | ≥ 10 | bundled with Node 20 |
| Java (JDK) | 17 | `java --version`; Gradle requires exactly 17 |
| Android SDK | API 34+ | via Android Studio or `sdkmanager` |
| `ANDROID_HOME` | set | e.g. `export ANDROID_HOME=~/Android/Sdk` |
| EAS CLI | latest | `npm install -g eas-cli` (for cloud builds only) |

---

## Option A — EAS Cloud Build (Recommended)

No local Android SDK / Java needed. EAS builds in the cloud.

```bash
cd mobile-app

# Authenticate with Expo account
eas login

# Preview APK (internal distribution, returns a download link)
eas build --platform android --profile preview

# After build completes, download the APK link from the console
# or list builds: eas build:list --platform android
```

> Profile `preview` outputs an `.apk`. Profile `production` outputs an `.aab` (Play Store bundle).

---

## Option B — Local Build via `build-local.sh`

> Runs inside WSL (Ubuntu) on Windows, or natively on macOS/Linux.

### 1. Set up environment

```bash
# Ensure JAVA_HOME points to JDK 17
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64   # Ubuntu/WSL
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH
```

### 2. Replace the LAN IP placeholder (development only)

In `src/config/env.ts`, find:

```ts
apiBase: 'http://LAN_IP:3001/api',
```

Replace `LAN_IP` with your machine's local IP (e.g., `192.168.x.x`). Staging/production already point to `https://api.agentrix.top`.

### 3. Run the build script

```bash
cd mobile-app
chmod +x build-local.sh

./build-local.sh          # release APK (first run triggers prebuild)
./build-local.sh debug    # debug APK
./build-local.sh clean    # force fresh prebuild then release
```

The APK will appear in `mobile-app/build-output/`.

### 4. Install on a device

```bash
adb install -r build-output/ClawLink-YYYYMMDD-release.apk
```

---

## Option C — Expo Go / Tunnel (Quick JS Testing)

No build needed. Runs JS directly in the **Expo Go** app.

```bash
cd mobile-app
npx expo start --tunnel
```

Scan the QR code with Expo Go (iOS/Android).  
**Note:** Native modules (camera, push notifications) are unavailable in Expo Go — use Option A/B for full testing.

---

## Option D — Development Client

For testing native modules (camera, deep links, push notifications) in a dev build:

```bash
eas build --platform android --profile development
# or locally:
./build-local.sh debug
```

Install the `.apk`, then start the dev server:

```bash
npx expo start --dev-client
```

---

## Deep Link Testing

```bash
# Test custom scheme
adb shell am start -W -a android.intent.action.VIEW \
  -d "clawlink://agent" app.clawlink.mobile

# Test HTTPS share link
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://clawlink.app/i/testuser" app.clawlink.mobile
```

---

## Push Notification Testing

1. Build with `preview` or `production` profile (push tokens require a real EAS build, not Expo Go).
2. After login, the app requests notification permissions automatically.
3. The Expo push token is stored and sent to the backend.
4. Test via Expo's push tool: https://expo.dev/notifications

---

## Common Issues

| Issue | Fix |
|-------|-----|
| `SDK location not found` | Set `ANDROID_HOME`; create `android/local.properties` with `sdk.dir=...` |
| `Gradle build failed: Java version` | Set `JAVA_HOME` to JDK 17 (not 21) |
| `expo-notifications: no token` | Push tokens only work in EAS-built apps or dev clients, not Expo Go |
| `LAN_IP` still in `env.ts` | Replace with your actual local IP for dev builds |
| Build stalls on prebuild | Delete `android/` and re-run with `./build-local.sh clean` |
| Camera not working | `expo-camera` is in `app.json` plugins — should work after prebuild |
| Proxy errors in WSL | `unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY` |

---

## Key Files

| File | Purpose |
|------|---------|
| `app.json` | App identity, permissions, EAS project ID, plugins |
| `eas.json` | Build profiles: development / preview / production + update channels |
| `src/config/env.ts` | API base URLs per environment; replace `LAN_IP` for dev |
| `build-local.sh` | Convenience script for local Gradle builds |
| `build-output/` | Local APK output (git-ignored) |

---

## App Details

- **Name:** ClawLink
- **Bundle ID:** `app.clawlink.mobile`
- **EAS Project ID:** `96a641e0-ce03-45ff-9de7-2cd89c488236`
- **Deep link scheme:** `clawlink://`
- **HTTPS link:** `https://clawlink.app`
- **API (prod):** `https://api.agentrix.top/api`

