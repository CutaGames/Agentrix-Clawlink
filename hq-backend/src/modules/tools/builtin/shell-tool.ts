/**
 * Shell Tool - Execute shell commands in a controlled environment
 */

import { ToolDefinition, ToolExecutor, ToolExecutionResult } from '../tool-registry';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Commands that are never allowed
const BLOCKED_COMMANDS = [
  'rm -rf /',
  'mkfs',
  'dd if=',
  ':(){:|:&};:',
  'chmod -R 777 /',
  'shutdown',
  'reboot',
  'halt',
  'init 0',
  'init 6',
];

// Only allow commands starting with these prefixes
const ALLOWED_PREFIXES = [
  'ls', 'cat', 'head', 'tail', 'grep', 'find', 'wc',
  'echo', 'pwd', 'whoami', 'date', 'df', 'du',
  'git', 'npm', 'node', 'npx', 'yarn', 'pnpm',
  'curl', 'wget',
  'docker', 'docker-compose',
  'pm2',
  'psql',
  'mkdir', 'cp', 'mv', 'touch',
  'sed', 'awk', 'sort', 'uniq', 'tr', 'cut',
  'tar', 'gzip', 'gunzip',
  'env', 'printenv',
  'systemctl status', 'journalctl',
  'nest', 'tsc', 'next',
];

export const shellToolDefinition: ToolDefinition = {
  name: 'execute_shell',
  description: 'Execute a shell command on the server. Only safe commands are allowed. Use for file operations, git, npm, deployment, etc.',
  category: 'system',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute',
      },
      workingDir: {
        type: 'string',
        description: 'Working directory for the command (defaults to project root)',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in seconds (default: 30, max: 120)',
      },
    },
    required: ['command'],
  },
  allowedRoles: ['architect', 'coder'],
  requiresApproval: false,
  timeout: 120,
};

export const shellToolExecutor: ToolExecutor = async (params, context): Promise<ToolExecutionResult> => {
  const { command, workingDir, timeout = 30 } = params;
  const startTime = Date.now();

  // Security checks
  const normalizedCmd = command.toLowerCase().trim();

  for (const blocked of BLOCKED_COMMANDS) {
    if (normalizedCmd.includes(blocked)) {
      return {
        success: false,
        output: '',
        error: `Command blocked for security: contains "${blocked}"`,
      };
    }
  }

  const firstWord = normalizedCmd.split(/\s+/)[0];
  const isAllowed = ALLOWED_PREFIXES.some(prefix => {
    const prefixFirst = prefix.split(/\s+/)[0];
    return firstWord === prefixFirst;
  });

  if (!isAllowed) {
    return {
      success: false,
      output: '',
      error: `Command "${firstWord}" is not in the allowed list. Allowed: ${ALLOWED_PREFIXES.map(p => p.split(/\s+/)[0]).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`,
    };
  }

  if (context.dryRun) {
    return {
      success: true,
      output: `[DRY RUN] Would execute: ${command}`,
      executionTimeMs: 0,
    };
  }

  const cwd = workingDir || context.workingDir || '/home/ubuntu/Agentrix-independent-HQ';
  const timeoutMs = Math.min(timeout, 120) * 1000;

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024, // 1MB
      env: { ...process.env, TERM: 'dumb' },
    });

    const output = stdout || stderr || '(no output)';
    // Truncate very long outputs
    const truncated = output.length > 8000
      ? output.substring(0, 8000) + `\n... (truncated, ${output.length} total chars)`
      : output;

    return {
      success: true,
      output: truncated,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message,
      executionTimeMs: Date.now() - startTime,
    };
  }
};
