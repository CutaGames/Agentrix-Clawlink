/**
 * OpenClaw Skill Hub Service — V2.2
 *
 * Fetches the **real** skill catalog from ClawHub (https://www.clawhub.ai/api/v1)
 * using cursor-based pagination, caches in memory, and persists into the `skills`
 * table (source = imported, originalPlatform = openclaw) so they appear in the
 * unified marketplace alongside native Agentrix skills.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import {
  Skill,
  SkillStatus,
  SkillLayer,
  SkillCategory,
  SkillSource,
  SkillOriginalPlatform,
  SkillPricingType,
} from '../../entities/skill.entity';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Raw item shape returned by ClawHub /api/v1/skills */
export interface ClawHubRawSkill {
  slug: string;
  displayName: string;
  summary: string;
  tags: Record<string, string>;
  stats: {
    comments: number;
    downloads: number;
    installsAllTime: number;
    installsCurrent: number;
    stars: number;
    versions: number;
  };
  createdAt: number;
  updatedAt: number;
  latestVersion?: {
    version: string;
    createdAt: number;
    changelog?: string;
  };
  metadata?: Record<string, any> | null;
}

/** Normalised in-memory cache shape (backward-compatible) */
export interface OpenClawHubSkill {
  id: string;
  key: string;
  name: string;
  displayName?: string;
  description: string;
  category: string;
  version?: string;
  author?: string;
  icon?: string;
  tags?: string[];
  enabled: boolean;
  documentation?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  callCount?: number;
  rating?: number;
  source: 'openclaw_hub';
  hubStats?: ClawHubRawSkill['stats'];
  hubSlug?: string;
  hubUpdatedAt?: number;
}

