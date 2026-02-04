import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

const KB_DIR = '/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/hq-console/.knowledge';
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

async function loadIndex(): Promise<KnowledgeIndex> {
  try {
    const data = await fs.readFile(KB_INDEX_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { entries: [], lastUpdated: new Date().toISOString() };
  }
}

// POST - Search knowledge base
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, category, limit = 10 } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

    const index = await loadIndex();
    const queryLower = query.toLowerCase();
    
    // Simple search - match in title, summary, or path
    let results = index.entries.filter(entry => {
      if (category && entry.category !== category) return false;
      
      const titleMatch = entry.title.toLowerCase().includes(queryLower);
      const summaryMatch = entry.summary?.toLowerCase().includes(queryLower);
      const pathMatch = entry.path.toLowerCase().includes(queryLower);
      
      return titleMatch || summaryMatch || pathMatch;
    });

    // Sort by relevance (title match first)
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(queryLower) ? 1 : 0;
      const bTitle = b.title.toLowerCase().includes(queryLower) ? 1 : 0;
      return bTitle - aTitle;
    });

    // Limit results
    results = results.slice(0, limit);

    // For each result, try to get more content context
    const enrichedResults = await Promise.all(
      results.map(async (entry) => {
        try {
          const content = await fs.readFile(entry.path, 'utf-8');
          // Find matching lines
          const lines = content.split('\n');
          const matchingLines = lines
            .filter(line => line.toLowerCase().includes(queryLower))
            .slice(0, 3)
            .map(line => line.trim().slice(0, 200));

          return {
            ...entry,
            matchingLines,
            contentPreview: content.slice(0, 1000),
          };
        } catch {
          return entry;
        }
      })
    );

    return NextResponse.json({
      success: true,
      query,
      results: enrichedResults,
      totalMatches: enrichedResults.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}
