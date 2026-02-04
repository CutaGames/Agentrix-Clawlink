"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentRoster } from "@/components/staff/AgentRoster";
import { CommandConsole } from "@/components/staff/CommandConsole";
import { ArtifactCanvas } from "@/components/staff/ArtifactCanvas";
import { useAgents } from "@/hooks/useAgents";
import { Bot } from "lucide-react";

export default function StaffPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const { agents } = useAgents();

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const selectedAgentCode = selectedAgent?.code || selectedAgentId;

  return (
    <main className="flex min-h-screen flex-col p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Staff Command <span className="text-slate-500 font-mono text-xl">作战室</span>
          </h1>
          <p className="text-slate-400 mt-1">
            <Bot className="inline h-4 w-4 mr-1" />
            {agents.filter(a => a.status === 'running').length} Agents running | {agents.length} Total
          </p>
        </div>
      </div>

      {/* Three-Column Layout */}
      <div className="grid grid-cols-12 gap-6 flex-1" style={{ minHeight: 'calc(100vh - 200px)' }}>
        
        {/* Column 1: Agent Roster (20%) */}
        <Card className="col-span-3 bg-slate-900 border-slate-800 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white">Agent Roster</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <AgentRoster
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
            />
          </CardContent>
        </Card>

        {/* Column 2: Command Console (40%) */}
        <Card className="col-span-5 bg-slate-900 border-slate-800 flex flex-col overflow-hidden">
          <CommandConsole
            agentId={selectedAgentCode}
            agentName={selectedAgent?.name}
          />
        </Card>

        {/* Column 3: Artifact Canvas (40%) */}
        <div className="col-span-4">
          <ArtifactCanvas agentId={selectedAgentCode} />
        </div>

      </div>
    </main>
  );
}
