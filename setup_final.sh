#!/bin/bash
set -e

# Core Gateway Config
openclaw config set gateway.mode local
openclaw config set gateway.bind lan
openclaw config set gateway.port 18789
openclaw config set gateway.auth.token "openclaw-test-token-2026"

# Telegram Integration
openclaw plugins enable telegram || true
# Note: Schema might be channels.telegram.token or telegram.token
openclaw config set channels.telegram.token "8292177231:AAHNZcDloe9DjQhSSQdVcoeg5E2H83U8S0I" || true

# Model Config
openclaw config set agents.defaults.model "google/gemini-2.0-flash" || true

# Restart
pm2 restart openclaw-gateway
sleep 5
pm2 logs openclaw-gateway --lines 50 --no-daemon &
SLEEP_PID=$!
sleep 15
kill $SLEEP_PID
