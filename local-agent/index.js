#!/usr/bin/env node
/**
 * ClawLink Local Agent
 * Connects your PC to the Agentrix relay server so AI agents can run locally.
 *
 * Modes:
 *   node index.js             — relay mode (connect to Agentrix cloud)
 *   node index.js --mcp       — MCP SSE server mode (local tool server on port 8765)
 *   node index.js --check     — auto-update check only
 */

'use strict';

const { io } = require('socket.io-client');
const { processMessage, TOOLS, executeTool } = require('./agent-runner');
const kleur = require('kleur');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const http = require('http');
const fetch = require('node-fetch');

// ─── CLI flags ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const MCP_MODE = args.includes('--mcp');
const CHECK_ONLY = args.includes('--check');
const MCP_PORT = parseInt(args[args.indexOf('--port') + 1] || '') || 8765;

// ─── Config ──────────────────────────────────────────────────────────────────

const CONFIG_DIR = path.join(os.homedir(), '.clawlink');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const VERSION = '1.1.0';
const GITHUB_RELEASES_URL = 'https://api.github.com/repos/CutaGames/Agentrix-Clawlink/releases/latest';

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function saveConfig(cfg) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

// ─── Auto-update check ────────────────────────────────────────────────────────

async function checkForUpdates() {
  try {
    const res = await fetch(GITHUB_RELEASES_URL, {
      headers: { 'User-Agent': 'clawlink-agent/' + VERSION },
      timeout: 8000,
    });
    if (!res.ok) return;
    const data = await res.json();
    const latest = (data.tag_name || '').replace(/^v/, '');
    if (latest && latest !== VERSION) {
      console.log('');
      console.log(kleur.yellow('  ┌─────────────────────────────────────────┐'));
      console.log(kleur.yellow(`  │  Update available: ${VERSION} → ${latest}`.padEnd(44) + '│'));
      console.log(kleur.yellow('  │  Run: npm install -g clawlink-agent     │'));
      console.log(kleur.yellow('  └─────────────────────────────────────────┘'));
      console.log('');
    }
  } catch (_) {
    // silently ignore network failures
  }
}

// ─── Banner ───────────────────────────────────────────────────────────────────

function printBanner() {
  console.log('');
  console.log(kleur.cyan().bold('  ╔══════════════════════════════════════════╗'));
  console.log(kleur.cyan().bold('  ║     ClawLink Local Agent  🦀  v' + VERSION + '      ║'));
  console.log(kleur.cyan().bold('  ╚══════════════════════════════════════════╝'));
  console.log('');
  if (MCP_MODE) {
    console.log(kleur.magenta('  Mode: MCP SSE Server (port ' + MCP_PORT + ')'));
  } else {
    console.log(kleur.dim('  Mode: Relay (WebSocket)'));
  }
  console.log('');
}

// ─── Setup wizard ─────────────────────────────────────────────────────────────

