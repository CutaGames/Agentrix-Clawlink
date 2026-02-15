/**
 * Terminal Component
 * 
 * xterm.js 集成 - 交互式终端
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface TerminalProps {
  onCommand?: (command: string) => void;
  onClose?: () => void;
  initialCwd?: string;
}

export function Terminal({ onCommand, onClose, initialCwd }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const commandBufferRef = useRef('');

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      allowProposedApi: true,
    });

    // Add fit addon
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Add web links addon
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(webLinksAddon);

    // Open terminal
    term.open(terminalRef.current);
    fitAddon.fit();

    // Save references
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome message
    term.writeln('\x1b[1;32m┌─────────────────────────────────────────┐\x1b[0m');
    term.writeln('\x1b[1;32m│  Agentrix HQ Workspace Terminal         │\x1b[0m');
    term.writeln('\x1b[1;32m└─────────────────────────────────────────┘\x1b[0m');
    term.writeln('');
    if (initialCwd) {
      term.writeln(`\x1b[90mWorking directory: ${initialCwd}\x1b[0m`);
    }
    term.writeln('');
    term.write('$ ');

    // Handle input
    term.onData(data => {
      const code = data.charCodeAt(0);

      // Enter key
      if (code === 13) {
        const command = commandBufferRef.current.trim();
        term.write('\r\n');
        
        if (command) {
          onCommand?.(command);
        }
        
        commandBufferRef.current = '';
        term.write('$ ');
        return;
      }

      // Backspace
      if (code === 127) {
        if (commandBufferRef.current.length > 0) {
          commandBufferRef.current = commandBufferRef.current.slice(0, -1);
          term.write('\b \b');
        }
        return;
      }

      // Ctrl+C
      if (code === 3) {
        term.write('^C\r\n$ ');
        commandBufferRef.current = '';
        return;
      }

      // Ctrl+L (clear)
      if (code === 12) {
        term.clear();
        term.write('$ ' + commandBufferRef.current);
        return;
      }

      // Printable characters
      if (code >= 32 && code < 127) {
        commandBufferRef.current += data;
        term.write(data);
      }
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [onCommand, initialCwd]);

  // Write output to terminal
  const write = (text: string) => {
    if (!xtermRef.current) return;
    xtermRef.current.write(text);
  };

  // Write line to terminal
  const writeln = (text: string) => {
    if (!xtermRef.current) return;
    xtermRef.current.writeln(text);
  };

  // Clear terminal
  const clear = () => {
    if (!xtermRef.current) return;
    xtermRef.current.clear();
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
    setTimeout(() => {
      fitAddonRef.current?.fit();
    }, 50);
  };

  // Expose methods to parent via ref
  useEffect(() => {
    if (terminalRef.current) {
      (terminalRef.current as any).terminalMethods = {
        write,
        writeln,
        clear,
      };
    }
  }, []);

  return (
    <div 
      className={`
        bg-gray-900 border border-gray-700 rounded-lg overflow-hidden
        flex flex-col
        ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}
      `}
    >
      {/* Terminal header */}
      <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-3">
        <span className="text-xs text-gray-400 font-mono">Terminal</span>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleFullscreen}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              title="Close terminal"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal content */}
      <div 
        ref={terminalRef} 
        className="flex-1 p-2 overflow-hidden"
        style={{ minHeight: isFullscreen ? 'calc(100vh - 2rem)' : '300px' }}
      />
    </div>
  );
}

/**
 * Hook to manage terminal instances
 */
export function useTerminal() {
  const [terminals, setTerminals] = useState<Array<{ id: string; cwd: string }>>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

  const createTerminal = (cwd: string = '') => {
    const id = `term-${Date.now()}-${Math.random()}`;
    setTerminals(prev => [...prev, { id, cwd }]);
    setActiveTerminalId(id);
    return id;
  };

  const closeTerminal = (id: string) => {
    setTerminals(prev => {
      const newTerminals = prev.filter(t => t.id !== id);
      
      if (activeTerminalId === id && newTerminals.length > 0) {
        setActiveTerminalId(newTerminals[newTerminals.length - 1].id);
      } else if (newTerminals.length === 0) {
        setActiveTerminalId(null);
      }
      
      return newTerminals;
    });
  };

  return {
    terminals,
    activeTerminalId,
    createTerminal,
    closeTerminal,
    setActiveTerminalId,
  };
}
