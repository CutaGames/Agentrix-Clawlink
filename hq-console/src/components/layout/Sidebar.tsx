"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Bot,
  ShieldAlert,
  Package,
  DollarSign,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  Shield,
  Book,
  Code,
  Wrench,
  MessageSquare,
  Radio,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { name: "Bridge", href: "/", icon: LayoutDashboard, description: "总览" },
  { name: "Staff", href: "/staff", icon: Bot, description: "作战室" },
  { name: "Agents", href: "/agents", icon: Bot, description: "Agent 管理" },
  { name: "Skills", href: "/skills", icon: Wrench, description: "技能包" },
  { name: "Remote", href: "/remote", icon: Radio, description: "远程控制" },
  { name: "───────", href: "#", icon: null, description: "Engine Room" },
  { name: "Users", href: "/engine/users", icon: Users, description: "用户管理" },
  { name: "Merchants", href: "/engine/merchants", icon: Package, description: "商户管理" },
  { name: "Products", href: "/engine/products", icon: Zap, description: "产品管理" },
  { name: "Risk", href: "/engine/risk", icon: ShieldAlert, description: "风控中心" },
  { name: "Finance", href: "/engine/finance", icon: DollarSign, description: "财务账本" },
  { name: "Protocols", href: "/engine/protocols", icon: Shield, description: "协议审核" },
  { name: "System", href: "/engine/system", icon: Settings, description: "系统配置" },
  { name: "───────", href: "#", icon: null, description: "Tools" },
  { name: "Knowledge", href: "/tools/knowledge", icon: Book, description: "知识库" },
  { name: "Workspace", href: "/tools/workspace", icon: Code, description: "IDE 编程" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen transition-all duration-300 bg-slate-900 border-r border-slate-800",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <Zap className="h-6 w-6 text-emerald-500" />
            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Agentrix HQ
            </span>
          </div>
        )}
        {collapsed && <Zap className="h-6 w-6 text-emerald-500 mx-auto" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          if (item.icon === null) {
            // Separator
            return collapsed ? null : (
              <div key={item.name} className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {item.description}
              </div>
            );
          }

          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-emerald-500" : "")} />
              {!collapsed && <span className="ml-3">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-4">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center">
              <span className="text-xs font-bold text-white">CEO</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">CEO Mode</p>
              <p className="text-xs text-emerald-400">24/7 Automated</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center mx-auto">
            <span className="text-xs font-bold text-white">CEO</span>
          </div>
        )}
      </div>
    </aside>
  );
}
