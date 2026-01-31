/**
 * File Explorer Component
 */

'use client';

import { useState, useEffect } from 'react';
import { hqApi } from '@/lib/api';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  language?: string;
  size?: number;
}

interface FileExplorerProps {
  workspaceId: string;
  onFileSelect: (filePath: string) => void;
}

export function FileExplorer({ workspaceId, onFileSelect }: FileExplorerProps) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTree();
  }, [workspaceId]);

  const loadTree = async () => {
    try {
      setLoading(true);
      const data = await hqApi.getFileTree(workspaceId);
      setTree(data);
    } catch (error) {
      console.error('Failed to load file tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getFileIcon = (node: FileNode) => {
    if (node.type === 'directory') {
      return expanded.has(node.path) ? '📂' : '📁';
    }
    
    const iconMap: Record<string, string> = {
      typescript: '🔷',
      javascript: '🟨',
      python: '🐍',
      json: '📋',
      markdown: '📝',
      css: '🎨',
      html: '🌐',
      shell: '💻',
    };
    
    return iconMap[node.language || ''] || '📄';
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expanded.has(node.path);
    const paddingLeft = depth * 16 + 8;

    return (
      <div key={node.path}>
        <div
          className="flex items-center py-1 px-2 hover:bg-gray-800 cursor-pointer text-sm"
          style={{ paddingLeft }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleExpand(node.path);
            } else {
              onFileSelect(node.path);
            }
          }}
        >
          <span className="mr-2 text-xs">{getFileIcon(node)}</span>
          <span className={node.type === 'directory' ? 'text-gray-300' : 'text-gray-400'}>
            {node.name}
          </span>
          {node.type === 'file' && node.size && (
            <span className="ml-auto text-xs text-gray-600">
              {formatSize(node.size)}
            </span>
          )}
        </div>
        {node.type === 'directory' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        Loading files...
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="px-3 py-2 text-xs text-gray-500 uppercase font-medium">
        Explorer
      </div>
      {tree.map(node => renderNode(node))}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
