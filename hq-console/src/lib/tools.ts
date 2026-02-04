/**
 * Local Tools Client - Provides access to local file system, terminal, and network
 * These tools run on the local machine through the HQ Console API routes
 */

import axios from 'axios';

const toolsApi = axios.create({
  baseURL: '/api/tools',
  timeout: 60000,
});

const knowledgeApi = axios.create({
  baseURL: '/api/knowledge',
  timeout: 30000,
});

// ============================================
// Path Utilities
// ============================================

/**
 * 将 Windows 路径转换为 WSL 路径格式
 * D:\wsl\Ubuntu-24.04\Code -> /mnt/d/wsl/Ubuntu-24.04/Code
 */
function normalizePathForWSL(inputPath: string): string {
  if (!inputPath) return inputPath;
  
  // 如果已经是 WSL 路径格式，直接返回
  if (inputPath.startsWith('/')) {
    return inputPath;
  }
  
  // 转换 Windows 路径为 WSL 路径
  // D:\path\to\file -> /mnt/d/path/to/file
  const windowsPathMatch = inputPath.match(/^([A-Za-z]):\\(.*)$/);
  if (windowsPathMatch) {
    const driveLetter = windowsPathMatch[1].toLowerCase();
    const restPath = windowsPathMatch[2].replace(/\\/g, '/');
    return `/mnt/${driveLetter}/${restPath}`;
  }
  
  // 如果是相对路径，加上默认工作目录
  if (!inputPath.includes(':') && !inputPath.startsWith('/')) {
    return `/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/${inputPath}`;
  }
  
  return inputPath;
}

// ============================================
// File Operations
// ============================================

export interface ReadFileResult {
  success: boolean;
  filePath: string;
  content: string;
  lines: { total: number; start: number; end: number };
  language: string;
}

export async function readFile(
  filePath: string,
  options?: { startLine?: number; endLine?: number }
): Promise<ReadFileResult> {
  const normalizedPath = normalizePathForWSL(filePath);
  console.log('[Tools] readFile:', filePath, '->', normalizedPath);
  const { data } = await toolsApi.post('/read-file', {
    filePath: normalizedPath,
    ...options,
  });
  return data;
}

export interface WriteFileResult {
  success: boolean;
  filePath: string;
  bytesWritten: number;
  backupPath?: string;
}

export async function writeFile(
  filePath: string,
  content: string,
  options?: { createIfNotExists?: boolean; backup?: boolean }
): Promise<WriteFileResult> {
  const normalizedPath = normalizePathForWSL(filePath);
  console.log('[Tools] writeFile:', filePath, '->', normalizedPath);
  const { data } = await toolsApi.post('/write-file', {
    filePath: normalizedPath,
    content,
    ...options,
  });
  return data;
}

export interface EditFileResult {
  success: boolean;
  filePath: string;
  replaced: boolean;
  backupPath?: string;
}

export async function editFile(
  filePath: string,
  oldString: string,
  newString: string,
  options?: { backup?: boolean }
): Promise<EditFileResult> {
  const normalizedPath = normalizePathForWSL(filePath);
  console.log('[Tools] editFile:', filePath, '->', normalizedPath);
  const { data } = await toolsApi.post('/edit-file', {
    filePath: normalizedPath,
    oldString,
    newString,
    ...options,
  });
  return data;
}

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
}

export interface ListDirResult {
  success: boolean;
  path: string;
  items: FileInfo[];
  count: number;
}

export async function listDir(
  inputPath: string,
  options?: { recursive?: boolean; maxDepth?: number }
): Promise<ListDirResult> {
  const normalizedPath = normalizePathForWSL(inputPath);
  console.log('[Tools] listDir:', inputPath, '->', normalizedPath);
  const { data } = await toolsApi.post('/list-dir', {
    path: normalizedPath,
    ...options,
  });
  return data;
}

// ============================================
// Command Execution
// ============================================

