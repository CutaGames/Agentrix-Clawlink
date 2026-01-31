"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/engine/DataTable";
import { useTransactions, Transaction } from "@/hooks/useEngine";
import { DollarSign, ArrowUpRight, ArrowDownRight, RefreshCw, Percent } from "lucide-react";

const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.type;
      const icons = {
        payment: <ArrowUpRight className="h-4 w-4 text-emerald-400" />,
        refund: <ArrowDownRight className="h-4 w-4 text-red-400" />,
        payout: <ArrowDownRight className="h-4 w-4 text-blue-400" />,
        fee: <Percent className="h-4 w-4 text-purple-400" />,
      };
      return (
        <div className="flex items-center space-x-2">
          {icons[type]}
          <span className="capitalize text-slate-300">{type}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const amount = row.original.amount;
      const isNegative = amount < 0;
      return (
        <span className={isNegative ? 'text-red-400' : 'text-emerald-400'}>
          {isNegative ? '' : '+'}${Math.abs(amount).toFixed(2)} {row.original.currency}
        </span>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="text-slate-200">{row.original.description}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge className={
          status === 'completed' ? 'bg-emerald-900/30 text-emerald-400' :
          status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
          'bg-red-900/30 text-red-400'
        }>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Date",
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
          View
        </Button>
        {row.original.type === 'payment' && row.original.status === 'completed' && (
          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
            Refund
          </Button>
        )}
      </div>
    ),
  },
];

export default function FinancePage() {
  const { transactions, loading } = useTransactions();

  const stats = {
    totalIncome: transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
    totalOutflow: Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)),
    pendingPayouts: transactions.filter(t => t.type === 'payout' && t.status === 'pending').length,
    totalTransactions: transactions.length,
  };

  return (
    <main className="flex min-h-screen flex-col p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">
            Finance Ledger <span className="text-slate-500 font-mono text-xl">Engine Room</span>
          </h1>
          <p className="text-slate-400 mt-1">
            <DollarSign className="inline h-4 w-4 mr-1" />
            Track payments, refunds, payouts, and platform fees
          </p>
        </div>
        <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <RefreshCw className="mr-2 h-4 w-4" /> Sync Transactions
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-400">Total Income</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">+${stats.totalIncome.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-red-400">Total Outflow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">-${stats.totalOutflow.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-400">Net</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              ${(stats.totalIncome - stats.totalOutflow).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-yellow-400">Pending Payouts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{stats.pendingPayouts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={transactions}
            searchKey="description"
            searchPlaceholder="Search transactions..."
            loading={loading}
          />
        </CardContent>
      </Card>
    </main>
  );
}
