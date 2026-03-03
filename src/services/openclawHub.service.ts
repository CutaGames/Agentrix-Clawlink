/**
 * OpenClaw Skill Hub — queries the curated skill registry from OpenClaw Bridge.
 * Endpoint: GET /api/openclaw/bridge/skill-hub/search
 *
 * Data flow:
 *   1. fetchFromBridge() → GET /openclaw/bridge/skill-hub/search?limit=200
 *   2. If bridge unavailable, falls back to HUB_PLACEHOLDER (30 skills)
 *   3. searchOpenClawHub() → filter + paginate → return items[]
 *
 * The rendering in ClawMarketplaceScreen expects items with:
 *   id, name, description, icon, category, rating, price, installCount, tags
 * so we preserve ALL of those fields (not the stripped SkillItem shape).
 */
import { apiFetch } from './api';
import type { SkillItem } from './marketplace.api';

// ── Cache ─────────────────────────────────────────────────────────────────────
let _hubCache: { items: OpenClawHubSkill[]; fetchedAt: number } | null = null;
const HUB_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── Types ─────────────────────────────────────────────────────────────────────
export interface OpenClawHubSkill {
  id: string;
  name: string;
  displayName?: string;
  description: string;
  author?: string;
  category?: string;
  subCategory?: string;
  tags?: string[];
  version?: string;
  rating?: number;
  installCount?: number;
  price?: number;
  priceUnit?: string;
  package?: string;
  repoUrl?: string;
  icon?: string;
}

