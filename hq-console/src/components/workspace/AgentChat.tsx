/**
 * Agent Chat Component
 * 
 * 与架构师/Coder Agent 聊天
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { hqApi } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentCode?: string;
  timestamp: Date;
}

interface AgentChatProps {
  workspaceId: string;
  currentFile?: string;
  selectedCode?: string;
}

const AGENTS = [
  { code: 'ARCHITECT-01', name: '架构师', icon: '🏛️', description: 'Claude Opus 4.5 - 系统架构设计' },
  { code: 'CODER-01', name: 'Coder', icon: '💻', description: 'Claude Sonnet 4.5 - 代码实现' },
  { code: 'GROWTH-01', name: '增长负责人', icon: '📈', description: 'Claude Haiku 4.5 - 增长策略' },
  { code: 'BD-01', name: 'BD 负责人', icon: '🌍', description: 'Claude Haiku 4.5 - 生态发展' },
];

export function AgentChat({ workspaceId, currentFile, selectedCode }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await hqApi.chatWithAgent(workspaceId, {
        agentCode: selectedAgent.code,
        message: input,
        filePath: currentFile,
        selectedCode,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        agentCode: response.agentCode,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat failed:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // 处理回车发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 清空对话
  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 头部 - Agent 选择 */}
      <div className="h-14 bg-gray-800 border-b border-gray-700 p-2">
        <div className="flex gap-1">
          {AGENTS.map(agent => (
            <button
              key={agent.code}
              className={`flex-1 px-2 py-1 rounded text-xs ${
                selectedAgent.code === agent.code
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => setSelectedAgent(agent)}
              title={agent.description}
            >
              <span className="mr-1">{agent.icon}</span>
              {agent.name}
            </button>
          ))}
        </div>
      </div>

      {/* 上下文指示器 */}
      {(currentFile || selectedCode) && (
        <div className="bg-gray-800/50 border-b border-gray-700 p-2 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            {currentFile && (
              <span className="bg-gray-700 px-2 py-0.5 rounded">
                📄 {currentFile.split('/').pop()}
              </span>
            )}
            {selectedCode && (
              <span className="bg-gray-700 px-2 py-0.5 rounded">
                ✂️ {selectedCode.length} chars selected
              </span>
            )}
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-4">{selectedAgent.icon}</div>
            <div className="text-sm">
              开始与 {selectedAgent.name} 对话
            </div>
            <div className="text-xs text-gray-600 mt-2">
              {selectedAgent.description}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="text-xs text-gray-400 mb-1">
                    {AGENTS.find(a => a.code === msg.agentCode)?.name || 'AI'}
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                <div className="text-xs text-gray-400 mt-1 text-right">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-100" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t border-gray-700 p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${selectedAgent.name}...`}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-blue-500"
            rows={2}
            disabled={loading}
          />
        </div>
        <div className="flex justify-between mt-2">
          <button
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-gray-300"
            disabled={messages.length === 0}
          >
            Clear Chat
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
