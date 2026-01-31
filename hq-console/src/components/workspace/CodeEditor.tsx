/**
 * Code Editor Component
 * 
 * 使用简单的 textarea 作为基础编辑器
 * 可以后续替换为 Monaco Editor
 */

'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

interface CodeEditorProps {
  content: string;
  language: string;
  onChange: (content: string) => void;
  onSave: () => void;
  onSelectCode: (code: string) => void;
}

export function CodeEditor({
  content,
  language,
  onChange,
  onSave,
  onSelectCode,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineCount, setLineCount] = useState(1);
  const [cursorInfo, setCursorInfo] = useState({ line: 1, column: 1 });

  // 更新行数
  useEffect(() => {
    const lines = content.split('\n').length;
    setLineCount(lines);
  }, [content]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  // 处理选择变化
  const handleSelect = useCallback(() => {
    if (!textareaRef.current) return;
    
    const { selectionStart, selectionEnd, value } = textareaRef.current;
    if (selectionStart !== selectionEnd) {
      const selectedText = value.substring(selectionStart, selectionEnd);
      onSelectCode(selectedText);
    }
  }, [onSelectCode]);

  // 更新光标位置
  const updateCursorInfo = useCallback(() => {
    if (!textareaRef.current) return;
    
    const { selectionStart, value } = textareaRef.current;
    const textBeforeCursor = value.substring(0, selectionStart);
    const lines = textBeforeCursor.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    
    setCursorInfo({ line, column });
  }, []);

  // 处理 Tab 键
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart, selectionEnd, value } = e.currentTarget;
      const newValue = value.substring(0, selectionStart) + '  ' + value.substring(selectionEnd);
      onChange(newValue);
      
      // 移动光标
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = selectionStart + 2;
          textareaRef.current.selectionEnd = selectionStart + 2;
        }
      }, 0);
    }
  }, [onChange]);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* 编辑器头部 */}
      <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center px-4 justify-between">
        <span className="text-xs text-gray-500">
          {language.toUpperCase()}
        </span>
        <button
          onClick={onSave}
          className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700"
        >
          Save (Ctrl+S)
        </button>
      </div>

      {/* 编辑器主体 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 行号 */}
        <div className="w-12 bg-gray-800 text-right pr-2 py-2 text-xs text-gray-600 select-none overflow-hidden font-mono">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} className="h-5 leading-5">
              {i + 1}
            </div>
          ))}
        </div>

        {/* 代码区域 */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          onClick={updateCursorInfo}
          onKeyUp={updateCursorInfo}
          className="flex-1 bg-gray-900 text-gray-100 font-mono text-sm p-2 resize-none outline-none leading-5"
          spellCheck={false}
          style={{
            tabSize: 2,
          }}
        />
      </div>

      {/* 状态栏 */}
      <div className="h-6 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs text-gray-500">
        <span>Ln {cursorInfo.line}, Col {cursorInfo.column}</span>
        <span className="mx-4">|</span>
        <span>{lineCount} lines</span>
        <span className="mx-4">|</span>
        <span>{content.length} chars</span>
        <span className="ml-auto">{language}</span>
      </div>
    </div>
  );
}
