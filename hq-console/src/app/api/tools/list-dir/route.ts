import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

// Security: Only allow listing directories within allowed paths
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

function isPathAllowed(dirPath: string): boolean {
  const normalizedPath = normalizePathForAccess(path.normalize(dirPath));
  return ALLOWED_ROOTS.some(root => {
    const normalizedRoot = normalizePathForAccess(path.normalize(root));
    return normalizedPath.startsWith(normalizedRoot);
  });
}

interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: dirPath, recursive = false, maxDepth = 3 } = body;

    if (!dirPath) {
      return NextResponse.json(
        { error: 'path is required' },
        { status: 400 }
      );
    }

    // Security check
    if (!isPathAllowed(dirPath)) {
      return NextResponse.json(
        { error: `Access denied: path not in allowed directories. Path: ${dirPath}` },
        { status: 403 }
      );
    }
    
    // 规范化路径用于文件系统访问
    const accessPath = normalizePathForAccess(dirPath);

    // Check if directory exists
    try {
      const stat = await fs.stat(accessPath);
      if (!stat.isDirectory()) {
        return NextResponse.json(
          { error: `Not a directory: ${dirPath}` },
          { status: 400 }
        );
      }
    } catch (err) {
      return NextResponse.json(
        { error: `Directory not found: ${dirPath} (tried: ${accessPath})` },
        { status: 404 }
      );
    }

    // List directory contents
    const entries = await fs.readdir(accessPath, { withFileTypes: true });
    
    const items: FileInfo[] = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(accessPath, entry.name);
        const isDir = entry.isDirectory();
        
        let size: number | undefined;
        let modified: string | undefined;
        
        try {
          const stat = await fs.stat(fullPath);
          size = isDir ? undefined : stat.size;
          modified = stat.mtime.toISOString();
        } catch {
          // Ignore stat errors
        }

        return {
          name: entry.name,
          path: fullPath,
          type: isDir ? 'directory' as const : 'file' as const,
          size,
          modified,
        };
      })
    );

    // Sort: directories first, then alphabetically
    items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      success: true,
      path: dirPath,
      items,
      count: items.length,
    });
  } catch (error: any) {
    console.error('List directory error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list directory' },
      { status: 500 }
    );
  }
}
