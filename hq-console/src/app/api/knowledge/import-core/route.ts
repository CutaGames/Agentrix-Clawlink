import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

// Workspace root
const WORKSPACE_ROOT = '/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website';
const KB_DIR = path.join(WORKSPACE_ROOT, 'hq-console/.knowledge');
const KB_INDEX_FILE = path.join(KB_DIR, 'index.json');

interface KnowledgeEntry {
  id: string;
  title: string;
  category: string;
  path: string;
  summary?: string;
  addedAt: string;
  size: number;
}

interface KnowledgeIndex {
  entries: KnowledgeEntry[];
  lastUpdated: string;
}

// Core project files to import
const CORE_FILES = [
  // Architecture & Design Docs
  { path: 'AGENTRIX_PAYMENT_V1_ARCH_DESIGN.md', category: 'architecture', title: 'Payment V1 Architecture Design' },
  { path: 'AGENTRIX_MCP_TECH_DESIGN.md', category: 'architecture', title: 'MCP Technical Design' },
  { path: 'AGENTRIX_UI_REFACTOR_PLAN.md', category: 'architecture', title: 'UI Refactor Plan' },
  { path: 'AGENTRIX_WORKBENCH_PRD_V3.md', category: 'product', title: 'Workbench PRD V3' },
  { path: 'AGENTRIX_MCP_ECOSYSTEM_PRD.md', category: 'product', title: 'MCP Ecosystem PRD' },
  
  // SDK & Integration
  { path: 'AI-Platform-Integration-Guide.md', category: 'integration', title: 'AI Platform Integration Guide' },
  { path: 'Agent-SDK-AI-Ecosystem-Integration-Guide.md', category: 'integration', title: 'Agent SDK Integration Guide' },
  { path: 'ChatGPT-GPTs配置指南.md', category: 'integration', title: 'ChatGPT GPTs Configuration Guide' },
  
  // Copilot Instructions
  { path: '.github/copilot-instructions.md', category: 'development', title: 'Copilot Development Instructions' },
  
  // Backend Core Files
  { path: 'backend/src/main.ts', category: 'code', title: 'Backend Main Entry' },
  { path: 'backend/src/app.module.ts', category: 'code', title: 'Backend App Module' },
  { path: 'backend/package.json', category: 'config', title: 'Backend Package Config' },
  
  // Frontend Core Files
  { path: 'frontend/src/app/layout.tsx', category: 'code', title: 'Frontend Layout' },
  { path: 'frontend/package.json', category: 'config', title: 'Frontend Package Config' },
  
  // HQ Console Core
  { path: 'hq-console/src/lib/api.ts', category: 'code', title: 'HQ Console API Client' },
  { path: 'hq-console/src/lib/tools.ts', category: 'code', title: 'HQ Console Local Tools' },
  { path: 'hq-console/src/hooks/useAgents.ts', category: 'code', title: 'HQ Console Agents Hook' },
  { path: 'hq-console/package.json', category: 'config', title: 'HQ Console Package Config' },
  
  // Scripts
  { path: 'start-all.sh', category: 'scripts', title: 'Start All Services Script' },
  { path: 'test-all.sh', category: 'scripts', title: 'Test All Script' },
];

async function ensureKbDir() {
  try {
    await fs.mkdir(KB_DIR, { recursive: true });
  } catch (e) {
    // Directory may already exist
  }
}

async function loadIndex(): Promise<KnowledgeIndex> {
  try {
    const data = await fs.readFile(KB_INDEX_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { entries: [], lastUpdated: new Date().toISOString() };
  }
}

async function saveIndex(index: KnowledgeIndex) {
  await ensureKbDir();
  await fs.writeFile(KB_INDEX_FILE, JSON.stringify(index, null, 2));
}

// POST - Import core project files
export async function POST(request: NextRequest) {
  try {
    const index = await loadIndex();
    const results = {
      success: [] as string[],
      failed: [] as string[],
      skipped: [] as string[],
    };

    for (const file of CORE_FILES) {
      const fullPath = path.join(WORKSPACE_ROOT, file.path);
      
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const stat = await fs.stat(fullPath);
        
        // Check if already in index
        const existingIdx = index.entries.findIndex(e => e.path === fullPath);
        
        const entry: KnowledgeEntry = {
          id: `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: file.title,
          category: file.category,
          path: fullPath,
          summary: content.slice(0, 500).replace(/\n/g, ' ').trim(),
          addedAt: new Date().toISOString(),
          size: stat.size,
        };

        if (existingIdx >= 0) {
          index.entries[existingIdx] = entry;
          results.skipped.push(file.path);
        } else {
          index.entries.push(entry);
          results.success.push(file.path);
        }
      } catch (e) {
        results.failed.push(file.path);
      }
    }

    index.lastUpdated = new Date().toISOString();
    await saveIndex(index);

    return NextResponse.json({
      success: true,
      message: `Imported ${results.success.length} files, updated ${results.skipped.length}, failed ${results.failed.length}`,
      results,
      totalEntries: index.entries.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to import core files' },
      { status: 500 }
    );
  }
}
