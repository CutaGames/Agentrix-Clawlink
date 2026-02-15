/**
 * File Tool - Read, write, and search files
 */

import { ToolDefinition, ToolExecutor, ToolExecutionResult } from '../tool-registry';
import * as fs from 'fs';
import * as path from 'path';

// ========== Read File ==========

export const readFileToolDefinition: ToolDefinition = {
  name: 'read_file',
  description: 'Read the contents of a file. Returns the file content with line numbers.',
  category: 'code',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the file (relative to working directory or absolute)',
      },
      startLine: {
        type: 'number',
        description: 'Start line number (1-indexed, optional)',
      },
      endLine: {
        type: 'number',
        description: 'End line number (1-indexed, optional)',
      },
    },
    required: ['filePath'],
  },
  timeout: 10,
};

export const readFileToolExecutor: ToolExecutor = async (params, context): Promise<ToolExecutionResult> => {
  const { filePath, startLine, endLine } = params;
  const startTime = Date.now();

  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(context.workingDir || process.cwd(), filePath);

  try {
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, output: '', error: `File not found: ${resolvedPath}` };
    }

    const stat = fs.statSync(resolvedPath);
    if (stat.size > 2 * 1024 * 1024) {
      return { success: false, output: '', error: `File too large (${(stat.size / 1024 / 1024).toFixed(1)}MB). Max 2MB.` };
    }

    const content = fs.readFileSync(resolvedPath, 'utf-8');
    const lines = content.split('\n');

    const start = Math.max(1, startLine || 1);
    const end = Math.min(lines.length, endLine || lines.length);
    const selectedLines = lines.slice(start - 1, end);

    const numbered = selectedLines.map((line, i) => `${start + i}: ${line}`).join('\n');

    return {
      success: true,
      output: numbered,
      data: { totalLines: lines.length, shownLines: selectedLines.length, path: resolvedPath },
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return { success: false, output: '', error: error.message, executionTimeMs: Date.now() - startTime };
  }
};

// ========== Write File ==========

export const writeFileToolDefinition: ToolDefinition = {
  name: 'write_file',
  description: 'Write or overwrite a file with new content. Creates parent directories if needed.',
  category: 'code',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the file (relative to working directory or absolute)',
      },
      content: {
        type: 'string',
        description: 'The full content to write to the file',
      },
    },
    required: ['filePath', 'content'],
  },
  allowedRoles: ['architect', 'coder'],
  timeout: 10,
};

export const writeFileToolExecutor: ToolExecutor = async (params, context): Promise<ToolExecutionResult> => {
  const { filePath, content } = params;
  const startTime = Date.now();

  if (context.dryRun) {
    return { success: true, output: `[DRY RUN] Would write ${content.length} chars to ${filePath}`, executionTimeMs: 0 };
  }

  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(context.workingDir || process.cwd(), filePath);

  try {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(resolvedPath, content, 'utf-8');

    return {
      success: true,
      output: `File written: ${resolvedPath} (${content.length} chars, ${content.split('\n').length} lines)`,
      data: { path: resolvedPath, size: content.length },
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return { success: false, output: '', error: error.message, executionTimeMs: Date.now() - startTime };
  }
};

// ========== Edit File (find & replace) ==========

export const editFileToolDefinition: ToolDefinition = {
  name: 'edit_file',
  description: 'Edit a file by finding and replacing a specific string. The old_string must match exactly.',
  category: 'code',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the file',
      },
      oldString: {
        type: 'string',
        description: 'The exact string to find and replace',
      },
      newString: {
        type: 'string',
        description: 'The replacement string',
      },
    },
    required: ['filePath', 'oldString', 'newString'],
  },
  allowedRoles: ['architect', 'coder'],
  timeout: 10,
};

export const editFileToolExecutor: ToolExecutor = async (params, context): Promise<ToolExecutionResult> => {
  const { filePath, oldString, newString } = params;
  const startTime = Date.now();

  if (context.dryRun) {
    return { success: true, output: `[DRY RUN] Would replace in ${filePath}`, executionTimeMs: 0 };
  }

  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(context.workingDir || process.cwd(), filePath);

  try {
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, output: '', error: `File not found: ${resolvedPath}` };
    }

    const content = fs.readFileSync(resolvedPath, 'utf-8');

    if (!content.includes(oldString)) {
      return { success: false, output: '', error: 'old_string not found in file' };
    }

    const occurrences = content.split(oldString).length - 1;
    if (occurrences > 1) {
      return { success: false, output: '', error: `old_string found ${occurrences} times. Must be unique. Provide more context.` };
    }

    const newContent = content.replace(oldString, newString);
    fs.writeFileSync(resolvedPath, newContent, 'utf-8');

    return {
      success: true,
      output: `File edited: ${resolvedPath} (replaced 1 occurrence)`,
      data: { path: resolvedPath },
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return { success: false, output: '', error: error.message, executionTimeMs: Date.now() - startTime };
  }
};

