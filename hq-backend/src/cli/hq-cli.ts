#!/usr/bin/env node
/**
 * HQ CLI Tool
 * 
 * 命令行工具 - 在终端中与 HQ Agent 交互
 * 
 * 用法:
 *   npx ts-node src/cli/hq-cli.ts skills                    # 列出技能
 *   npx ts-node src/cli/hq-cli.ts invoke CODE_GEN "task"    # 调用技能
 *   npx ts-node src/cli/hq-cli.ts chat "message"            # 与 Agent 对话
 *   npx ts-node src/cli/hq-cli.ts codegen "prompt"          # 快速代码生成
 */

const HQ_API_URL = process.env.HQ_API_URL || 'http://localhost:3005/api/hq/cli';

interface CLIResult {
  success: boolean;
  [key: string]: any;
}

async function callAPI(endpoint: string, method = 'GET', body?: any): Promise<CLIResult> {
  try {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${HQ_API_URL}${endpoint}`, options);
    return await response.json();
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function listSkills(): Promise<void> {
  console.log('📚 Fetching available skills...\n');
  const result = await callAPI('/skills');
  
  if (!result.success) {
    console.error('❌ Failed to fetch skills:', result.error);
    return;
  }

  console.log('🛠️  Available Skills:\n');
  for (const skill of result.data) {
    console.log(`  ${skill.code}`);
    console.log(`    Name: ${skill.name}`);
    console.log(`    Category: ${skill.category}`);
    console.log(`    Capabilities: ${skill.capabilities?.join(', ') || 'N/A'}`);
    console.log('');
  }
}

async function listAgents(): Promise<void> {
  console.log('🤖 Fetching agents...\n');
  const result = await callAPI('/agents');
  
  if (!result.success) {
    console.error('❌ Failed to fetch agents:', result.error);
    return;
  }

  console.log('🤖 Agents:\n');
  for (const agent of result.data) {
    const statusEmoji = {
      idle: '🟢',
      working: '🟡',
      error: '🔴',
      offline: '⚫',
    }[agent.status] || '⚪';
    
    console.log(`  ${statusEmoji} ${agent.name} (${agent.type})`);
    console.log(`     ID: ${agent.id}`);
    console.log(`     Status: ${agent.status}`);
    if (agent.currentTask) {
      console.log(`     Task: ${agent.currentTask}`);
    }
    console.log('');
  }
}

async function invokeSkill(skillCode: string, input: string): Promise<void> {
  console.log(`⚡ Invoking skill: ${skillCode}\n`);
  console.log(`📝 Input: ${input.substring(0, 100)}${input.length > 100 ? '...' : ''}\n`);
  
  const result = await callAPI('/invoke', 'POST', { skillCode, input });
  
  if (!result.success) {
    console.error('❌ Skill execution failed:', result.error || result.output);
    return;
  }

  console.log(`✅ Skill: ${result.skill}`);
  console.log(`⏱️  Time: ${result.executionTime}`);
  if (result.tokensUsed) {
    console.log(`🔢 Tokens: ${result.tokensUsed}`);
  }
  console.log('\n📤 Output:\n');
  console.log(result.output);
}

async function smartExecute(task: string, agentId?: string): Promise<void> {
  console.log('🧠 Smart Execute\n');
  console.log(`📝 Task: ${task.substring(0, 100)}${task.length > 100 ? '...' : ''}\n`);
  
  const result = await callAPI('/execute', 'POST', {
    agentId: agentId || 'cli-user',
    task,
  });
  
  if (!result.success) {
    console.error('❌ Execution failed');
    return;
  }

  console.log('📊 Execution Steps:');
  for (const step of result.steps) {
    const emoji = step.success ? '✅' : '❌';
    console.log(`  ${emoji} ${step.skill} (${step.time})`);
  }
  
  console.log(`\n⏱️  Total Time: ${result.totalTime}`);
  console.log(`🔢 Total Tokens: ${result.totalTokens}`);
  console.log('\n📤 Output:\n');
  console.log(result.output);
}

async function chat(message: string, agentId?: string): Promise<void> {
  console.log('💬 Chat with Agent\n');
  
  const result = await callAPI('/chat', 'POST', {
    agentId: agentId || 'default',
    message,
  });
  
  if (!result.success) {
    console.error('❌ Chat failed:', result.error);
    return;
  }

  console.log(`🤖 Agent: ${result.agentId}`);
  console.log(`🧠 Model: ${result.model}`);
  if (result.tokensUsed) {
    console.log(`🔢 Tokens: ${result.tokensUsed}`);
  }
  console.log('\n📤 Response:\n');
  console.log(result.response);
}

async function codeGen(prompt: string, language?: string): Promise<void> {
  console.log('💻 Code Generation\n');
  
  const result = await callAPI('/codegen', 'POST', { prompt, language });
  
  if (!result.success) {
    console.error('❌ Code generation failed');
    return;
  }

  console.log(`⏱️  Time: ${result.executionTime}\n`);
  console.log('📤 Generated Code:\n');
  console.log(result.code);
}

async function codeReview(code: string, focus?: string): Promise<void> {
  console.log('🔍 Code Review\n');
  
  const result = await callAPI('/review', 'POST', { code, focus });
  
  if (!result.success) {
    console.error('❌ Code review failed');
    return;
  }

  console.log(`⏱️  Time: ${result.executionTime}\n`);
  console.log('📤 Review:\n');
  console.log(result.review);
}

function printHelp(): void {
  console.log(`
🤖 HQ CLI - Agent Command Line Interface

Usage:
  hq-cli <command> [options]

Commands:
  skills                        List available skills
  agents                        List available agents
  invoke <skillCode> <input>    Invoke a specific skill
  execute <task> [agentId]      Smart execute with auto skill selection
  chat <message> [agentId]      Chat with an agent
  codegen <prompt> [language]   Quick code generation
  review <code> [focus]         Quick code review
  health                        Check API health

Examples:
  hq-cli skills
  hq-cli invoke CODE_GEN "Create a React button component"
  hq-cli execute "Analyze this data and create a summary"
  hq-cli chat "How do I optimize this algorithm?"
  hq-cli codegen "A TypeScript function to sort an array" typescript

Environment:
  HQ_API_URL    API base URL (default: http://localhost:3005/api/hq/cli)
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  switch (command) {
    case 'skills':
      await listSkills();
      break;

    case 'agents':
      await listAgents();
      break;

    case 'invoke':
      if (args.length < 3) {
        console.error('Usage: hq-cli invoke <skillCode> <input>');
        process.exit(1);
      }
      await invokeSkill(args[1], args.slice(2).join(' '));
      break;

    case 'execute':
      if (args.length < 2) {
        console.error('Usage: hq-cli execute <task> [agentId]');
        process.exit(1);
      }
      await smartExecute(args.slice(1, -1).join(' ') || args[1], args[args.length - 1]);
      break;

    case 'chat':
      if (args.length < 2) {
        console.error('Usage: hq-cli chat <message> [agentId]');
        process.exit(1);
      }
      await chat(args.slice(1).join(' '));
      break;

    case 'codegen':
      if (args.length < 2) {
        console.error('Usage: hq-cli codegen <prompt> [language]');
        process.exit(1);
      }
      await codeGen(args.slice(1, -1).join(' ') || args[1], args.length > 2 ? args[args.length - 1] : undefined);
      break;

    case 'review':
      if (args.length < 2) {
        console.error('Usage: hq-cli review <code> [focus]');
        process.exit(1);
      }
      await codeReview(args[1], args[2]);
      break;

    case 'health':
      const result = await callAPI('/health');
      console.log('Health Check:', JSON.stringify(result, null, 2));
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch(console.error);
