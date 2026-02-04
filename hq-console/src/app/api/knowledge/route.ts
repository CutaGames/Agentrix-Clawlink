import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

// Local knowledge base storage path
const KB_DIR = process.env.KNOWLEDGE_BASE_DIR || '/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/hq-console/.knowledge';
const KB_INDEX_FILE = path.join(KB_DIR, 'index.json');

interface KnowledgeEntry {
  id: string;
  title: string;
  category: string;
  path: string;
  content?: string;
  summary?: string;
  addedAt: string;
  size: number;
}

interface KnowledgeIndex {
  entries: KnowledgeEntry[];
  lastUpdated: string;
}

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

// GET - List all knowledge entries
export async function GET(request: NextRequest) {
  try {
    const index = await loadIndex();
    
    // Calculate stats
    const byCategory: Record<string, number> = {};
    let totalWords = 0;
    
    for (const entry of index.entries) {
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
      if (entry.summary) {
        totalWords += entry.summary.split(/\s+/).length;
      }
    }

    return NextResponse.json({
      success: true,
      entries: index.entries,
      stats: {
        total: index.entries.length,
        byCategory,
        totalWords,
      },
      lastUpdated: index.lastUpdated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load knowledge base' },
      { status: 500 }
    );
  }
}

// POST - Add a file to knowledge base
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath, category = 'general', title } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: 'filePath is required' },
        { status: 400 }
      );
    }

    // Read file content
    let content: string;
    let size: number;
    try {
      content = await fs.readFile(filePath, 'utf-8');
      const stat = await fs.stat(filePath);
      size = stat.size;
    } catch {
      return NextResponse.json(
        { error: `File not found: ${filePath}` },
        { status: 404 }
      );
    }

    // Generate summary (first 500 chars)
    const summary = content.slice(0, 500).replace(/\n/g, ' ').trim();

    // Create entry
    const entry: KnowledgeEntry = {
      id: `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title || path.basename(filePath),
      category,
      path: filePath,
      summary,
      addedAt: new Date().toISOString(),
      size,
    };

    // Update index
    const index = await loadIndex();
    
    // Check if already exists
    const existingIdx = index.entries.findIndex(e => e.path === filePath);
    if (existingIdx >= 0) {
      index.entries[existingIdx] = entry;
    } else {
      index.entries.push(entry);
    }
    
    index.lastUpdated = new Date().toISOString();
    await saveIndex(index);

    return NextResponse.json({
      success: true,
      entry,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to add to knowledge base' },
      { status: 500 }
    );
  }
}

// DELETE - Remove from knowledge base
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const index = await loadIndex();
    const initialLength = index.entries.length;
    index.entries = index.entries.filter(e => e.id !== id);

    if (index.entries.length === initialLength) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    index.lastUpdated = new Date().toISOString();
    await saveIndex(index);

    return NextResponse.json({
      success: true,
      message: 'Entry removed from knowledge base',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete from knowledge base' },
      { status: 500 }
    );
  }
}
