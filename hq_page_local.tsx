"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck,
  Shield,
  Cpu, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Send,
  Activity,
  Zap,
  CheckCircle2,
  AlertCircle,
  Code,
  FileText,
  ChevronRight,
  ChevronDown,
  Layout,
  Terminal as TerminalIcon,
  Maximize2,
  RefreshCw,
  Clock,
  CheckCircle,
  Database,
  Search
} from "lucide-react";
import { 
  Group as PanelGroup, 
  Panel, 
  Separator as PanelResizeHandle 
} from "react-resizable-panels";
import { CommandLog } from "@/components/CommandLog";

interface Agent {
  id: string;
  name: string;
  role: string;
  status: "active" | "idle" | "error";
  lastAction: string;
  walletBalance: string;
  avatar: React.ReactNode;
  color: string;
}

const agents: Agent[] = [
  {
    id: "AGENT-ARCHITECT-001",
    name: "首席系统架构师",
    role: "Claude 3 Opus (Supreme Engine)",
    status: "active",
    lastAction: "正在优化混合模型路由协议...",
    walletBalance: "1,250.00 USDC",
    avatar: <ShieldCheck className="w-6 h-6" />,
    color: "text-blue-400 border-blue-400/30 bg-blue-400/10"
  },
  {
    id: "AGENT-CODER-001",
    name: "全栈代码专家",
    role: "Claude 3.5 Sonnet (Coding Specialist)",
    status: "active",
    lastAction: "正在修复 HQ 跨域权限模块",
    walletBalance: "820.50 USDC",
    avatar: <Cpu className="w-6 h-6" />,
    color: "text-purple-400 border-purple-400/30 bg-purple-400/10"
  },
  {
    id: "AGENT-GROWTH-001",
    name: "全球增长负责人",
    role: "Gemini 1.5 Flash (Free Engine)",
    status: "active",
    lastAction: "市场营销战略规划中...",
    walletBalance: "945.20 USDC",
    avatar: <TrendingUp className="w-6 h-6" />,
    color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
  },
  {
    id: "AGENT-BD-001",
    name: "生态商务拓展",
    role: "Gemini 1.5 Flash (Free Engine)",
    status: "active",
    lastAction: "正在梳理合作伙伴列表",
    walletBalance: "998.00 USDC",
    avatar: <Users className="w-6 h-6" />,
    color: "text-amber-400 border-amber-400/30 bg-amber-400/10"
  }
];

