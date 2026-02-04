"use client";

import { Button } from "@/components/ui/button"
import { Bot, Zap } from "lucide-react"
import { KpiGrid } from "@/components/bridge/KpiGrid"
import { AlertFeed } from "@/components/bridge/AlertFeed"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAgents } from "@/hooks/useAgents"
import { ShieldAlert, DollarSign } from "lucide-react"

export default function HqDashboard() {
  const { agents } = useAgents();

  return (
    <main className="flex min-h-screen flex-col p-6 md:p-8">
      {/* Header / Operations Room Title */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            CEO Command Room <span className="text-slate-500 font-mono text-xl">V2.0</span>
          </h1>
          <p className="text-slate-400 mt-1">Operational Mode: <span className="text-emerald-400 font-mono font-bold">AUTOMATED (24/7)</span></p>
        </div>
        <div className="flex space-x-4">
          <Button variant="outline" className="text-slate-200 border-slate-700 hover:bg-slate-800">
            <Zap className="mr-2 h-4 w-4 text-yellow-400" /> Emergency Stop
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Bot className="mr-2 h-4 w-4" /> Deploy New Agent
          </Button>
        </div>
      </div>

      {/* Layer 1: The Radar (Status Overview) */}
      <KpiGrid />

      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-7 mt-8">
        
        {/* Layer 2: Alert Feed (The Radar) */}
        <div className="col-span-3">
          <AlertFeed />
        </div>

        {/* Layer 3: Active Operations (The Workbench Preview) */}
        <Card className="col-span-4 bg-slate-900 border-slate-800">
           <CardHeader>
            <CardTitle className="text-xl text-white">Agent Activity Log</CardTitle>
            <CardDescription className="text-slate-400">What your team is working on right now.</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="space-y-6">
                {agents.slice(0, 3).map((agent) => (
                  <div key={agent.id} className="flex items-center">
                    {(() => {
                      const initials = agent.name
                        ?.split(' ')
                        .map(part => part.charAt(0))
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || 'AG';
                      return (
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center mr-4 border ${
                      agent.role.includes('Sales') ? 'bg-blue-900 border-blue-700' :
                      agent.role.includes('Dev') ? 'bg-purple-900 border-purple-700' :
                      'bg-emerald-900 border-emerald-700'
                    }`}>
                      <span className={`font-mono text-xs ${
                        agent.role.includes('Sales') ? 'text-blue-200' :
                        agent.role.includes('Dev') ? 'text-purple-200' :
                        'text-emerald-200'
                      }`}>{initials}</span>
                    </div>
                      );
                    })()}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-200">{agent.name} ({agent.role})</p>
                        <Badge variant="secondary" className={`${
                          agent.status === 'running' ? 'bg-blue-900/30 text-blue-400' :
                          agent.status === 'paused' ? 'bg-yellow-900/30 text-yellow-400' :
                          agent.status === 'error' ? 'bg-red-900/30 text-red-400' :
                          'bg-emerald-900/30 text-emerald-400'
                        }`}>
                          {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400">{agent.currentTask || 'No active task'}</p>
                      {agent.progress !== undefined && (
                        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${agent.progress}%` }}></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
             </div>
             
             <div className="mt-8 pt-6 border-t border-slate-800">
                <h4 className="text-sm font-medium text-slate-400 mb-4">Quick Actions (Manual Override)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 justify-start">
                    <ShieldAlert className="mr-2 h-4 w-4" /> Review Banned Users
                  </Button>
                  <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 justify-start">
                    <DollarSign className="mr-2 h-4 w-4" /> Approve Refunds ($500+)
                  </Button>
                </div>
             </div>

           </CardContent>
        </Card>

      </div>
    </main>
  )
}
