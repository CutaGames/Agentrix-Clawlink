/**
 * OpenClaw Skill Hub — V2 (Real ClawHub Integration)
 *
 * Queries the Agentrix backend which now fetches 4500+ real skills from the
 * official ClawHub API (https://www.clawhub.ai/api/v1) with cursor-paginated
 * syncing, DB persistence and in-memory caching.
 *
 * Endpoint: GET /api/openclaw/bridge/skill-hub/search
 *
 * Data flow:
 *   1. fetchFromBridge() → GET /openclaw/bridge/skill-hub/search?limit=500
 *      (backend returns real ClawHub skills with SkillCategory enum values)
 *   2. Client-side filter + paginate → return items[] for rendering
 *   3. Fallback: 6 built-in skills if backend is unreachable
 */
import { apiFetch } from './api';
import type { SkillItem } from './marketplace.api';

// Simple TTL cache: refreshes every 10 min to match backend refresh
let _hubCache: { items: OpenClawHubSkill[]; fetchedAt: number } | null = null;
const HUB_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

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
  package?: string;   // ClawHub slug for deep-linking
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
// Backend returns SkillCategory enum values (utility, data, integration, commerce,
// payment, custom) from real ClawHub skills, plus string categories from built-ins.
const CATEGORY_MAP: Record<string, string> = {
  utility:       'Dev Tools',
  data:          'Data',
  integration:   'Integration',
  commerce:      'Commerce',
  payment:       'Finance',
  custom:        'Creative',
  search:        'AI Tools',
  developer:     'Dev Tools',
  memory:        'AI Tools',
  creative:      'Creative',
  analytics:     'Data',
  language:      'AI Tools',
  automation:    'Automation',
  general:       'General',
  ai:            'AI Tools',
  media:         'Creative',
  communication: 'Social',
  productivity:  'Automation',
  finance:       'Finance',
};

function normaliseCategory(raw?: string): string {
  if (!raw) return 'General';
  const lower = raw.toLowerCase();
  return CATEGORY_MAP[lower] ?? raw;
}

// ── Icon map ──────────────────────────────────────────────────────────────────
const FALLBACK_CATEGORY_ICON: Record<string, string> = {
  'Dev Tools': '💻',
  'AI Tools': '🤖',
  Data: '📊',
  Integration: '🔌',
  Commerce: '💰',
  Finance: '💳',
  Creative: '🎨',
  Automation: '⚙️',
  Social: '💬',
  General: '⚡',
};

