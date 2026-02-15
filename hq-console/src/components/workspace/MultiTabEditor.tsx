/**
 * Multi-Tab Editor Component
 * 
 * Monaco Editor with tab support
 */

import React, { useState, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';

export interface EditorTab {
  id: string;
  path: string;
  content: string;
  language: string;
  modified: boolean;
}

export interface MultiTabEditorProps {
  tabs: EditorTab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabCreate: () => void;
  onContentChange: (tabId: string, content: string) => void;
  onSave: (tabId: string) => void;
  onSelectCode?: (code: string) => void;
}

export const MultiTabEditor: React.FC<MultiTabEditorProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onTabCreate,
  onContentChange,
  onSave,
  onSelectCode,
}) => {
  const activeTab = tabs.find(t => t.id === activeTabId);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined && activeTabId) {
      onContentChange(activeTabId, value);
    }
  }, [activeTabId, onContentChange]);

  const handleSave = useCallback(() => {
    if (activeTabId) {
      onSave(activeTabId);
    }
  }, [activeTabId, onSave]);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Tab Bar */}
      <div className="flex items-center bg-gray-800 border-b border-gray-700 overflow-x-auto">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`
              flex items-center gap-2 px-4 py-2 border-r border-gray-700 cursor-pointer
              hover:bg-gray-700 transition-colors min-w-fit
              ${activeTabId === tab.id ? 'bg-gray-900 text-white' : 'text-gray-400'}
            `}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="text-sm">
              {tab.path.split('/').pop() || 'untitled'}
              {tab.modified && <span className="ml-1 text-blue-400">*</span>}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="hover:bg-gray-600 rounded p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <button
          onClick={onTabCreate}
          className="p-2 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          title="New Tab"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1">
        {activeTab ? (
          <MonacoEditor
            height="100%"
            language={activeTab.language}
            value={activeTab.content}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              rulers: [80, 120],
              wordWrap: 'off',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              folding: true,
              renderWhitespace: 'selection',
              tabSize: 2,
            }}
            onMount={(editor, monaco) => {
              // Ctrl+S to save
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, handleSave);

              if (onSelectCode) {
                editor.onDidChangeCursorSelection(() => {
                  const selection = editor.getSelection();
                  if (!selection || selection.isEmpty()) return;
                  const model = editor.getModel();
                  if (!model) return;
                  const selectedText = model.getValueInRange(selection);
                  if (selectedText?.trim()) {
                    onSelectCode(selectedText);
                  }
                });
              }
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No file open. Click + to create a new file.
          </div>
        )}
      </div>
    </div>
  );
};
