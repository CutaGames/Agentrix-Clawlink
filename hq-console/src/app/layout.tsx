"use client";

import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { useState } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <html lang="en">
      <head>
        <title>Agentrix CEO HQ</title>
        <meta name="description" content="Command center for Agentrix team management" />
      </head>
      <body className="bg-slate-950 text-slate-100">
        <Sidebar />
        <main className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
          {children}
        </main>
      </body>
    </html>
  )
}
