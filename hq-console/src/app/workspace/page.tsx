/**
 * Workspace IDE Page
 * 
 * IDE 工作区页面 - 文件浏览器、编辑器、Agent 聊天、实时状态面板
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  WorkspaceLayout, 
  FileExplorer, 
  CodeEditor, 
  AgentChat, 
  WorkspaceSelector,
  WorkspaceStatusPanel,
  useWorkspaceStatus,
} from '@/components/workspace';
import { AgentActivity, useAgentActivity, Activity } from '@/components/workspace/AgentActivity';
import { hqApi } from '@/lib/api';
import { ToolExecutionCallback } from '@/components/workspace/AgentChat';

interface Workspace {
  id: string;
  name: string;
  rootPath: string;
  description?: string;
  type?: string;
}

interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
}

export default function WorkspacePage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFile, setActiveFile] = useState<OpenFile | null>(null);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // 使用工作区状态 Hook
  const workspaceStatus = useWorkspaceStatus();
  const agentActivity = useAgentActivity();
  
  // 工具执行回调
  const toolCallbacks: ToolExecutionCallback = {
    onFileChange: (change) => {
      workspaceStatus.addFileChange(change);
    },
    onTerminalOutput: (output) => {
      workspaceStatus.addTerminalOutput(output);
    },
    onActivityChange: (activity) => {
      if (activity.status === 'running') {
        if (activity.type === 'thinking') {
          agentActivity.startThinking();
        }
        agentActivity.addActivity(activity.type as any, activity.description);
      } else {
        agentActivity.stopThinking();
        // 找到最后一个 running 状态的活动并完成它
        const lastRunning = agentActivity.activities.find(a => a.status === 'running');
        if (lastRunning) {
          agentActivity.completeActivity(lastRunning.id, activity.status === 'completed');
        }
      }
    },
  };

  // 加载工作区列表
  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const data = await hqApi.getWorkspaces();
      setWorkspaces(data);
      if (data.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(data[0]);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  // 切换工作区
  const handleSwitchWorkspace = useCallback(async (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    setOpenFiles([]);
    setActiveFile(null);
  }, []);

  // 创建工作区
  const handleCreateWorkspace = useCallback(async (name: string, rootPath: string) => {
    try {
      const workspace = await hqApi.createWorkspace({ name, rootPath });
      setWorkspaces(prev => [...prev, workspace]);
      setCurrentWorkspace(workspace);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  }, []);

  // 打开文件
  const handleOpenFile = useCallback(async (filePath: string) => {
    if (!currentWorkspace) return;

    // 检查是否已打开
    const existing = openFiles.find(f => f.path === filePath);
    if (existing) {
      setActiveFile(existing);
      return;
    }

    try {
      const data = await hqApi.readFile(currentWorkspace.id, filePath);
      const newFile: OpenFile = {
        path: filePath,
        name: data.fileName,
        content: data.content,
        language: data.language,
        isDirty: false,
      };
      setOpenFiles(prev => [...prev, newFile]);
      setActiveFile(newFile);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }, [currentWorkspace, openFiles]);

  // 关闭文件
  const handleCloseFile = useCallback((filePath: string) => {
    setOpenFiles(prev => prev.filter(f => f.path !== filePath));
    if (activeFile?.path === filePath) {
      setActiveFile(openFiles.find(f => f.path !== filePath) || null);
    }
  }, [activeFile, openFiles]);

  // 保存文件
  const handleSaveFile = useCallback(async (filePath: string, content: string) => {
    if (!currentWorkspace) return;

    try {
      await hqApi.saveFile(currentWorkspace.id, filePath, content);
      setOpenFiles(prev =>
        prev.map(f =>
          f.path === filePath ? { ...f, content, isDirty: false } : f
        )
      );
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  }, [currentWorkspace]);

  // 文件内容变更
  const handleContentChange = useCallback((filePath: string, content: string) => {
    setOpenFiles(prev =>
      prev.map(f =>
        f.path === filePath ? { ...f, content, isDirty: true } : f
      )
    );
    if (activeFile?.path === filePath) {
      setActiveFile(prev => prev ? { ...prev, content, isDirty: true } : null);
    }
  }, [activeFile]);

  // 选择代码
  const handleSelectCode = useCallback((code: string) => {
    setSelectedCode(code);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white">Loading Workspace IDE...</div>
      </div>
    );
  }

  return (
    <WorkspaceLayout>
      {/* 顶部工具栏 */}
      <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center px-4">
        <WorkspaceSelector
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          onSelect={handleSwitchWorkspace}
          onCreate={handleCreateWorkspace}
        />
        <div className="flex-1" />
        <div className="text-sm text-gray-400">
          HQ Workspace IDE
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧: 文件浏览器 + Agent 状态面板 */}
        <div className="w-72 bg-gray-900 border-r border-gray-700 flex flex-col">
          {/* 文件浏览器 */}
          <div className="flex-1 overflow-auto border-b border-gray-700">
            {currentWorkspace ? (
              <FileExplorer
                workspaceId={currentWorkspace.id}
                onFileSelect={handleOpenFile}
              />
            ) : (
              <div className="p-4 text-gray-500 text-sm">
                Select or create a workspace
              </div>
            )}
          </div>
          
          {/* Agent 活动状态 */}
          {(agentActivity.isThinking || agentActivity.activities.length > 0) && (
            <div className="p-3 border-b border-gray-700">
              <div className="text-xs text-gray-500 uppercase font-medium mb-2">Agent 状态</div>
              <AgentActivity 
                activities={agentActivity.activities}
                isThinking={agentActivity.isThinking}
                thinkingDuration={agentActivity.thinkingDuration}
              />
            </div>
          )}
          
          {/* 文件/终端状态面板 */}
          <div className="h-64 flex-shrink-0">
            <WorkspaceStatusPanel
              fileChanges={workspaceStatus.fileChanges}
              terminalOutputs={workspaceStatus.terminalOutputs}
              onFileClick={handleOpenFile}
              onClearFiles={workspaceStatus.clearFileChanges}
              onClearTerminal={workspaceStatus.clearTerminalOutputs}
            />
          </div>
        </div>

        {/* 中间: 代码编辑器 */}
        <div className="flex-1 flex flex-col">
          {/* 文件标签 */}
          <div className="h-10 bg-gray-800 flex items-center overflow-x-auto">
            {openFiles.map(file => (
              <div
                key={file.path}
                className={`flex items-center px-3 h-full cursor-pointer border-r border-gray-700 ${
                  activeFile?.path === file.path
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
                onClick={() => setActiveFile(file)}
              >
                <span className="text-sm truncate max-w-[150px]">
                  {file.isDirty && '• '}
                  {file.name}
                </span>
                <button
                  className="ml-2 text-gray-500 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseFile(file.path);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* 编辑器 */}
          <div className="flex-1">
            {activeFile ? (
              <CodeEditor
                content={activeFile.content}
                language={activeFile.language}
                onChange={(content: string) => handleContentChange(activeFile.path, content)}
                onSave={() => handleSaveFile(activeFile.path, activeFile.content)}
                onSelectCode={handleSelectCode}
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-900 text-gray-500">
                Select a file to edit
              </div>
            )}
          </div>
        </div>

        {/* 右侧: Agent 聊天 */}
        <div className="w-96 bg-gray-900 border-l border-gray-700">
          {currentWorkspace && (
            <AgentChat
              workspaceId={currentWorkspace.id}
              currentFile={activeFile?.path}
              selectedCode={selectedCode}
              onOpenFile={handleOpenFile}
              callbacks={toolCallbacks}
            />
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
