#!/bin/bash
export GOOGLE_API_KEY=AIzaSyDH6jHpd857EaxTXbFJaqXT4EgDxMib428
export OPENAI_API_KEY=fk235761-wCrllyRS6SkvzeLZrs4tuqTqIzjBNgG3
export OPENAI_API_BASE=https://api.api2d.com/v1

pm2 delete openclaw-gateway 2>/dev/null || true
echo "Starting OpenClaw Gateway with explicit env vars..."
env GOOGLE_API_KEY=AIzaSyDH6jHpd857EaxTXbFJaqXT4EgDxMib428 \
    OPENAI_API_KEY=fk235761-wCrllyRS6SkvzeLZrs4tuqTqIzjBNgG3 \
    pm2 start openclaw --name openclaw-gateway -- gateway run --port 18789 --bind 0.0.0.0
pm2 save
sleep 5
pm2 status
curl -i http://localhost:18789/
