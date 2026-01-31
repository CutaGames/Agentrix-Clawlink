"use client"

import * as React from "react"

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function Tabs({ 
  defaultValue, 
  value, 
  onValueChange, 
  children, 
  className = "",
  ...props 
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  
  const activeTab = value !== undefined ? value : internalValue;
  const setActiveTab = React.useCallback((newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  }, [value, onValueChange]);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={`w-full ${className}`} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider");
  }
  return context;
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function TabsList({ children, className = "", ...props }: TabsListProps) {
  return (
    <div 
      className={`inline-flex h-10 items-center justify-center rounded-md bg-slate-800/50 p-1 text-slate-400 ${className}`}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
}

export function TabsTrigger({ value, children, className = "", ...props }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      className={`
        inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5
        text-sm font-medium ring-offset-background transition-all
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        disabled:pointer-events-none disabled:opacity-50
        ${isActive 
          ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm" 
          : "text-slate-400 hover:text-white hover:bg-slate-700/50"
        }
        ${className}
      `}
      onClick={() => setActiveTab(value)}
      {...props}
    >
      {children}
    </button>
  );
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
}

export function TabsContent({ value, children, className = "", ...props }: TabsContentProps) {
  const { activeTab } = useTabsContext();
  
  if (activeTab !== value) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      data-state="active"
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