export interface RunCommandResult {
  success: boolean;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runCommand(
  command: string,
  options?: { cwd?: string; timeout?: number; shell?: 'bash' | 'powershell' }
): Promise<RunCommandResult> {
  const { data } = await toolsApi.post('/run-command', {
    command,
    ...options,
  });
  return data;
}

// ============================================
// Network Operations
// ============================================

export interface FetchUrlResult {
  success: boolean;
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
}

export async function fetchUrl(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
    followRedirects?: boolean;
  }
): Promise<FetchUrlResult> {
  const { data } = await toolsApi.post('/fetch-url', {
    url,
    ...options,
  });
  return data;
}

// ============================================
// Knowledge Base Operations
// ============================================

export interface KnowledgeEntry {
  id: string;
  title: string;
  category: string;
  path: string;
  summary?: string;
  addedAt: string;
  size: number;
  matchingLines?: string[];
  contentPreview?: string;
}

export interface SearchKnowledgeResult {
  success: boolean;
  query: string;
  results: KnowledgeEntry[];
  totalMatches: number;
}

export async function searchKnowledge(
  query: string,
  options?: { category?: string; limit?: number }
): Promise<SearchKnowledgeResult> {
  const { data } = await knowledgeApi.post('/search', {
    query,
    ...options,
  });
  return data;
}

export interface KnowledgeListResult {
  success: boolean;
  entries: KnowledgeEntry[];
  stats: {
    total: number;
    byCategory: Record<string, number>;
    totalWords: number;
  };
}

export async function listKnowledge(): Promise<KnowledgeListResult> {
  const { data } = await knowledgeApi.get('/');
  return data;
}

export async function importCoreKnowledge(): Promise<any> {
  const { data } = await knowledgeApi.post('/import-core');
  return data;
}

// ============================================
// Tool Definitions for Agent System Prompt
// ============================================