// ========== Search Files (grep) ==========

export const searchFilesToolDefinition: ToolDefinition = {
  name: 'search_files',
  description: 'Search for a pattern in files using grep. Returns matching lines with file paths and line numbers.',
  category: 'search',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Search pattern (regex or fixed string)',
      },
      directory: {
        type: 'string',
        description: 'Directory to search in (defaults to working directory)',
      },
      filePattern: {
        type: 'string',
        description: 'File glob pattern, e.g. "*.ts" or "*.tsx"',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results (default: 30)',
      },
    },
    required: ['pattern'],
  },
  timeout: 30,
};

export const searchFilesToolExecutor: ToolExecutor = async (params, context): Promise<ToolExecutionResult> => {
  const { pattern, directory, filePattern, maxResults = 30 } = params;
  const startTime = Date.now();

  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  const searchDir = directory || context.workingDir || process.cwd();
  const includeFlag = filePattern ? `--include="${filePattern}"` : '';
  const cmd = `grep -rn ${includeFlag} --max-count=${maxResults} -I "${pattern.replace(/"/g, '\\"')}" "${searchDir}" 2>/dev/null | head -${maxResults}`;

  try {
    const { stdout } = await execAsync(cmd, { timeout: 15000, maxBuffer: 512 * 1024 });
    const output = stdout || '(no matches found)';

    return {
      success: true,
      output: output.length > 6000 ? output.substring(0, 6000) + '\n... (truncated)' : output,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    if (error.code === 1) {
      return { success: true, output: '(no matches found)', executionTimeMs: Date.now() - startTime };
    }
    return { success: false, output: '', error: error.message, executionTimeMs: Date.now() - startTime };
  }
};

// ========== List Directory ==========

export const listDirToolDefinition: ToolDefinition = {
  name: 'list_directory',
  description: 'List files and directories in a given path.',
  category: 'code',
  parameters: {
    type: 'object',
    properties: {
      directory: {
        type: 'string',
        description: 'Directory path to list (defaults to working directory)',
      },
      recursive: {
        type: 'boolean',
        description: 'Whether to list recursively (default: false, max depth 2)',
      },
    },
    required: [],
  },
  timeout: 10,
};

export const listDirToolExecutor: ToolExecutor = async (params, context): Promise<ToolExecutionResult> => {
  const { directory, recursive = false } = params;
  const startTime = Date.now();

  const dir = directory || context.workingDir || process.cwd();

  try {
    if (!fs.existsSync(dir)) {
      return { success: false, output: '', error: `Directory not found: ${dir}` };
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const lines: string[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.env') continue;
      if (['node_modules', 'dist', '.next', '.git', 'coverage'].includes(entry.name)) {
        lines.push(`📁 ${entry.name}/ (skipped)`);
        continue;
      }

      if (entry.isDirectory()) {
        lines.push(`📁 ${entry.name}/`);
        if (recursive) {
          try {
            const subEntries = fs.readdirSync(path.join(dir, entry.name), { withFileTypes: true });
            for (const sub of subEntries.slice(0, 20)) {
              lines.push(`   ${sub.isDirectory() ? '📁' : '📄'} ${entry.name}/${sub.name}`);
            }
            if (subEntries.length > 20) lines.push(`   ... (${subEntries.length - 20} more)`);
          } catch { /* permission denied */ }
        }
      } else {
        const stat = fs.statSync(path.join(dir, entry.name));
        const size = stat.size < 1024 ? `${stat.size}B` : `${(stat.size / 1024).toFixed(1)}KB`;
        lines.push(`📄 ${entry.name} (${size})`);
      }
    }

    return {
      success: true,
      output: lines.join('\n') || '(empty directory)',
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return { success: false, output: '', error: error.message, executionTimeMs: Date.now() - startTime };
  }
};
