"use client";

import { useState, useEffect } from "react";
import { useAgentChat } from "@/hooks/useAgents";
import { FileText, Code, Image, RefreshCw, Copy, Check, Download, FileCode, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ArtifactCanvasProps {
  agentId: string | null;
}

// Helper to detect code blocks and file outputs in messages
function extractCodeBlocks(messages: Array<{ role: string; content: string }>): { code: string; language: string; filename?: string }[] {
  const blocks: { code: string; language: string; filename?: string }[] = [];
  const codeBlockRegex = /```(\w+)?(?:\s+(\S+))?\n([\s\S]*?)```/g;
  
  for (const msg of messages) {
    if (msg.role === 'assistant') {
      let match;
      while ((match = codeBlockRegex.exec(msg.content)) !== null) {
        blocks.push({
          language: match[1] || 'text',
          filename: match[2],
          code: match[3].trim()
        });
      }
    }
  }
  return blocks;
}

export function ArtifactCanvas({ agentId }: ArtifactCanvasProps) {
  const { artifact, messages, workingStatus } = useAgentChat(agentId);
  const [copied, setCopied] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(0);

  const codeBlocks = extractCodeBlocks(messages);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!agentId) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-slate-500 bg-slate-900/50 rounded-lg">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg">Artifact Canvas</p>
        <p className="text-sm mt-2">Generated outputs will appear here</p>
      </div>
    );
  }

  // Show working status when processing
  if (workingStatus) {
    return (
      <div className="flex flex-col h-full bg-slate-900/50 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Terminal className="h-4 w-4 text-blue-400 animate-pulse" />
            <h3 className="text-sm font-medium text-white">Working...</h3>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-blue-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-sm">{workingStatus}</p>
          <p className="text-xs text-slate-500 mt-2">Processing your request...</p>
        </div>
      </div>
    );
  }

  // Show extracted code blocks if any
  if (codeBlocks.length > 0) {
    const currentBlock = codeBlocks[selectedBlock] || codeBlocks[0];
    return (
      <div className="flex flex-col h-full bg-slate-900/50 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <FileCode className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-medium text-white">
              {currentBlock.filename || `Code Output (${currentBlock.language})`}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {codeBlocks.length > 1 && (
              <span className="text-xs text-slate-400">
                {selectedBlock + 1} / {codeBlocks.length}
              </span>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleCopy(currentBlock.code)}
              className="text-slate-400 hover:text-white"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Code block tabs if multiple */}
        {codeBlocks.length > 1 && (
          <div className="flex border-b border-slate-800 overflow-x-auto">
            {codeBlocks.map((block, i) => (
              <button
                key={i}
                onClick={() => setSelectedBlock(i)}
                className={`px-3 py-2 text-xs whitespace-nowrap ${
                  i === selectedBlock 
                    ? 'text-emerald-400 border-b-2 border-emerald-400' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {block.filename || `${block.language} #${i + 1}`}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          <pre className="text-sm text-slate-300 font-mono bg-slate-950 p-4 rounded-lg overflow-x-auto">
            <code>{currentBlock.code}</code>
          </pre>
        </div>
      </div>
    );
  }

  if (!artifact) {
    return (
      <div className="flex flex-col h-full bg-slate-900/50 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Code className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-medium text-white">Artifact Canvas</h3>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
          <Image className="h-16 w-16 mb-4 opacity-30" />
          <p>No artifacts generated yet</p>
          <p className="text-sm mt-1">Send a command to generate output</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Code className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-white">Generated Artifact</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div
          className="prose prose-invert prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: artifact }}
        />
      </div>
    </div>
  );
}
