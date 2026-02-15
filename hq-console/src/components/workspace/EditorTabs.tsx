/**
 * Editor Tabs Component
 * 
 * 多标签页编辑器 - 支持打开多个文件
 */

'use client';

import { useState, useCallback } from 'react';
import { CodeEditor } from './CodeEditor';
import { X, Save, FileText } from 'lucide-react';

export interface EditorTab {
  id: string;
  filePath: string;
  filename: string;
  content: string;
  language: string;
  isDirty: boolean;
  isNew?: boolean;
}

interface EditorTabsProps {
  onSaveFile: (filePath: string, content: string) => Promise<void>;
  onSelectCode: (code: string) => void;
  initialTabs?: EditorTab[];
}

export function EditorTabs({ onSaveFile, onSelectCode, initialTabs = [] }: EditorTabsProps) {
  const [tabs, setTabs] = useState<EditorTab[]>(initialTabs);
  const [activeTabId, setActiveTabId] = useState<string | null>(
    initialTabs.length > 0 ? initialTabs[0].id : null
  );

  /**
   * 打开新文件 (如果已打开则激活)
   */
  const openFile = useCallback((filePath: string, content: string, language: string) => {
    const existingTab = tabs.find(t => t.filePath === filePath);
    
    if (existingTab) {
      // File already open, just activate it
      setActiveTabId(existingTab.id);
      return;
    }

    // Extract filename from path
    const filename = filePath.split('/').pop() || filePath;
    
    // Create new tab
    const newTab: EditorTab = {
      id: `tab-${Date.now()}-${Math.random()}`,
      filePath,
      filename,
      content,
      language,
      isDirty: false,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs]);

  /**
   * 关闭标签页
   */
  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      
      // If closing active tab, switch to adjacent tab
      if (activeTabId === tabId && newTabs.length > 0) {
        const closedIndex = prev.findIndex(t => t.id === tabId);
        const newActiveIndex = closedIndex > 0 ? closedIndex - 1 : 0;
        setActiveTabId(newTabs[newActiveIndex].id);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
      }
      
      return newTabs;
    });
  }, [activeTabId]);

  /**
   * 更新标签页内容
   */
  const updateTabContent = useCallback((tabId: string, content: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, content, isDirty: true }
        : tab
    ));
  }, []);

  /**
   * 保存标签页
   */
  const saveTab = useCallback(async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    try {
      await onSaveFile(tab.filePath, tab.content);
      
      // Mark as saved
      setTabs(prev => prev.map(t => 
        t.id === tabId ? { ...t, isDirty: false } : t
      ));
    } catch (error) {
      console.error('[EditorTabs] Failed to save:', error);
      alert('Failed to save file');
    }
  }, [tabs, onSaveFile]);

  /**
   * 保存所有标签页
   */
  const saveAll = useCallback(async () => {
    const dirtyTabs = tabs.filter(t => t.isDirty);
    
    for (const tab of dirtyTabs) {
      await saveTab(tab.id);
    }
  }, [tabs, saveTab]);

  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Tab bar */}
      <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center overflow-x-auto">
        <div className="flex items-center">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm border-r border-gray-700
                transition-colors min-w-[120px] max-w-[200px]
                ${tab.id === activeTabId 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
                }
              `}
            >
              <FileText className="h-3 w-3 flex-shrink-0" />
              <span className="truncate flex-1">{tab.filename}</span>
              {tab.isDirty && (
                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" title="Unsaved changes" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="p-0.5 hover:bg-gray-700 rounded flex-shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </button>
          ))}
        </div>
        
        {/* Save all button */}
        {tabs.some(t => t.isDirty) && (
          <button
            onClick={saveAll}
            className="ml-auto mr-2 px-3 py-1 text-xs text-blue-400 hover:text-blue-300 
                     flex items-center gap-1 hover:bg-gray-700 rounded"
            title="Save all modified files"
          >
            <Save className="h-3 w-3" />
            Save All
          </button>
        )}
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-hidden">
        {activeTab ? (
          <CodeEditor
            content={activeTab.content}
            language={activeTab.language}
            filePath={activeTab.filePath}
            onChange={(content) => updateTabContent(activeTab.id, content)}
            onSave={() => saveTab(activeTab.id)}
            onSelectCode={onSelectCode}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-900 text-gray-500">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No file open</p>
              <p className="text-xs mt-1 opacity-75">Click a file in the explorer to open it</p>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      {activeTab && (
        <div className="h-6 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs text-gray-500">
          <span>{activeTab.filePath}</span>
          <span className="ml-auto">
            {tabs.filter(t => t.isDirty).length > 0 && (
              <span className="text-blue-400">
                {tabs.filter(t => t.isDirty).length} unsaved
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage editor tabs from parent component
 */
export function useEditorTabs() {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const openFile = useCallback((filePath: string, content: string, language: string) => {
    const existingTab = tabs.find(t => t.filePath === filePath);
    
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return existingTab.id;
    }

    const filename = filePath.split('/').pop() || filePath;
    const newTab: EditorTab = {
      id: `tab-${Date.now()}-${Math.random()}`,
      filePath,
      filename,
      content,
      language,
      isDirty: false,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    return newTab.id;
  }, [tabs]);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      
      if (activeTabId === tabId && newTabs.length > 0) {
        const closedIndex = prev.findIndex(t => t.id === tabId);
        const newActiveIndex = closedIndex > 0 ? closedIndex - 1 : 0;
        setActiveTabId(newTabs[newActiveIndex].id);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
      }
      
      return newTabs;
    });
  }, [activeTabId]);

  const updateTab = useCallback((tabId: string, updates: Partial<EditorTab>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, ...updates } : tab
    ));
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId);

  return {
    tabs,
    activeTabId,
    activeTab,
    openFile,
    closeTab,
    updateTab,
    setActiveTabId,
  };
}
