/**
 * Workspace IDE Page
 * 
 * IDE 工作区页面 - 文件浏览器、编辑器、Agent 聊天、实时状态面板
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  WorkspaceLayout, 
  FileExplorer, 
  MultiTabEditor,
  AgentChat, 
  WorkspaceSelector,
  WorkspaceStatusPanel,
  useWorkspaceStatus,
  IntegratedTerminal,
} from '@/components/workspace';
import { AgentActivity, useAgentActivity, Activity } from '@/components/workspace/AgentActivity';
import { hqApi } from '@/lib/api';
import { readFile, writeFile } from '@/lib/tools';
import { ToolExecutionCallback } from '@/components/workspace/AgentChat';
import { useHqWebSocket } from '@/hooks/useHqWebSocket';

interface Workspace {
  id: string;
  name: string;
  rootPath: string;
  description?: string;
  type?: string;
  isLocal?: boolean;
}

interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
}

export default function WorkspacePage() {
  const apiBase = process.env.NEXT_PUBLIC_HQ_API_URL || process.env.NEXT_PUBLIC_HQ_URL || '';
  const isCloudBackend = apiBase && !apiBase.includes('localhost') && !apiBase.includes('127.0.0.1');
  const defaultLocalRoot = process.env.NEXT_PUBLIC_WORKSPACE_ROOT || '/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website';
  const defaultCloudRoot = '/home/ubuntu/Agentrix-independent-HQ';
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFile, setActiveFile] = useState<OpenFile | null>(null);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(420);
  const [dragging, setDragging] = useState<'left' | 'right' | 'bottom' | null>(null);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(260);
  const [bottomPanelTab, setBottomPanelTab] = useState<'terminal' | 'files' | 'activity'>('terminal');
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const wsState = useHqWebSocket();
  
  // 使用工作区状态 Hook
  const workspaceStatus = useWorkspaceStatus();
  const agentActivity = useAgentActivity();
  
  // 工具执行回调
  const toolCallbacks: ToolExecutionCallback = {
    onFileChange: (change) => {
      workspaceStatus.addFileChange(change);
      // Auto-show bottom panel on file changes
      if (!showBottomPanel) setShowBottomPanel(true);
      setBottomPanelTab('files');
    },
    onTerminalOutput: (output) => {
      workspaceStatus.addTerminalOutput(output);
      // Auto-show bottom panel on terminal output
      if (!showBottomPanel) setShowBottomPanel(true);
      setBottomPanelTab('terminal');
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

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (event: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const effectiveLeft = showLeftSidebar ? leftWidth : 0;
      const minLeft = 180;
      const minRight = 280;
      const minCenter = 320;

      if (dragging === 'left') {
        const proposed = event.clientX - rect.left;
        const maxLeft = rect.width - rightWidth - minCenter;
        setLeftWidth(Math.max(minLeft, Math.min(maxLeft, proposed)));
      }

      if (dragging === 'right') {
        const proposed = rect.right - event.clientX;
        const maxRight = rect.width - effectiveLeft - minCenter;
        setRightWidth(Math.max(minRight, Math.min(maxRight, proposed)));
      }

      if (dragging === 'bottom' && centerRef.current) {
        const centerRect = centerRef.current.getBoundingClientRect();
        const proposed = centerRect.bottom - event.clientY;
        const minBottom = 120;
        const maxBottom = centerRect.height - 120;
        setBottomPanelHeight(Math.max(minBottom, Math.min(maxBottom, proposed)));
      }
    };

    const handleUp = () => setDragging(null);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, leftWidth, rightWidth, showLeftSidebar]);

  useEffect(() => {
    if (!currentWorkspace || typeof window === 'undefined') return;
    if (!currentWorkspace.isLocal || !currentWorkspace.rootPath?.startsWith('local://')) return;
    const handle = (window as any)?.__hqLocalWorkspaceHandles?.[currentWorkspace.id];
    if (handle) return;

    const fallbackWorkspace: Workspace = {
      id: `local:${Date.now()}`,
      name: 'Local Workspace',
      rootPath: defaultLocalRoot,
      type: 'local',
      isLocal: true,
    };
    const existing = loadLocalWorkspaces();
    const updated = [fallbackWorkspace, ...existing.filter(ws => ws.rootPath !== defaultLocalRoot)];
    saveLocalWorkspaces(updated.map(ws => ({ ...ws, isLocal: undefined })));
    setWorkspaces(prev => [fallbackWorkspace, ...prev.filter(ws => ws.id !== currentWorkspace.id)]);
    setCurrentWorkspace(fallbackWorkspace);
  }, [currentWorkspace, defaultLocalRoot]);

  const loadLocalWorkspaces = (): Workspace[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('hq_local_workspaces');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Workspace[];
      return parsed.map(ws => ({ ...ws, isLocal: true }));
    } catch {
      return [];
    }
  };

  const saveLocalWorkspaces = (items: Workspace[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('hq_local_workspaces', JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const isLocalPath = (inputPath: string) => {
    return inputPath.startsWith('local://') || /^([A-Za-z]:\\|\/mnt\/)/.test(inputPath);
  };

  const loadWorkspaces = async () => {
    try {
      const data = await hqApi.getWorkspaces();
      const normalizedRemote = data.map(ws => ({
        ...ws,
        isLocal: isLocalPath(ws.rootPath),
      }));
      const localWorkspaces = loadLocalWorkspaces();
      const merged = [...localWorkspaces, ...normalizedRemote];
      setWorkspaces(merged);
      if (merged.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(merged[0]);
        return;
      }

      if (merged.length === 0) {
        if (isCloudBackend) {
          const workspace = await hqApi.createWorkspace({
            name: 'HQ Default Workspace',
            rootPath: defaultCloudRoot,
            description: 'Auto-created default workspace',
          });
          const next = { ...workspace, isLocal: false };
          setWorkspaces([next]);
          setCurrentWorkspace(next);
        } else {
          const localWorkspace: Workspace = {
            id: `local:${Date.now()}`,
            name: 'Local Workspace',
            rootPath: defaultLocalRoot,
            type: 'local',
            isLocal: true,
          };
          const updated = [localWorkspace, ...localWorkspaces.filter(ws => ws.rootPath !== defaultLocalRoot)];
          saveLocalWorkspaces(updated.map(ws => ({ ...ws, isLocal: undefined })));
          setWorkspaces([localWorkspace]);
          setCurrentWorkspace(localWorkspace);
        }
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      const localWorkspaces = loadLocalWorkspaces();
      setWorkspaces(localWorkspaces);
      if (localWorkspaces.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(localWorkspaces[0]);
      } else if (localWorkspaces.length === 0 && !isCloudBackend) {
        const localWorkspace: Workspace = {
          id: `local:${Date.now()}`,
          name: 'Local Workspace',
          rootPath: defaultLocalRoot,
          type: 'local',
          isLocal: true,
        };
        saveLocalWorkspaces([{ ...localWorkspace, isLocal: undefined }]);
        setWorkspaces([localWorkspace]);
        setCurrentWorkspace(localWorkspace);
      }
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
      if ((isCloudBackend && isLocalPath(rootPath)) || rootPath.startsWith('local://')) {
        const localWorkspace: Workspace = {
          id: rootPath.startsWith('local://') ? rootPath.replace('local://', '') : `local:${Date.now()}`,
          name,
          rootPath,
          type: 'local',
          isLocal: true,
        };
        const existing = loadLocalWorkspaces();
        const updated = [localWorkspace, ...existing.filter(ws => ws.rootPath !== rootPath)];
        saveLocalWorkspaces(updated.map(ws => ({ ...ws, isLocal: undefined })));
        setWorkspaces(prev => [localWorkspace, ...prev]);
        setCurrentWorkspace(localWorkspace);
        return;
      }

      const workspace = await hqApi.createWorkspace({ name, rootPath });
      setWorkspaces(prev => [...prev, workspace]);
      setCurrentWorkspace(workspace);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  }, [isCloudBackend]);

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
      if (currentWorkspace.isLocal) {
        if (currentWorkspace.rootPath.startsWith('local://')) {
          const localHandle = (window as any)?.__hqLocalWorkspaceHandles?.[currentWorkspace.id];
          if (localHandle) {
            const fileHandle = await getFileHandle(localHandle, filePath);
            const file = await fileHandle.getFile();
            const content = await file.text();
            const newFile: OpenFile = {
              path: filePath,
              name: file.name,
              content,
              language: file.name.split('.').pop() || 'plaintext',
              isDirty: false,
            };
            setOpenFiles(prev => [...prev, newFile]);
            setActiveFile(newFile);
            return;
          }
        }

        const data = await readFile(filePath);
        const newFile: OpenFile = {
          path: filePath,
          name: data.filePath.split('/').pop() || filePath,
          content: data.content,
          language: data.language || 'plaintext',
          isDirty: false,
        };
        setOpenFiles(prev => [...prev, newFile]);
        setActiveFile(newFile);
        return;
      }

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
      if (currentWorkspace.isLocal) {
        if (currentWorkspace.rootPath.startsWith('local://')) {
          const localHandle = (window as any)?.__hqLocalWorkspaceHandles?.[currentWorkspace.id];
          if (localHandle) {
            const fileHandle = await getFileHandle(localHandle, filePath, true);
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
          }
        } else {
          await writeFile(filePath, content);
        }
      } else {
        await hqApi.saveFile(currentWorkspace.id, filePath, content);
      }
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

  const createUntitledPath = useCallback(() => {
    const fileName = `untitled-${Date.now()}.md`;
    if (!currentWorkspace) return fileName;
    if (currentWorkspace.isLocal && currentWorkspace.rootPath.startsWith('local://')) {
      return fileName;
    }
    const root = currentWorkspace.rootPath?.replace(/\\/g, '/').replace(/\/+$/, '') || '';
    return root ? `${root}/${fileName}` : fileName;
  }, [currentWorkspace]);

  const handleCreateTab = useCallback(() => {
    if (!currentWorkspace) return;
    const filePath = createUntitledPath();
    const newFile: OpenFile = {
      path: filePath,
      name: filePath.split('/').pop() || filePath,
      content: '',
      language: 'markdown',
      isDirty: true,
    };
    setOpenFiles(prev => [...prev, newFile]);
    setActiveFile(newFile);
  }, [createUntitledPath, currentWorkspace]);

  const handleTabChange = useCallback((tabId: string) => {
    const next = openFiles.find(f => f.path === tabId) || null;
    setActiveFile(next);
  }, [openFiles]);

  const handleTabSave = useCallback((tabId: string) => {
    const file = openFiles.find(f => f.path === tabId);
    if (file) {
      handleSaveFile(file.path, file.content);
    }
  }, [openFiles, handleSaveFile]);

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
      <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-3 gap-2 select-none">
        {/* Toggle left sidebar */}
        <button
          className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          onClick={() => setShowLeftSidebar(prev => !prev)}
          title={showLeftSidebar ? 'Hide Explorer' : 'Show Explorer'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>

        <WorkspaceSelector
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          onSelect={handleSwitchWorkspace}
          onCreate={handleCreateWorkspace}
        />
        <div className="flex-1" />

        {/* Bottom panel toggle buttons */}
        <div className="flex items-center gap-1 mr-2">
          <button
            className={`px-2 py-1 text-xs rounded transition-colors ${
              showBottomPanel && bottomPanelTab === 'terminal'
                ? 'bg-gray-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            onClick={() => {
              if (showBottomPanel && bottomPanelTab === 'terminal') {
                setShowBottomPanel(false);
              } else {
                setShowBottomPanel(true);
                setBottomPanelTab('terminal');
              }
            }}
          >
            Terminal
          </button>
          <button
            className={`px-2 py-1 text-xs rounded transition-colors ${
              showBottomPanel && bottomPanelTab === 'files'
                ? 'bg-gray-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            onClick={() => {
              if (showBottomPanel && bottomPanelTab === 'files') {
                setShowBottomPanel(false);
              } else {
                setShowBottomPanel(true);
                setBottomPanelTab('files');
              }
            }}
          >
            Files {workspaceStatus.fileChanges.length > 0 && (
              <span className="ml-1 bg-blue-500 text-white text-[10px] px-1 py-0.5 rounded-full">
                {workspaceStatus.fileChanges.length}
              </span>
            )}
          </button>
          <button
            className={`px-2 py-1 text-xs rounded transition-colors ${
              showBottomPanel && bottomPanelTab === 'activity'
                ? 'bg-gray-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            onClick={() => {
              if (showBottomPanel && bottomPanelTab === 'activity') {
                setShowBottomPanel(false);
              } else {
                setShowBottomPanel(true);
                setBottomPanelTab('activity');
              }
            }}
          >
            Activity {agentActivity.isThinking && (
              <span className="ml-1 inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            )}
          </button>
        </div>

        <div className="mr-2 flex items-center gap-1.5 text-xs text-gray-400">
          <span
            className={`h-2 w-2 rounded-full ${wsState.connected ? 'bg-emerald-400' : wsState.connecting ? 'bg-yellow-400' : 'bg-red-400'}`}
            title={wsState.connected ? 'WebSocket connected' : wsState.connecting ? 'WebSocket connecting' : wsState.error || 'WebSocket disconnected'}
          />
          <span>{wsState.connected ? 'WS Connected' : wsState.connecting ? 'WS Connecting' : 'WS Disconnected'}</span>
        </div>
        <div className="text-xs text-gray-500">
          HQ Workspace IDE
        </div>
      </div>

      {/* 主内容区 */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden" style={{ userSelect: dragging ? 'none' : 'auto' }}>
        {/* 左侧: 文件浏览器 (collapsible) */}
        {showLeftSidebar && (
          <>
            <div
              className="bg-slate-950 border-r border-slate-700/80 flex flex-col overflow-hidden"
              style={{ width: leftWidth }}
            >
              <div className="flex-1 overflow-auto">
                {currentWorkspace ? (
                  <FileExplorer
                    workspaceId={currentWorkspace.id}
                    workspaceRootPath={currentWorkspace.rootPath}
                    isLocal={currentWorkspace.isLocal}
                    onFileSelect={handleOpenFile}
                  />
                ) : (
                  <div className="p-4 text-gray-500 text-sm">
                    Select or create a workspace
                  </div>
                )}
              </div>
            </div>

            {/* 拖拽分隔条 (左) */}
            <div
              className="w-1 bg-slate-800 hover:bg-emerald-400/70 cursor-col-resize flex-shrink-0"
              onMouseDown={() => setDragging('left')}
              onDoubleClick={() => setLeftWidth(240)}
            />
          </>
        )}

        {/* 中间: 代码编辑器 + 底部面板 */}
        <div ref={centerRef} className="flex-1 flex flex-col bg-slate-950 min-w-0">
          {/* 编辑器区域 */}
          <div className="flex-1 min-h-0">
            <MultiTabEditor
              tabs={openFiles.map(file => ({
                id: file.path,
                path: file.path,
                content: file.content,
                language: file.language,
                modified: file.isDirty,
              }))}
              activeTabId={activeFile?.path || ''}
              onTabChange={handleTabChange}
              onTabClose={handleCloseFile}
              onTabCreate={handleCreateTab}
              onContentChange={handleContentChange}
              onSave={handleTabSave}
              onSelectCode={handleSelectCode}
            />
          </div>

          {/* 底部面板 (resizable, collapsible) */}
          {showBottomPanel && (
            <>
              {/* 垂直拖拽分隔条 */}
              <div
                className="h-1 bg-slate-800 hover:bg-emerald-400/70 cursor-row-resize flex-shrink-0"
                onMouseDown={() => setDragging('bottom')}
                onDoubleClick={() => setBottomPanelHeight(260)}
              />

              <div
                className="flex flex-col bg-slate-950 overflow-hidden flex-shrink-0"
                style={{ height: bottomPanelHeight }}
              >
                {/* 底部面板标签栏 */}
                <div className="flex items-center border-b border-slate-700/80 bg-slate-900/80 px-1 h-8 flex-shrink-0">
                  <button
                    className={`px-3 py-1 text-xs font-medium rounded-t transition-colors ${
                      bottomPanelTab === 'terminal'
                        ? 'text-white bg-slate-800 border-b-2 border-emerald-500'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    onClick={() => setBottomPanelTab('terminal')}
                  >
                    Terminal {workspaceStatus.terminalOutputs.length > 0 && (
                      <span className="ml-1 bg-green-600 text-white text-[10px] px-1 rounded-full">
                        {workspaceStatus.terminalOutputs.length}
                      </span>
                    )}
                  </button>
                  <button
                    className={`px-3 py-1 text-xs font-medium rounded-t transition-colors ${
                      bottomPanelTab === 'files'
                        ? 'text-white bg-slate-800 border-b-2 border-blue-500'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    onClick={() => setBottomPanelTab('files')}
                  >
                    Files {workspaceStatus.fileChanges.length > 0 && (
                      <span className="ml-1 bg-blue-600 text-white text-[10px] px-1 rounded-full">
                        {workspaceStatus.fileChanges.length}
                      </span>
                    )}
                  </button>
                  <button
                    className={`px-3 py-1 text-xs font-medium rounded-t transition-colors ${
                      bottomPanelTab === 'activity'
                        ? 'text-white bg-slate-800 border-b-2 border-amber-500'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    onClick={() => setBottomPanelTab('activity')}
                  >
                    Activity {agentActivity.isThinking && (
                      <span className="ml-1 inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    )}
                  </button>
                  <div className="flex-1" />
                  <button
                    className="p-1 text-gray-500 hover:text-white hover:bg-gray-700 rounded"
                    onClick={() => setShowBottomPanel(false)}
                    title="Close Panel"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* 底部面板内容 */}
                <div className="flex-1 overflow-auto">
                  {bottomPanelTab === 'terminal' && (
                    <WorkspaceStatusPanel
                      forceTab="terminal"
                      fileChanges={[]}
                      terminalOutputs={workspaceStatus.terminalOutputs}
                      onFileClick={handleOpenFile}
                      onClearTerminal={workspaceStatus.clearTerminalOutputs}
                    />
                  )}
                  {bottomPanelTab === 'files' && (
                    <WorkspaceStatusPanel
                      forceTab="files"
                      fileChanges={workspaceStatus.fileChanges}
                      terminalOutputs={[]}
                      onFileClick={handleOpenFile}
                      onClearFiles={workspaceStatus.clearFileChanges}
                    />
                  )}
                  {bottomPanelTab === 'activity' && (
                    <div className="p-3">
                      <AgentActivity
                        activities={agentActivity.activities}
                        isThinking={agentActivity.isThinking}
                        thinkingDuration={agentActivity.thinkingDuration}
                      />
                      {!agentActivity.isThinking && agentActivity.activities.length === 0 && (
                        <div className="text-gray-500 text-sm text-center py-6">
                          No agent activity yet
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 拖拽分隔条 (右) */}
        <div
          className="w-1 bg-slate-800 hover:bg-emerald-400/70 cursor-col-resize flex-shrink-0"
          onMouseDown={() => setDragging('right')}
          onDoubleClick={() => setRightWidth(420)}
        />

        {/* 右侧: Agent 聊天 */}
        <div
          className="bg-slate-950 border-l border-slate-700/80 flex-shrink-0"
          style={{ width: rightWidth }}
        >
          {currentWorkspace && (
            <AgentChat
              workspaceId={currentWorkspace.id}
              workspaceRootPath={currentWorkspace.rootPath}
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

async function getFileHandle(
  root: FileSystemDirectoryHandle,
  relativePath: string,
  create = false,
) {
  const segments = relativePath.replace(/^\//, '').split('/').filter(Boolean);
  const fileName = segments.pop();
  if (!fileName) {
    throw new Error('Invalid file path');
  }
  let current = root;
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment, { create });
  }
  return await current.getFileHandle(fileName, { create });
}