async function askQuestion(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function runSetup(cfg) {
  console.log(kleur.yellow('  First-time setup — paste your Relay Token from the app:\n'));
  const token = await askQuestion('  Relay Token: ');
  if (!token || token.length < 16) {
    console.error(kleur.red('  Invalid token. Please re-run and try again.'));
    process.exit(1);
  }
  cfg.relayToken = token;

  const defaultRelay = 'wss://api.agentrix.io';
  const relayInput = await askQuestion(`  Relay server [${defaultRelay}]: `);
  cfg.relayUrl = relayInput || defaultRelay;

  saveConfig(cfg);
  console.log(kleur.green('\n  ✓ Config saved to ' + CONFIG_FILE));
  return cfg;
}

// ─── MCP SSE Server mode ──────────────────────────────────────────────────────
// Implements the Model Context Protocol (MCP) SSE transport.
// Clients (e.g., Claude Desktop, Cursor, OpenClaw) connect to:
//   GET  http://localhost:8765/sse          — open SSE stream
//   POST http://localhost:8765/message       — send JSON-RPC request

function startMcpServer() {
  const clients = new Map(); // clientId → res
  let nextId = 1;

  const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // ── GET /sse — open SSE stream ──────────────────────────────────────────
    if (req.method === 'GET' && req.url === '/sse') {
      const clientId = String(nextId++);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      // Send endpoint event (MCP spec)
      res.write(`event: endpoint\ndata: /message?sessionId=${clientId}\n\n`);
      clients.set(clientId, res);
      console.log(kleur.dim(`  [MCP] Client connected: ${clientId}`));

      req.on('close', () => {
        clients.delete(clientId);
        console.log(kleur.dim(`  [MCP] Client disconnected: ${clientId}`));
      });
      return;
    }

    // ── POST /message — handle JSON-RPC ────────────────────────────────────
    if (req.method === 'POST' && req.url?.startsWith('/message')) {
      const sessionId = new URL(req.url, `http://localhost:${MCP_PORT}`).searchParams.get('sessionId') || 'default';
      const client = clients.get(sessionId);

      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');

        let msg;
        try { msg = JSON.parse(body); } catch (_) { return; }

        const { id, method, params } = msg;
        console.log(kleur.dim(`  [MCP] ${method} (session: ${sessionId})`));

        let result = null;
        let error = null;

        try {
          if (method === 'initialize') {
            result = {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {} },
              serverInfo: { name: 'clawlink-agent', version: VERSION },
            };
          } else if (method === 'tools/list') {
            result = { tools: TOOLS.map((t) => t.function) };
          } else if (method === 'tools/call') {
            const { name, arguments: toolArgs } = params;
            const toolResult = executeTool(name, toolArgs);
            result = { content: [{ type: 'text', text: toolResult }] };
          } else if (method === 'ping') {
            result = {};
          } else {
            error = { code: -32601, message: `Method not found: ${method}` };
          }
        } catch (err) {
          error = { code: -32000, message: err.message };
        }

        const response = { jsonrpc: '2.0', id };
        if (error) response.error = error;
        else response.result = result;

        if (client) {
          client.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
        }
      });
      return;
    }

    // ── GET /health ─────────────────────────────────────────────────────────
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', version: VERSION, mode: 'mcp', tools: TOOLS.length }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(MCP_PORT, '127.0.0.1', () => {
    console.log(kleur.green(`  ✓ MCP SSE server listening on http://localhost:${MCP_PORT}`));
    console.log(kleur.dim(`  SSE endpoint:  http://localhost:${MCP_PORT}/sse`));
    console.log(kleur.dim(`  Message POST:  http://localhost:${MCP_PORT}/message`));
    console.log(kleur.dim(`  Health check:  http://localhost:${MCP_PORT}/health`));
    console.log('');
    console.log('  Available tools:');
    TOOLS.forEach((t) => {
      console.log(kleur.dim(`    • ${t.function.name} — ${t.function.description}`));
    });
    console.log('');
    console.log(kleur.dim('  Add to Claude Desktop / OpenClaw:'));
    console.log(kleur.dim(`    { "mcpServers": { "clawlink": { "url": "http://localhost:${MCP_PORT}/sse" } } }`));
    console.log('');
  });

  process.on('SIGINT', () => {
    console.log(kleur.yellow('\n  Shutting down MCP server...'));
    server.close();
    process.exit(0);
  });
}

// ─── Relay mode ───────────────────────────────────────────────────────────────

async function startRelayMode(cfg) {
  const relayUrl = cfg.relayUrl || 'wss://api.agentrix.io';
  const relayToken = cfg.relayToken;

  console.log(kleur.dim(`  Connecting to relay: ${relayUrl}/relay`));
  console.log('');

  const socket = io(`${relayUrl}/relay`, {
    auth: { relayToken },
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionAttempts: Infinity,
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log(kleur.green('  ✓ Connected to relay server'));
    console.log(kleur.dim('  Waiting for messages from your social accounts...\n'));
  });

  socket.on('disconnect', (reason) => {
    console.log(kleur.yellow(`  ⚠  Disconnected: ${reason}. Reconnecting...`));
  });

  socket.on('connect_error', (err) => {
    console.error(kleur.red(`  ✗ Connection error: ${err.message}`));
  });

  socket.on('agent:message', async (payload) => {
    const { key, text, from, sessionId } = payload;
    console.log(kleur.cyan(`  ← [${from || 'user'}] ${text}`));

    try {
      const reply = await processMessage({ text, cfg, sessionId: sessionId || key || 'default' });
      if (!reply) process.stdout.write('\n');
      console.log(kleur.green(`  → ${reply}`));
      socket.emit('agent:reply', { key, reply });
    } catch (err) {
      const errMsg = `Error: ${err.message}`;
      console.error(kleur.red(`  ✗ ${errMsg}`));
      socket.emit('agent:reply', { key, reply: errMsg });
    }
  });

  process.on('SIGINT', () => {
    console.log(kleur.yellow('\n  Shutting down...'));
    socket.disconnect();
    process.exit(0);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  printBanner();
  await checkForUpdates();

  if (CHECK_ONLY) {
    console.log(kleur.green(`  Current version: ${VERSION}`));
    process.exit(0);
  }

  if (MCP_MODE) {
    startMcpServer();
    return;
  }

  let cfg = loadConfig();
  if (process.env.RELAY_TOKEN) cfg.relayToken = process.env.RELAY_TOKEN;
  if (process.env.RELAY_URL) cfg.relayUrl = process.env.RELAY_URL;
  if (!cfg.relayToken) cfg = await runSetup(cfg);

  await startRelayMode(cfg);
}

main().catch((err) => {
  console.error(kleur.red('Fatal: ' + err.message));
  process.exit(1);
});
