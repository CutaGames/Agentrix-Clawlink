export const TOOL_PERMISSION_KEYS = [
  'read_file',
  'write_file',
  'edit_file',
  'list_dir',
  'run_command',
  'fetch_url',
  'search_knowledge',
  'list_knowledge',
] as const;

export type ToolPermissionKey = (typeof TOOL_PERMISSION_KEYS)[number];
export type ToolPermissions = Record<ToolPermissionKey, boolean>;

const DEFAULT_PERMISSIONS: ToolPermissions = {
  read_file: true,
  write_file: true,
  edit_file: true,
  list_dir: true,
  run_command: true,
  fetch_url: true,
  search_knowledge: true,
  list_knowledge: true,
};

function getStorageKey(agentKey: string): string {
  return `agent_tool_permissions_${agentKey}`;
}

export function getAgentToolPermissions(agentKey: string): ToolPermissions {
  if (typeof window === 'undefined' || !agentKey) {
    return { ...DEFAULT_PERMISSIONS };
  }

  try {
    const raw = localStorage.getItem(getStorageKey(agentKey));
    if (!raw) return { ...DEFAULT_PERMISSIONS };
    const parsed = JSON.parse(raw) as Partial<ToolPermissions>;
    return { ...DEFAULT_PERMISSIONS, ...parsed };
  } catch {
    return { ...DEFAULT_PERMISSIONS };
  }
}

export function setAgentToolPermissions(agentKey: string, permissions: ToolPermissions): void {
  if (typeof window === 'undefined' || !agentKey) return;
  try {
    localStorage.setItem(getStorageKey(agentKey), JSON.stringify(permissions));
  } catch {
    // ignore storage errors
  }
}

export function isToolAllowed(agentKey: string, tool: string): boolean {
  const perms = getAgentToolPermissions(agentKey);
  return perms[tool as ToolPermissionKey] ?? false;
}

export function getToolPermissionLabel(tool: ToolPermissionKey): string {
  switch (tool) {
    case 'read_file':
      return '读取文件';
    case 'write_file':
      return '写入文件';
    case 'edit_file':
      return '编辑文件';
    case 'list_dir':
      return '列出目录';
    case 'run_command':
      return '执行命令';
    case 'fetch_url':
      return '抓取网页';
    case 'search_knowledge':
      return '搜索知识库';
    case 'list_knowledge':
      return '列出知识库';
    default:
      return tool;
  }
}
