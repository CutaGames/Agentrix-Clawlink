/**
 * Workspace Layout Component
 */

'use client';

import { ReactNode } from 'react';

interface WorkspaceLayoutProps {
  children: ReactNode;
}

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {children}
    </div>
  );
}
