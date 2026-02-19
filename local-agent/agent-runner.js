'use strict';

/**
 * agent-runner.js — handles the actual AI inference for the local agent.
 * Uses an OpenAI-compatible API; by default calls localhost:11434 (Ollama).
 * Can be overridden via environment variables or config.
 */

const fetch = require('node-fetch');

const DEFAULT_ENDPOINT = 'http://localhost:11434/v1/chat/completions';
const DEFAULT_MODEL = 'llama3.2';
const SYSTEM_PROMPT = `You are ClawLink, a helpful AI assistant running locally on the user's computer.
You have access to the user's local system and can help with tasks, answer questions, and assist with workflows.
Be concise, helpful, and friendly.`;

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
