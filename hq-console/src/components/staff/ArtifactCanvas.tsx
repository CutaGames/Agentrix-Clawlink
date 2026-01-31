"use client";

import { useAgentChat } from "@/hooks/useAgents";
import { FileText, Code, Image, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ArtifactCanvasProps {
  agentId: string | null;
}

export function ArtifactCanvas({ agentId }: ArtifactCanvasProps) {
  const { artifact } = useAgentChat(agentId);

  if (!agentId) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-slate-500 bg-slate-900/50 rounded-lg">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg">Artifact Canvas</p>
        <p className="text-sm mt-2">Generated outputs will appear here</p>
      </div>
    );
  }

  if (!artifact) {
    return (
      <div className="flex flex-col h-full bg-slate-900/50 rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Code className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-medium text-white">Artifact Canvas</h3>
          </div>
        </div>

        {/* Empty State */}
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Code className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-white">Generated Artifact</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Artifact Content */}
      <div className="flex-1 overflow-auto p-4">
        <div
          className="prose prose-invert prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: artifact }}
        />
      </div>
    </div>
  );
}
