"use client";

import { useState, useCallback } from 'react';
import { 
  ToolCall, 
  parseToolCalls, 
  executeToolCall,
  readFile,
  writeFile,
  editFile,
  listDir,
  runCommand,
  fetchUrl,
  ReadFileResult,
  WriteFileResult,
  EditFileResult,
  ListDirResult,
  RunCommandResult,
  FetchUrlResult,
} from '@/lib/tools';

export interface ToolExecution {
  id: string;
  tool: string;
  params: Record<string, any>;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: any;
  error?: string;
  timestamp: string;
}

export function useTools() {
  const [executions, setExecutions] = useState<ToolExecution[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  // Execute a single tool call
  const executeTool = useCallback(async (toolCall: ToolCall): Promise<ToolExecution> => {
    const execution: ToolExecution = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tool: toolCall.tool,
      params: toolCall.params,
      status: 'running',
      timestamp: new Date().toISOString(),
    };

    setExecutions(prev => [...prev, execution]);
    setIsExecuting(true);

    try {
      const result = await executeToolCall(toolCall);
      
      const updatedExecution: ToolExecution = {
        ...execution,
        status: result.success ? 'success' : 'error',
        result: result.result,
        error: result.error,
      };

      setExecutions(prev => 
        prev.map(e => e.id === execution.id ? updatedExecution : e)
      );
      
      return updatedExecution;
    } catch (error: any) {
      const updatedExecution: ToolExecution = {
        ...execution,
        status: 'error',
        error: error.message || 'Unknown error',
      };

      setExecutions(prev => 
        prev.map(e => e.id === execution.id ? updatedExecution : e)
      );
      
      return updatedExecution;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  // Parse and execute all tool calls in a message
  const executeToolsInMessage = useCallback(async (message: string, overrideCalls?: ToolCall[]): Promise<{
    toolCalls: ToolCall[];
    results: ToolExecution[];
  }> => {
    console.log('[useTools] executeToolsInMessage called, message length:', message.length);
    console.log('[useTools] Message preview:', message.substring(0, 500));
    
    const toolCalls = overrideCalls ?? parseToolCalls(message);
    
    console.log('[useTools] Parsed tool calls:', toolCalls.length);
    
    if (toolCalls.length === 0) {
      console.log('[useTools] No tool calls found, returning empty');
      return { toolCalls: [], results: [] };
    }

    console.log('[useTools] Executing', toolCalls.length, 'tool calls');
    setIsExecuting(true);
    const results: ToolExecution[] = [];

    for (const call of toolCalls) {
      console.log('[useTools] Executing tool:', call.tool, call.params);
      const result = await executeTool(call);
      console.log('[useTools] Tool result:', result.status, result.error || '');
      results.push(result);
    }

    setIsExecuting(false);
    return { toolCalls, results };
  }, [executeTool]);

  // Format tool result for display
  const formatToolResult = useCallback((execution: ToolExecution): string => {
    if (execution.status === 'error') {
      return `❌ Tool "${execution.tool}" failed: ${execution.error}`;
    }

    const result = execution.result;
    
    switch (execution.tool) {
      case 'read_file':
        const readRes = result as ReadFileResult;
        return `📄 Read ${readRes.filePath}\n\`\`\`${readRes.language}\n${readRes.content.slice(0, 2000)}${readRes.content.length > 2000 ? '\n... (truncated)' : ''}\n\`\`\``;
      
      case 'write_file':
        const writeRes = result as WriteFileResult;
        return `✅ Written ${writeRes.bytesWritten} bytes to ${writeRes.filePath}`;
      
      case 'edit_file':
        const editRes = result as EditFileResult;
        return `✅ Edited ${editRes.filePath}`;
      
      case 'list_dir':
        const listRes = result as ListDirResult;
        const items = listRes.items.slice(0, 20).map(i => 
          i.type === 'directory' ? `📁 ${i.name}/` : `📄 ${i.name}`
        ).join('\n');
        return `📂 ${listRes.path} (${listRes.count} items)\n${items}${listRes.count > 20 ? '\n... and more' : ''}`;
      
      case 'run_command':
        const cmdRes = result as RunCommandResult;
        const output = cmdRes.stdout || cmdRes.stderr || '(no output)';
        return `💻 $ ${cmdRes.command}\n\`\`\`\n${output.slice(0, 2000)}${output.length > 2000 ? '\n... (truncated)' : ''}\n\`\`\`\nExit code: ${cmdRes.exitCode}`;
      
      case 'fetch_url':
        const fetchRes = result as FetchUrlResult;
        const body = typeof fetchRes.body === 'string' 
          ? fetchRes.body.slice(0, 1000) 
          : JSON.stringify(fetchRes.body, null, 2).slice(0, 1000);
        return `🌐 ${fetchRes.url}\nStatus: ${fetchRes.status} ${fetchRes.statusText}\n\`\`\`\n${body}\n\`\`\``;
      
      case 'search_knowledge':
        const searchRes = result as any;
        if (searchRes.results?.length === 0) {
          return `📚 No results found for "${searchRes.query}"`;
        }
        const searchItems = searchRes.results?.slice(0, 5).map((r: any) => 
          `📖 **${r.title}** (${r.category})\n   ${r.summary?.slice(0, 100)}...`
        ).join('\n\n') || 'No results';
        return `📚 Knowledge Search: "${searchRes.query}" (${searchRes.totalMatches} results)\n\n${searchItems}`;
      
      case 'list_knowledge':
        const kbRes = result as any;
        const kbItems = kbRes.entries?.slice(0, 10).map((e: any) => 
          `📖 ${e.title} [${e.category}]`
        ).join('\n') || 'No entries';
        return `📚 Knowledge Base (${kbRes.stats?.total || 0} entries)\n${kbItems}`;
      
      default:
        return JSON.stringify(result, null, 2);
    }
  }, []);

  // Clear all executions
  const clearExecutions = useCallback(() => {
    setExecutions([]);
  }, []);

  return {
    executions,
    isExecuting,
    executeTool,
    executeToolsInMessage,
    formatToolResult,
    clearExecutions,
    // Direct tool access
    tools: {
      readFile,
      writeFile,
      editFile,
      listDir,
      runCommand,
      fetchUrl,
    },
  };
}
