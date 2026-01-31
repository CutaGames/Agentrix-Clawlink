import * as React from "react"

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className = "", ...props }: TextareaProps) {
  return (
    <textarea
      className={`
        flex min-h-[80px] w-full rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2
        text-sm text-slate-100 placeholder:text-slate-400
        ring-offset-background
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        resize-none
        ${className}
      `}
      {...props}
    />
  );
}
