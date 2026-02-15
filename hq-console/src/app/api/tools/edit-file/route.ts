import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

// Security: Only allow editing files within allowed directories
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
    const { filePath, oldString, newString, backup = true } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: 'filePath is required' },
        { status: 400 }
      );
    }

    if (oldString === undefined || newString === undefined) {
      return NextResponse.json(
        { error: 'oldString and newString are required' },
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

    // Read existing file
    let content: string;
    try {
      content = await fs.readFile(accessPath, 'utf-8');
    } catch {
      return NextResponse.json(
        { error: `File not found: ${filePath} (tried: ${accessPath})` },
        { status: 404 }
      );
    }

    // Check if oldString exists in file
    if (!content.includes(oldString)) {
      return NextResponse.json(
        { error: 'oldString not found in file', found: false },
        { status: 400 }
      );
    }

    // Count occurrences
    const occurrences = content.split(oldString).length - 1;
    if (occurrences > 1) {
      return NextResponse.json(
        { 
          error: `oldString appears ${occurrences} times. Please provide more context for unique match.`,
          occurrences 
        },
        { status: 400 }
      );
    }

    // Backup existing file
    let backupPath: string | null = null;
    if (backup) {
      backupPath = `${accessPath}.backup.${Date.now()}`;
      await fs.copyFile(accessPath, backupPath);
    }

    // Perform replacement
    const newContent = content.replace(oldString, newString);
    await fs.writeFile(accessPath, newContent, 'utf-8');

    return NextResponse.json({
      success: true,
      filePath,
      replaced: true,
      backupPath,
    });
  } catch (error: any) {
    console.error('Edit file error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to edit file' },
      { status: 500 }
    );
  }
}
