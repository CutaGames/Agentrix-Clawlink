import { invoke } from "@tauri-apps/api/core";

export interface FileEntry {
  name: string;
  is_dir: boolean;
  size: number;
}

export async function setWorkspaceDir(path: string): Promise<string> {
  return invoke<string>("set_workspace_dir", { path });
}

export async function getWorkspaceDir(): Promise<string | null> {
  return invoke<string | null>("get_workspace_dir");
}

export async function listWorkspaceDir(relativePath: string = ""): Promise<FileEntry[]> {
  return invoke<FileEntry[]>("list_workspace_dir", { relativePath });
}

export async function readWorkspaceFile(relativePath: string): Promise<string> {
  return invoke<string>("read_workspace_file", { relativePath });
}

export async function writeWorkspaceFile(relativePath: string, content: string): Promise<void> {
  return invoke<void>("write_workspace_file", { relativePath, content });
}

export async function pickWorkspaceFolder(): Promise<string | null> {
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true, multiple: false, title: "Select Workspace Folder" });
    if (!selected) return null;
    const path = typeof selected === "string" ? selected : selected[0];
    if (!path) return null;
    return setWorkspaceDir(path);
  } catch {
    return null;
  }
}