export const TOOL_DEFINITIONS = [
  {
    name: 'read_file',
    description: 'Read the contents of a file from the local file system.',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path to the file' },
        startLine: { type: 'number', description: 'Start line (1-based, optional)' },
        endLine: { type: 'number', description: 'End line (1-based, optional)' },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file. Creates the file if it does not exist.',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path to the file' },
        content: { type: 'string', description: 'Content to write' },
      },
      required: ['filePath', 'content'],
    },
  },
  {
    name: 'edit_file',
    description: 'Edit a file by replacing a specific string. The oldString must be unique in the file.',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path to the file' },
        oldString: { type: 'string', description: 'Exact string to replace (must be unique)' },
        newString: { type: 'string', description: 'New string to insert' },
      },
      required: ['filePath', 'oldString', 'newString'],
    },
  },
  {
    name: 'list_dir',
    description: 'List contents of a directory.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the directory' },
      },
      required: ['path'],
    },
  },
  {
    name: 'run_command',
    description: 'Execute a shell command in the terminal.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command to execute' },
        cwd: { type: 'string', description: 'Working directory (optional)' },
      },
      required: ['command'],
    },
  },
  {
    name: 'fetch_url',
    description: 'Fetch content from a URL on the internet.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
        method: { type: 'string', description: 'HTTP method (default: GET)' },
      },
      required: ['url'],
    },
  },
  {
    name: 'search_knowledge',
    description: 'Search the local knowledge base for relevant project documentation and code.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        category: { type: 'string', description: 'Optional category filter: architecture, product, integration, development, code, config, scripts' },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_knowledge',
    description: 'List all entries in the local knowledge base.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

// Generate tool descriptions for system prompt
export function getToolsSystemPrompt(): string {
  return `你有以下工具可以使用来执行文件/命令操作。当你需要读写文件时，**必须**使用工具，不要假装执行。

## 可用工具

### 1. read_file - 读取文件内容
<tool_call>
<name>read_file</name>
<params>{"filePath": "/mnt/d/path/to/file.txt", "startLine": 1, "endLine": 100}</params>
</tool_call>

### 2. write_file - 创建或覆写文件
<tool_call>
<name>write_file</name>
<params>{"filePath": "/mnt/d/path/to/file.txt", "content": "文件内容"}</params>
</tool_call>

### 3. edit_file - 编辑文件（查找并替换）
<tool_call>
<name>edit_file</name>
<params>{"filePath": "/mnt/d/path/to/file.txt", "oldString": "旧内容", "newString": "新内容"}</params>
</tool_call>

### 4. list_dir - 列出目录内容
<tool_call>
<name>list_dir</name>
<params>{"path": "/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website"}</params>
</tool_call>

### 5. run_command - 执行终端命令（需要授权）
<tool_call>
<name>run_command</name>
<params>{"command": "ls -la", "cwd": "/mnt/d/path"}</params>
<requires_permission>true</requires_permission>
<reason>需要执行命令的原因</reason>
</tool_call>

### 6. fetch_url - 获取网页内容
<tool_call>
<name>fetch_url</name>
<params>{"url": "https://example.com", "method": "GET"}</params>
</tool_call>

### 7. search_knowledge - 搜索知识库
<tool_call>
<name>search_knowledge</name>
<params>{"query": "payment architecture", "category": "architecture"}</params>
</tool_call>

### 8. list_knowledge - 列出知识库条目
<tool_call>
<name>list_knowledge</name>
<params>{}</params>
</tool_call>

## 重要规则
1. 工作目录: /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website
2. 路径格式: 使用 /mnt/d/... (不是 D:\\...)
3. 直接输出: 当需要使用工具时，直接输出 <tool_call>...</tool_call>，不要放在代码块中
4. 真实执行: 工具会真正执行，结果会返回给你继续处理
5. 不要假装: 需要读写文件时，必须调用工具

当需要使用工具时，按上述格式输出。工具执行结果会返回给你继续处理。`;
}

// ============================================
// Tool Call Parser and Executor
// ============================================

export interface ToolCall {
  tool: string;
  params: Record<string, any>;
  requiresPermission?: boolean;
  reason?: string;
}

function normalizeToolName(tool: string): string {
  const normalized = tool.trim();
  const aliasMap: Record<string, string> = {
    list_directory: 'list_dir',
    listDir: 'list_dir',
    readFile: 'read_file',
    writeFile: 'write_file',
    editFile: 'edit_file',
    runCommand: 'run_command',
    fetchUrl: 'fetch_url',
    searchKnowledge: 'search_knowledge',
    listKnowledge: 'list_knowledge',
  };
  return aliasMap[normalized] || normalized;
}

function normalizeToolParams(tool: string, params: Record<string, any>): Record<string, any> {
  const next = { ...params };
  if ((tool === 'read_file' || tool === 'write_file' || tool === 'edit_file') && !next.filePath && next.path) {
    next.filePath = next.path;
  }
  return next;
}

export function parseToolCalls(text: string): ToolCall[] {
  const toolCalls: ToolCall[] = [];
  
  console.log('[Tools] parseToolCalls input length:', text.length);
  console.log('[Tools] parseToolCalls text preview:', text.substring(0, 500));
  
  // 首先去掉代码块标记，因为 AI 可能会把工具调用放在 ```tool 或 ``` 代码块中
  let cleanedText = text;
  // 移除 ```tool ... ``` 或 ```xml ... ``` 或 ``` ... ``` 代码块标记
  cleanedText = cleanedText.replace(/```(?:tool|xml|json)?\s*([\s\S]*?)```/g, '$1');
  
  console.log('[Tools] Cleaned text preview:', cleanedText.substring(0, 500));
  
  // 支持三种格式:
  // 格式1: <tool_call><name>...</name><params>...</params></tool_call>
  // 格式2: <tool>...</tool><params>...</params>
  // 格式3: <tool_use><tool_name>...</tool_name><parameters>...</parameters></tool_use>
  
  // 格式1 - 新的 XML 格式 (更宽松的匹配)
  const newFormatRegex = /<tool_call>\s*<name>\s*(\w+)\s*<\/name>\s*<params>\s*([\s\S]*?)\s*<\/params>(?:\s*<requires_permission>\s*(true|false)\s*<\/requires_permission>)?(?:\s*<reason>\s*([\s\S]*?)\s*<\/reason>)?\s*<\/tool_call>/g;
  
  let match;
  while ((match = newFormatRegex.exec(cleanedText)) !== null) {
    try {
      const tool = normalizeToolName(match[1].trim());
      const paramsStr = match[2].trim();
      console.log('[Tools] Found tool_call:', tool, 'params:', paramsStr.substring(0, 100));
      const params = normalizeToolParams(tool, JSON.parse(paramsStr));
      const requiresPermission = match[3] === 'true';
      const reason = match[4]?.trim();
      toolCalls.push({ tool, params, requiresPermission, reason });
    } catch (e) {
      console.error('[Tools] Failed to parse tool call (new format):', e, 'raw:', match[2]);
    }
  }

  // 格式3 - tool_use 格式
  const toolUseRegex = /<tool_use>\s*<tool_name>\s*([\w-]+)\s*<\/tool_name>\s*<parameters>\s*([\s\S]*?)\s*<\/parameters>\s*<\/tool_use>/g;
  while ((match = toolUseRegex.exec(cleanedText)) !== null) {
    try {
      const tool = normalizeToolName(match[1].trim());
      const params = normalizeToolParams(tool, JSON.parse(match[2]));
      const dangerousTools = ['run_command', 'delete_file'];
      const requiresPermission = dangerousTools.includes(tool);
      toolCalls.push({ tool, params, requiresPermission });
    } catch (e) {
      console.error('[Tools] Failed to parse tool call (tool_use format):', e, 'raw:', match[2]);
    }
  }
  
  // 格式2 - 旧格式 (向后兼容)
  const oldFormatRegex = /<tool>\s*(\w+)\s*<\/tool>\s*<params>\s*([\s\S]*?)\s*<\/params>/g;
  
  while ((match = oldFormatRegex.exec(cleanedText)) !== null) {
    try {
      const tool = normalizeToolName(match[1]);
      const params = normalizeToolParams(tool, JSON.parse(match[2]));
      // 某些工具默认需要权限
      const dangerousTools = ['run_command', 'delete_file'];
      const requiresPermission = dangerousTools.includes(tool);
      toolCalls.push({ tool, params, requiresPermission });
    } catch (e) {
      console.error('Failed to parse tool call (old format):', e);
    }
  }
  
  console.log('[Tools] parseToolCalls found:', toolCalls.length, 'tool calls');
  if (toolCalls.length > 0) {
    console.log('[Tools] Tool calls:', JSON.stringify(toolCalls, null, 2));
  }
  
  return toolCalls;
}

export async function executeToolCall(toolCall: ToolCall): Promise<{ success: boolean; result: any; error?: string }> {
  const normalizedTool = normalizeToolName(toolCall.tool);
  const normalizedParams = normalizeToolParams(normalizedTool, toolCall.params);
  console.log('[Tools] executeToolCall:', normalizedTool, normalizedParams);
  try {
    switch (normalizedTool) {
      case 'read_file':
        const readResult = await readFile(normalizedParams.filePath, {
          startLine: normalizedParams.startLine,
          endLine: normalizedParams.endLine,
        });
        return { success: true, result: readResult };

      case 'write_file':
        const writeResult = await writeFile(normalizedParams.filePath, normalizedParams.content);
        return { success: true, result: writeResult };

      case 'edit_file':
        const editResult = await editFile(
          normalizedParams.filePath,
          normalizedParams.oldString,
          normalizedParams.newString
        );
        return { success: true, result: editResult };

      case 'list_dir':
        const listResult = await listDir(normalizedParams.path);
        return { success: true, result: listResult };

      case 'run_command':
        const cmdResult = await runCommand(normalizedParams.command, {
          cwd: normalizedParams.cwd,
        });
        return { success: true, result: cmdResult };

      case 'fetch_url':
        const fetchResult = await fetchUrl(normalizedParams.url, {
          method: normalizedParams.method,
        });
        return { success: true, result: fetchResult };

      case 'search_knowledge':
        const searchResult = await searchKnowledge(normalizedParams.query, {
          category: normalizedParams.category,
        });
        return { success: true, result: searchResult };

      case 'list_knowledge':
        const kbListResult = await listKnowledge();
        return { success: true, result: kbListResult };

      default:
        return { success: false, result: null, error: `Unknown tool: ${toolCall.tool}` };
    }
  } catch (error: any) {
    return { 
      success: false, 
      result: null, 
      error: error.response?.data?.error || error.message || 'Tool execution failed' 
    };
  }
}
