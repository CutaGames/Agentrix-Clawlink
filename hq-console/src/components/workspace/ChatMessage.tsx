/**
 * Chat Message Component
 * 
 * 单条消息渲染 - 支持附件、生成文件、权限请求、Markdown 渲染
 */

'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { FileText, Download, ExternalLink, Lock, CheckCircle, XCircle, AlertTriangle, Terminal, Edit, FolderOpen, Globe, Copy } from 'lucide-react';
import { useState, useMemo } from 'react';
import { stripToolCallsFromContent } from '@/lib/tools';

// Import highlight.js styles (you'll need to add this CSS)
import 'highlight.js/styles/github-dark.css';

export interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
  preview?: string;
}

export interface GeneratedFile {
  path: string;
  name: string;
  language?: string;
  content?: string;
}

export interface PermissionRequest {
  id: string;
  tool: string;
  params: Record<string, any>;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
}

export interface ToolExecution {
  id: string;
  tool: string;
  params: Record<string, any>;
  status: string;
  result?: any;
  error?: string;
  timestamp: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  agentCode?: string;
  timestamp: Date;
  attachments?: AttachedFile[];
  generatedFiles?: GeneratedFile[];
  toolExecutions?: ToolExecution[];
  permissionRequest?: PermissionRequest;
}

interface ChatMessageProps {
  message: Message;
  onOpenFile?: (path: string) => void;
  onSaveFile?: (file: GeneratedFile) => void;
  onApplyCode?: (code: string, language?: string) => void;
}

export function ChatMessage({ message: msg, onOpenFile, onSaveFile, onApplyCode }: ChatMessageProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg p-3 ${
          msg.role === 'user'
            ? 'bg-blue-600 text-white'
            : msg.role === 'tool'
            ? 'bg-gray-800 text-gray-300 border border-gray-600'
            : 'bg-gray-700 text-gray-200'
        }`}
      >
        {/* Attachments preview */}
        {msg.attachments && msg.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {msg.attachments.map(file => (
              <div key={file.id} className="bg-gray-600/50 rounded px-2 py-1 text-xs flex items-center gap-1">
                {file.preview ? (
                  <img src={file.preview} alt={file.name} className="h-8 w-8 object-cover rounded" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className="truncate max-w-[100px]">{file.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Markdown rendered content */}
        <div className="text-sm prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight, rehypeRaw]}
            components={{
              code({ node, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                const isInline = !match;

                if (isInline) {
                  return (
                    <code className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-300" {...props}>
                      {children}
                    </code>
                  );
                }

                return (
                  <div className="relative group my-2">
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopyCode(codeString)}
                        className="p-1 bg-gray-700 hover:bg-gray-600 rounded text-xs flex items-center gap-1"
                        title="Copy code"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedCode === codeString ? 'Copied!' : 'Copy'}
                      </button>
                      {onApplyCode && (
                        <button
                          onClick={() => onApplyCode(codeString, match?.[1])}
                          className="p-1 bg-blue-600 hover:bg-blue-500 rounded text-xs flex items-center gap-1"
                          title="Apply to editor"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Apply
                        </button>
                      )}
                    </div>
                    <pre className={className}>
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  </div>
                );
              },
            }}
          >
            {stripToolCallsFromContent(msg.content) || msg.content}
          </ReactMarkdown>
        </div>

        {/* Generated files */}
        {msg.generatedFiles && msg.generatedFiles.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-gray-600 pt-2">
            <p className="text-xs text-gray-400">Generated Files:</p>
            {msg.generatedFiles.map((file, idx) => (
              <div key={idx} className="bg-gray-800 rounded p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-blue-300">{file.name}</span>
                  <span className="text-xs text-gray-500">{file.language}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenFile?.(file.path)}
                    className="p-1 hover:bg-gray-700 rounded"
                    title="Open in editor"
                  >
                    <ExternalLink className="h-3 w-3 text-gray-400" />
                  </button>
                  <button
                    onClick={() => onSaveFile?.(file)}
                    className="p-1 hover:bg-gray-700 rounded"
                    title="Save file"
                  >
                    <Download className="h-3 w-3 text-green-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs mt-1 opacity-50">
          {msg.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

interface PermissionRequestUIProps {
  permission: PermissionRequest;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
}

export function PermissionRequestUI({ permission: perm, onApprove, onDeny }: PermissionRequestUIProps) {
  return (
    <div className="flex justify-start">
      <div className="bg-amber-900/50 border border-amber-600/50 text-gray-200 rounded-lg p-4 max-w-[85%]">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-5 w-5 text-amber-400" />
          <span className="font-medium text-amber-300">权限请求</span>
        </div>
        <div className="text-sm mb-3">
          <p className="mb-1">Agent 请求执行以下操作:</p>
          <div className="bg-gray-800 rounded p-2 mt-1 font-mono text-xs">
            <div className="flex items-center gap-2 text-amber-200">
              {perm.tool === 'run_command' && <Terminal className="h-4 w-4" />}
              {(perm.tool === 'write_file' || perm.tool === 'edit_file') && <Edit className="h-4 w-4" />}
              {(perm.tool === 'read_file' || perm.tool === 'list_dir') && <FolderOpen className="h-4 w-4" />}
              {perm.tool === 'fetch_url' && <Globe className="h-4 w-4" />}
              <span>{perm.tool}</span>
            </div>
            <pre className="text-gray-400 mt-1 overflow-x-auto">
              {JSON.stringify(perm.params, null, 2)}
            </pre>
          </div>
          {perm.reason && (
            <p className="mt-2 text-gray-400 text-xs">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              原因: {perm.reason}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(perm.id)}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            允许
          </button>
          <button
            onClick={() => onDeny(perm.id)}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
          >
            <XCircle className="h-4 w-4" />
            拒绝
          </button>
        </div>
      </div>
    </div>
  );
}
