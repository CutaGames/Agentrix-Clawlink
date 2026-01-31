"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/engine/DataTable";
import { useMerchants, Merchant } from "@/hooks/useEngine";
import { Store, Plus, CheckCircle, Clock, XCircle, DollarSign } from "lucide-react";

const columns: ColumnDef<Merchant>[] = [
  {
    accessorKey: "name",
    header: "Merchant",
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-white">{row.original.name}</div>
        <div className="text-xs text-slate-400">{row.original.email}</div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge className={
          status === 'active' ? 'bg-emerald-900/30 text-emerald-400' :
          status === 'suspended' ? 'bg-red-900/30 text-red-400' :
          'bg-yellow-900/30 text-yellow-400'
        }>
          {status === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
          {status === 'suspended' && <XCircle className="h-3 w-3 mr-1" />}
          {status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "kycStatus",
    header: "KYC",
    cell: ({ row }) => {
      const kyc = row.original.kycStatus;
      return (
        <Badge variant="outline" className={
          kyc === 'approved' ? 'border-emerald-500 text-emerald-400' :
          kyc === 'rejected' ? 'border-red-500 text-red-400' :
          kyc === 'pending' ? 'border-yellow-500 text-yellow-400' :
          'border-slate-500 text-slate-400'
        }>
          {kyc === 'none' ? 'Not Started' : kyc.charAt(0).toUpperCase() + kyc.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "revenue",
    header: "Revenue",
    cell: ({ row }) => (
      <div className="flex items-center text-emerald-400">
        <DollarSign className="h-3 w-3 mr-1" />
        {row.original.revenue.toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: "productCount",
    header: "Products",
    cell: ({ row }) => (
      <span className="text-slate-300">{row.original.productCount}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) => (
      <span className="text-slate-400 text-sm">
        {new Date(row.original.createdAt).toLocaleDateString()}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex space-x-2">
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
          View
        </Button>
        {row.original.kycStatus === 'pending' && (
          <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
            Approve KYC
          </Button>
        )}
        {row.original.status !== 'suspended' ? (
          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
            Suspend
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
            Reactivate
          </Button>
        )}
      </div>
    ),
  },
];

export default function MerchantsPage() {
  const { merchants, loading } = useMerchants();

  const stats = {
    total: merchants.length,
    active: merchants.filter(m => m.status === 'active').length,
    pending: merchants.filter(m => m.status === 'pending').length,
    totalRevenue: merchants.reduce((sum, m) => sum + m.revenue, 0),
  };

  return (
    <main className="flex min-h-screen flex-col p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Merchant Management <span className="text-slate-500 font-mono text-xl">Engine Room</span>
          </h1>
          <p className="text-slate-400 mt-1">
            <Store className="inline h-4 w-4 mr-1" />
            Manage merchants, KYC approvals, and revenue tracking
          </p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-2 h-4 w-4" /> Invite Merchant
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Total Merchants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-400">Active</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-yellow-400">Pending Approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-400">Total Revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">${stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">All Merchants</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={merchants}
            searchKey="name"
            searchPlaceholder="Search by merchant name..."
            loading={loading}
          />
        </CardContent>
      </Card>
    </main>
  );
}
