"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Server, Zap, Bell, Shield, Database, RefreshCw, Activity } from "lucide-react";
import { useRealtime } from '@/hooks/useRealtime';

interface SystemConfig {
  watchdogEnabled: boolean;
  alertsEnabled: boolean;
  autoRefundEnabled: boolean;
  maintenanceMode: boolean;
}

export default function SystemPage() {
  const { isConnected, stats, lastUpdate } = useRealtime();
  
  const [config, setConfig] = useState<SystemConfig>({
    watchdogEnabled: true,
    alertsEnabled: true,
    autoRefundEnabled: true,
    maintenanceMode: false,
  });

  const toggleConfig = (key: keyof SystemConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <main className="flex min-h-screen flex-col p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-400 to-slate-200">
            System Configuration <span className="text-slate-500 font-mono text-xl">Engine Room</span>
          </h1>
          <p className="text-slate-400 mt-1">
            <Settings className="inline h-4 w-4 mr-1" />
            Manage automation, alerts, and system settings
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <Card className="bg-slate-900 border-slate-800 mb-8">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Activity className="h-5 w-5 mr-2 text-emerald-500" />
            Real-time Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Badge className={isConnected ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}>
                {isConnected ? '● Connected' : '○ Disconnected'}
              </Badge>
              {lastUpdate && (
                <span className="text-slate-400 text-sm">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
            {stats && (
              <div className="text-slate-300 text-sm">
                System: <span className={stats.systemHealth === 'HEALTHY' ? 'text-emerald-400' : 'text-yellow-400'}>{stats.systemHealth}</span>
                {' | '}
                Risk: <span className={stats.riskLevel === 'LOW' ? 'text-emerald-400' : stats.riskLevel === 'MEDIUM' ? 'text-yellow-400' : 'text-red-400'}>{stats.riskLevel}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Automation Controls */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-500" />
              Watchdog Service
            </CardTitle>
            <CardDescription className="text-slate-400">
              Automated monitoring and health checks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Status</span>
                <Badge className={config.watchdogEnabled ? 'bg-emerald-900/30 text-emerald-400' : 'bg-slate-700 text-slate-400'}>
                  {config.watchdogEnabled ? 'Active' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Agent Health Check</span>
                <span className="text-slate-400 text-sm">Every 1 minute</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Risk Monitor</span>
                <span className="text-slate-400 text-sm">Every 5 minutes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Daily Report</span>
                <span className="text-slate-400 text-sm">00:00 UTC</span>
              </div>
              <Button 
                onClick={() => toggleConfig('watchdogEnabled')}
                className={config.watchdogEnabled ? 'bg-red-600 hover:bg-red-700 w-full' : 'bg-emerald-600 hover:bg-emerald-700 w-full'}
              >
                {config.watchdogEnabled ? 'Disable Watchdog' : 'Enable Watchdog'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Bell className="h-5 w-5 mr-2 text-blue-500" />
              Alert System
            </CardTitle>
            <CardDescription className="text-slate-400">
              Real-time notifications and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Push Notifications</span>
                <Badge className={config.alertsEnabled ? 'bg-emerald-900/30 text-emerald-400' : 'bg-slate-700 text-slate-400'}>
                  {config.alertsEnabled ? 'On' : 'Off'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Email Alerts</span>
                <span className="text-slate-400 text-sm">Critical only</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Slack Integration</span>
                <Badge variant="outline" className="border-slate-600 text-slate-400">Not configured</Badge>
              </div>
              <Button 
                onClick={() => toggleConfig('alertsEnabled')}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 w-full"
              >
                {config.alertsEnabled ? 'Mute Alerts' : 'Enable Alerts'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Shield className="h-5 w-5 mr-2 text-purple-500" />
              Auto-Refund Rules
            </CardTitle>
            <CardDescription className="text-slate-400">
              Automated refund processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Auto-Refund</span>
                <Badge className={config.autoRefundEnabled ? 'bg-emerald-900/30 text-emerald-400' : 'bg-slate-700 text-slate-400'}>
                  {config.autoRefundEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Max Amount</span>
                <span className="text-slate-400 text-sm">$50.00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Timeout Trigger</span>
                <span className="text-slate-400 text-sm">24 hours</span>
              </div>
              <Button 
                onClick={() => toggleConfig('autoRefundEnabled')}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 w-full"
              >
                Configure Rules
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Server className="h-5 w-5 mr-2 text-orange-500" />
              Maintenance Mode
            </CardTitle>
            <CardDescription className="text-slate-400">
              System maintenance controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Status</span>
                <Badge className={config.maintenanceMode ? 'bg-orange-900/30 text-orange-400' : 'bg-emerald-900/30 text-emerald-400'}>
                  {config.maintenanceMode ? 'Maintenance' : 'Operational'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Database</span>
                <Badge variant="outline" className="border-emerald-500 text-emerald-400">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Cache</span>
                <Badge variant="outline" className="border-emerald-500 text-emerald-400">Healthy</Badge>
              </div>
              <Button 
                onClick={() => toggleConfig('maintenanceMode')}
                className={config.maintenanceMode ? 'bg-emerald-600 hover:bg-emerald-700 w-full' : 'bg-orange-600 hover:bg-orange-700 w-full'}
              >
                {config.maintenanceMode ? 'Exit Maintenance' : 'Enter Maintenance'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <RefreshCw className="mr-2 h-4 w-4" /> Clear Cache
            </Button>
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <Database className="mr-2 h-4 w-4" /> Run Migrations
            </Button>
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <Activity className="mr-2 h-4 w-4" /> View Logs
            </Button>
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <Shield className="mr-2 h-4 w-4" /> Security Audit
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
