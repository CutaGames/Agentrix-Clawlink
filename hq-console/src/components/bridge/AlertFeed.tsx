"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ArrowUpRight, ShieldAlert, Zap } from "lucide-react";
import { useAlerts, formatTimeAgo } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";

export function AlertFeed() {
  const { alerts, loading } = useAlerts(10);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'risk':
        return <ShieldAlert className="h-4 w-4" />;
      case 'biz':
        return <ArrowUpRight className="h-4 w-4" />;
      case 'sys':
        return <Zap className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'risk':
        return 'bg-red-900/50 text-red-500';
      case 'biz':
        return 'bg-blue-900/50 text-blue-500';
      case 'sys':
        return 'bg-emerald-900/50 text-emerald-500';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-xl text-white">Alert Feed</CardTitle>
          <CardDescription className="text-slate-400">Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-4 animate-pulse">
                <div className="h-6 w-6 rounded-full bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-1/3" />
                  <div className="h-3 bg-slate-800 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-xl text-white">Alert Feed</CardTitle>
        <CardDescription className="text-slate-400">Real-time intelligence from the field.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "flex items-start space-x-4 border-b border-slate-800 pb-3 last:border-0",
                !alert.read && "bg-slate-800/30 -mx-2 px-2 rounded-lg"
              )}
            >
              <div className={cn("mt-1 p-1 rounded-full", getAlertColor(alert.type))}>
                {getAlertIcon(alert.type)}
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium leading-none text-slate-200">{alert.title}</p>
                  {!alert.read && (
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                  )}
                </div>
                <p className="text-xs text-slate-400">{alert.message}</p>
                <p className="text-[10px] text-slate-600 uppercase font-mono">
                  {formatTimeAgo(alert.timestamp)}
                </p>
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No alerts</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
