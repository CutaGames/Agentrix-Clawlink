"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Sparkles, Clock, Terminal, FileText, Globe, CheckCircle, XCircle, Wrench, BookOpen, Paperclip, Image, X, Upload, Maximize2, Minimize2 } from "lucide-react";
import { useAgentChat } from "@/hooks/useAgents";
import { cn } from "@/lib/utils";
import { getAgentToolPermissions, setAgentToolPermissions, getToolPermissionLabel } from "@/lib/agent-permissions";

interface CommandConsoleProps {
  agentId: string | null;
  agentName?: string;
}

interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
  preview?: string;
}

function formatTime(timestamp?: string) {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// Tool icon mapping
function getToolIcon(toolName: string) {
  switch (toolName) {
    case 'read_file':
    case 'write_file':
    case 'edit_file':
      return <FileText className="h-3 w-3" />;
    case 'run_command':
    case 'list_dir':
      return <Terminal className="h-3 w-3" />;
    case 'fetch_url':
      return <Globe className="h-3 w-3" />;
    case 'search_knowledge':
    case 'list_knowledge':
      return <BookOpen className="h-3 w-3" />;
    default:
      return <Wrench className="h-3 w-3" />;
  }
}

// Format tool call display
function formatToolCall(tool: string, params: any): string {
  switch (tool) {
    case 'read_file':
      return `📄 Reading: ${params.filePath?.split('/').pop() || params.filePath}`;
    case 'write_file':
      return `📝 Writing: ${params.filePath?.split('/').pop() || params.filePath}`;
    case 'edit_file':
      return `✏️ Editing: ${params.filePath?.split('/').pop() || params.filePath}`;
    case 'list_dir':
      return `📂 Listing: ${params.path?.split('/').pop() || params.path}`;
    case 'run_command':
      return `💻 Running: ${params.command?.substring(0, 50)}${params.command?.length > 50 ? '...' : ''}`;
    case 'fetch_url':
      return `🌐 Fetching: ${params.url?.substring(0, 50)}${params.url?.length > 50 ? '...' : ''}`;
    case 'search_knowledge':
      return `📚 Searching: "${params.query}"${params.category ? ` in ${params.category}` : ''}`;
    case 'list_knowledge':
      return `📚 Listing knowledge base`;
    default:
      return `🔧 ${tool}`;
  }
}

export function CommandConsole({ agentId, agentName }: CommandConsoleProps) {
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { messages, sending, workingStatus, toolExecutions, sendMessage, clearChat } = useAgentChat(agentId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, workingStatus]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, isExpanded ? 300 : 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input, isExpanded]);

  // Handle file reading
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    
    const newFiles: AttachedFile[] = [];
    
    for (const file of Array.from(files)) {
      const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      if (file.type.startsWith('image/')) {
        // For images, create a preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachedFiles(prev => prev.map(f => 
            f.id === id ? { ...f, preview: e.target?.result as string } : f
          ));
        };
        reader.readAsDataURL(file);
        
        newFiles.push({
          id,
          name: file.name,
          type: file.type,
          size: file.size,
        });
      } else {
        // For text files, read content
        const content = await file.text();
        newFiles.push({
          id,
          name: file.name,
          type: file.type,
          size: file.size,
          content: content.slice(0, 10000), // Limit content size
        });
      }
    }
    
    setAttachedFiles(prev => [...prev, ...newFiles]);
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Paste handler for images
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    
    if (files.length > 0) {
      const dt = new DataTransfer();
      files.forEach(f => dt.items.add(f));
      handleFileSelect(dt.files);
    }
  }, [handleFileSelect]);

  const removeFile = useCallback((id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || sending) return;
    
    // Build message with attached files
    let fullMessage = input.trim();
    
    if (attachedFiles.length > 0) {
      const fileDescriptions = attachedFiles.map(f => {
        if (f.content) {
          return `\n\n[Attached File: ${f.name}]\n\`\`\`\n${f.content}\n\`\`\``;
        } else if (f.preview) {
          return `\n\n[Attached Image: ${f.name}]`;
        }
        return `\n\n[Attached: ${f.name}]`;
      }).join('');
      fullMessage += fileDescriptions;
    }
    
    sendMessage(fullMessage);
    setInput("");
    setAttachedFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleGrantPermission = useCallback((tool: string) => {
    if (!agentId) return;
    const current = getAgentToolPermissions(agentId);
    const next = { ...current, [tool]: true } as typeof current;
    setAgentToolPermissions(agentId, next);
  }, [agentId]);

  if (!agentId) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-slate-500">
        <p className="text-lg">Select an agent to start commanding</p>
        <p className="text-sm mt-2">Choose from the roster on the left</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-medium text-white">
            Command Console: {agentName || agentId}
          </h3>
          <p className="text-xs text-slate-400">Send instructions to this agent</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearChat}
          className="text-slate-400 hover:text-white"
        >
          Clear
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            <p>No messages yet.</p>
            <p className="text-sm mt-1">Start by typing a command below.</p>
            <p className="text-xs mt-2 text-slate-600">💡 Chat history is saved locally</p>
            <p className="text-xs mt-1 text-emerald-600">🛠️ Agent can read/edit files, run commands, and fetch URLs</p>
          </div>
        )}
        {messages.map((msg: any, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col",
              msg.role === "user" ? "items-end" : "items-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-2",
                msg.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-200"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.timestamp && (
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(msg.timestamp)}
                </p>
              )}
            </div>
            {/* Show tool calls if any */}
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="mt-2 space-y-1 max-w-[80%]">
                {msg.toolCalls.map((tc: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1">
                    {getToolIcon(tc.tool)}
                    <span className="text-amber-400">{formatToolCall(tc.tool, tc.params)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {/* Tool Executions in Progress */}
        {toolExecutions.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 space-y-2 max-w-[80%]">
              <p className="text-xs text-slate-400 font-medium">🛠️ Tool Executions:</p>
              {toolExecutions.map((exec, idx) => (
                <div key={idx} className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    {exec.status === 'running' ? (
                      <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                    ) : exec.status === 'success' ? (
                      <CheckCircle className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-400" />
                    )}
                    {getToolIcon(exec.tool)}
                    <span className={cn(
                      exec.status === 'running' ? 'text-blue-300' :
                      exec.status === 'success' ? 'text-emerald-300' : 'text-red-300'
                    )}>
                      {exec.tool}
                    </span>
                  </div>
                  {exec.status === 'error' && typeof exec.result === 'string' && exec.result.includes('Permission denied') && (
                    <div className="flex items-center gap-2 text-xs text-amber-300">
                      <span>权限不足：{getToolPermissionLabel(exec.tool as any)}</span>
                      <button
                        onClick={() => handleGrantPermission(exec.tool)}
                        className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
                      >
                        申请权限
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {workingStatus && (
          <div className="flex justify-start">
            <div className="bg-blue-900/50 border border-blue-700 text-blue-300 rounded-lg px-4 py-2 flex items-center space-x-2">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="text-sm">{workingStatus}</span>
            </div>
          </div>
        )}
        {sending && !workingStatus && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 rounded-lg px-4 py-2 flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div 
        className={cn(
          "p-4 border-t border-slate-800 transition-colors",
          isDragOver && "bg-emerald-900/20 border-emerald-500"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachedFiles.map(file => (
              <div 
                key={file.id} 
                className="relative group bg-slate-800 rounded-lg p-2 flex items-center gap-2"
              >
                {file.preview ? (
                  <img src={file.preview} alt={file.name} className="w-12 h-12 object-cover rounded" />
                ) : (
                  <FileText className="h-8 w-8 text-slate-400" />
                )}
                <div className="text-xs">
                  <p className="text-slate-300 truncate max-w-[100px]">{file.name}</p>
                  <p className="text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Drop Zone Hint */}
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-900/50 z-10 pointer-events-none">
            <div className="text-emerald-300 flex items-center gap-2">
              <Upload className="h-6 w-6" />
              <span>Drop files here</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Type a command... (Ctrl+Enter to send, paste images, or drag files)"
              disabled={sending}
              rows={1}
              className={cn(
                "w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 pr-24 text-sm text-white placeholder:text-slate-500",
                "focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50",
                "resize-none overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600",
                isExpanded ? "min-h-[120px]" : "min-h-[44px]"
              )}
              style={{ maxHeight: isExpanded ? '300px' : '120px' }}
            />
            
            {/* Toolbar */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              {/* Expand/Collapse */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-white"
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>

              {/* Image Upload */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                className="h-7 w-7 p-0 text-slate-400 hover:text-white"
              >
                <Image className="h-4 w-4" />
              </Button>

              {/* File Upload */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 w-7 p-0 text-slate-400 hover:text-white"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              {/* Send Button */}
              <Button
                type="submit"
                disabled={(!input.trim() && attachedFiles.length === 0) || sending}
                size="sm"
                className="h-7 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {/* Hints */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Ctrl+Enter to send • Paste images • Drag & drop files</span>
            <span>{input.length} chars</span>
          </div>
        </form>
      </div>
    </div>
  );
}
