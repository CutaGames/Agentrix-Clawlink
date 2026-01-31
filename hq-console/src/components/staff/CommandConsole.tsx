"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { useAgentChat } from "@/hooks/useAgents";
import { cn } from "@/lib/utils";

interface CommandConsoleProps {
  agentId: string | null;
  agentName?: string;
}

export function CommandConsole({ agentId, agentName }: CommandConsoleProps) {
  const [input, setInput] = useState("");
  const { messages, sending, sendMessage, clearChat } = useAgentChat(agentId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Clear chat when agent changes
    clearChat();
  }, [agentId, clearChat]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    sendMessage(input.trim());
    setInput("");
  };

  if (!agentId) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-slate-500">
        <p className="text-lg">Select an agent to start commanding</p>
        <p className="text-sm mt-2">Choose from the roster on the left</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-medium text-white">
            Command Console: {agentName || agentId}
          </h3>
          <p className="text-xs text-slate-400">Send instructions to this agent</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearChat}
          className="text-slate-400 hover:text-white"
        >
          Clear
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            <p>No messages yet.</p>
            <p className="text-sm mt-1">Start by typing a command below.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-2",
                msg.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-200"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 rounded-lg px-4 py-2 flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a command..."
            disabled={sending}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={!input.trim() || sending}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