// ── Minimal fallback (backend has 55+ built-ins + ClawHub real skills) ─────────
const HUB_PLACEHOLDER: OpenClawHubSkill[] = [
  { id: 'oc-memory', name: 'Long-Term Memory', icon: '🧠', description: 'Persistent memory across conversations', category: 'AI Tools', tags: ['memory', 'context'], rating: 4.9, installCount: 18200, price: 0 },
  { id: 'oc-web-search', name: 'Web Search', icon: '🔍', description: 'Search the web with AI-powered relevance ranking', category: 'AI Tools', tags: ['search', 'web'], rating: 4.7, installCount: 15420, price: 0 },
  { id: 'oc-code-exec', name: 'Code Sandbox', icon: '💻', description: 'Execute Python, JavaScript safely in sandbox', category: 'Dev Tools', tags: ['code', 'python'], rating: 4.8, installCount: 12300, price: 0 },
  { id: 'oc-file-manager', name: 'File Manager', icon: '📁', description: 'Read, write and manage files', category: 'Automation', tags: ['files', 'storage'], rating: 4.5, installCount: 9800, price: 0 },
  { id: 'oc-news-search', name: 'News', icon: '📰', description: 'Search real-time news from global sources', category: 'AI Tools', tags: ['news', 'realtime'], rating: 4.5, installCount: 9200, price: 0 },
  { id: 'oc-translation', name: 'Translation', icon: '🌐', description: 'Translate text between 100+ languages', category: 'AI Tools', tags: ['translate', 'language'], rating: 4.7, installCount: 8900, price: 0 },
  { id: 'oc-git', name: 'Git Operations', icon: '🐙', description: 'Clone, commit, push and manage GitHub repos', category: 'Dev Tools', tags: ['git', 'github'], rating: 4.6, installCount: 8100, price: 0 },
  { id: 'oc-image-gen', name: 'Image Generator', icon: '🎨', description: 'Generate images from text prompts', category: 'Creative', tags: ['image', 'generation'], rating: 4.3, installCount: 7650, price: 0 },
  { id: 'oc-crypto-price', name: 'Crypto Prices', icon: '💰', description: 'Real-time crypto prices and market cap', category: 'Finance', tags: ['crypto', 'price'], rating: 4.6, installCount: 6800, price: 0 },
  { id: 'oc-data-analysis', name: 'Data Analysis', icon: '📊', description: 'Analyse datasets, generate charts', category: 'Data', tags: ['data', 'analytics'], rating: 4.6, installCount: 6100, price: 0 },
  { id: 'oc-weather', name: 'Weather', icon: '🌤️', description: 'Real-time weather data for any location', category: 'General', tags: ['weather', 'forecast'], rating: 4.6, installCount: 5500, price: 0 },
  { id: 'oc-web-scrape', name: 'Web Scraper', icon: '🕷️', description: 'Extract content from web pages', category: 'Data', tags: ['scrape', 'web'], rating: 4.4, installCount: 5400, price: 0 },
  { id: 'oc-sql', name: 'SQL Agent', icon: '🗃️', description: 'Query databases with natural language', category: 'Data', tags: ['sql', 'database'], rating: 4.6, installCount: 5200, price: 0 },
  { id: 'oc-browser', name: 'Browser Automation', icon: '🌐', description: 'Control a headless browser', category: 'Automation', tags: ['browser', 'automation'], rating: 4.5, installCount: 5100, price: 0 },
  { id: 'oc-twitter', name: 'Twitter/X Agent', icon: '🐦', description: 'Post, search and analyze tweets', category: 'Integration', tags: ['twitter', 'social'], rating: 4.4, installCount: 4800, price: 0 },
  { id: 'oc-docker', name: 'Docker Manager', icon: '🐋', description: 'Build, run and manage Docker containers', category: 'Dev Tools', tags: ['docker', 'container'], rating: 4.4, installCount: 4800, price: 0 },
  { id: 'oc-stock', name: 'Stock Data', icon: '📈', description: 'Real-time stock quotes, charts and analysis', category: 'Finance', tags: ['stock', 'market'], rating: 4.5, installCount: 4600, price: 0 },
  { id: 'oc-api-connector', name: 'API Connector', icon: '🔌', description: 'Connect to any REST or GraphQL API', category: 'Integration', tags: ['api', 'rest'], rating: 4.5, installCount: 4500, price: 0 },
  { id: 'oc-email', name: 'Email Sender', icon: '📧', description: 'Send and read emails via SMTP/IMAP', category: 'Integration', tags: ['email', 'smtp'], rating: 4.5, installCount: 4400, price: 0 },
  { id: 'oc-calculator', name: 'Calculator', icon: '🔢', description: 'Advanced math, unit conversion and formulas', category: 'General', tags: ['math', 'convert'], rating: 4.5, installCount: 4200, price: 0 },
  { id: 'oc-pdf', name: 'PDF Reader', icon: '📄', description: 'Extract text and data from PDF documents', category: 'Data', tags: ['pdf', 'document'], rating: 4.5, installCount: 4200, price: 0 },
  { id: 'oc-slack', name: 'Slack Bot', icon: '💬', description: 'Send messages and manage Slack channels', category: 'Integration', tags: ['slack', 'messaging'], rating: 4.5, installCount: 4100, price: 0 },
  { id: 'oc-scheduler', name: 'Task Scheduler', icon: '⏰', description: 'Schedule recurring tasks and reminders', category: 'Automation', tags: ['schedule', 'cron'], rating: 4.5, installCount: 3700, price: 0 },
  { id: 'oc-csv', name: 'CSV Tool', icon: '📋', description: 'Parse, transform and analyze CSV data', category: 'Data', tags: ['csv', 'data'], rating: 4.4, installCount: 3600, price: 0 },
  { id: 'oc-tts', name: 'Text to Speech', icon: '🔊', description: 'Convert text to natural-sounding speech', category: 'Creative', tags: ['tts', 'speech'], rating: 4.5, installCount: 3500, price: 0 },
  { id: 'oc-discord', name: 'Discord Bot', icon: '🎮', description: 'Manage Discord servers and channels', category: 'Integration', tags: ['discord', 'gaming'], rating: 4.4, installCount: 3500, price: 0 },
  { id: 'oc-dex-swap', name: 'DEX Swap', icon: '🔄', description: 'Execute token swaps on decentralized exchanges', category: 'Finance', tags: ['dex', 'swap'], rating: 4.3, installCount: 3400, price: 0 },
  { id: 'oc-stt', name: 'Speech to Text', icon: '🎤', description: 'Transcribe audio to text with high accuracy', category: 'Creative', tags: ['stt', 'transcription'], rating: 4.4, installCount: 3200, price: 0 },
  { id: 'oc-debugger', name: 'AI Debugger', icon: '🔧', description: 'AI-assisted debugging with stack trace analysis', category: 'Dev Tools', tags: ['debug', 'error'], rating: 4.5, installCount: 3200, price: 0 },
  { id: 'oc-workflow', name: 'Workflows', icon: '🔀', description: 'Build and execute multi-step workflows', category: 'Automation', tags: ['workflow', 'pipeline'], rating: 4.4, installCount: 3100, price: 0 },
];

