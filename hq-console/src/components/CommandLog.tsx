"use client";

import React, { useState, useEffect } from "react";
import { Terminal } from "lucide-react";

export function CommandLog() {
  const [time, setTime] = useState("");

  useEffect(() => {
    setTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const logs = [
    { time: "10:04:21", source: "架构师", msg: "正在同步 UCP 跨链身份索引。" },
    { time: "10:05:12", source: "代码员", msg: "扫描 src/protocols 查找 X402 实现缺口。" },
    { time: "10:05:45", source: "增长官", msg: "监测到 'autonomous payments' 社交提及量激增。" },
    { time: "10:06:01", source: "商务官", msg: "重试连接商户 API... 状态：成功。" },
  ];

  return (
    <div className="bg-black/40 border border-slate-800 rounded-xl p-4 font-mono text-[10px]">
      <div className="flex items-center gap-2 mb-3 text-slate-500 border-b border-slate-800 pb-2">
        <Terminal className="w-3 h-3" />
        <span className="uppercase tracking-widest">全局事件流 (Global Stream)</span>
      </div>
      <div className="space-y-1">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-slate-600">[{log.time}]</span>
            <span className="text-indigo-400 font-bold">{log.source}:</span>
            <span className="text-slate-300">{log.msg}</span>
          </div>
        ))}
        <div className="flex gap-2">
          <span className="text-slate-600">[{time || "--:--:--"}]</span>
          <span className="text-emerald-400 font-bold">系统:</span>
          <span className="text-slate-300 animate-pulse">正在监控 Agent 矩阵动态...</span>
        </div>
      </div>
    </div>
  );
}
