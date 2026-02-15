/**
 * Chat Message List Component
 * 
 * 消息列表渲染 - 包括权限请求、工具执行结果
 * 从 AgentChat.tsx 拆分
 */

'use client';

import { useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ChatMessage, PermissionRequestUI, type Message, type PermissionRequest } from './ChatMessage';
import type { AgentOption } from './AgentSelector';

interface ChatMessageListProps {
  messages: Message[];
  loading: boolean;
  selectedAgent: AgentOption;
  pendingPermissions: PermissionRequest[];
  currentFile?: string;
  selectedCode?: string;
  onOpenFile?: (path: string) => void;
  onSaveFile?: (file: any) => void;
  onPermissionApprove: (id: string) => void;
  onPermissionDeny: (id: string) => void;
}

export function ChatMessageList({
  messages,
  loading,
  selectedAgent,
  pendingPermissions,
  currentFile,
  selectedCode,
  onOpenFile,
  onSaveFile,
  onPermissionApprove,
  onPermissionDeny,
}: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingPermissions]);

  return (
    <>
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
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-4xl mb-4">{selectedAgent.icon}</p>
            <p className="font-medium">{selectedAgent.name}</p>
            <p className="text-sm">{selectedAgent.description}</p>
            <p className="text-xs mt-4 text-gray-600">
              开始对话，获取帮助...
              <br />
              支持拖放文件、粘贴图片
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onOpenFile={onOpenFile}
              onSaveFile={onSaveFile}
            />
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-200 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}

        {/* 权限请求 UI */}
        {pendingPermissions.filter(p => p.status === 'pending').map(perm => (
          <PermissionRequestUI
            key={perm.id}
            permission={perm}
            onApprove={onPermissionApprove}
            onDeny={onPermissionDeny}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>
    </>
  );
}
