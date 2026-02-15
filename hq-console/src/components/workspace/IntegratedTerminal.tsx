/**
 * Integrated Terminal Component
 * 
 * xterm.js integration for workspace terminal
 */

import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { Terminal, X, Maximize2, Minimize2 } from 'lucide-react';
import { hqApi } from '@/lib/api';
import { runCommand } from '@/lib/tools';

export interface IntegratedTerminalProps {
  workspaceId: string;
  workspaceRootPath?: string;
  isLocal?: boolean;
  onCommand?: (command: string) => void;
  onOutput?: (output: { command: string; output: string; exitCode?: number; cwd?: string }) => void;
}

export const IntegratedTerminal: React.FC<IntegratedTerminalProps> = ({
  workspaceId,
  workspaceRootPath,
  isLocal,
  onCommand,
  onOutput,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const commandBufferRef = useRef('');

  useEffect(() => {
    if (!terminalRef.current) return;

    // 创建终端实例
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        selectionBackground: '#3a3d41',
      },
      rows: 20,
      scrollback: 1000,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // 欢迎信息
    xterm.writeln('\x1b[1;32mAgentrix HQ Terminal\x1b[0m');
    xterm.writeln('\x1b[90mWorkspace: ' + workspaceId + '\x1b[0m');
    if (workspaceRootPath) {
      xterm.writeln('\x1b[90mRoot: ' + workspaceRootPath + '\x1b[0m');
    }
    if (isLocal && workspaceRootPath?.startsWith('local://')) {
      xterm.writeln('\x1b[33mNotice: Local handle workspaces cannot run shell commands.\x1b[0m');
    }
    xterm.writeln('');
    xterm.write('$ ');

    // 处理用户输入
    xterm.onData((data) => {
      switch (data) {
        case '\r': // Enter
          xterm.write('\r\n');
          const command = commandBufferRef.current;
          if (command.trim()) {
            onCommand?.(command);
            executeCommand(command, xterm);
          }
          commandBufferRef.current = '';
          xterm.write('$ ');
          break;
        case '\u007F': // Backspace
          if (commandBufferRef.current.length > 0) {
            commandBufferRef.current = commandBufferRef.current.slice(0, -1);
            xterm.write('\b \b');
          }
          break;
        case '\u0003': // Ctrl+C
          xterm.write('^C\r\n$ ');
          commandBufferRef.current = '';
          break;
        default:
          if (data >= String.fromCharCode(0x20) && data <= String.fromCharCode(0x7E) || data >= '\u00a0') {
            commandBufferRef.current += data;
            xterm.write(data);
          }
      }
    });

    // 窗口大小调整
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      xterm.dispose();
    };
  }, [workspaceId, onCommand]);

  const executeCommand = async (command: string, xterm: XTerm) => {
    try {
      xterm.writeln(`\x1b[90mExecuting: ${command}\x1b[0m`);
      if (isLocal) {
        if (workspaceRootPath?.startsWith('local://')) {
          xterm.writeln('\x1b[33mLocal handle workspaces do not support terminal execution.\x1b[0m');
          onOutput?.({ command, output: 'Local handle workspaces do not support terminal execution.', exitCode: 1 });
          return;
        }
        const response = await runCommand(command, { cwd: workspaceRootPath });
        const output = response.stdout || response.stderr || '';
        xterm.writeln(output.length > 0 ? output : '\x1b[90m(no output)\x1b[0m');
        onOutput?.({ command, output, exitCode: response.exitCode, cwd: workspaceRootPath });
        return;
      }

      const response = await hqApi.executeCommand(command);
      const output = response.output || '';
      xterm.writeln(output.length > 0 ? output : '\x1b[90m(no output)\x1b[0m');
      onOutput?.({ command, output, exitCode: response.exitCode });
    } catch (error: any) {
      xterm.writeln(`\x1b[31mError: ${error.message}\x1b[0m`);
      onOutput?.({ command, output: error.message, exitCode: 1 });
    }
  };

  const handleClear = () => {
    xtermRef.current?.clear();
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
    setTimeout(() => {
      fitAddonRef.current?.fit();
    }, 100);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`
        bg-gray-900 border-t border-gray-700 flex flex-col
        ${isMaximized ? 'fixed inset-0 z-50' : 'h-64'}
      `}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2 text-gray-400">
          <Terminal size={16} />
          <span className="text-sm font-medium">Terminal</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 hover:bg-gray-700 rounded"
          >
            Clear
          </button>
          <button
            onClick={toggleMaximize}
            className="text-gray-400 hover:text-white p-1 hover:bg-gray-700 rounded"
            title={isMaximized ? 'Minimize' : 'Maximize'}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white p-1 hover:bg-gray-700 rounded"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div ref={terminalRef} className="flex-1 p-2" />
    </div>
  );
};

// Hook for terminal visibility management
export function useTerminal() {
  const [isTerminalVisible, setIsTerminalVisible] = useState(false);

  const showTerminal = () => setIsTerminalVisible(true);
  const hideTerminal = () => setIsTerminalVisible(false);
  const toggleTerminal = () => setIsTerminalVisible(prev => !prev);

  return {
    isTerminalVisible,
    showTerminal,
    hideTerminal,
    toggleTerminal,
  };
}
