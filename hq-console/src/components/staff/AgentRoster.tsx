"use client";

import { Badge } from "@/components/ui/badge";
import { useAgents } from "@/hooks/useAgents";
import { cn } from "@/lib/utils";

interface AgentRosterProps {
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
}

export function AgentRoster({ selectedAgentId, onSelectAgent }: AgentRosterProps) {
  const { agents, loading } = useAgents();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-blue-900/30 text-blue-400 hover:bg-blue-900/50">Running</Badge>;
      case 'idle':
        return <Badge className="bg-slate-700/50 text-slate-300 hover:bg-slate-700">Idle</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50">Paused</Badge>;
      case 'error':
        return <Badge className="bg-red-900/30 text-red-400 hover:bg-red-900/50">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleColor = (role: string) => {
    if (role.includes('Sales') || role.includes('Growth')) return 'bg-blue-900 border-blue-700 text-blue-200';
    if (role.includes('Dev') || role.includes('Bug')) return 'bg-purple-900 border-purple-700 text-purple-200';
    if (role.includes('System') || role.includes('Core')) return 'bg-emerald-900 border-emerald-700 text-emerald-200';
    if (role.includes('Market')) return 'bg-orange-900 border-orange-700 text-orange-200';
    if (role.includes('Content')) return 'bg-pink-900 border-pink-700 text-pink-200';
    return 'bg-slate-800 border-slate-700 text-slate-200';
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 rounded-lg bg-slate-800/50 animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-slate-700" />
              <div className="flex-1">
                <div className="h-4 bg-slate-700 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-700 rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {agents.map((agent) => (
        <button
          key={agent.id}
          onClick={() => onSelectAgent(agent.id)}
          className={cn(
            "w-full p-3 rounded-lg text-left transition-colors",
            selectedAgentId === agent.id
              ? "bg-slate-700 ring-1 ring-emerald-500"
              : "bg-slate-800/50 hover:bg-slate-800"
          )}
        >
          <div className="flex items-center space-x-3">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center border",
              getRoleColor(agent.role)
            )}>
              <span className="font-mono text-xs">{agent.id}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-slate-200 truncate">{agent.name}</p>
                {getStatusBadge(agent.status)}
              </div>
              <p className="text-xs text-slate-400 truncate">{agent.role}</p>
            </div>
          </div>
          {agent.currentTask && (
            <p className="mt-2 text-xs text-slate-500 truncate pl-13">
              {agent.currentTask}
            </p>
          )}
          {agent.progress !== undefined && (
            <div className="mt-2 w-full bg-slate-700 rounded-full h-1">
              <div
                className="bg-blue-600 h-1 rounded-full transition-all"
                style={{ width: `${agent.progress}%` }}
              />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
