#!/bin/bash
set -e

# Reset config to avoid "version" error
echo '{}' > ~/.openclaw/openclaw.json

# Correct 2026.2.17 Schema Paths
openclaw config set gateway.mode local
openclaw config set gateway.bind lan
openclaw config set gateway.port 18789
openclaw config set gateway.auth.token "openclaw-test-token-2026"

# Channel configuration
openclaw channels add telegram --token "8292177231:AAHNZcDloe9DjQhSSQdVcoeg5E2H83U8S0I" || true

# Model defaults - nesting is strict
openclaw config set agents.defaults.model.provider google
openclaw config set agents.defaults.model.id gemini-2.0-flash

# Cleanup PM2
pm2 delete openclaw-gateway 2>/dev/null || true

# Launch with environment
export GOOGLE_API_KEY="AIzaSyDH6jHpd857EaxTXbFJaqXT4EgDxMib428"
export OPENAI_API_KEY="fk235761-wCrllyRS6SkvzeLZrs4tuqTqIzjBNgG3"
export OPENAI_API_BASE="https://api.api2d.com/v1"

pm2 start openclaw --name openclaw-gateway -- gateway run --allow-unconfigured
pm2 save

echo "Waiting for start logs..."
sleep 15
pm2 logs openclaw-gateway --lines 100 --no-daemon &
SLEEP_PID=$!
sleep 15
kill $SLEEP_PID
