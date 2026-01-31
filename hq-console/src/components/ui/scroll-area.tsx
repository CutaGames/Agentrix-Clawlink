"use client"

import * as React from "react"

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ScrollArea({ children, className = "", ...props }: ScrollAreaProps) {
  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      <div className="h-full w-full overflow-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {children}
      </div>
    </div>
  );
}

interface ScrollBarProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal";
}

export function ScrollBar({ 
  orientation = "vertical", 
  className = "", 
  ...props 
}: ScrollBarProps) {
  return (
    <div
      className={`
        flex touch-none select-none transition-colors
        ${orientation === "vertical" 
          ? "h-full w-2.5 border-l border-l-transparent p-[1px]" 
          : "h-2.5 flex-col border-t border-t-transparent p-[1px]"
        }
        ${className}
      `}
      {...props}
    />
  );
}
