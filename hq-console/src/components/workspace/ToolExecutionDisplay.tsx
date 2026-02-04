'use client';

import React, { useState } from 'react';
import { Check, X, Loader2, ChevronDown, ChevronRight, FileText, Terminal, FolderOpen, Edit, Eye, AlertTriangle, Copy, RefreshCw } from 'lucide-react';

export interface ToolExecution {
  tool: string;
  params: Record<string, any>;
  status: 'pending' | 'running' | 'success' | 'error' | 'denied';
  result?: any;
  error?: string;
  oldContent?: string;
  newContent?: string;
}

interface Props {
  execution: ToolExecution;
  compact?: boolean;
  onRetry?: () => void;
  onOpenFile?: (path: string) => void;
}

const TOOL_CONFIG: Record<string, { icon: React.ReactNode; name: string; bg: string }> = {
  read_file: { icon: <Eye className="h-4 w-4" />, name: '读取文件', bg: 'bg-blue-500/10 border-blue-500/30' },
  write_file: { icon: <FileText className="h-4 w-4" />, name: '写入文件', bg: 'bg-green-500/10 border-green-500/30' },
  edit_file: { icon: <Edit className="h-4 w-4" />, name: '编辑文件', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  list_dir: { icon: <FolderOpen className="h-4 w-4" />, name: '列出目录', bg: 'bg-purple-500/10 border-purple-500/30' },
  run_command: { icon: <Terminal className="h-4 w-4" />, name: '执行命令', bg: 'bg-orange-500/10 border-orange-500/30' },
};

export function ToolExecutionDisplay({ execution, compact, onRetry, onOpenFile }: Props) {
  const [expanded, setExpanded] = useState(!compact);
  const [showDiff, setShowDiff] = useState(false);
  const [copied, setCopied] = useState(false);

  const { tool, params, status, result, error, oldContent, newContent } = execution;
  const config = TOOL_CONFIG[tool] || { icon: <FileText className="h-4 w-4" />, name: tool, bg: 'bg-gray-500/10 border-gray-500/30' };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const StatusIcon = () => {
    switch (status) {
      case 'pending': return <div className="h-3 w-3 rounded-full border-2 border-gray-500" />;
      case 'running': return <Loader2 className="h-3 w-3 animate-spin text-blue-400" />;
      case 'success': return <Check className="h-3 w-3 text-green-400" />;
      case 'error': return <X className="h-3 w-3 text-red-400" />;
      case 'denied': return <AlertTriangle className="h-3 w-3 text-yellow-400" />;
    }
  };

  // 文件读取结果
  const renderReadResult = () => {
    const content = result?.content || '';
    return (
      <div className="mt-2 rounded border border-gray-700 overflow-hidden">
        <div className="bg-gray-800 px-3 py-1 flex justify-between items-center">
          <span className="text-xs text-gray-400 truncate">{params.filePath}</span>
          <button onClick={() => handleCopy(content)} className="text-gray-500 hover:text-white">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
        <pre className="p-2 text-xs text-gray-300 max-h-48 overflow-auto bg-gray-900">
          <code>{content.slice(0, 3000)}{content.length > 3000 ? '\n...(truncated)' : ''}</code>
        </pre>
      </div>
    );
  };

  // 文件写入/编辑结果 - Diff 视图
  const renderWriteResult = () => {
    const content = newContent || result?.content || params.content || '';
    return (
      <div className="mt-2">
        <div className="flex items-center gap-2 text-xs text-green-400">
          <Check className="h-3 w-3" />
          <span>文件已保存</span>
          {onOpenFile && (
            <button onClick={() => onOpenFile(params.filePath)} className="text-blue-400 hover:underline ml-2">
              打开文件
            </button>
          )}
        </div>
        <button onClick={() => setShowDiff(!showDiff)} className="text-xs text-blue-400 mt-1 flex items-center gap-1">
          {showDiff ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {showDiff ? '隐藏' : '查看'}变更
        </button>
        {showDiff && (
          <div className="mt-2 rounded border border-gray-700 overflow-hidden">
            {oldContent ? (
              <div className="grid grid-cols-2 divide-x divide-gray-700">
                <div>
                  <div className="bg-red-900/30 px-2 py-1 text-xs text-red-400">- 修改前</div>
                  <pre className="p-2 text-xs text-gray-400 max-h-40 overflow-auto">{oldContent}</pre>
                </div>
                <div>
                  <div className="bg-green-900/30 px-2 py-1 text-xs text-green-400">+ 修改后</div>
                  <pre className="p-2 text-xs text-gray-300 max-h-40 overflow-auto">{content}</pre>
                </div>
              </div>
            ) : (
              <div>
                <div className="bg-green-900/30 px-2 py-1 text-xs text-green-400">+ 新文件</div>
                <pre className="p-2 text-xs text-gray-300 max-h-40 overflow-auto">{content.slice(0, 2000)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // 目录列表
  const renderListResult = () => {
    const items = result?.items || result?.entries || [];
    return (
      <div className="mt-2 rounded border border-gray-700 overflow-hidden">
        <div className="bg-gray-800 px-3 py-1 text-xs text-gray-400">{params.path} ({items.length} 项)</div>
        <div className="p-2 max-h-40 overflow-auto bg-gray-900">
          {items.slice(0, 20).map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs py-0.5 text-gray-300">
              {item.isDirectory ? <FolderOpen className="h-3 w-3 text-yellow-500" /> : <FileText className="h-3 w-3 text-gray-500" />}
              <span>{item.name}</span>
            </div>
          ))}
          {items.length > 20 && <div className="text-xs text-gray-600">...还有 {items.length - 20} 项</div>}
        </div>
      </div>
    );
  };

  // 命令执行结果
  const renderCommandResult = () => {
    const stdout = result?.stdout || result?.output || '';
    const stderr = result?.stderr || '';
    return (
      <div className="mt-2 rounded border border-gray-700 overflow-hidden font-mono">
        <div className="bg-gray-800 px-3 py-1 flex justify-between">
          <span className="text-xs text-gray-300">$ {params.command}</span>
          <span className={`text-xs ${result?.exitCode === 0 ? 'text-green-400' : 'text-red-400'}`}>exit: {result?.exitCode || 0}</span>
        </div>
        <div className="bg-gray-900 p-2 max-h-48 overflow-auto">
          {stdout && <pre className="text-xs text-gray-300 whitespace-pre-wrap">{stdout}</pre>}
          {stderr && <pre className="text-xs text-red-400 whitespace-pre-wrap">{stderr}</pre>}
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (status === 'error') return (
      <div className="mt-2 p-2 rounded bg-red-900/20 border border-red-800">
        <div className="text-xs text-red-400">{error}</div>
        {onRetry && <button onClick={onRetry} className="text-xs text-blue-400 mt-1 flex items-center gap-1"><RefreshCw className="h-3 w-3" />重试</button>}
      </div>
    );
    if (status !== 'success') return null;
    switch (tool) {
      case 'read_file': return renderReadResult();
      case 'write_file':
      case 'edit_file': return renderWriteResult();
      case 'list_dir': return renderListResult();
      case 'run_command': return renderCommandResult();
      default: return result ? <pre className="mt-2 p-2 text-xs bg-gray-900 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre> : null;
    }
  };

  return (
    <div className={`rounded-lg border p-3 my-2 ${config.bg}`}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        {config.icon}
        <span className="text-sm font-medium text-gray-200">{config.name}</span>
        <span className="text-xs text-gray-400 truncate flex-1">{params.filePath?.split('/').pop() || params.path?.split('/').pop() || params.command?.slice(0, 30)}</span>
        <StatusIcon />
      </div>
      {expanded && <div className="mt-2 pl-6">{renderResult()}</div>}
    </div>
  );
}

export default ToolExecutionDisplay;
