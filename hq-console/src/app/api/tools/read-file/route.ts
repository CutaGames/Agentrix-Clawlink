import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

// Security: Only allow reading files within allowed directories
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
 * 将 Windows 路径转换为 WSL/Unix 格式用于文件系统访问
 */
function normalizePathForAccess(inputPath: string): string {
  if (!inputPath) return inputPath;

  // Windows 环境下支持 WSL 路径反向转换
  if (process.platform === 'win32') {
    const wslMatch = inputPath.match(/^\/mnt\/([A-Za-z])\/(.*)$/) || inputPath.match(/^\\+mnt\\([A-Za-z])\\(.*)$/);
    if (wslMatch) {
      const driveLetter = wslMatch[1].toUpperCase();
      const restPath = wslMatch[2].replace(/[\/]/g, '\\');
      return `${driveLetter}:\\${restPath}`;
    }
  }
  
  // 如果已经是 Unix 路径，直接返回
  if (inputPath.startsWith('/')) {
    return inputPath;
  }
  
  // 转换 Windows 路径为 WSL 路径
  const windowsPathMatch = inputPath.match(/^([A-Za-z]):\\(.*)$/);
  if (windowsPathMatch) {
    const driveLetter = windowsPathMatch[1].toLowerCase();
    const restPath = windowsPathMatch[2].replace(/\\/g, '/');
    return `/mnt/${driveLetter}/${restPath}`;
  }
  
  return inputPath;
}

function isPathAllowed(filePath: string): boolean {
  const normalizedPath = normalizePathForAccess(path.normalize(filePath));
  return ALLOWED_ROOTS.some(root => {
    const normalizedRoot = normalizePathForAccess(path.normalize(root));
    return normalizedPath.startsWith(normalizedRoot);
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath, startLine, endLine } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: 'filePath is required' },
        { status: 400 }
      );
    }

    // Security check
    if (!isPathAllowed(filePath)) {
      return NextResponse.json(
        { error: `Access denied: path not in allowed directories. Path: ${filePath}` },
        { status: 403 }
      );
    }
    
    // 规范化路径用于文件系统访问
    const accessPath = normalizePathForAccess(filePath);

    // Check if file exists
    try {
      await fs.access(accessPath);
    } catch {
      return NextResponse.json(
        { error: `File not found: ${filePath} (tried: ${accessPath})` },
        { status: 404 }
      );
    }

    // Read file content
    const content = await fs.readFile(accessPath, 'utf-8');
    const lines = content.split('\n');
    
    // Apply line filtering if specified
    let result = content;
    let lineInfo = { total: lines.length, start: 1, end: lines.length };
    
    if (startLine || endLine) {
      const start = Math.max(1, startLine || 1);
      const end = Math.min(lines.length, endLine || lines.length);
      result = lines.slice(start - 1, end).join('\n');
      lineInfo = { total: lines.length, start, end };
    }

    return NextResponse.json({
      success: true,
      filePath,
      content: result,
      lines: lineInfo,
      language: getLanguageFromPath(filePath),
    });
  } catch (error: any) {
    console.error('Read file error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to read file' },
      { status: 500 }
    );
  }
}

function getLanguageFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const langMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.json': 'json',
    '.md': 'markdown',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.sql': 'sql',
    '.sh': 'bash',
    '.bash': 'bash',
  };
  return langMap[ext] || 'plaintext';
}
