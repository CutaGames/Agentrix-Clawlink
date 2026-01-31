"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/engine/DataTable";
import { useProducts, Product } from "@/hooks/useEngine";
import { Package, Plus, CheckCircle, Clock, XCircle, DollarSign } from "lucide-react";

const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-white">{row.original.name}</div>
        <div className="text-xs text-slate-400">{row.original.merchantName}</div>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="outline" className="border-slate-600 text-slate-300">
        {row.original.category}
      </Badge>
    ),
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => (
      <div className="flex items-center text-emerald-400">
        <DollarSign className="h-3 w-3" />
        {row.original.price.toFixed(2)}
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
          status === 'rejected' ? 'bg-red-900/30 text-red-400' :
          status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
          'bg-slate-700 text-slate-400'
        }>
          {status === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
          {status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
          {status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "salesCount",
    header: "Sales",
    cell: ({ row }) => (
      <span className="text-slate-300">{row.original.salesCount}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
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
        {row.original.status === 'pending' && (
          <>
            <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
              Approve
            </Button>
            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
              Reject
            </Button>
          </>
        )}
        {row.original.status === 'active' && (
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-300">
            Archive
          </Button>
        )}
      </div>
    ),
  },
];

export default function ProductsPage() {
  const { products, loading } = useProducts();

  const stats = {
    total: products.length,
    active: products.filter(p => p.status === 'active').length,
    pending: products.filter(p => p.status === 'pending').length,
    totalSales: products.reduce((sum, p) => sum + p.salesCount, 0),
  };

  return (
    <main className="flex min-h-screen flex-col p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Product Management <span className="text-slate-500 font-mono text-xl">Engine Room</span>
          </h1>
          <p className="text-slate-400 mt-1">
            <Package className="inline h-4 w-4 mr-1" />
            Review and manage marketplace products and AI skills
          </p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Total Products</CardDescription>
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
            <CardDescription className="text-yellow-400">Pending Review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-purple-400">Total Sales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{stats.totalSales}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">All Products</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={products}
            searchKey="name"
            searchPlaceholder="Search products..."
            loading={loading}
          />
        </CardContent>
      </Card>
    </main>
  );
}
