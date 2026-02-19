# ClawLink Local Agent

A pre-built binary that runs on your Windows or macOS PC, connects to the Agentrix relay server, and
lets your social accounts (Telegram, etc.) talk to a local AI model.

## End-user usage

1. Download `clawlink-agent-win.exe` (Windows) or `clawlink-agent-mac` (macOS) from the app.
2. Double-click to run.
3. Paste the **Relay Token** shown in the app when prompted.
4. Done — the agent is now online and connected to your social accounts.

## Configuration

All configuration is stored in `~/.clawlink/config.json` after first-run setup.

| Key | Default | Description |
|-----|---------|-------------|
| `relayToken` | (required) | Obtained from the Agentrix mobile app |
| `relayUrl` | `wss://api.agentrix.io` | Relay server WebSocket URL |
| `llmEndpoint` | `http://localhost:11434/v1/chat/completions` | OpenAI-compatible LLM endpoint |
| `llmModel` | `llama3.2` | Model name sent to LLM |
| `llmApiKey` | `ollama` | API key (use `sk-...` for OpenAI) |

You can also set these via environment variables: `RELAY_TOKEN`, `RELAY_URL`, `LLM_ENDPOINT`, `LLM_MODEL`, `LLM_API_KEY`.

## Building (CI/CD only)

```bash
bash build.sh
```

Outputs:
- `dist/clawlink-agent-win.exe`
- `dist/clawlink-agent-mac`

These binaries are uploaded to `https://api.agentrix.io/downloads/` and served by the backend.
