#!/bin/bash
export GOOGLE_API_KEY=AIzaSyDH6jHpd857EaxTXbFJaqXT4EgDxMib428
export OPENAI_API_KEY=fk235761-wCrllyRS6SkvzeLZrs4tuqTqIzjBNgG3
export GROQ_API_KEY=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

# Append to bashrc if not already there
grep -q "GOOGLE_API_KEY" ~/.bashrc || printf "\nexport GOOGLE_API_KEY=$GOOGLE_API_KEY\nexport OPENAI_API_KEY=$OPENAI_API_KEY\nexport GROQ_API_KEY=$GROQ_API_KEY\n" >> ~/.bashrc

# Restart Gateway
pm2 delete openclaw-gateway 2>/dev/null || true
pm2 start openclaw --name openclaw-gateway -- gateway run --port 18789 --bind auto

# Verify
sleep 5
openclaw status --port 18789
openclaw models list --all --port 18789
