"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/engine/DataTable";
import { useRiskAlerts, RiskAlert } from "@/hooks/useEngine";
import { ShieldAlert, AlertTriangle, CheckCircle, Eye, XCircle } from "lucide-react";

const columns: ColumnDef<RiskAlert>[] = [
  {
    accessorKey: "severity",
    header: "Severity",
    cell: ({ row }) => {
      const severity = row.original.severity;
      return (
        <Badge className={
          severity === 'critical' ? 'bg-red-600 text-white' :
          severity === 'high' ? 'bg-orange-600 text-white' :
          severity === 'medium' ? 'bg-yellow-600 text-black' :
          'bg-slate-600 text-white'
        }>
          {severity.toUpperCase()}
        </Badge>
      );
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <span className="text-slate-300 capitalize">{row.original.type.replace('_', ' ')}</span>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <div className="max-w-md">
        <p className="text-slate-200 truncate">{row.original.description}</p>
        {(row.original.userId || row.original.merchantId) && (
          <p className="text-xs text-slate-500 mt-1">
            {row.original.userId && `User: ${row.original.userId}`}
            {row.original.userId && row.original.merchantId && ' | '}
            {row.original.merchantId && `Merchant: ${row.original.merchantId}`}
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant="outline" className={
          status === 'open' ? 'border-red-500 text-red-400' :
          status === 'investigating' ? 'border-yellow-500 text-yellow-400' :
          status === 'resolved' ? 'border-emerald-500 text-emerald-400' :
          'border-slate-500 text-slate-400'
        }>
          {status === 'open' && <AlertTriangle className="h-3 w-3 mr-1" />}
          {status === 'investigating' && <Eye className="h-3 w-3 mr-1" />}
          {status === 'resolved' && <CheckCircle className="h-3 w-3 mr-1" />}
          {status === 'dismissed' && <XCircle className="h-3 w-3 mr-1" />}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Time",
    cell: ({ row }) => (
      <span className="text-slate-400 text-sm">
        {new Date(row.original.createdAt).toLocaleString()}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex space-x-2">
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
          Investigate
        </Button>
        {row.original.status === 'open' && (
          <>
            <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
              Resolve
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-300">
              Dismiss
            </Button>
          </>
        )}
      </div>
    ),
  },
];

export default function RiskPage() {
  const { alerts, loading } = useRiskAlerts();

  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    open: alerts.filter(a => a.status === 'open').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
  };

  return (
    <main className="flex min-h-screen flex-col p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
            Risk Center <span className="text-slate-500 font-mono text-xl">Engine Room</span>
          </h1>
          <p className="text-slate-400 mt-1">
            <ShieldAlert className="inline h-4 w-4 mr-1" />
            Monitor and respond to security threats and fraud alerts
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Total Alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-red-900/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-red-400">Critical</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{stats.critical}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-yellow-400">Open</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{stats.open}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-400">Resolved</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Active Risk Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={alerts}
            searchKey="description"
            searchPlaceholder="Search alerts..."
            loading={loading}
          />
        </CardContent>
      </Card>
    </main>
  );
}
