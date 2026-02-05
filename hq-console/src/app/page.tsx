"use client";

import React, { useState } from 'react';
import { useAgents, useAgentChat } from '@/hooks/useAgents';
import { StrategicPlanBoard } from '@/components/StrategicPlanBoard';
import { AgentMatrix } from '@/components/AgentMatrix';
import { CommandCenter } from '@/components/CommandCenter';

type ViewMode = 'dashboard' | 'chat';

export default function HQConsolePage() {
  const { agents, loading, refetch } = useAgents();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>('ARCHITECT-01');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const chat = useAgentChat(selectedAgentId);

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId);
    setViewMode('chat');
  };

  const handleSendCommand = (to: string, content: string) => {
    // 如果是发给当前选中的 agent，直接发送
    if (to === selectedAgentId) {
      chat.sendMessage(content);
    } else {
      // 切换到目标 agent 并发送
      setSelectedAgentId(to);
      setViewMode('chat');
      // 延迟发送，等待 agent 切换
      setTimeout(() => {
        chat.sendMessage(content);
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Navigation */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">🏛️ Agentrix HQ</h1>
            <span className="px-3 py-1 bg-blue-600 rounded-full text-sm">指挥中心</span>
          </div>
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('dashboard')}
                className={`px-4 py-2 rounded-md text-sm transition-colors ${
                  viewMode === 'dashboard' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📊 总览
              </button>
              <button
                onClick={() => setViewMode('chat')}
                className={`px-4 py-2 rounded-md text-sm transition-colors ${
                  viewMode === 'chat' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                💬 对话
              </button>
            </div>
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-gray-400">系统在线</span>
            </div>
            {/* Refresh Button */}
            <button
              onClick={refetch}
              disabled={loading}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              🔄 刷新
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {viewMode === 'dashboard' ? (
          /* Dashboard View */
          <div className="space-y-6">
            {/* Row 1: Strategic Plan */}
            <StrategicPlanBoard />
            
            {/* Row 2: Agent Matrix + Command Center */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AgentMatrix
                onSelectAgent={handleAgentSelect}
                selectedAgentId={selectedAgentId || undefined}
              />
              <CommandCenter 
                onSendCommand={handleSendCommand}
                selectedAgentId={selectedAgentId || undefined}
              />
            </div>
          </div>
        ) : (
          /* Chat View */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
            {/* Left Sidebar: Agent List + Quick Stats */}
            <div className="space-y-4">
              <AgentMatrix
                compact
                onSelectAgent={handleAgentSelect}
                selectedAgentId={selectedAgentId || undefined}
              />
              <StrategicPlanBoard compact />
            </div>
            
            {/* Main Chat Area */}
            <div className="lg:col-span-2 bg-gray-900 rounded-lg border border-gray-700 flex flex-col">
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <h3 className="font-semibold">{selectedAgentId || '选择 Agent'}</h3>
                    <p className="text-xs text-gray-400">
                      {chat.workingStatus || '等待指令...'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {chat.lastModel && (
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                      {chat.lastModel}
                    </span>
                  )}
                  <button
                    onClick={chat.clearChat}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1"
                  >
                    清空对话
                  </button>
                </div>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chat.messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <p className="text-4xl mb-4">💬</p>
                    <p>开始与 {selectedAgentId} 对话</p>
                    <p className="text-sm mt-2">输入指令或问题</p>
                  </div>
                ) : (
                  chat.messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-100'
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                        {msg.timestamp && (
                          <div className="text-xs opacity-50 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {chat.sending && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="animate-spin">⚙️</span>
                        <span className="text-sm text-gray-400">
                          {chat.workingStatus || '处理中...'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Tool Executions */}
              {chat.toolExecutions.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-700 bg-gray-800">
                  <div className="text-xs text-gray-400 mb-1">工具执行:</div>
                  <div className="flex flex-wrap gap-2">
                    {chat.toolExecutions.map((te, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-1 rounded ${
                          te.status === 'running' ? 'bg-blue-600' :
                          te.status === 'success' ? 'bg-green-600' : 'bg-red-600'
                        }`}
                      >
                        {te.tool}: {te.status}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Chat Input */}
              <div className="p-4 border-t border-gray-700">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement;
                    if (input.value.trim()) {
                      chat.sendMessage(input.value);
                      input.value = '';
                    }
                  }}
                  className="flex gap-3"
                >
                  <input
                    name="message"
                    type="text"
                    placeholder="输入指令或问题..."
                    disabled={chat.sending}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={chat.sending}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
                  >
                    发送
                  </button>
                </form>
              </div>
            </div>
            
            {/* Right Sidebar: Command Center */}
            <div>
              <CommandCenter 
                compact
                onSendCommand={handleSendCommand}
                selectedAgentId={selectedAgentId || undefined}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
