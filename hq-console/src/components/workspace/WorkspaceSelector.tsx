/**
 * Workspace Selector Component
 */

'use client';

import { useState } from 'react';

interface Workspace {
  id: string;
  name: string;
  rootPath: string;
  description?: string;
  type?: string;
}

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onSelect: (workspace: Workspace) => void | Promise<void>;
  onCreate: (name: string, rootPath: string) => void | Promise<void>;
}

export function WorkspaceSelector({
  workspaces,
  currentWorkspace,
  onSelect,
  onCreate,
}: WorkspaceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');

  const handleCreate = () => {
    if (newName && newPath) {
      onCreate(newName, newPath);
      setShowCreate(false);
      setNewName('');
      setNewPath('');
    }
  };

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span>{currentWorkspace?.name || 'Select Workspace'}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-gray-800 border border-gray-700 rounded shadow-lg z-50">
          <div className="p-2 border-b border-gray-700">
            <div className="text-xs text-gray-500 uppercase">Workspaces</div>
          </div>
          <div className="max-h-60 overflow-auto">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                className={`w-full text-left px-3 py-2 hover:bg-gray-700 ${
                  currentWorkspace?.id === ws.id ? 'bg-gray-700' : ''
                }`}
                onClick={() => {
                  onSelect(ws);
                  setIsOpen(false);
                }}
              >
                <div className="font-medium">{ws.name}</div>
                <div className="text-xs text-gray-500 truncate">{ws.rootPath}</div>
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-gray-700">
            <button
              className="w-full text-left px-3 py-2 text-sm text-blue-400 hover:bg-gray-700 rounded"
              onClick={() => {
                setShowCreate(true);
                setIsOpen(false);
              }}
            >
              + Create New Workspace
            </button>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Create Workspace</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="My Project"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Root Path</label>
                <input
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="/path/to/project"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded"
                  onClick={handleCreate}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
