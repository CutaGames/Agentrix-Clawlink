#!/usr/bin/env bash
set -euo pipefail
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website

echo "=== 1. Mobile app: CI + OpenClaw feature ==="
cd mobile-app
git status --short

# Stage everything changed/new
git add \
  .github/workflows/build-apk.yml \
  src/navigation/types.ts \
  src/navigation/RootNavigator.tsx \
  src/screens/onboarding/DeploySelectScreen.tsx \
  src/screens/onboarding/LocalDeployScreen.tsx \
  src/screens/onboarding/SocialBindScreen.tsx \
  src/services/openclaw.service.ts 2>/dev/null || true

echo "--- staged files ---"
git diff --cached --name-only

git commit -m "feat(openclaw): local agent + social bind screens; fix(ci): restrict ABIs arm64+x86_64, timeout 55m

CI:
- Build was timing out at 40min due to CMake builds for 4 ABIs (arm64, armeabi-v7a, x86, x86_64)
- Add post-prebuild patch to set abiFilters='arm64-v8a,x86_64' in android/app/build.gradle
  (drops legacy 32-bit targets, cuts C++ build time ~60%)
- Increase timeout 40→55min as safety net

OpenClaw dual-mode:
- navigation/types.ts: add LocalDeploy + SocialBind routes
- RootNavigator.tsx: register LocalDeployScreen + SocialBindScreen
- DeploySelectScreen.tsx: wire local option to LocalDeploy (was TODO)
- LocalDeployScreen.tsx: NEW — provision→download Windows/Mac binary→poll relay→SocialBind
- SocialBindScreen.tsx: NEW — Telegram QR code bind with platform picker
- openclaw.service.ts: add provisionLocalAgent, getRelayStatus, generateTelegramQr, unlinkTelegram"

git push origin main
echo "✓ mobile-app pushed"

echo ""
echo "=== 2. Monorepo: OpenClaw backend + local agent ==="
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website

git add \
  backend/src/modules/openclaw-connection/ \
  backend/src/entities/openclaw-instance.entity.ts \
  backend/src/migrations/1776800000001-AddSocialRelayToOpenClaw.ts \
  local-agent/ 2>/dev/null || true

echo "--- staged files ---"
git diff --cached --name-only

git commit -m "feat(openclaw): dual-mode cloud+local with Telegram relay

Backend:
- openclaw-connection.module.ts: register TelegramBotService + LocalRelayGateway
- telegram-bot.service.ts: NEW — Telegram webhook handler with relay forwarding
- local-relay.gateway.ts: NEW — Socket.io /relay gateway for local agents
- openclaw-connection.controller.ts: add /social/telegram/qr, /local/provision, /webhook/telegram
- openclaw-connection.service.ts: add generateSocialBindQr, provisionLocalInstance, getRelayStatus
- openclaw-instance.entity.ts: add telegramChatId, relayToken, relayConnected, subscriptionId fields
- 1776800000001-AddSocialRelayToOpenClaw.ts: DB migration for relay fields

Local agent:
- local-agent/: Node.js package that connects PC to relay via Socket.io
  - index.js: first-run wizard, relay connection loop
  - agent-runner.js: OpenAI-compatible LLM calls (default: Ollama)
  - build.sh: pkg build → dist/clawlink-agent-win.exe + dist/clawlink-agent-mac"

git push origin main
echo "✓ monorepo pushed"
