/**
 * Chat Input Component
 * 
 * 输入区域 - 文本框、附件、拖放、粘贴、工具栏
 * 从 AgentChat.tsx 拆分
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Image, X, Upload, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import type { AttachedFile } from './ChatMessage';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onClear: () => void;
  loading: boolean;
  messageCount: number;
  agentName: string;
  attachedFiles: AttachedFile[];
  onFilesAttach: (files: AttachedFile[]) => void;
  onFileRemove: (id: string) => void;
}

export function ChatInput({
  input,
  onInputChange,
  onSend,
  onStop,
  onClear,
  loading,
  messageCount,
  agentName,
  attachedFiles,
  onFilesAttach,
  onFileRemove,
}: ChatInputProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, isExpanded ? 200 : 100);
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
        const reader = new FileReader();
        const previewPromise = new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
        });
        reader.readAsDataURL(file);
        const preview = await previewPromise;
        newFiles.push({ id, name: file.name, type: file.type, size: file.size, preview });
      } else {
        const content = await file.text();
        newFiles.push({
          id,
          name: file.name,
          type: file.type,
          size: file.size,
          content: content.slice(0, 50000),
        });
      }
    }

    onFilesAttach(newFiles);
  }, [onFilesAttach]);

  // Drag and drop
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

  // Paste images
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

  // Keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div
      className="relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-900/50 z-50 flex items-center justify-center rounded-lg">
          <div className="text-blue-300 flex items-center gap-2">
            <Upload className="h-8 w-8" />
            <span className="text-lg">Drop files here</span>
          </div>
        </div>
      )}

      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="border-t border-gray-700 bg-gray-800/50 p-2">
          <div className="flex flex-wrap gap-2">
            {attachedFiles.map(file => (
              <div key={file.id} className="bg-gray-700 rounded px-2 py-1 flex items-center gap-2 text-xs">
                {file.preview ? (
                  <img src={file.preview} alt={file.name} className="h-6 w-6 object-cover rounded" />
                ) : (
                  <span className="text-gray-400">📄</span>
                )}
                <span className="truncate max-w-[100px] text-gray-300">{file.name}</span>
                <button
                  onClick={() => onFileRemove(file.id)}
                  className="text-gray-500 hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="*/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Input area */}
      <div className="border-t border-gray-700 p-3 bg-gray-800">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => imageInputRef.current?.click()}
              className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200 transition-colors"
              title="Add image (or paste)"
            >
              <Image className="h-4 w-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200 transition-colors"
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200 transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{input.length} chars</span>
            <button
              onClick={onClear}
              disabled={messageCount === 0}
              className="text-xs text-gray-500 hover:text-gray-300 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={`Ask ${agentName}... (Ctrl+Enter to send)`}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none transition-colors"
            style={{ minHeight: isExpanded ? '80px' : '40px' }}
            disabled={loading}
          />
          {loading ? (
            <button
              onClick={onStop}
              className="bg-red-600 hover:bg-red-700 text-white px-4 rounded-lg transition-colors flex items-center justify-center"
              title="停止生成"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!input.trim() && attachedFiles.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
