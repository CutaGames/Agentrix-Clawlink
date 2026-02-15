/**
 * Workspace Status Panel
 * 
 * 显示 Agent 工作状态面板 - 包含实时文件变更和终端输出
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  FolderOpen, 
  Terminal, 
  FileEdit, 
  FileText, 
  FilePlus, 
  ChevronDown, 
  ChevronRight,
  X,
  Clock
} from 'lucide-react';

export interface FileChange {
  id: string;
  type: 'read' | 'write' | 'edit' | 'create' | 'delete';
  path: string;
  timestamp: Date;
  preview?: string;
  success: boolean;
  error?: string;
}

export interface TerminalOutput {
  id: string;
  command: string;
  output: string;
  exitCode?: number;
  timestamp: Date;
  cwd?: string;
}

interface WorkspaceStatusPanelProps {
  fileChanges: FileChange[];
  terminalOutputs: TerminalOutput[];
  onFileClick?: (path: string) => void;
  onClearFiles?: () => void;
  onClearTerminal?: () => void;
  forceTab?: 'files' | 'terminal';
}

export function WorkspaceStatusPanel({
  fileChanges,
  terminalOutputs,
  onFileClick,
  onClearFiles,
  onClearTerminal,
  forceTab,
}: WorkspaceStatusPanelProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'terminal'>(forceTab || 'files');
  const effectiveTab = forceTab || activeTab;
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const terminalRef = useRef<HTMLDivElement>(null);

  // 自动滚动终端到底部
  useEffect(() => {
    if (activeTab === 'terminal' && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutputs, activeTab]);

  const toggleExpand = (id: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getFileIcon = (type: FileChange['type']) => {
    switch (type) {
      case 'read': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'write': return <FilePlus className="w-4 h-4 text-green-400" />;
      case 'edit': return <FileEdit className="w-4 h-4 text-yellow-400" />;
      case 'create': return <FilePlus className="w-4 h-4 text-green-400" />;
      case 'delete': return <X className="w-4 h-4 text-red-400" />;
    }
  };

  const getFileLabel = (type: FileChange['type']) => {
    switch (type) {
      case 'read': return '读取';
      case 'write': return '写入';
      case 'edit': return '编辑';
      case 'create': return '创建';
      case 'delete': return '删除';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* 标签栏 - hidden when parent controls tab */}
      {!forceTab && (
        <div className="flex border-b border-gray-700">
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 ${
              effectiveTab === 'files'
                ? 'text-white bg-gray-800 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            onClick={() => setActiveTab('files')}
          >
            <FolderOpen className="w-4 h-4" />
            文件 {fileChanges.length > 0 && (
              <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {fileChanges.length}
              </span>
            )}
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 ${
              effectiveTab === 'terminal'
                ? 'text-white bg-gray-800 border-b-2 border-green-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            onClick={() => setActiveTab('terminal')}
          >
            <Terminal className="w-4 h-4" />
            终端 {terminalOutputs.length > 0 && (
              <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {terminalOutputs.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* 内容区 */}
      <div className="flex-1 overflow-auto">
        {effectiveTab === 'files' ? (
          <div className="p-2">
            {fileChanges.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Agent 尚未操作任何文件</p>
                <p className="text-xs mt-1 text-gray-600">当 Agent 读取/写入文件时会在这里显示</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* 清除按钮 */}
                {onClearFiles && (
                  <button
                    onClick={onClearFiles}
                    className="w-full text-xs text-gray-500 hover:text-gray-400 py-1 text-right"
                  >
                    清除记录
                  </button>
                )}
                {fileChanges.slice().reverse().map((change) => (
                  <div 
                    key={change.id}
                    className={`rounded border ${
                      change.success 
                        ? 'border-gray-700 bg-gray-800/50' 
                        : 'border-red-900/50 bg-red-900/20'
                    }`}
                  >
                    <div 
                      className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-700/50"
                      onClick={() => toggleExpand(change.id)}
                    >
                      {change.preview ? (
                        expandedFiles.has(change.id) 
                          ? <ChevronDown className="w-3 h-3 text-gray-500" />
                          : <ChevronRight className="w-3 h-3 text-gray-500" />
                      ) : (
                        <span className="w-3" />
                      )}
                      {getFileIcon(change.type)}
                      <span className="text-xs text-gray-400">{getFileLabel(change.type)}</span>
                      <span 
                        className="flex-1 text-sm truncate text-gray-200 cursor-pointer hover:text-blue-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFileClick?.(change.path);
                        }}
                      >
                        {change.path.split('/').pop()}
                      </span>
                      <span className="text-xs text-gray-600">
                        {formatTime(change.timestamp)}
                      </span>
                    </div>
                    
                    {/* 预览内容 */}
                    {expandedFiles.has(change.id) && change.preview && (
                      <div className="px-2 pb-2">
                        <pre className="text-xs bg-gray-900 p-2 rounded overflow-x-auto max-h-32 text-gray-400">
                          {change.preview}
                        </pre>
                      </div>
                    )}
                    
                    {/* 错误信息 */}
                    {change.error && (
                      <div className="px-2 pb-2 text-xs text-red-400">
                        {change.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : effectiveTab === 'terminal' ? (
          <div className="h-full flex flex-col">
            {terminalOutputs.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8 flex-1 flex flex-col items-center justify-center">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Agent 尚未执行任何命令</p>
                <p className="text-xs mt-1 text-gray-600">当 Agent 运行终端命令时会在这里显示</p>
              </div>
            ) : (
              <div 
                ref={terminalRef}
                className="flex-1 overflow-auto font-mono text-xs p-2 space-y-2"
              >
                {/* 清除按钮 */}
                {onClearTerminal && (
                  <button
                    onClick={onClearTerminal}
                    className="w-full text-xs text-gray-500 hover:text-gray-400 py-1 text-right"
                  >
                    清除记录
                  </button>
                )}
                {terminalOutputs.map((output) => (
                  <div key={output.id} className="border-b border-gray-800 pb-2">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(output.timestamp)}</span>
                      {output.cwd && (
                        <span className="text-gray-600 truncate">
                          {output.cwd}
                        </span>
                      )}
                    </div>
                    <div className="text-green-400 mb-1">
                      $ {output.command}
                    </div>
                    <pre className="text-gray-300 whitespace-pre-wrap break-all">
                      {output.output || '(无输出)'}
                    </pre>
                    {output.exitCode !== undefined && output.exitCode !== 0 && (
                      <div className="text-red-400 mt-1">
                        退出码: {output.exitCode}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Hook 来管理工作区状态
export function useWorkspaceStatus() {
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [terminalOutputs, setTerminalOutputs] = useState<TerminalOutput[]>([]);

  const addFileChange = (change: Omit<FileChange, 'id' | 'timestamp'>) => {
    const newChange: FileChange = {
      ...change,
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setFileChanges(prev => [...prev.slice(-50), newChange]); // 保留最近 50 条
    return newChange.id;
  };

  const addTerminalOutput = (output: Omit<TerminalOutput, 'id' | 'timestamp'>) => {
    const newOutput: TerminalOutput = {
      ...output,
      id: `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setTerminalOutputs(prev => [...prev.slice(-20), newOutput]); // 保留最近 20 条
    return newOutput.id;
  };

  const clearFileChanges = () => setFileChanges([]);
  const clearTerminalOutputs = () => setTerminalOutputs([]);

  return {
    fileChanges,
    terminalOutputs,
    addFileChange,
    addTerminalOutput,
    clearFileChanges,
    clearTerminalOutputs,
  };
}
