/**
 * File Explorer Component
 */

'use client';

import { useState, useEffect } from 'react';
import { hqApi } from '@/lib/api';
import { listDir } from '@/lib/tools';

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
  workspaceRootPath?: string;
  isLocal?: boolean;
  onFileSelect: (filePath: string) => void;
}

export function FileExplorer({ workspaceId, workspaceRootPath, isLocal, onFileSelect }: FileExplorerProps) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTree();
  }, [workspaceId, workspaceRootPath, isLocal]);

  const getLocalHandle = () => {
    return (window as any)?.__hqLocalWorkspaceHandles?.[workspaceId] || null;
  };

  const loadTree = async () => {
    try {
      setLoading(true);
      setError(null);
      const localHandle = getLocalHandle();
      if (isLocal && workspaceRootPath?.startsWith('local://')) {
        if (!localHandle) {
          setTree([]);
          setError('Local workspace handle is missing. Please re-select the folder.');
          return;
        }
        const items: FileNode[] = [];
        for await (const [name, handle] of (localHandle as any).entries()) {
          items.push({
            name,
            path: name,
            type: handle.kind === 'directory' ? 'directory' : 'file',
          });
        }
        setTree(items);
        return;
      }
      if (isLocal && workspaceRootPath) {
        const data = await listDir(workspaceRootPath, { recursive: false, maxDepth: 1 });
        const nodes = data.items.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type,
        }));
        setTree(nodes);
        return;
      }

      const data = await hqApi.getFileTree(workspaceId);
      setTree(data);
    } catch (error) {
      console.error('Failed to load file tree:', error);
      setError(error instanceof Error ? error.message : 'Failed to load file tree');
    } finally {
      setLoading(false);
    }
  };

  const hydrateChildren = async (node: FileNode) => {
    if (!isLocal || node.type !== 'directory') return;
    if (node.children && node.children.length > 0) return;
    try {
      const localHandle = getLocalHandle();
      if (workspaceRootPath?.startsWith('local://')) {
        if (!localHandle) return;
        const dirHandle = await getDirectoryHandle(localHandle as FileSystemDirectoryHandle, node.path);
        if (!dirHandle) return;
        const children: FileNode[] = [];
        for await (const [name, handle] of (dirHandle as any).entries()) {
          const childPath = node.path ? `${node.path}/${name}` : name;
          children.push({
            name,
            path: childPath,
            type: handle.kind === 'directory' ? 'directory' : 'file',
          });
        }
        setTree(prev => updateNodeChildren(prev, node.path, children));
        return;
      }
      const data = await listDir(node.path, { recursive: false, maxDepth: 1 });
      const children = data.items.map(item => ({
        name: item.name,
        path: item.path,
        type: item.type,
      }));
      setTree(prev => updateNodeChildren(prev, node.path, children));
    } catch (error) {
      console.error('Failed to load directory:', error);
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
          onClick={async () => {
            if (node.type === 'directory') {
              toggleExpand(node.path);
              await hydrateChildren(node);
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

  if (error) {
    return (
      <div className="p-4 text-amber-400 text-sm">
        <div className="font-medium">Failed to load files</div>
        <div className="text-xs text-amber-500/90 mt-1 break-words">{error}</div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="px-3 py-2 text-xs text-gray-500 uppercase font-medium">
        Explorer
      </div>
      {tree.length === 0 && (
        <div className="px-3 py-2 text-xs text-gray-500">
          No files found. Check the workspace root path.
        </div>
      )}
      {tree.map(node => renderNode(node))}
    </div>
  );
}

async function getDirectoryHandle(root: FileSystemDirectoryHandle, relativePath: string) {
  if (!relativePath) return root;
  const segments = relativePath.split('/').filter(Boolean);
  let current = root;
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment);
  }
  return current;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function updateNodeChildren(nodes: FileNode[], targetPath: string, children: FileNode[]): FileNode[] {
  return nodes.map(node => {
    if (node.path === targetPath) {
      return { ...node, children };
    }
    if (node.children && node.children.length > 0) {
      return { ...node, children: updateNodeChildren(node.children, targetPath, children) };
    }
    return node;
  });
}
