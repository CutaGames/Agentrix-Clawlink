/**
 * Code Editor Component
 * 
 * Monaco Editor 集成 - 语法高亮、代码折叠、自动补全、多语言支持
 */

'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Monaco
const Editor = dynamic(() => import('@monaco-editor/react').then(mod => mod.default), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-900 text-gray-500">
      <div className="text-center">
        <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
        <span className="text-sm">Loading editor...</span>
      </div>
    </div>
  ),
});

// Map file extensions to Monaco language identifiers
function getMonacoLanguage(language: string): string {
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    typescript: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    javascript: 'javascript',
    json: 'json',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    md: 'markdown',
    markdown: 'markdown',
    py: 'python',
    python: 'python',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    shell: 'shell',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    go: 'go',
    rust: 'rust',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    'c++': 'cpp',
    dockerfile: 'dockerfile',
    graphql: 'graphql',
    plaintext: 'plaintext',
    text: 'plaintext',
    txt: 'plaintext',
  };
  return map[language.toLowerCase()] || 'plaintext';
}

interface CodeEditorProps {
  content: string;
  language: string;
  onChange: (content: string) => void;
  onSave: () => void;
  onSelectCode: (code: string) => void;
  readOnly?: boolean;
  filePath?: string;
}

export function CodeEditor({
  content,
  language,
  onChange,
  onSave,
  onSelectCode,
  readOnly = false,
  filePath,
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const [cursorInfo, setCursorInfo] = useState({ line: 1, column: 1 });
  const [lineCount, setLineCount] = useState(1);

  const monacoLanguage = getMonacoLanguage(language);

  // Handle editor mount
  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;

    // Ctrl+S / Cmd+S save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave();
    });

    // Track cursor position
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorInfo({ line: e.position.lineNumber, column: e.position.column });
    });

    // Track selections for "send to chat"
    editor.onDidChangeCursorSelection((e: any) => {
      const selection = editor.getModel()?.getValueInRange(e.selection);
      if (selection) {
        onSelectCode(selection);
      }
    });

    // Update line count
    const updateLineCount = () => setLineCount(editor.getModel()?.getLineCount() || 1);
    updateLineCount();
    editor.onDidChangeModelContent(updateLineCount);

    // Focus editor
    editor.focus();
  }, [onSave, onSelectCode]);

  // Update line count when content changes externally
  useEffect(() => {
    setLineCount(content.split('\n').length);
  }, [content]);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Editor header */}
      <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center px-4 justify-between">
        <span className="text-xs text-gray-500">
          {monacoLanguage.toUpperCase()}
          {filePath && <span className="ml-2 text-gray-600">— {filePath}</span>}
        </span>
        <button
          onClick={onSave}
          className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700"
        >
          Save (Ctrl+S)
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={monacoLanguage}
          value={content}
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
            fontLigatures: true,
            minimap: { enabled: true, maxColumn: 80 },
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoIndent: 'full',
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'mouseover',
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            lineNumbers: 'on',
            glyphMargin: false,
            readOnly,
            domReadOnly: readOnly,
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>

      {/* Status bar */}
      <div className="h-6 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs text-gray-500">
        <span>Ln {cursorInfo.line}, Col {cursorInfo.column}</span>
        <span className="mx-4">|</span>
        <span>{lineCount} lines</span>
        <span className="mx-4">|</span>
        <span>{content.length} chars</span>
        <span className="ml-auto">{monacoLanguage}</span>
      </div>
    </div>
  );
}
