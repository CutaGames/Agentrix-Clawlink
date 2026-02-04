import { NextRequest, NextResponse } from 'next/server';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

// Security: Define allowed commands and blocked patterns
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//,  // Prevent rm -rf /
  /sudo\s+rm/,
  /mkfs/,
  /dd\s+if=/,
  />\s*\/dev\//,
  /chmod\s+777\s+\//,
  /:(){ :|:& };:/,  // Fork bomb
];

const ALLOWED_ROOTS = [
  process.env.WORKSPACE_ROOT || process.cwd(),
  '/mnt/d/wsl/Ubuntu-24.04/Code',
  '/mnt/d/wsl/Ubuntu-24.04',
  '/mnt/d',
  '/home',
  'D:\\wsl\\Ubuntu-24.04\\Code',
  'D:\\wsl\\Ubuntu-24.04',
  'D:\\',
];

/**
 * 将 Windows 路径转换为 WSL/Unix 格式
 */
function normalizePathForAccess(inputPath: string): string {
  if (!inputPath) return inputPath;
  
  if (inputPath.startsWith('/')) {
    return inputPath;
  }
  
  const windowsPathMatch = inputPath.match(/^([A-Za-z]):\\(.*)$/);
  if (windowsPathMatch) {
    const driveLetter = windowsPathMatch[1].toLowerCase();
    const restPath = windowsPathMatch[2].replace(/\\/g, '/');
    return `/mnt/${driveLetter}/${restPath}`;
  }
  
  return inputPath;
}

function isCommandSafe(command: string): { safe: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return { safe: false, reason: 'Dangerous command pattern detected' };
    }
  }
  return { safe: true };
}

function isPathAllowed(workingDir: string): boolean {
  if (!workingDir) return true;
  const normalizedPath = normalizePathForAccess(path.normalize(workingDir));
  return ALLOWED_ROOTS.some(root => {
    const normalizedRoot = normalizePathForAccess(path.normalize(root));
    return normalizedPath.startsWith(normalizedRoot);
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, cwd, timeout = 30000, shell = 'bash' } = body;

    if (!command) {
      return NextResponse.json(
        { error: 'command is required' },
        { status: 400 }
      );
    }

    // Security checks
    const safetyCheck = isCommandSafe(command);
    if (!safetyCheck.safe) {
      return NextResponse.json(
        { error: `Command blocked: ${safetyCheck.reason}` },
        { status: 403 }
      );
    }

    if (cwd && !isPathAllowed(cwd)) {
      return NextResponse.json(
        { error: `Access denied: working directory not in allowed paths. Path: ${cwd}` },
        { status: 403 }
      );
    }
    
    // 规范化工作目录路径
    const accessCwd = cwd ? normalizePathForAccess(cwd) : process.cwd();

    // Execute command
    const options = {
      cwd: accessCwd,
      timeout,
      maxBuffer: 1024 * 1024 * 10, // 10MB
      shell: shell === 'powershell' ? 'powershell.exe' : '/bin/bash',
    };

    const result = await execAsync(command, options);

    return NextResponse.json({
      success: true,
      command,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
    });
  } catch (error: any) {
    console.error('Command execution error:', error);
    
    // Command failed but executed
    if (error.code !== undefined) {
      return NextResponse.json({
        success: false,
        command: error.cmd,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code,
      });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to execute command' },
      { status: 500 }
    );
  }
}