export interface OpenClawHubSearchResult {
  items: OpenClawHubSkill[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CLAWHUB_API = process.env.CLAWHUB_API_URL || 'https://www.clawhub.ai/api/v1';
const PER_PAGE = 100;
const MAX_PAGES = 300;
const CACHE_TTL_MS = 10 * 60 * 1000;
const FULL_SYNC_INTERVAL_MS = 60 * 60 * 1000;

/** Map ClawHub tags → our SkillCategory enum */
const TAG_CATEGORY_MAP: Record<string, SkillCategory> = {
  code: SkillCategory.UTILITY, coding: SkillCategory.UTILITY,
  git: SkillCategory.UTILITY, github: SkillCategory.UTILITY,
  docker: SkillCategory.UTILITY, devops: SkillCategory.UTILITY,
  terminal: SkillCategory.UTILITY, ssh: SkillCategory.UTILITY,
  security: SkillCategory.UTILITY,
  database: SkillCategory.DATA, sql: SkillCategory.DATA,
  data: SkillCategory.DATA, analytics: SkillCategory.DATA,
  csv: SkillCategory.DATA, pdf: SkillCategory.DATA,
  ocr: SkillCategory.DATA, scrape: SkillCategory.DATA,
  'web-scraping': SkillCategory.DATA, 'market-data': SkillCategory.DATA,
  stock: SkillCategory.DATA, weather: SkillCategory.DATA,
  predict: SkillCategory.DATA, prediction: SkillCategory.DATA,
  api: SkillCategory.INTEGRATION, webhook: SkillCategory.INTEGRATION,
  zapier: SkillCategory.INTEGRATION, slack: SkillCategory.INTEGRATION,
  notion: SkillCategory.INTEGRATION, automation: SkillCategory.INTEGRATION,
  mcp: SkillCategory.INTEGRATION,
  trading: SkillCategory.COMMERCE, crypto: SkillCategory.COMMERCE,
  aicoin: SkillCategory.COMMERCE, freqtrade: SkillCategory.COMMERCE,
  hyperliquid: SkillCategory.COMMERCE, payment: SkillCategory.PAYMENT,
  image: SkillCategory.CUSTOM, video: SkillCategory.CUSTOM,
  music: SkillCategory.CUSTOM, 'creative-writing': SkillCategory.CUSTOM,
  creative: SkillCategory.CUSTOM, caption: SkillCategory.CUSTOM,
  title: SkillCategory.CUSTOM, game: SkillCategory.CUSTOM,
  arena: SkillCategory.CUSTOM, battle: SkillCategory.CUSTOM,
  competition: SkillCategory.CUSTOM,
  translate: SkillCategory.UTILITY, korean: SkillCategory.UTILITY,
};

/* ------------------------------------------------------------------ */
/*  Service                                                            */
/* ------------------------------------------------------------------ */

@Injectable()
export class OpenClawSkillHubService {
  private readonly logger = new Logger(OpenClawSkillHubService.name);

  private cachedSkills: OpenClawHubSkill[] = [];
  private lastCacheAt: Date | null = null;
  private lastDbSyncAt: Date | null = null;
  private syncInProgress = false;
  private rateLimitBackoffUntil: number = 0;
  private rateLimitConsecutiveFails = 0;

  constructor(
    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
  ) {}

  /* ================================================================ */
  /*  Public read API                                                  */
  /* ================================================================ */

  async getSkills(opts: {
    query?: string;
    category?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  } = {}): Promise<OpenClawHubSearchResult> {
    const { query, category, page = 1, limit = 20, sortBy = 'name', sortOrder = 'ASC' } = opts;

    await this.ensureCache();

    let filtered = [...this.cachedSkills];

    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.displayName?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.tags?.some(t => t.toLowerCase().includes(q)),
      );
    }

    if (category && category !== 'all') {
      filtered = filtered.filter(s => s.category === category);
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'callCount': case 'downloads':
          cmp = (a.callCount || 0) - (b.callCount || 0); break;
        case 'rating': case 'stars':
          cmp = (a.rating || 0) - (b.rating || 0); break;
        case 'name': default:
          cmp = (a.displayName || a.name).localeCompare(b.displayName || b.name); break;
      }
      return sortOrder === 'DESC' ? -cmp : cmp;
    });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);
    return { items, total, page, limit, hasMore: start + limit < total };
  }

  async getSkillById(id: string): Promise<OpenClawHubSkill | null> {
    await this.ensureCache();
    return this.cachedSkills.find(s => s.id === id || s.key === id) ?? null;
  }

  async getSkillBySlug(slug: string): Promise<OpenClawHubSkill | null> {
    const cached = this.cachedSkills.find(s => s.key === slug || s.hubSlug === slug);
    if (cached) return cached;
    try {
      const { data } = await axios.get(`${CLAWHUB_API}/skills/${slug}`, { timeout: 10_000 });
      if (data?.skill) return this.normalizeClawHubSkill(data.skill);
    } catch { /* fall through */ }
    return null;
  }

  getCategories(): { id: string; label: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const skill of this.cachedSkills) {
      const cat = skill.category || 'general';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([id, count]) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1), count }))
      .sort((a, b) => b.count - a.count);
  }

  get totalSkills(): number { return this.cachedSkills.length; }

  get hubSyncStatus() {
    return {
      cachedSkills: this.cachedSkills.length,
      lastCacheAt: this.lastCacheAt?.toISOString() ?? null,
      lastDbSyncAt: this.lastDbSyncAt?.toISOString() ?? null,
      syncInProgress: this.syncInProgress,
      rateLimited: this.isRateLimited(),
      rateLimitBackoffUntil: this.rateLimitBackoffUntil > 0 ? new Date(this.rateLimitBackoffUntil).toISOString() : null,
      rateLimitConsecutiveFails: this.rateLimitConsecutiveFails,
    };
  }

  async isHubReachable(): Promise<boolean> {
    try {
      await axios.get(`${CLAWHUB_API}/skills?per_page=1`, { timeout: 5_000 });
      return true;
    } catch { return false; }
  }

  async triggerFullSync(): Promise<{ fetched: number; persisted: number }> {
    return this.fullSync();
  }

  /* ================================================================ */
  /*  Cache management                                                 */
  /* ================================================================ */

  private async ensureCache(): Promise<void> {
    if (this.cachedSkills.length > 0 && this.lastCacheAt &&
        Date.now() - this.lastCacheAt.getTime() < CACHE_TTL_MS) {
      return;
    }

    // Cache expired or cold start — try DB first
    const dbSkills = await this.loadFromDbRaw();
    if (dbSkills.length > 0) {
      this.cachedSkills = dbSkills;
      this.lastCacheAt = new Date();
      return;
    }

    // DB empty — try ClawHub live API
    if (!this.isRateLimited()) {
      await this.refreshFromClawHub();
    }

    // Final fallback: built-in skills
    if (this.cachedSkills.length === 0) {
      this.cachedSkills = this.getBuiltInSkills();
      this.lastCacheAt = new Date();
      this.logger.warn(`Using ${this.cachedSkills.length} built-in fallback skills`);
    }
  }

  private async loadFromDbRaw(): Promise<OpenClawHubSkill[]> {
    try {
      const rows = await this.skillRepo.find({
        where: {
          source: SkillSource.IMPORTED,
          originalPlatform: SkillOriginalPlatform.OPENCLAW,
          status: SkillStatus.PUBLISHED,
        },
        order: { callCount: 'DESC' },
      });
      if (rows.length > 0) {
        this.logger.log(`Loaded ${rows.length} OpenClaw skills from DB`);
        return rows.map(r => this.skillEntityToHubSkill(r));
      }
    } catch (err: any) {
      this.logger.warn(`Failed to load OpenClaw skills from DB: ${err.message}`);
    }
    return [];
  }

  private async loadFromDb(): Promise<void> {
    const skills = await this.loadFromDbRaw();
    if (skills.length > 0) {
      this.cachedSkills = skills;
      this.lastCacheAt = new Date();
    }
  }

  private isRateLimited(): boolean {
    return Date.now() < this.rateLimitBackoffUntil;
  }

  private markRateLimited(): void {
    this.rateLimitConsecutiveFails++;
    // Exponential backoff: 5m, 10m, 20m, 40m, 60m (max)
    const backoffMs = Math.min(5 * 60_000 * Math.pow(2, this.rateLimitConsecutiveFails - 1), 60 * 60_000);
    this.rateLimitBackoffUntil = Date.now() + backoffMs;
    this.logger.warn(`ClawHub rate-limited, backing off for ${Math.round(backoffMs / 60_000)}min (consecutive fails: ${this.rateLimitConsecutiveFails})`);
  }

  private resetRateLimit(): void {
    this.rateLimitConsecutiveFails = 0;
    this.rateLimitBackoffUntil = 0;
  }

  /* ================================================================ */
  /*  ClawHub live fetch (cursor-paginated)                            */
  /* ================================================================ */

  private async refreshFromClawHub(): Promise<void> {
    const skills = await this.fetchAllFromClawHub();
    if (skills.length > 0) {
      this.cachedSkills = skills;
      this.lastCacheAt = new Date();
      this.logger.log(`Refreshed cache with ${skills.length} ClawHub skills`);
    } else if (this.cachedSkills.length > 0) {
      this.lastCacheAt = new Date();
      this.logger.warn('ClawHub returned 0 skills, keeping stale cache');
    } else {
      this.cachedSkills = this.getBuiltInSkills();
      this.lastCacheAt = new Date();
      this.logger.warn(`Using ${this.cachedSkills.length} built-in fallback skills`);
    }
  }

  private async fetchAllFromClawHub(): Promise<OpenClawHubSkill[]> {
    if (this.isRateLimited()) {
      this.logger.debug(`Skipping ClawHub fetch — rate-limited until ${new Date(this.rateLimitBackoffUntil).toISOString()}`);
      return [];
    }

    const all: OpenClawHubSkill[] = [];
    let cursor: string | undefined;
    let pageNum = 0;

    try {
      while (pageNum < MAX_PAGES) {
        pageNum++;
        let url = `${CLAWHUB_API}/skills?per_page=${PER_PAGE}`;
        if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

        const { data, status, headers } = await axios.get(url, {
          timeout: 15_000,
          headers: { 'User-Agent': 'Agentrix/2.0', Accept: 'application/json' },
          validateStatus: (s) => s < 500, // don't throw on 4xx
        });

        // Handle rate limiting
        if (status === 429) {
          this.markRateLimited();
          this.logger.warn(`ClawHub 429 Rate Limited after ${all.length} skills (page ${pageNum})`);
          break;
        }

        if (status !== 200) {
          this.logger.warn(`ClawHub returned ${status} on page ${pageNum}`);
          break;
        }

        const items: ClawHubRawSkill[] = data?.items ?? [];
        if (items.length === 0) break;

        for (const raw of items) {
          all.push(this.normalizeClawHubSkill(raw));
        }

        const nextCursor: string | undefined = data?.nextCursor;
        if (!nextCursor) break;
        cursor = nextCursor;

        // Small delay between pages to respect rate limits
        if (pageNum % 5 === 0) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      if (all.length > 0) {
        this.resetRateLimit();
      }
      this.logger.log(`Fetched ${all.length} skills from ClawHub in ${pageNum} pages`);
    } catch (err: any) {
      if (err.response?.status === 429 || err.message?.includes('rate limit') || err.message?.includes('Rate limit')) {
        this.markRateLimited();
      }
      this.logger.error(`ClawHub fetch error after ${all.length} skills (page ${pageNum}): ${err.message}`);
    }
    return all;
  }

  /* ================================================================ */
  /*  Normalisation                                                    */
  /* ================================================================ */

  private normalizeClawHubSkill(raw: ClawHubRawSkill): OpenClawHubSkill {
    const tagKeys = raw.tags && typeof raw.tags === 'object'
      ? Object.keys(raw.tags).filter(k => k !== 'latest')
      : [];

    const category = this.inferCategory(tagKeys, raw.displayName, raw.summary);
    const version = raw.latestVersion?.version ?? raw.tags?.latest ?? undefined;

    return {
      id: `clawhub-${raw.slug}`,
      key: raw.slug,
      name: raw.slug,
      displayName: raw.displayName || raw.slug,
      description: raw.summary || 'OpenClaw community skill',
      category,
      version,
      author: 'OpenClaw Community',
      icon: this.inferIcon(category, tagKeys),
      tags: tagKeys,
      enabled: true,
      callCount: raw.stats?.downloads ?? 0,
      rating: raw.stats?.stars ?? 0,
      source: 'openclaw_hub',
      hubStats: raw.stats,
      hubSlug: raw.slug,
      hubUpdatedAt: raw.updatedAt,
    };
  }

  private inferCategory(tags: string[], name?: string, desc?: string): string {
    for (const tag of tags) {
      const mapped = TAG_CATEGORY_MAP[tag.toLowerCase()];
      if (mapped) return mapped;
    }
    const text = `${name ?? ''} ${desc ?? ''}`.toLowerCase();
    if (/trad(e|ing)|crypto|coin|exchange|binance/i.test(text)) return SkillCategory.COMMERCE;
    if (/data|analy|chart|csv|pdf/i.test(text)) return SkillCategory.DATA;
    if (/api|webhook|slack|notion|zapier/i.test(text)) return SkillCategory.INTEGRATION;
    if (/pay|stripe|checkout/i.test(text)) return SkillCategory.PAYMENT;
    if (/image|video|music|draw|creat/i.test(text)) return SkillCategory.CUSTOM;
    return SkillCategory.UTILITY;
  }

  private inferIcon(category: string, tags: string[]): string {
    if (tags.includes('git') || tags.includes('github')) return '🐙';
    if (tags.includes('docker')) return '🐋';
    if (tags.includes('ssh') || tags.includes('security')) return '🔒';
    if (tags.includes('weather')) return '🌤️';
    if (tags.includes('game') || tags.includes('arena')) return '🎮';
    const iconMap: Record<string, string> = {
      [SkillCategory.COMMERCE]: '💰', [SkillCategory.PAYMENT]: '💳',
      [SkillCategory.DATA]: '📊', [SkillCategory.INTEGRATION]: '🔌',
      [SkillCategory.CUSTOM]: '🎨', [SkillCategory.UTILITY]: '⚡',
    };
    return iconMap[category] || '⚡';
  }

  /* ================================================================ */
  /*  DB persistence (full sync)                                       */
  /* ================================================================ */

  private async fullSync(): Promise<{ fetched: number; persisted: number }> {
    if (this.syncInProgress) {
      this.logger.warn('Sync already in progress, skipping');
      return { fetched: 0, persisted: 0 };
    }
    this.syncInProgress = true;
    try {
      const hubSkills = await this.fetchAllFromClawHub();
      if (hubSkills.length === 0) {
        this.logger.warn('Full sync: 0 skills fetched, aborting');
        return { fetched: 0, persisted: 0 };
      }

      this.cachedSkills = hubSkills;
      this.lastCacheAt = new Date();

      let persisted = 0;
      const existingMap = await this.getExistingHubSkillMap();

      const batch: Skill[] = [];
      for (const hs of hubSkills) {
        const entity = existingMap.get(hs.key) ?? this.skillRepo.create();
        this.applyHubSkillToEntity(entity, hs);
        batch.push(entity);
      }

      const CHUNK = 200;
      for (let i = 0; i < batch.length; i += CHUNK) {
        const chunk = batch.slice(i, i + CHUNK);
        await this.skillRepo.save(chunk, { chunk: CHUNK });
        persisted += chunk.length;
      }

      this.lastDbSyncAt = new Date();
      this.logger.log(`Full sync: ${hubSkills.length} fetched, ${persisted} persisted`);
      return { fetched: hubSkills.length, persisted };
    } finally {
      this.syncInProgress = false;
    }
  }

  private async getExistingHubSkillMap(): Promise<Map<string, Skill>> {
    try {
      const rows = await this.skillRepo.find({
        where: {
          source: SkillSource.IMPORTED,
          originalPlatform: SkillOriginalPlatform.OPENCLAW,
        },
      });
      return new Map(rows.map(r => [r.externalSkillId ?? r.name, r]));
    } catch { return new Map(); }
  }

  private applyHubSkillToEntity(entity: Skill, hs: OpenClawHubSkill): void {
    entity.name = hs.key;
    entity.displayName = hs.displayName ?? hs.name;
    entity.description = (hs.description ?? '').slice(0, 500);
    entity.version = hs.version ?? '1.0.0';
    entity.category = (hs.category as SkillCategory) || SkillCategory.UTILITY;
    entity.layer = SkillLayer.LOGIC;
    entity.source = SkillSource.IMPORTED;
    entity.originalPlatform = SkillOriginalPlatform.OPENCLAW;
    entity.status = SkillStatus.PUBLISHED;
    entity.externalSkillId = hs.key;
    entity.callCount = hs.callCount ?? 0;
    entity.rating = hs.rating ?? 0;
    entity.tags = hs.tags ?? [];
    entity.humanAccessible = true;
    entity.ucpEnabled = false;
    entity.x402Enabled = false;
    entity.imageUrl = hs.icon ?? '⚡';
    entity.pricing = { type: SkillPricingType.FREE };
    entity.inputSchema = hs.inputSchema as any ?? {
      type: 'object',
      properties: { prompt: { type: 'string', description: 'Input prompt for the skill' } },
      required: ['prompt'],
    };
    entity.executor = {
      type: 'mcp',
      mcpServer: 'openclaw',
      endpoint: `https://www.clawhub.ai/skills/${hs.key}`,
    };
    entity.metadata = {
      hubSlug: hs.hubSlug ?? hs.key,
      hubStats: hs.hubStats,
      hubUpdatedAt: hs.hubUpdatedAt,
      syncedAt: new Date().toISOString(),
    };
    entity.authorInfo = { id: 'openclaw-community', name: 'OpenClaw Community', type: 'developer' };
    entity.compatibleAgents = ['all'];
    entity.permissions = ['read'];
    entity.aiPriority = 'normal';
  }

  private skillEntityToHubSkill(entity: Skill): OpenClawHubSkill {
    return {
      id: entity.id,
      key: entity.externalSkillId ?? entity.name,
      name: entity.name,
      displayName: entity.displayName,
      description: entity.description,
      category: entity.category,
      version: entity.version,
      author: entity.authorInfo?.name ?? 'OpenClaw Community',
      icon: entity.imageUrl ?? '⚡',
      tags: entity.tags ?? [],
      enabled: entity.status === SkillStatus.PUBLISHED,
      callCount: entity.callCount,
      rating: Number(entity.rating) || 0,
      source: 'openclaw_hub',
      hubSlug: entity.externalSkillId ?? entity.name,
      hubStats: entity.metadata?.hubStats,
      hubUpdatedAt: entity.metadata?.hubUpdatedAt,
    };
  }

  /* ================================================================ */
  /*  Cron jobs                                                        */
  /* ================================================================ */

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCacheRefresh() {
    if (this.isRateLimited()) {
      this.logger.debug('Skipping cache refresh — rate-limited');
      return;
    }
    try { await this.refreshFromClawHub(); }
    catch (err: any) { this.logger.error(`Cache refresh cron failed: ${err.message}`); }
  }

  @Cron('0 0 */2 * * *') // Every 2 hours (less aggressive)
  async handleDbSync() {
    if (this.isRateLimited()) {
      this.logger.debug('Skipping DB sync — rate-limited');
      return;
    }
    if (this.lastDbSyncAt && Date.now() - this.lastDbSyncAt.getTime() < FULL_SYNC_INTERVAL_MS) return;
    try {
      const result = await this.fullSync();
      this.logger.log(`DB sync: ${result.fetched} fetched, ${result.persisted} saved`);
    } catch (err: any) { this.logger.error(`DB sync cron failed: ${err.message}`); }
  }

  /* ================================================================ */
  /*  Built-in fallback                                                */
  /* ================================================================ */

  private getBuiltInSkills(): OpenClawHubSkill[] {
    const s = (id: string, key: string, name: string, dn: string, desc: string, cat: string, icon: string, tags: string[], count: number, rating: number): OpenClawHubSkill => ({
      id, key, name, displayName: dn, description: desc, category: cat, icon, tags, enabled: true,
      author: 'OpenClaw', callCount: count, rating, source: 'openclaw_hub',
    });
    return [
      // Core AI
      s('oc-web-search','web_search','Web Search','Web Search','Search the web with AI-powered relevance ranking','search','🔍',['search','web'],15420,4.7),
      s('oc-news-search','news_search','News Search','News','Search real-time news from global sources','search','📰',['news','realtime'],9200,4.5),
      s('oc-code-exec','code_execution','Code Execution','Code Sandbox','Execute Python, JavaScript safely','developer','💻',['code','python'],12300,4.8),
      s('oc-git','git_ops','Git Operations','Git','Clone, commit, push and manage GitHub repos','developer','🐙',['git','github'],8100,4.6),
      s('oc-memory','long_term_memory','Long-Term Memory','Memory','Persistent memory across conversations','memory','🧠',['memory','context'],18200,4.9),
      s('oc-image-gen','image_generation','Image Generation','Image Gen','Generate images from text prompts','creative','🎨',['image','generation'],7650,4.3),
      s('oc-data-analysis','data_analysis','Data Analysis','Data Analysis','Analyse datasets, generate charts','analytics','📊',['data','analytics'],6100,4.6),
      s('oc-web-scrape','web_scraper','Web Scraper','Web Scraper','Extract content from web pages','data','🕷️',['scrape','web'],5400,4.4),
      s('oc-api-connector','api_connector','API Connector','API Connector','Connect to any REST/GraphQL API','integration','🔌',['api','rest'],4500,4.5),
      s('oc-translation','translation','Translation','Translation','Translate text between 100+ languages','language','🌐',['translate','language'],8900,4.7),
      s('oc-browser','browser_automation','Browser Automation','Browser','Control a headless browser','automation','🌐',['browser','automation'],5100,4.5),
      s('oc-file-manager','file_manager','File Manager','File Manager','Read, write and manage files','utility','📁',['files','storage'],9800,4.5),
      // Developer tools
      s('oc-docker','docker_manager','Docker Manager','Docker','Build, run and manage Docker containers','developer','🐋',['docker','container'],4800,4.4),
      s('oc-ssh','ssh_commander','SSH Commander','SSH','Execute commands on remote servers via SSH','developer','🔒',['ssh','remote'],3900,4.3),
      s('oc-debugger','code_debugger','Code Debugger','Debugger','AI-assisted debugging with stack trace analysis','developer','🔧',['debug','error'],3200,4.5),
      s('oc-test-gen','test_generator','Test Generator','Test Gen','Auto-generate unit and integration tests','developer','🧪',['test','coverage'],2800,4.2),
      s('oc-lint','code_linter','Code Linter','Linter','Lint and auto-fix code style issues','developer','✨',['lint','format'],2400,4.1),
      s('oc-docs-gen','docs_generator','Documentation Generator','Doc Gen','Generate API docs from code','developer','📝',['docs','api'],2100,4.3),
      // Data & analytics
      s('oc-csv','csv_processor','CSV Processor','CSV Tool','Parse, transform and analyze CSV data','data','📋',['csv','data'],3600,4.4),
      s('oc-pdf','pdf_reader','PDF Reader','PDF','Extract text and data from PDF documents','data','📄',['pdf','document'],4200,4.5),
      s('oc-ocr','ocr_engine','OCR Engine','OCR','Extract text from images & scanned documents','data','👁️',['ocr','image'],3100,4.3),
      s('oc-charts','chart_builder','Chart Builder','Charts','Generate interactive charts from data','analytics','📈',['chart','visualization'],2900,4.4),
      s('oc-sql','sql_agent','SQL Agent','SQL','Query databases with natural language','data','🗃️',['sql','database'],5200,4.6),
      s('oc-json','json_transformer','JSON Transformer','JSON Tool','Parse, query and transform JSON data','data','📦',['json','transform'],2600,4.2),
      // Integration
      s('oc-slack','slack_bot','Slack Bot','Slack','Send messages and manage Slack channels','integration','💬',['slack','messaging'],4100,4.5),
      s('oc-notion','notion_assistant','Notion Assistant','Notion','Create and manage Notion pages and databases','integration','📓',['notion','workspace'],3800,4.4),
      s('oc-email','email_sender','Email Sender','Email','Send and read emails via SMTP/IMAP','integration','📧',['email','smtp'],4400,4.5),
      s('oc-webhook','webhook_handler','Webhook Handler','Webhooks','Create and manage HTTP webhooks','integration','🔗',['webhook','http'],2700,4.2),
      s('oc-zapier','zapier_trigger','Zapier Trigger','Zapier','Trigger and manage Zapier workflows','integration','⚡',['zapier','automation'],2300,4.1),
      s('oc-calendar','calendar_manager','Calendar Manager','Calendar','Manage Google/Outlook calendar events','integration','📅',['calendar','schedule'],3200,4.4),
      s('oc-sheets','spreadsheet','Spreadsheet','Sheets','Read and write Google Sheets','integration','📊',['sheets','spreadsheet'],2800,4.3),
      // Commerce & finance
      s('oc-crypto-price','crypto_price','Crypto Price','Crypto Prices','Real-time crypto prices and market cap','commerce','💰',['crypto','price'],6800,4.6),
      s('oc-dex-swap','dex_swap','DEX Swap','DEX Swap','Execute token swaps on decentralized exchanges','commerce','🔄',['dex','swap'],3400,4.3),
      s('oc-portfolio','portfolio_tracker','Portfolio Tracker','Portfolio','Track crypto and stock portfolio value','commerce','📊',['portfolio','tracking'],2900,4.4),
      s('oc-stock','stock_data','Stock Data','Stocks','Real-time stock quotes, charts and analysis','commerce','📈',['stock','market'],4600,4.5),
      s('oc-nft','nft_tools','NFT Tools','NFT','Mint, list and browse NFTs across chains','commerce','🖼️',['nft','mint'],2200,4.1),
      s('oc-payment','payment_gateway','Payment Gateway','Payments','Accept crypto and fiat payments','payment','💳',['payment','checkout'],3100,4.4),
      // Creative
      s('oc-music','music_generator','Music Generator','Music Gen','Generate music tracks from text descriptions','creative','🎵',['music','audio'],2400,4.2),
      s('oc-video','video_editor','Video Editor','Video','Edit and process video clips with AI','creative','🎬',['video','edit'],1800,4.0),
      s('oc-tts','text_to_speech','Text to Speech','TTS','Convert text to natural-sounding speech','creative','🔊',['tts','speech'],3500,4.5),
      s('oc-stt','speech_to_text','Speech to Text','STT','Transcribe audio to text with high accuracy','creative','🎤',['stt','transcription'],3200,4.4),
      s('oc-caption','caption_generator','Caption Generator','Captions','Generate social media captions and hashtags','creative','✍️',['caption','social'],2100,4.2),
      // Automation
      s('oc-scheduler','task_scheduler','Task Scheduler','Scheduler','Schedule recurring tasks and reminders','automation','⏰',['schedule','cron'],3700,4.5),
      s('oc-workflow','workflow_engine','Workflow Engine','Workflows','Build and execute multi-step workflows','automation','🔀',['workflow','pipeline'],3100,4.4),
      s('oc-monitor','site_monitor','Site Monitor','Monitor','Monitor website uptime and performance','automation','📡',['monitor','uptime'],2500,4.3),
      s('oc-scrape-auto','auto_scraper','Auto Scraper','Scraper','Automated web scraping with scheduling','automation','🤖',['scrape','schedule'],2200,4.2),
      // Utility
      s('oc-weather','weather_forecast','Weather Forecast','Weather','Real-time weather data for any location','utility','🌤️',['weather','forecast'],5500,4.6),
      s('oc-maps','maps_geocoding','Maps & Geocoding','Maps','Address lookup, directions and distance','utility','🗺️',['maps','geocode'],3800,4.4),
      s('oc-qr','qr_generator','QR Generator','QR Code','Generate and scan QR codes','utility','🔳',['qr','barcode'],2100,4.2),
      s('oc-calculator','calculator','Calculator','Calculator','Advanced math, unit conversion and formulas','utility','🔢',['math','convert'],4200,4.5),
      s('oc-password','password_generator','Password Generator','Passwords','Generate secure passwords and manage secrets','utility','🔑',['password','security'],1900,4.3),
      // Social & gaming
      s('oc-twitter','twitter_agent','Twitter Agent','Twitter/X','Post, search and analyze tweets','integration','🐦',['twitter','social'],4800,4.4),
      s('oc-reddit','reddit_reader','Reddit Reader','Reddit','Browse and analyze Reddit posts','integration','📱',['reddit','social'],2600,4.2),
      s('oc-discord','discord_bot','Discord Bot','Discord','Manage Discord servers and channels','integration','🎮',['discord','gaming'],3500,4.4),
      s('oc-game-arena','game_arena','Game Arena','Battle Arena','AI agent battle arena and competitions','custom','⚔️',['game','battle'],1800,4.1),
    ];
  }
}
