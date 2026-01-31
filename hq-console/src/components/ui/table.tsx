import * as React from "react"

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export function Table({ children, className = "", ...props }: TableProps) {
  return (
    <div className="relative w-full overflow-auto">
      <table 
        className={`w-full caption-bottom text-sm ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function TableHeader({ children, className = "", ...props }: TableHeaderProps) {
  return (
    <thead className={`[&_tr]:border-b border-slate-700 ${className}`} {...props}>
      {children}
    </thead>
  );
}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function TableBody({ children, className = "", ...props }: TableBodyProps) {
  return (
    <tbody className={`[&_tr:last-child]:border-0 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function TableFooter({ children, className = "", ...props }: TableFooterProps) {
  return (
    <tfoot 
      className={`border-t border-slate-700 bg-slate-800/50 font-medium [&>tr]:last:border-b-0 ${className}`}
      {...props}
    >
      {children}
    </tfoot>
  );
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

export function TableRow({ children, className = "", ...props }: TableRowProps) {
  return (
    <tr 
      className={`border-b border-slate-700/50 transition-colors hover:bg-slate-800/50 data-[state=selected]:bg-slate-800 ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
}

export function TableHead({ children, className = "", ...props }: TableHeadProps) {
  return (
    <th 
      className={`h-12 px-4 text-left align-middle font-medium text-slate-400 [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
}

export function TableCell({ children, className = "", ...props }: TableCellProps) {
  return (
    <td 
      className={`p-4 align-middle text-slate-300 [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}

interface TableCaptionProps extends React.HTMLAttributes<HTMLTableCaptionElement> {
  children: React.ReactNode;
}

export function TableCaption({ children, className = "", ...props }: TableCaptionProps) {
  return (
    <caption className={`mt-4 text-sm text-slate-400 ${className}`} {...props}>
      {children}
    </caption>
  );
}