export interface OpenClawHubSearchParams {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface OpenClawHubSearchResponse {
  items: any[];     // enriched objects — superset of SkillItem with icon/tokenCost
  total: number;
  page: number;
  totalPages: number;
}

// ── Category normalisation ────────────────────────────────────────────────────
// Backend built-in skills use lowercase category names (e.g. 'search', 'developer')
// Mobile UI filter uses display names (e.g. 'Automation', 'AI Tools', 'Dev')
// This map normalises backend → display category.
const CATEGORY_MAP: Record<string, string> = {
  search:        'Automation',
  automation:    'Automation',
  developer:     'Dev',
  memory:        'AI Tools',
  creative:      'AI Tools',
  ai:            'AI Tools',
  language:      'AI Tools',
  media:         'AI Tools',
  data:          'Data',
  analytics:     'Data',
  integration:   'Automation',
  communication: 'Social',
  productivity:  'Productivity',
  utility:       'Files',
  finance:       'Finance',
  general:       'Automation',
};

function normaliseCategory(raw?: string): string {
  if (!raw) return 'Automation';
  const lower = raw.toLowerCase();
  return CATEGORY_MAP[lower] ?? raw; // keep as-is if already a display name
}

// ── Icon map (for backend built-in skills that have icon in response) ─────
const FALLBACK_CATEGORY_ICON: Record<string, string> = {
  Automation: '⚙️',
  'AI Tools': '🤖',
  Data: '📊',
  Dev: '💻',
  Social: '💬',
  Finance: '💰',
  Files: '📁',
  Productivity: '📋',
  Web: '🌐',
};

// ── Rich placeholder skill catalog (always available, no network needed) ──────
const HUB_PLACEHOLDER: OpenClawHubSkill[] = [
  // Automation
  { id: 'oc-web-search', name: 'Web Search', icon: '🔍', description: 'Full-web search with result ranking and summarization', category: 'Automation', tags: ['search', 'web', 'AI'], rating: 4.9, installCount: 18500, price: 0 },
  { id: 'oc-browser-ctrl', name: 'Browser Control', icon: '🌐', description: 'Headless browser automation — click, fill, navigate', category: 'Automation', tags: ['browser', 'playwright'], rating: 4.7, installCount: 12400, price: 0 },
  { id: 'oc-file-ops', name: 'File Operations', icon: '📂', description: 'Read, write, and manipulate files and directories', category: 'Automation', tags: ['files', 'io'], rating: 4.8, installCount: 15000, price: 0 },
  { id: 'oc-shell-exec', name: 'Shell Executor', icon: '⚡', description: 'Run shell commands in a sandboxed environment', category: 'Automation', tags: ['shell', 'bash'], rating: 4.6, installCount: 9800, price: 0 },
  { id: 'oc-scheduler', name: 'Task Scheduler', icon: '⏰', description: 'Schedule and run recurring agent tasks via cron', category: 'Automation', tags: ['cron', 'scheduler'], rating: 4.5, installCount: 7200, price: 0 },
  // AI Tools
  { id: 'oc-code-gen', name: 'Code Generator', icon: '💻', description: 'GPT-4-powered code generation in 30+ languages', category: 'AI Tools', tags: ['AI', 'codegen'], rating: 4.9, installCount: 22000, price: 0 },
  { id: 'oc-summarizer', name: 'Text Summarizer', icon: '📝', description: 'Summarize long documents, articles, or web pages', category: 'AI Tools', tags: ['AI', 'summary', 'NLP'], rating: 4.8, installCount: 17600, price: 0 },
  { id: 'oc-translator', name: 'Multi-Lang Translator', icon: '🌐', description: 'Translate text between 100+ languages using LLM', category: 'AI Tools', tags: ['translate', 'NLP'], rating: 4.7, installCount: 13400, price: 0 },
  { id: 'oc-img-analyze', name: 'Image Analyzer', icon: '🖼️', description: 'Vision LLM to describe, classify, and extract from images', category: 'AI Tools', tags: ['vision', 'AI'], rating: 4.8, installCount: 10200, price: 0 },
  { id: 'oc-sentiment', name: 'Sentiment Analysis', icon: '😊', description: 'Batch sentiment scoring for reviews, tweets, or comments', category: 'AI Tools', tags: ['sentiment', 'NLP'], rating: 4.5, installCount: 8900, price: 0 },
  { id: 'oc-embedding', name: 'Text Embeddings', icon: '🔮', description: 'OpenAI / local embeddings for similarity search', category: 'AI Tools', tags: ['embeddings', 'vector'], rating: 4.7, installCount: 11200, price: 0 },
  // Data
  { id: 'oc-csv-parser', name: 'CSV/Excel Processor', icon: '📋', description: 'Read, filter, transform, and export CSV/Excel files', category: 'Data', tags: ['csv', 'excel'], rating: 4.6, installCount: 9400, price: 0 },
  { id: 'oc-sql-agent', name: 'SQL Query Agent', icon: '🗄️', description: 'Natural language to SQL — query any Postgres/MySQL DB', category: 'Data', tags: ['sql', 'database'], rating: 4.8, installCount: 14700, price: 0 },
  { id: 'oc-scraper', name: 'Web Scraper', icon: '🕷️', description: 'Structured web data extraction with pagination', category: 'Data', tags: ['scraping', 'web'], rating: 4.6, installCount: 11900, price: 0 },
  { id: 'oc-json-proc', name: 'JSON Processor', icon: '📦', description: 'Parse, transform, validate JSON with JQ-style queries', category: 'Data', tags: ['json', 'data'], rating: 4.5, installCount: 7600, price: 0 },
  { id: 'oc-vector-db', name: 'Vector DB Connector', icon: '🔮', description: 'Pinecone/Chroma/Weaviate read/write for agents', category: 'Data', tags: ['vector', 'pinecone'], rating: 4.7, installCount: 8300, price: 0 },
  // Finance
  { id: 'oc-crypto-price', name: 'Crypto Price Feed', icon: '📈', description: 'Real-time prices for 1000+ tokens from CoinGecko/Binance', category: 'Finance', tags: ['crypto', 'price'], rating: 4.8, installCount: 16200, price: 0 },
  { id: 'oc-defi-swap', name: 'DeFi Swap Agent', icon: '💱', description: 'Execute token swaps via Uniswap/dex aggregator', category: 'Finance', tags: ['defi', 'swap'], rating: 4.5, installCount: 7100, price: 0 },
  { id: 'oc-wallet-monitor', name: 'Wallet Monitor', icon: '👁️', description: 'Monitor wallet activity and alert on transactions', category: 'Finance', tags: ['wallet', 'monitor'], rating: 4.6, installCount: 8800, price: 0 },
  // Social
  { id: 'oc-twitter-agent', name: 'Twitter/X Agent', icon: '🐦', description: 'Post, search, and monitor Twitter/X via API', category: 'Social', tags: ['twitter', 'social'], rating: 4.5, installCount: 9200, price: 0 },
  { id: 'oc-telegram-bot', name: 'Telegram Bot', icon: '✈️', description: 'Send messages and handle Telegram bot commands', category: 'Social', tags: ['telegram', 'bot'], rating: 4.7, installCount: 12100, price: 0 },
  { id: 'oc-discord-bot', name: 'Discord Bot', icon: '🎮', description: 'Discord message sending, reading, and command handling', category: 'Social', tags: ['discord', 'bot'], rating: 4.6, installCount: 10800, price: 0 },
  { id: 'oc-email-agent', name: 'Email Agent', icon: '📧', description: 'Send and read emails via SMTP/IMAP — draft, reply, summarize', category: 'Social', tags: ['email', 'smtp'], rating: 4.7, installCount: 13500, price: 0 },
  // Dev
  { id: 'oc-github-agent', name: 'GitHub Agent', icon: '🐙', description: 'Create PRs, issues, and files via GitHub API', category: 'Dev', tags: ['github', 'git'], rating: 4.8, installCount: 14000, price: 0 },
  { id: 'oc-docker-ctrl', name: 'Docker Controller', icon: '🐋', description: 'Start, stop, and inspect Docker containers', category: 'Dev', tags: ['docker', 'devops'], rating: 4.6, installCount: 7900, price: 0 },
  { id: 'oc-code-review', name: 'Code Review Bot', icon: '🔍', description: 'AI-powered code review with security and style checks', category: 'Dev', tags: ['code', 'review'], rating: 4.7, installCount: 11400, price: 0 },
  { id: 'oc-test-gen', name: 'Unit Test Generator', icon: '🧪', description: 'Auto-generate pytest/jest unit tests from source code', category: 'Dev', tags: ['testing', 'pytest'], rating: 4.5, installCount: 8100, price: 0 },
  // Productivity / Files
  { id: 'oc-pdf-reader', name: 'PDF Reader', icon: '📄', description: 'Extract text, tables, and images from PDF documents', category: 'Files', tags: ['pdf', 'extract'], rating: 4.7, installCount: 15800, price: 0 },
  { id: 'oc-calendar', name: 'Calendar Manager', icon: '📅', description: 'Google/Outlook calendar read/write and scheduling', category: 'Productivity', tags: ['calendar', 'schedule'], rating: 4.6, installCount: 9700, price: 0 },
  { id: 'oc-notes', name: 'Notes & Memory', icon: '🧠', description: 'Persistent note-taking and recall across agent sessions', category: 'AI Tools', tags: ['notes', 'memory'], rating: 4.8, installCount: 16900, price: 0 },
];

// ── Mapping: OpenClawHubSkill → enriched item for rendering ───────────────────
// Returns an object that satisfies SkillItem PLUS has icon/tokenCost/displayName
// that ClawMarketplaceScreen.tsx renderer directly uses.
function toDisplayItem(s: OpenClawHubSkill): any {
  const cat = normaliseCategory(s.category);
  const icon = s.icon || FALLBACK_CATEGORY_ICON[cat] || '⚡';
  return {
    // SkillItem base fields
    id: s.id,
    name: s.name,
    displayName: s.displayName ?? s.name,
    description: s.description,
    author: s.author || 'OpenClaw',
    authorId: 'openclaw',
    category: 'skills' as const,     // SkillItem union type
    subCategory: cat,                 // preserve display category here
    price: s.price ?? 0,
    priceUnit: s.priceUnit || 'free',
    rating: s.rating ?? 4.5,
    reviewCount: Math.floor((s.installCount ?? 0) / 10),
    likeCount: Math.floor((s.installCount ?? 0) / 20),
    usageCount: s.installCount ?? 0,
    callCount: (s.installCount ?? 0) * 12,
    agentCompatible: true,
    tags: s.tags || [],
    isLiked: false,
    isFavorited: false,
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date().toISOString(),
    // Extra fields the renderer uses directly:
    icon,
    tokenCost: 0,                     // hub skills are free to call
    installCount: s.installCount ?? 0,
    hubCategory: cat,                 // original display category for filtering
  };
}

// ── Fetch from Agentrix backend bridge ────────────────────────────────────────
async function fetchFromBridge(): Promise<OpenClawHubSkill[]> {
  try {
    const resp = await apiFetch<any>(
      '/openclaw/bridge/skill-hub/search?limit=200&sortBy=callCount&sortOrder=DESC',
    );
    const raw: any[] =
      resp?.items || resp?.skills || resp?.data || (Array.isArray(resp) ? resp : []);
    if (raw.length === 0) return [];
    return raw.map((s: any): OpenClawHubSkill => ({
      id: s.id ?? s.key ?? `oc-${Math.random().toString(36).slice(2, 8)}`,
      name: s.displayName ?? s.name ?? 'Unknown Skill',
      displayName: s.displayName ?? s.name,
      description: s.description ?? 'OpenClaw community skill',
      author: s.author ?? 'OpenClaw',
      category: s.category ?? 'general',
      subCategory: s.subCategory,
      tags: s.tags ?? [],
      version: s.version,
      rating: typeof s.rating === 'number' ? s.rating : parseFloat(s.rating) || 4.5,
      installCount: s.callCount ?? s.installCount ?? 0,
      price: s.price ?? 0,
      priceUnit: s.priceUnit ?? 'free',
      package: s.package ?? s.key,
      repoUrl: s.repoUrl,
      icon: s.icon,                   // ← CRITICAL: preserve icon from backend
    }));
  } catch {
    return [];
  }
}

// ── Get hub skills (cached) ───────────────────────────────────────────────────
async function getHubSkills(): Promise<OpenClawHubSkill[]> {
  if (_hubCache && Date.now() - _hubCache.fetchedAt < HUB_CACHE_TTL_MS) {
    return _hubCache.items;
  }

  const bridgeSkills = await fetchFromBridge();
  if (bridgeSkills.length > 0) {
    _hubCache = { items: bridgeSkills, fetchedAt: Date.now() };
    return bridgeSkills;
  }

  // Fallback: use rich placeholder catalog (no network needed)
  _hubCache = { items: HUB_PLACEHOLDER, fetchedAt: Date.now() };
  return HUB_PLACEHOLDER;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function searchOpenClawHub(
  params: OpenClawHubSearchParams,
): Promise<OpenClawHubSearchResponse> {
  const allSkills = await getHubSkills();
  let list = [...allSkills];

  // Text search
  if (params.q) {
    const q = params.q.toLowerCase();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }

  // Category filter — compare against the NORMALISED display category
  if (params.category && params.category !== 'All') {
    const cat = params.category.toLowerCase();
    list = list.filter((s) => normaliseCategory(s.category).toLowerCase() === cat);
  }

  // Sort by popularity (installCount / callCount desc)
  list.sort((a, b) => (b.installCount ?? 0) - (a.installCount ?? 0));

  // Paginate
  const page = params.page || 1;
  const limit = params.limit || 20;
  const start = (page - 1) * limit;
  const items = list.slice(start, start + limit).map(toDisplayItem);

  return {
    items,
    total: list.length,
    page,
    totalPages: Math.ceil(list.length / limit),
  };
}

export async function getHubSkillDetail(id: string): Promise<any | null> {
  // Try fetching from backend by search
  try {
    const resp = await apiFetch<any>(
      `/openclaw/bridge/skill-hub/search?limit=50&q=${encodeURIComponent(id)}`,
    );
    const items: any[] = resp?.items || [];
    const found = items.find((s: any) => s.id === id || s.key === id);
    if (found) {
      return toDisplayItem({
        id: found.id ?? found.key,
        name: found.displayName ?? found.name,
        displayName: found.displayName,
        description: found.description ?? '',
        author: found.author,
        category: found.category,
        tags: found.tags,
        version: found.version,
        rating: found.rating,
        installCount: found.callCount ?? found.installCount ?? 0,
        price: found.price ?? 0,
        icon: found.icon,
      });
    }
  } catch { /* fallback to cache */ }

  // Check cache / placeholder
  const allSkills = await getHubSkills();
  const skill = allSkills.find((s) => s.id === id || s.package === id);
  if (!skill) return null;
  return toDisplayItem(skill);
}

/** Force refresh hub cache (e.g. on pull-to-refresh) */
export function invalidateHubCache(): void {
  _hubCache = null;
}
