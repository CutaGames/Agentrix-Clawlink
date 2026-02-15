/*
 * Verify HQ agent model mapping and tool-call ability.
 * Usage: node scripts/verify-hq-agents.js
 * Env: HQ_API_URL (default http://localhost:3005/api)
 */

const baseUrl = process.env.HQ_API_URL || 'http://localhost:3005/api';

const TOOL_PROMPT = `你有以下工具可以使用来执行文件/命令操作。当你需要读写文件时，必须使用工具。

只允许使用以下格式输出工具调用：
<tool_call>\n<name>list_dir</name>\n<params>{"path":"/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website"}</params>\n</tool_call>
`;

const TOOL_CALL_REGEX = /<tool_call>[\s\S]*?<name>\s*list_dir\s*<\/name>[\s\S]*?<params>[\s\S]*?<\/params>[\s\S]*?<\/tool_call>/i;

async function getJson(url, options) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

async function verifyAgent(agent) {
  const payload = {
    agentId: agent.code,
    messages: [{ role: 'user', content: '请调用 list_dir 工具查看项目根目录，并只返回工具调用。' }],
    useMemory: false,
    toolPrompt: TOOL_PROMPT,
    provider: agent.resolvedProvider === 'unknown' ? undefined : agent.resolvedProvider,
    model: agent.resolvedModel,
  };

  const response = await getJson(`${baseUrl}/hq/chat`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const model = response.model || 'unknown';
  const content = response.content || '';
  const toolCall = TOOL_CALL_REGEX.test(content);

  return {
    code: agent.code,
    expectedModel: agent.resolvedModel || 'unknown',
    actualModel: model,
    modelMatch: !agent.resolvedModel || model === agent.resolvedModel,
    toolCall,
  };
}

(async () => {
  try {
    const mapping = await getJson(`${baseUrl}/hq/agents/model-mapping`);
    const agents = mapping.agents || [];

    console.log(`HQ API: ${baseUrl}`);
    console.log(`Agents: ${agents.length}`);

    const results = [];
    for (const agent of agents) {
      try {
        const result = await verifyAgent(agent);
        results.push(result);
        console.log(
          `${result.code} | model: ${result.actualModel} | match: ${result.modelMatch ? 'OK' : 'FAIL'} | tool: ${result.toolCall ? 'OK' : 'FAIL'}`
        );
      } catch (err) {
        results.push({ code: agent.code, error: err.message });
        console.log(`${agent.code} | ERROR: ${err.message}`);
      }
    }

    const failed = results.filter(r => r.error || r.modelMatch === false || r.toolCall === false);
    if (failed.length > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(`Verification failed: ${err.message}`);
    process.exitCode = 1;
  }
})();
