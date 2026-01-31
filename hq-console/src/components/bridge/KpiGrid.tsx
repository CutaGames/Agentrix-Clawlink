"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Bot, BarChart3, Activity, DollarSign } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  iconColor: string;
}

function KpiCard({ title, value, change, changeLabel, icon, iconColor }: KpiCardProps) {
  const isPositive = change && change > 0;

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-200">{title}</CardTitle>
        <div className={iconColor}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {change !== undefined && (
          <p className={cn(
            "text-xs flex items-center mt-1",
            isPositive ? "text-emerald-500" : "text-red-500"
          )}>
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3 mr-1" />
            ) : (
              <ArrowDownRight className="h-3 w-3 mr-1" />
            )}
            {isPositive ? '+' : ''}{(change * 100).toFixed(1)}% {changeLabel}
          </p>
        )}
        {changeLabel && change === undefined && (
          <p className="text-xs text-slate-400 mt-1">{changeLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function KpiGrid() {
  const { stats, loading } = useDashboardStats();

  if (loading || !stats || stats.revenue24h === undefined) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-slate-900 border-slate-800 animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-slate-800 rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-slate-800 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-800 rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Safe defaults
  const safeStats = {
    revenue24h: stats.revenue24h ?? 0,
    revenueChange: stats.revenueChange ?? 0,
    activeAgents: stats.activeAgents ?? 0,
    totalAgents: stats.totalAgents ?? 0,
    activeMerchants: stats.activeMerchants ?? 0,
    newMerchants24h: stats.newMerchants24h ?? 0,
    riskLevel: stats.riskLevel ?? 'LOW',
    systemHealth: stats.systemHealth ?? 'HEALTHY',
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'text-green-500';
      case 'MEDIUM':
        return 'text-yellow-500';
      case 'HIGH':
        return 'text-red-500';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Total Revenue (24h)"
        value={`$${safeStats.revenue24h.toLocaleString()}`}
        change={safeStats.revenueChange}
        changeLabel="from yesterday"
        icon={<DollarSign className="h-4 w-4" />}
        iconColor="text-emerald-500"
      />
      <KpiCard
        title="Active Agents"
        value={`${safeStats.activeAgents} / ${safeStats.totalAgents}`}
        changeLabel={`${safeStats.totalAgents - safeStats.activeAgents} Agent(s) inactive`}
        icon={<Bot className="h-4 w-4" />}
        iconColor="text-blue-500"
      />
      <KpiCard
        title="Active Merchants"
        value={safeStats.activeMerchants}
        changeLabel={`+${safeStats.newMerchants24h} New onboarded today`}
        icon={<BarChart3 className="h-4 w-4" />}
        iconColor="text-purple-500"
      />
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-200">Risk Level</CardTitle>
          <Activity className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", getRiskColor(safeStats.riskLevel))}>
            {safeStats.riskLevel}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            System {safeStats.systemHealth.toLowerCase()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
