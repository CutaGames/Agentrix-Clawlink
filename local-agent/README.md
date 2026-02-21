# ClawLink Local Agent v1.1

Connects your PC to the Agentrix platform so AI agents can run locally and access your files.

## Modes

### 1. Relay Mode (default)
Connects to the Agentrix relay server and processes messages from your linked accounts.

```bash
node index.js
# or double-click: clawlink-agent-win.exe
```

### 2. MCP SSE Server Mode  
Starts a local [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes file-system tools to any MCP-compatible client (Claude Desktop, Cursor, OpenClaw, etc.).

```bash
node index.js --mcp [--port 8765]
```

**Endpoints:**
- `GET http://localhost:8765/sse` — establish SSE connection
- `POST http://localhost:8765/message?sessionId=<id>` — send JSON-RPC request
- `GET http://localhost:8765/health` — server health & version

**Claude Desktop config** (`~/.config/claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "clawlink": { "url": "http://localhost:8765/sse" }
  }
}
```

## Available MCP Tools

| Tool | Description |
|---|---|
| `list_files` | List files and folders in a directory |
| `read_file` | Read file contents (capped at 50 KB) |
| `write_file` | Write content to a file |

## Configuration

Config stored at `~/.clawlink/config.json`:

```json
{
  "relayToken": "your-token-from-app",
  "relayUrl": "wss://api.agentrix.io",
  "llmEndpoint": "http://localhost:11434/v1/chat/completions",
  "llmModel": "llama3.2",
  "llmApiKey": "ollama",
  "streaming": true,
  "tools": true
}
```

Environment variable overrides: `RELAY_TOKEN`, `RELAY_URL`, `LLM_ENDPOINT`, `LLM_MODEL`, `LLM_API_KEY`

## Build Binaries

```bash
npm run build:all
```

Outputs to `dist/`:
- `clawlink-agent-win.exe` (Windows x64)
- `clawlink-agent-mac` (macOS x64)
- `clawlink-agent-linux` (Linux x64)
- `clawlink-agent-linux-arm64` (Linux ARM64 / Raspberry Pi / NAS)

## Check for Updates

```bash
node index.js --check
```


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
