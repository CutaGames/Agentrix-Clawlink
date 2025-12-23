import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ViewMode } from '../types/agent';

interface WorkbenchContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selection: string[];
  setSelection: (ids: string[]) => void;
  workspaceData: any;
  setWorkspaceData: (data: any) => void;
  isChatExpanded: boolean;
  setIsChatExpanded: (expanded: boolean) => void;
}

const WorkbenchContext = createContext<WorkbenchContextType | undefined>(undefined);

export const WorkbenchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [selection, setSelection] = useState<string[]>([]);
  const [workspaceData, setWorkspaceData] = useState<any>(null);
  const [isChatExpanded, setIsChatExpanded] = useState<boolean>(true);

  return (
    <WorkbenchContext.Provider
      value={{
        viewMode,
        setViewMode,
        selection,
        setSelection,
        workspaceData,
        setWorkspaceData,
        isChatExpanded,
        setIsChatExpanded,
      }}
    >
      {children}
    </WorkbenchContext.Provider>
  );
};

export const useWorkbench = () => {
  const context = useContext(WorkbenchContext);
  if (context === undefined) {
    throw new Error('useWorkbench must be used within a WorkbenchProvider');
  }
  return context;
};
