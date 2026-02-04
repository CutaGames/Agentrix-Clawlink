import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

// Security: Only allow writing files within allowed directories
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
    const { filePath, content, createIfNotExists = true, backup = true } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: 'filePath is required' },
        { status: 400 }
      );
    }

    if (content === undefined) {
      return NextResponse.json(
        { error: 'content is required' },
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

    // Ensure directory exists
    const dir = path.dirname(accessPath);
    await fs.mkdir(dir, { recursive: true });

    // Backup existing file if it exists
    let backupPath: string | null = null;
    try {
      await fs.access(accessPath);
      if (backup) {
        backupPath = `${accessPath}.backup.${Date.now()}`;
        await fs.copyFile(accessPath, backupPath);
      }
    } catch {
      // File doesn't exist, no backup needed
      if (!createIfNotExists) {
        return NextResponse.json(
          { error: `File not found: ${filePath}` },
          { status: 404 }
        );
      }
    }

    // Write file
    await fs.writeFile(accessPath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      filePath,
      bytesWritten: Buffer.byteLength(content, 'utf-8'),
      backupPath,
    });
  } catch (error: any) {
    console.error('Write file error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to write file' },
      { status: 500 }
    );
  }
}
