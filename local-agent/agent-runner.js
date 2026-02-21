'use strict';

/**
 * agent-runner.js — handles AI inference for the local agent.
 * Uses an OpenAI-compatible API; by default calls localhost:11434 (Ollama).
 * Supports: streaming responses, multi-turn conversation history, tool calls.
 */

const fetch = require('node-fetch');
const kleur = require('kleur');

const DEFAULT_ENDPOINT = 'http://localhost:11434/v1/chat/completions';
const DEFAULT_MODEL = 'llama3.2';
const SYSTEM_PROMPT = `You are ClawLink, a helpful AI assistant running locally on the user's computer.
You have access to the user's local file system via tools. You can list files, read file contents, and write files.
Be concise, helpful, and friendly. When using tools, explain what you're doing.`;

// ─── Per-session conversation history ─────────────────────────────────────────

const sessions = new Map(); // sessionId → messages[]

function getHistory(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, [{ role: 'system', content: SYSTEM_PROMPT }]);
  }
  return sessions.get(sessionId);
}

function clearHistory(sessionId) {
  sessions.delete(sessionId);
}

// ─── Tool definitions (MCP-compatible) ────────────────────────────────────────

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'List files and folders in a directory on the local machine',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute or relative directory path' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file on the local machine',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute or relative file path' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write content to a file on the local machine',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute or relative file path' },
          content: { type: 'string', description: 'Content to write to the file' },
        },
        required: ['path', 'content'],
      },
    },
  },
];

// ─── Tool executor ─────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const os = require('os');

function executeTool(name, args) {
  try {
    switch (name) {
      case 'list_files': {
        const dir = args.path.startsWith('~')
          ? args.path.replace('~', os.homedir())
          : args.path;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const result = entries.map((e) => ({
          name: e.name,
          type: e.isDirectory() ? 'directory' : 'file',
          size: e.isFile() ? fs.statSync(path.join(dir, e.name)).size : null,
        }));
        return JSON.stringify(result);
      }
      case 'read_file': {
        const filePath = args.path.startsWith('~')
          ? args.path.replace('~', os.homedir())
          : args.path;
        // Safety: cap at 50KB
        const stat = fs.statSync(filePath);
        if (stat.size > 51200) {
          return fs.readFileSync(filePath, 'utf8').slice(0, 51200) + '\n... [truncated at 50KB]';
        }
        return fs.readFileSync(filePath, 'utf8');
      }
      case 'write_file': {
        const filePath = args.path.startsWith('~')
          ? args.path.replace('~', os.homedir())
          : args.path;
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, args.content, 'utf8');
        return `File written successfully: ${filePath}`;
      }
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    return `Tool error: ${err.message}`;
  }
}

// ─── Core processMessage with streaming + history ─────────────────────────────

/**
 * Process an incoming message and return an AI-generated reply.
 * @param {{ text: string, cfg: object, sessionId?: string }} param0
 * @returns {Promise<string>}
 */
async function processMessage({ text, cfg, sessionId = 'default' }) {
  const endpoint = cfg.llmEndpoint || process.env.LLM_ENDPOINT || DEFAULT_ENDPOINT;
  const model = cfg.llmModel || process.env.LLM_MODEL || DEFAULT_MODEL;
  const apiKey = cfg.llmApiKey || process.env.LLM_API_KEY || 'ollama';
  const useStream = cfg.streaming !== false; // default true
  const useTool = cfg.tools !== false;       // default true

  const messages = getHistory(sessionId);
  messages.push({ role: 'user', content: text });

  const body = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 2048,
    stream: useStream,
    ...(useTool ? { tools: TOOLS, tool_choice: 'auto' } : {}),
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    timeout: 60000,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`LLM request failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  let fullReply = '';
  let toolCalls = [];

  if (useStream) {
    // Stream mode: read SSE lines
    const text_ = await res.text();
    const lines = text_.split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') break;
      try {
        const chunk = JSON.parse(data);
        const delta = chunk?.choices?.[0]?.delta;
        if (delta?.content) {
          fullReply += delta.content;
          process.stdout.write(kleur.green(delta.content));
        }
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCalls[idx]) toolCalls[idx] = { id: tc.id, type: tc.type, function: { name: '', arguments: '' } };
            if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
            if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
          }
        }
      } catch (_) {}
    }
    if (fullReply) process.stdout.write('\n');
  } else {
    const data = await res.json();
    const choice = data?.choices?.[0];
    fullReply = choice?.message?.content || '';
    toolCalls = choice?.message?.tool_calls || [];
  }

  // ── Handle tool calls ────────────────────────────────────────────────────────
  if (toolCalls.length > 0) {
    messages.push({ role: 'assistant', content: fullReply || null, tool_calls: toolCalls });

    for (const tc of toolCalls) {
      let args = {};
      try { args = JSON.parse(tc.function.arguments); } catch (_) {}
      console.log(kleur.dim(`  [tool] ${tc.function.name}(${JSON.stringify(args)})`));
      const result = executeTool(tc.function.name, args);
      messages.push({ role: 'tool', tool_call_id: tc.id, content: result });
    }

    // Second call with tool results
    const body2 = { model, messages, temperature: 0.7, max_tokens: 2048, stream: false };
    const res2 = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body2),
      timeout: 60000,
    });
    if (!res2.ok) throw new Error(`LLM tool-result call failed (${res2.status})`);
    const data2 = await res2.json();
    fullReply = data2?.choices?.[0]?.message?.content || '';
  }

  messages.push({ role: 'assistant', content: fullReply });
  return fullReply.trim();
}

module.exports = { processMessage, clearHistory, TOOLS, executeTool };


/**
 * Process an incoming message and return an AI-generated reply.
 * @param {{ text: string, cfg: object }} param0
 * @returns {Promise<string>}
 */
async function processMessage({ text, cfg }) {
  const endpoint = cfg.llmEndpoint || process.env.LLM_ENDPOINT || DEFAULT_ENDPOINT;
  const model = cfg.llmModel || process.env.LLM_MODEL || DEFAULT_MODEL;
  const apiKey = cfg.llmApiKey || process.env.LLM_API_KEY || 'ollama';

  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    temperature: 0.7,
    max_tokens: 1024,
    stream: false,
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    timeout: 30000,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`LLM request failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const reply =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    '(no response)';

  return reply.trim();
}

module.exports = { processMessage };