export default function CEOConsole() {
  const [activeTab, setActiveTab] = useState<"chat" | "knowledge" | "workshop" | "dashboard">("dashboard");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  // 每个 Agent 独立的对话历史
  const [agentMessages, setAgentMessages] = useState<Record<string, {sender: string, text: string, model?: string}[]>>({});
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // 获取当前选中Agent的消息
  const messages = selectedAgent ? (agentMessages[selectedAgent.id] || []) : [];
  
  // Knowledge Base State
  const [kbContent, setKbContent] = useState("");
  const [isSavingKb, setIsSavingKb] = useState(false);
  const [ragFiles, setRagFiles] = useState<string[]>([]);

  // Workshop State
  const [lastCodeChange, setLastCodeChange] = useState<{path: string, content: string} | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<{cmd: string, output: string}[]>([]);
  const [workspacePath, setWorkspacePath] = useState<string>("");
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [fileTree, setFileTree] = useState<any[]>([]);

  useEffect(() => {
    // 自动降噪处理：静默 MetaMask 可能触发的错误提示
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.ethereum = window.ethereum || { isMetaMask: false, request: async () => {} };
      
      // 捕获全局未捕获异常，过滤掉 MetaMask 相关的噪音
      const handleError = (e: ErrorEvent) => {
        if (e.message?.includes('MetaMask') || e.message?.includes('inpage.js')) {
          e.stopImmediatePropagation();
        }
      };
      window.addEventListener('error', handleError);
      return () => window.removeEventListener('error', handleError);
    }
  }, []);

  useEffect(() => {
    // HQ Standalone Server usually runs on 3005, Backend on 3001
    // In production, we proxy /api to the backend
    const hqBaseUrl = process.env.NEXT_PUBLIC_HQ_URL || '';

    // Fetch KB content on load
    fetch(`${hqBaseUrl}/api/hq/knowledge-base`)
      .then(res => res.json())
      .then(data => setKbContent(data.content))
      .catch(err => console.error("Failed to load KB:", err));

    // Fetch RAG files
    fetch(`${hqBaseUrl}/api/hq/rag-files`)
      .then(res => res.json())
      .then(data => setRagFiles(data))
      .catch(err => console.error("Failed to load RAG files:", err));
  }, []);

  const loadWorkspaceInfo = async () => {
    const hqBaseUrl = process.env.NEXT_PUBLIC_HQ_URL || '';
    try {
      const [infoRes, treeRes] = await Promise.all([
        fetch(`${hqBaseUrl}/api/hq/workspace/info`),
        fetch(`${hqBaseUrl}/api/hq/workspace/tree?depth=2`)
      ]);
      
      if (infoRes.ok) {
        const info = await infoRes.json();
        setProjectInfo(info);
        setWorkspacePath(info.name || "Current Project");
      }
      
      if (treeRes.ok) {
        const tree = await treeRes.json();
        setFileTree(tree);
      }
    } catch (err) {
      console.error("Failed to load workspace:", err);
    }
  };

  const handleSaveKb = async () => {
    setIsSavingKb(true);
    const hqBaseUrl = process.env.NEXT_PUBLIC_HQ_URL || '';
    try {
      await fetch(`${hqBaseUrl}/api/hq/knowledge-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: kbContent })
      });
      alert("知识库已更新，Agent 已重载。");
    } catch (err) {
      alert("保存失败");
    } finally {
      setIsSavingKb(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent || isLoading) return;
    
    const currentInput = input;
    const userMsg = { sender: "CEO", text: currentInput };
    const currentMessages = agentMessages[selectedAgent.id] || [];
    const newMsgs = [...currentMessages, userMsg];
    setAgentMessages(prev => ({ ...prev, [selectedAgent.id]: newMsgs }));
    setInput("");
    setIsLoading(true);

    const hqBaseUrl = process.env.NEXT_PUBLIC_HQ_URL || '';
    try {
      const response = await fetch(`${hqBaseUrl}/api/hq/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          // 转换消息格式为大模型通用的格式
          messages: newMsgs.map(m => ({
            role: m.sender === 'CEO' ? 'user' : 'assistant',
            content: m.text
          }))
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      setAgentMessages(prev => ({
        ...prev,
        [selectedAgent.id]: [...newMsgs, { 
          sender: selectedAgent.name, 
          text: data.content || "通信加密失败，请稍后重试。",
          model: data.model
        }]
      }));

      // 更新 Workshop 状态
      if (data.lastCodeChange) {
        setLastCodeChange({ 
          path: data.lastPath || "modified-file.ts", 
          content: data.lastCodeChange 
        });
      }
      
      if (data.terminalOutput) {
        setTerminalLogs(prev => [
          ...prev, 
          { cmd: "Agent 执行任务", output: data.terminalOutput }
        ]);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setAgentMessages(prev => ({
        ...prev,
        [selectedAgent.id]: [...newMsgs, { 
          sender: "系统终端", 
          text: `[错令中断]: ${error.message || '无法建立安全信道，请检查 HQ Standalone 服务是否在 [3005] 端口运行。'}` 
        }]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-4 flex flex-col gap-4 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-center py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <Zap className="fill-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Agentrix CEO 总部控制台</h1>
            <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">自主项目指令中心 (Autonomous Project Command)</p>
          </div>
        </div>
        
        <nav className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'dashboard' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            指挥中心
          </button>
          <button 
            onClick={() => setActiveTab("knowledge")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'knowledge' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            全员知识库 (潜意识)
          </button>
          <button 
            onClick={() => setActiveTab("workshop")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'workshop' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Workshop IDE
          </button>
        </nav>

        <div className="flex items-center gap-4 bg-slate-900/50 p-2 px-4 rounded-full border border-slate-700">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-medium">系统状态: 运行中</span>
          </div>
          <div className="w-px h-4 bg-slate-700"></div>
          <span className="text-xs font-mono text-slate-400">区域: WSL-OS</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 overflow-hidden">
        {/* Sidebar: Agents List */}
        <aside className="md:col-span-4 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase px-2">核心执勤 Agent</h2>
          <div className="flex flex-col gap-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => {
                  console.log("Selecting agent:", agent.id);
                  setSelectedAgent(agent);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer text-left group ${
                  selectedAgent?.id === agent.id 
                  ? "bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]" 
                  : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${agent.color}`}>
                    {agent.avatar}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold flex items-center justify-between">
                      {agent.name}
                      {agent.status === "active" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      {agent.status === "error" && <AlertCircle className="w-3 h-3 text-red-500" />}
                    </h3>
                    <p className="text-xs text-slate-400">{agent.role}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
                  <span>余额: {agent.walletBalance}</span>
                  <span className={`${selectedAgent?.id === agent.id ? "text-indigo-400" : "group-hover:text-slate-300"}`}>
                    {selectedAgent?.id === agent.id ? "正在指挥中..." : "详情预览 →"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <CommandLog />
        </aside>

        {/* Main: Dialogue Center */}
        <section className="md:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden min-h-[600px]">
          {activeTab === "dashboard" ? (
            <div className="flex-1 p-6 overflow-auto bg-slate-950/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Layout className="text-amber-500" /> 团队执行概览
                </h2>
                <div className="flex gap-4 text-[10px] font-mono text-slate-500">
                  <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                    <Clock className="w-3 h-3" /> UPTIME: 124H
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                    <CheckCircle className="w-3 h-3 text-emerald-500" /> COMPLETED: 842
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                    <Activity className="w-3 h-3 text-indigo-500" /> ACTIVE_TASKS: 4
                  </div>
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                {agents.map(agent => (
                  <div key={agent.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${agent.color.split(' ').slice(0,2).join(' ')}`}>
                      {agent.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm truncate">{agent.name}</span>
                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 capitalize">{agent.status}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mb-2">
                        {agent.lastAction}
                      </p>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full w-[65%] shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Systems Link Health */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                    <Database className="w-3 h-3 text-blue-500" /> 存储核心
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-bold font-mono">98.2%</span>
                    <span className="text-[10px] text-emerald-500">OPTIMAL</span>
                  </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                    <Activity className="w-3 h-3 text-emerald-500" /> 处理带宽
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-bold font-mono">4.2 Gb/s</span>
                    <span className="text-[10px] text-slate-400">NORMAL</span>
                  </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                     <Search className="w-3 h-3 text-purple-500" /> RAG 检索率
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-bold font-mono">12ms</span>
                    <span className="text-[10px] text-emerald-500">EXPRESS</span>
                  </div>
                </div>
              </div>

              {/* Recent Actions Feed */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden mt-6">
                <div className="p-3 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">全局指令流 (GLOBAL_STREAM)</h3>
                  <button onClick={() => setTerminalLogs([])} className="text-[10px] text-slate-600 hover:text-slate-400">CLEAR</button>
                </div>
                <div className="p-4 max-h-64 overflow-auto scrollbar-hide">
                   {terminalLogs.length > 0 ? terminalLogs.map((log, i) => (
                     <div key={i} className="flex gap-3 mb-3 text-[11px] group">
                        <span className="text-emerald-600 font-mono">[{new Date().toLocaleTimeString()}]</span>
                        <span className="text-slate-500 font-bold">{log.cmd}:</span>
                        <span className="text-slate-400 flex-1 truncate group-hover:whitespace-normal transition-all">{log.output}</span>
                     </div>
                   )) : (
                     <div className="text-[11px] text-slate-700 italic">No global activity detected in the last session...</div>
                   )}
                </div>
              </div>
            </div>
          ) : activeTab === "chat" ? (
            selectedAgent ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${selectedAgent.color}`}>
                      {selectedAgent.avatar}
                    </div>
                    <div>
                      <h2 className="font-bold text-sm leading-none">{selectedAgent.name}</h2>
                      <span className="text-[10px] text-emerald-400 font-mono tracking-tighter">加密信道已建立</span>
                    </div>
                  </div>
                  <div className="text-[10px] bg-slate-950 p-1 px-2 rounded font-mono text-slate-500">
                    标识符: {selectedAgent.id.toUpperCase()}-MATRIX-01
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                  <div className="text-center py-4">
                    <span className="text-[10px] text-slate-600 bg-slate-950 p-1 px-4 rounded-full border border-slate-900">
                      消息已通过端到端加密保护
                    </span>
                  </div>
                  
                  {messages.length === 0 && (
                    <div className="p-4 bg-slate-950/50 border border-dashed border-slate-800 rounded-xl text-center text-slate-500">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-xs">请点击下方输入框，为 {selectedAgent.name} 下达任务指令</p>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === "CEO" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] p-3 px-4 rounded-2xl text-sm ${
                        msg.sender === "CEO" 
                        ? "bg-indigo-600 text-white rounded-tr-none" 
                        : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700"
                      }`}>
                        <p className="text-[10px] font-mono opacity-50 mb-1">{msg.sender === "CEO" ? "首席执行官 (CEO)" : msg.sender}</p>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 text-slate-100 rounded-2xl rounded-tl-none border border-slate-700 p-3 px-4">
                        <div className="flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-slate-950 border-t border-slate-800">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={input}
                      disabled={isLoading}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      placeholder={isLoading ? "正在等待响应..." : `指挥 ${selectedAgent.name} 执行任务...`}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 pr-12 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 disabled:opacity-50"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={isLoading || !input.trim()}
                      className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:bg-slate-800 disabled:text-slate-500"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 opacity-20" />
                </div>
                <h3 className="text-sm font-bold text-slate-400 mb-1">未选择指挥目标</h3>
                <p className="text-xs max-w-[200px]">请从左侧列表选择一名核心 Agent 以建立加密指挥信道。</p>
              </div>
            )
          ) : activeTab === "knowledge" ? (
            <>
              {/* Knowledge Base Editor */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md text-purple-400 bg-purple-400/10 border border-purple-400/20">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-bold text-sm leading-none">团队潜意识 (MD 知识库)</h2>
                      <span className="text-[10px] text-purple-400 font-mono tracking-tighter">全员实时共享</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleSaveKb}
                    disabled={isSavingKb}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-500 transition-colors disabled:opacity-50"
                  >
                    {isSavingKb ? "同步中..." : "保存并重写潜意识"}
                  </button>
                </div>
                
                <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
                  <textarea
                    value={kbContent}
                    onChange={(e) => setKbContent(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-6 font-mono text-sm text-slate-300 focus:outline-none focus:border-purple-500/30 resize-none leading-relaxed shadow-inner"
                    placeholder="# 这里的 MD 内容将注入到所有 Agent 的系统提示词中..."
                  />
                  
                  {/* RAG Files List */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Zap className="w-3 h-3" /> 
                      本地 RAG 索引文件 (backend/knowledge/)
                    </h4>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                      {ragFiles.length > 0 ? ragFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-[11px] text-slate-400 group hover:border-purple-500/50 transition-colors">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50 group-hover:bg-purple-500"></div>
                          <span className="truncate">{file}</span>
                        </div>
                      )) : (
                        <p className="text-[10px] text-slate-600 col-span-full italic">暂无本地索引文件，请将 PDF/MD 存入 backend/knowledge 目录</p>
                      )}
                    </div>
                  </div>
                </div>
            </>
          ) : (
            <>
              {/* Workshop IDE Tab */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md text-emerald-400 bg-emerald-400/10 border border-emerald-400/20">
                    <Code className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm leading-none">Workshop IDE 工作区</h2>
                    <span className="text-[10px] text-emerald-400 font-mono tracking-tighter">
                      {workspacePath || "AI 编码与系统执行监控"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={loadWorkspaceInfo}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[10px] font-bold uppercase transition-colors"
                  >
                    🔍 打开工作区
                  </button>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md text-[10px] font-bold uppercase">
                    实时监听已开启
                  </span>
                </div>
              </div>
              
              <div className="flex-1 p-4 flex gap-4 overflow-hidden h-full">
                <PanelGroup orientation="horizontal">
                  {/* Left: Project Info & File Tree */}
                  {projectInfo && (
                    <>
                      <Panel defaultSize={20} minSize={15}>
                        <div className="h-full bg-slate-950 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-2xl">
                          <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                              <Layout className="w-3 h-3" /> 项目信息
                            </h3>
                          </div>
                          <div className="flex-1 overflow-auto p-4 text-xs text-slate-300 font-mono space-y-2">
                            <div className="flex justify-between border-b border-slate-900 pb-1 mb-2">
                              <span className="text-slate-500">名称:</span> 
                              <span className="text-emerald-500 font-bold">{projectInfo.name}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-900 pb-1">
                              <span className="text-slate-500">版本:</span> 
                              <span>{projectInfo.version}</span>
                            </div>
                            {projectInfo.git && (
                              <>
                                <div className="flex justify-between border-b border-slate-900 pb-1">
                                  <span className="text-slate-500">分支:</span> 
                                  <span className="text-indigo-400">{projectInfo.git.branch}</span>
                                </div>
                                <div className="p-2 mt-2 bg-slate-900/50 rounded-lg border border-slate-800">
                                  <div className="text-[10px] text-slate-500 uppercase mb-1">未暂存变更</div>
                                  <div className="text-lg font-bold text-amber-500">{projectInfo.git.changes?.length || 0}</div>
                                  <div className="text-[9px] text-slate-600 uppercase">Files modified</div>
                                </div>
                              </>
                            )}
                            
                            {fileTree.length > 0 && (
                              <div className="pt-4 flex flex-col h-full overflow-hidden">
                                <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                  <FileText className="w-3 h-3" /> 文件预览
                                </div>
                                <div className="flex-1 overflow-auto p-1 bg-black/30 rounded-lg border border-slate-900 scrollbar-hide">
                                  {fileTree.slice(0, 50).map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 py-1 px-2 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer truncate">
                                      {item.type === 'directory' ? <ChevronRight className="w-2.5 h-2.5 text-slate-600" /> : <div className="w-2.5 h-2.5 border-l border-slate-700"></div>}
                                      {item.type === 'directory' ? '📁' : '📄'} {item.name}
                                    </div>
                                  ))}
                                  {fileTree.length > 50 && <div className="p-2 text-[9px] text-slate-700 italic">... and {fileTree.length - 50} more</div>}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Panel>

                      <PanelResizeHandle className="w-1 hover:bg-emerald-500/20 transition-colors cursor-col-resize" />
                    </>
                  )}
                  
                  {/* Middle: Code Editor Preview */}
                  <Panel defaultSize={45} minSize={30}>
                    <div className="h-full bg-slate-950 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-2xl">
                      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5 mr-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                            <Code className="w-3 h-3" />
                            {lastCodeChange?.path || "untitled-agent.ts"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {lastCodeChange && <span className="text-[9px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">LIVE 更新中</span>}
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                      </div>
                      <div className="flex-1 overflow-auto p-4 bg-black/40">
                        <pre className="text-xs font-mono text-slate-300 leading-relaxed scrollbar-thin">
                          <code>{lastCodeChange?.content || "// Agent 尚未执行代码修改任务...\n// 已开启实时代码审计监控"}</code>
                        </pre>
                      </div>
                      {lastCodeChange && (
                        <div className="p-2 bg-slate-900/80 border-t border-slate-800 flex justify-between items-center text-[9px] font-mono text-slate-500">
                          <span>LAST MODIFIED: {new Date().toLocaleTimeString()}</span>
                          <span className="text-slate-400">DIFF SIZE: {lastCodeChange.content.length} bytes</span>
                        </div>
                      )}
                    </div>
                  </Panel>

                  <PanelResizeHandle className="w-1 hover:bg-emerald-500/20 transition-colors cursor-col-resize" />
                  
                  {/* Right: Terminal Logs */}
                  <Panel defaultSize={35} minSize={25}>
                    <div className="h-full flex flex-col gap-4">
                      <div className="flex-1 bg-black border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-2 px-3 bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TerminalIcon className="w-3" />
                            执行终端 (Terminal Output)
                          </div>
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[8px] text-emerald-600">CONNECTED</span>
                          </div>
                        </div>
                        <div className="flex-1 p-3 font-mono text-[11px] leading-relaxed overflow-auto text-emerald-400 bg-black selection:bg-emerald-500/30">
                          {terminalLogs.length > 0 ? terminalLogs.map((log, idx) => (
                            <div key={idx} className="mb-4 last:mb-0 group">
                              <div className="flex gap-2 text-indigo-400 font-bold opacity-80 border-b border-slate-900 pb-1 mb-1">
                                <span className="text-emerald-600">$</span>
                                <span className="flex-1">{log.cmd}</span>
                                <span className="text-[8px] text-slate-600">{new Date().toLocaleTimeString()}</span>
                              </div>
                              <div className="text-slate-400 mt-1 whitespace-pre-wrap pl-4 border-l border-slate-800/50 group-hover:border-emerald-500/30 transition-colors">
                                {log.output}
                              </div>
                            </div>
                          )) : (
                            <div className="flex flex-col items-center justify-center h-full opacity-30">
                              <Activity className="w-8 h-8 mb-2 text-slate-700" />
                              <div className="text-slate-700 italic uppercase tracking-tighter text-[10px]">等待自主指令执行...</div>
                            </div>
                          )}
                        </div>
                        {terminalLogs.length > 0 && (
                          <div className="p-1 px-3 bg-slate-900 border-t border-slate-800 text-[8px] text-slate-600 flex justify-between items-center">
                             <span>PROCESS_ID: {Math.floor(Math.random()*10000)}</span>
                             <span>STATUS: IDLE</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Panel>
                </PanelGroup>
              </div>
            </>
          )}
          
          <div className="p-4 bg-slate-950/50 border-t border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">
            警告: 修改知识库将立即改变 Agent 的决策路径。保存后后台将自动 reload 所有 Agent 的逻辑单元。
          </div>
        </section>
      </div>
      <footer className="py-2 px-4 flex justify-between items-center text-[10px] font-mono text-slate-600 bg-slate-900/30 rounded-lg border border-slate-800/50 mt-auto">
        <div className="flex gap-4">
          <span>持续运行: 124:12:44</span>
          <span>延迟: 42ms</span>
          <span>加密协议: AES-256</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          <span>团队通讯在线</span>
        </div>
      </footer>
    </main>
  );
}