// ── Mapping: OpenClawHubSkill → enriched item for rendering ───────────────────
function toDisplayItem(s: OpenClawHubSkill): any {
  const cat = normaliseCategory(s.category);
  const icon = s.icon || FALLBACK_CATEGORY_ICON[cat] || '⚡';
  const downloads = s.installCount ?? 0;
  return {
    id: s.id,
    name: s.displayName ?? s.name,
    displayName: s.displayName ?? s.name,
    description: s.description,
    author: s.author || 'OpenClaw Community',
    authorId: 'openclaw',
    category: 'skills' as const,
    subCategory: cat,
    price: s.price ?? 0,
    priceUnit: s.priceUnit || 'free',
    rating: s.rating ?? 0,
    reviewCount: Math.min(Math.floor(downloads / 50), 999),
    likeCount: Math.min(Math.floor(downloads / 20), 9999),
    usageCount: downloads,
    callCount: downloads,
    agentCompatible: true,
    tags: s.tags || [],
    isLiked: false,
    isFavorited: false,
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date().toISOString(),
    icon,
    tokenCost: 0,
    installCount: downloads,
    hubCategory: cat,
    hubSlug: s.package,
  };
}

// ── Fetch from Agentrix backend bridge (now returns 4500+ real ClawHub skills)
async function fetchFromBridge(): Promise<OpenClawHubSkill[]> {
  try {
    const resp = await apiFetch<any>(
      '/openclaw/bridge/skill-hub/search?limit=500&sortBy=callCount&sortOrder=DESC',
    );
    const raw: any[] =
      resp?.items || resp?.skills || resp?.data || (Array.isArray(resp) ? resp : []);
    if (raw.length === 0) {
      console.warn('[OpenClawHub] Bridge returned 0 skills');
      return [];
    }
    console.log(`[OpenClawHub] Bridge returned ${raw.length} skills`);
    return raw.map((s: any): OpenClawHubSkill => ({
      id: s.id ?? s.key ?? `oc-${Math.random().toString(36).slice(2, 8)}`,
      name: s.name ?? s.displayName ?? 'Unknown Skill',
      displayName: s.displayName ?? s.name,
      description: s.description ?? 'OpenClaw community skill',
      author: s.author ?? 'OpenClaw Community',
      category: s.category ?? 'utility',
      subCategory: s.subCategory,
      tags: s.tags ?? [],
      version: s.version,
      rating: typeof s.rating === 'number' ? s.rating : parseFloat(s.rating) || 0,
      installCount: s.callCount ?? s.installCount ?? 0,
      price: s.price ?? 0,
      priceUnit: s.priceUnit ?? 'free',
      package: s.hubSlug ?? s.key ?? s.name,
      repoUrl: s.repoUrl,
      icon: s.icon,
    }));
  } catch (err) {
    console.error('[OpenClawHub] fetchFromBridge failed:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ── Get hub skills (cached, with progressive loading) ─────────────────────────
async function getHubSkills(): Promise<OpenClawHubSkill[]> {
  if (_hubCache && Date.now() - _hubCache.fetchedAt < HUB_CACHE_TTL_MS) {
    return _hubCache.items;
  }

  const bridgeSkills = await fetchFromBridge();
  if (bridgeSkills.length > 0) {
    _hubCache = { items: bridgeSkills, fetchedAt: Date.now() };
    return bridgeSkills;
  }

  // Fallback: minimal placeholder catalog
  _hubCache = { items: HUB_PLACEHOLDER, fetchedAt: Date.now() };
  return HUB_PLACEHOLDER;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function searchOpenClawHub(
  params: OpenClawHubSearchParams,
): Promise<OpenClawHubSearchResponse> {
  const allSkills = await getHubSkills();
  let list = [...allSkills];

  // Text search (name + description + tags)
  if (params.q) {
    const q = params.q.toLowerCase();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.displayName ?? '').toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }

  // Category filter — compare against the NORMALISED display category
  if (params.category && params.category !== 'All') {
    const cat = params.category;
    list = list.filter((s) => normaliseCategory(s.category) === cat);
  }

  // Sort by popularity (downloads desc)
  list.sort((a, b) => (b.installCount ?? 0) - (a.installCount ?? 0));

  // Paginate
  const page = params.page || 1;
  const limit = params.limit || 30;
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
  // Try the new slug endpoint first (returns live detail from ClawHub)
  try {
    const slug = id.replace(/^clawhub-/, '');
    const resp = await apiFetch<any>(`/openclaw/bridge/skill-hub/skills/${encodeURIComponent(slug)}`);
    if (resp && (resp.id || resp.key)) {
      return toDisplayItem({
        id: resp.id ?? resp.key,
        name: resp.displayName ?? resp.name,
        displayName: resp.displayName,
        description: resp.description ?? '',
        author: resp.author,
        category: resp.category,
        tags: resp.tags,
        version: resp.version,
        rating: resp.rating,
        installCount: resp.callCount ?? resp.installCount ?? 0,
        price: resp.price ?? 0,
        icon: resp.icon,
        package: resp.hubSlug ?? resp.key,
      });
    }
  } catch { /* fallback to cache */ }

  // Check cache / placeholder
  const allSkills = await getHubSkills();
  const skill = allSkills.find((s) => s.id === id || s.package === id || s.name === id);
  if (!skill) return null;
  return toDisplayItem(skill);
}

/** Force refresh hub cache (e.g. on pull-to-refresh) */
export function invalidateHubCache(): void {
  _hubCache = null;
}
