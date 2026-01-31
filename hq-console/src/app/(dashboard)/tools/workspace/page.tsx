"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { 
  RefreshCw, Save, Folder, File, ChevronRight, ChevronDown,
  Code, Terminal, Search, Play, FolderOpen, FileCode, FileText,
  GitBranch, Package, Send, Bot, MessageSquare
} from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface WorkspaceInfo {
  projectName: string;
  gitBranch?: string;
  nodeVersion?: string;
  dependencies?: Record<string, string>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  agentCode?: string;
}

const AGENTS = [
  { code: 'ANALYST-01', name: 'Business Analyst', icon: '📊', model: 'Claude Haiku 4.5' },
  { code: 'ARCHITECT-01', name: '首席架构师', icon: '🏛️', model: 'Claude Opus 4.5' },
  { code: 'CODER-01', name: '高级开发工程师', icon: '💻', model: 'Claude Sonnet 4.5' },
  { code: 'GROWTH-01', name: '全球增长负责人', icon: '📈', model: 'Claude Haiku 4.5' },
  { code: 'BD-01', name: '全球生态发展负责人', icon: '🌍', model: 'Claude Haiku 4.5' },
];

export default function WorkspaceIDEPage() {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null);
  const [currentFile, setCurrentFile] = useState<{ path: string; content: string } | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [terminalOutput, setTerminalOutput] = useState('$ Ready\n');
  const [terminalCommand, setTerminalCommand] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['.', 'src']));
  const [activePanel, setActivePanel] = useState<'editor' | 'terminal' | 'search'>('editor');
  
  // Agent Chat State
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[1]); // Default to Architect
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [treeRes, infoRes] = await Promise.all([
        api.get('/hq/workspace/tree?depth=3'),
        api.get('/hq/workspace/info'),
      ]);
      setFileTree(treeRes.data.tree || treeRes.data || []);
      setWorkspaceInfo(infoRes.data);
    } catch (e) {
      console.error('Failed to fetch workspace:', e);
      // Mock data for development
      setFileTree([
        { name: 'src', path: 'src', type: 'directory', children: [
          { name: 'app', path: 'src/app', type: 'directory', children: [
            { name: 'page.tsx', path: 'src/app/page.tsx', type: 'file' },
            { name: 'layout.tsx', path: 'src/app/layout.tsx', type: 'file' },
          ]},
          { name: 'components', path: 'src/components', type: 'directory', children: [] },
        ]},
        { name: 'package.json', path: 'package.json', type: 'file' },
        { name: 'README.md', path: 'README.md', type: 'file' },
      ]);
      setWorkspaceInfo({
        projectName: 'Agentrix HQ Console',
        gitBranch: 'main',
        nodeVersion: 'v20.x',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openFile = async (path: string) => {
    try {
      const res = await api.post('/hq/workspace/read', { path });
      setCurrentFile({ path, content: res.data.content });
      setFileContent(res.data.content);
      setActivePanel('editor');
    } catch (e) {
      console.error('Failed to read file:', e);
      setCurrentFile({ path, content: '// Error loading file' });
      setFileContent('// Error loading file');
    }
  };

  const saveFile = async () => {
    if (!currentFile) return;
    setSaving(true);
    try {
      await api.post('/hq/workspace/write', { path: currentFile.path, content: fileContent });
      setCurrentFile({ ...currentFile, content: fileContent });
    } catch (e) {
      console.error('Failed to save file:', e);
    } finally {
      setSaving(false);
    }
  };

  const executeCommand = async () => {
    if (!terminalCommand.trim()) return;
    setExecuting(true);
    setTerminalOutput(prev => prev + `\n$ ${terminalCommand}\n`);
    try {
      const res = await api.post('/hq/workspace/execute', { command: terminalCommand });
      setTerminalOutput(prev => prev + (res.data.output || res.data.stdout || 'Command executed') + '\n');
    } catch (e: any) {
      setTerminalOutput(prev => prev + `Error: ${e.message || 'Command failed'}\n`);
    } finally {
      setTerminalCommand('');
      setExecuting(false);
    }
  };

  const searchCode = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await api.get(`/hq/workspace/search?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data.results || res.data || []);
      setActivePanel('search');
    } catch (e) {
      console.error('Search failed:', e);
    }
  };

  // Agent Chat Function
  const sendAgentMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.post('/hq/cli/chat', {
        agentId: selectedAgent.code,
        message: chatInput,
        context: currentFile ? `Current file: ${currentFile.path}\n\n${fileContent.substring(0, 2000)}` : undefined,
      });
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: res.data.response || res.data.content || 'No response',
        agentCode: selectedAgent.code,
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (e: any) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${e.response?.data?.message || e.message || 'Failed to get response'}`,
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
      case 'ts':
        return <FileCode className="h-4 w-4 text-blue-400" />;
      case 'js':
      case 'jsx':
        return <FileCode className="h-4 w-4 text-yellow-400" />;
      case 'json':
        return <FileCode className="h-4 w-4 text-amber-400" />;
      case 'md':
        return <FileText className="h-4 w-4 text-slate-400" />;
      case 'css':
      case 'scss':
        return <FileCode className="h-4 w-4 text-pink-400" />;
      default:
        return <File className="h-4 w-4 text-slate-400" />;
    }
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders.has(node.path);
      const isSelected = currentFile?.path === node.path;

      return (
        <div key={node.path}>
          <div
            className={`flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-slate-700/50 rounded text-sm ${
              isSelected ? 'bg-slate-700 text-white' : 'text-slate-300'
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => {
              if (node.type === 'directory') {
                toggleFolder(node.path);
              } else {
                openFile(node.path);
              }
            }}
          >
            {node.type === 'directory' ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-slate-400" />
                )}
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-amber-400" />
                ) : (
                  <Folder className="h-4 w-4 text-amber-400" />
                )}
              </>
            ) : (
              <>
                <span className="w-3" />
                {getFileIcon(node.name)}
              </>
            )}
            <span className="ml-1 truncate">{node.name}</span>
          </div>
          {node.type === 'directory' && isExpanded && node.children && (
            renderFileTree(node.children, depth + 1)
          )}
        </div>
      );
    });
  };

  return (
    <div className="p-4 h-[calc(100vh-80px)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Code className="h-5 w-5 text-emerald-400" />
            Workspace IDE
          </h1>
          <p className="text-slate-400 text-sm">Agent-powered code editing and terminal</p>
        </div>
        <div className="flex items-center gap-4">
          {workspaceInfo && (
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline" className="text-slate-400 border-slate-600">
                <Package className="h-3 w-3 mr-1" />
                {workspaceInfo.projectName}
              </Badge>
              {workspaceInfo.gitBranch && (
                <Badge variant="outline" className="text-slate-400 border-slate-600">
                  <GitBranch className="h-3 w-3 mr-1" />
                  {workspaceInfo.gitBranch}
                </Badge>
              )}
            </div>
          )}
          <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main IDE Layout */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* File Explorer */}
        <Card className="w-64 flex-shrink-0 bg-slate-800/50 border-slate-700 flex flex-col">
          <CardHeader className="py-2 px-3 border-b border-slate-700">
            <CardTitle className="text-sm text-white">Explorer</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="py-2">
                {renderFileTree(fileTree)}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Editor + Panels */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Search Bar */}
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code..."
              className="bg-slate-800/50 border-slate-700 text-white"
              onKeyDown={(e) => e.key === 'Enter' && searchCode()}
            />
            <Button onClick={searchCode} variant="outline" size="sm">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Editor */}
          <Card className="flex-1 bg-slate-800/50 border-slate-700 flex flex-col overflow-hidden">
            <CardHeader className="py-2 px-3 border-b border-slate-700 flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                {currentFile ? (
                  <>
                    {getFileIcon(currentFile.path.split('/').pop() || '')}
                    <span className="text-sm text-white">{currentFile.path}</span>
                    {fileContent !== currentFile.content && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Modified</Badge>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-slate-400">No file open</span>
                )}
              </div>
              {currentFile && (
                <Button onClick={saveFile} disabled={saving || fileContent === currentFile.content} size="sm" variant="ghost">
                  <Save className={`h-4 w-4 ${saving ? 'animate-pulse' : ''}`} />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              {activePanel === 'editor' && (
                <Textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="h-full w-full bg-slate-900/50 border-0 text-slate-200 font-mono text-sm resize-none rounded-none focus-visible:ring-0"
                  placeholder="Select a file to edit..."
                />
              )}
              {activePanel === 'search' && (
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-2">
                    {searchResults.length === 0 ? (
                      <p className="text-slate-400 text-center">No results found</p>
                    ) : (
                      searchResults.map((result, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-slate-900/50 rounded cursor-pointer hover:bg-slate-900/70"
                          onClick={() => openFile(result.file || result.path)}
                        >
                          <p className="text-white text-sm">{result.file || result.path}</p>
                          <p className="text-slate-400 text-xs font-mono">{result.match || result.line}</p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Terminal */}
          <Card className="h-48 bg-slate-900 border-slate-700 flex flex-col">
            <CardHeader className="py-2 px-3 border-b border-slate-700 flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-white">Terminal</span>
              </div>
              <Button
                onClick={() => setTerminalOutput('$ Ready\n')}
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
              >
                Clear
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 p-2">
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{terminalOutput}</pre>
              </ScrollArea>
              <div className="flex items-center border-t border-slate-700 p-2">
                <span className="text-emerald-400 text-sm mr-2">$</span>
                <Input
                  value={terminalCommand}
                  onChange={(e) => setTerminalCommand(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
                  placeholder="Enter command..."
                  className="flex-1 bg-transparent border-0 text-white font-mono text-sm h-6 p-0 focus-visible:ring-0"
                  disabled={executing}
                />
                <Button onClick={executeCommand} disabled={executing || !terminalCommand.trim()} size="sm" variant="ghost">
                  <Play className={`h-4 w-4 ${executing ? 'animate-pulse' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Chat Panel */}
        <Card className="w-80 flex-shrink-0 bg-slate-800/50 border-slate-700 flex flex-col">
          <CardHeader className="py-2 px-3 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-white">Agent Chat</span>
              </div>
              <Button
                onClick={() => setChatMessages([])}
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
              >
                Clear
              </Button>
            </div>
            {/* Agent Selector */}
            <Select
              value={selectedAgent.code}
              onValueChange={(value) => {
                const agent = AGENTS.find(a => a.code === value);
                if (agent) setSelectedAgent(agent);
              }}
            >
              <SelectTrigger className="w-full h-8 mt-2 bg-slate-900/50 border-slate-600 text-sm">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <span>{selectedAgent.icon}</span>
                    <span>{selectedAgent.name}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {AGENTS.map((agent) => (
                  <SelectItem key={agent.code} value={agent.code} className="text-white">
                    <div className="flex items-center gap-2">
                      <span>{agent.icon}</span>
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-xs text-slate-400">{agent.model}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center text-slate-500 text-sm py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Ask {selectedAgent.name} a question</p>
                    <p className="text-xs mt-1">Using {selectedAgent.model}</p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg text-sm ${
                      msg.role === 'user'
                        ? 'bg-emerald-600/20 text-emerald-100 ml-4'
                        : 'bg-slate-700/50 text-slate-200 mr-4'
                    }`}
                  >
                    {msg.role === 'assistant' && msg.agentCode && (
                      <div className="text-xs text-purple-400 mb-1 font-medium">
                        {AGENTS.find(a => a.code === msg.agentCode)?.icon} {msg.agentCode}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
                {chatLoading && (
                  <div className="p-2 rounded-lg bg-slate-700/50 text-slate-400 text-sm mr-4">
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
            {/* Chat Input */}
            <div className="border-t border-slate-700 p-2 flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendAgentMessage()}
                placeholder="Ask the agent..."
                className="flex-1 bg-slate-900/50 border-slate-600 text-white text-sm h-8"
                disabled={chatLoading}
              />
              <Button
                onClick={sendAgentMessage}
                disabled={chatLoading || !chatInput.trim()}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 h-8 w-8 p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
