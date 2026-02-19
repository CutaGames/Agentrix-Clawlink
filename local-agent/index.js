#!/usr/bin/env node
/**
 * ClawLink Local Agent
 * Connects your PC to the Agentrix relay server so AI agents can run locally.
 * Usage: just double-click or run  ./clawlink-agent-win.exe
 */

'use strict';

const { io } = require('socket.io-client');
const { processMessage } = require('./agent-runner');
const kleur = require('kleur');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// ─── Config ──────────────────────────────────────────────────────────────────

const CONFIG_DIR = path.join(os.homedir(), '.clawlink');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

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

// ─── Banner ───────────────────────────────────────────────────────────────────

function printBanner() {
  console.log('');
  console.log(kleur.cyan().bold('  ╔══════════════════════════════╗'));
  console.log(kleur.cyan().bold('  ║   ClawLink Local Agent  🦀   ║'));
  console.log(kleur.cyan().bold('  ╚══════════════════════════════╝'));
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  printBanner();

  let cfg = loadConfig();

  // Allow env override (for advanced users / CI)
  if (process.env.RELAY_TOKEN) cfg.relayToken = process.env.RELAY_TOKEN;
  if (process.env.RELAY_URL) cfg.relayUrl = process.env.RELAY_URL;

  if (!cfg.relayToken) {
    cfg = await runSetup(cfg);
  }

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

  // ── Handle incoming message from relay ──────────────────────────────────────
  socket.on('agent:message', async (payload) => {
    const { key, text, from } = payload;
    console.log(kleur.cyan(`  ← [${from || 'user'}] ${text}`));

    try {
      const reply = await processMessage({ text, cfg });
      console.log(kleur.green(`  → ${reply}`));
      socket.emit('agent:reply', { key, reply });
    } catch (err) {
      const errMsg = `Error: ${err.message}`;
      console.error(kleur.red(`  ✗ ${errMsg}`));
      socket.emit('agent:reply', { key, reply: errMsg });
    }
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log(kleur.yellow('\n  Shutting down...'));
    socket.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(kleur.red('Fatal: ' + err.message));
  process.exit(1);
});
