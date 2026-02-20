#!/bin/bash
# Test the Molty Agent
export GOOGLE_API_KEY=AIzaSyDH6jHpd857EaxTXbFJaqXT4EgDxMib428
export OPENAI_API_KEY=fk235761-wCrllyRS6SkvzeLZrs4tuqTqIzjBNgG3
export GROQ_API_KEY=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

echo "--- SOUL.md ---"
cat ~/.openclaw/workspace/SOUL.md
echo "--- Agent Response ---"
openclaw agent --message "Who are you and what is your mission?" --session-id test
