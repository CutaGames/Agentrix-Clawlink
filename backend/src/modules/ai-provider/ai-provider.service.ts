import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { UserProviderConfig } from '../../entities/user-provider-config.entity';

// ─── Provider & Model Catalog ────────────────────────────────────

export interface ModelDef {
  id: string;
  label: string;
  contextWindow: number;
  costTier: 'free' | 'low' | 'medium' | 'high';
  capabilities: string[]; // e.g. ['chat', 'vision', 'function_calling']
}

export interface ProviderDef {
  id: string;
  name: string;
  icon: string;
  region: 'international' | 'china';
  requiredFields: string[]; // e.g. ['apiKey'], ['apiKey', 'secretKey', 'region']
  optionalFields: string[];
  placeholder: Record<string, string>;
  baseUrl?: string;
  models: ModelDef[];
}

export const PROVIDER_CATALOG: ProviderDef[] = [
  // ─── International ───
  {
    id: 'anthropic', name: 'Anthropic (Claude)', icon: '🤖', region: 'international',
    requiredFields: ['apiKey'], optionalFields: ['baseUrl'],
    placeholder: { apiKey: 'sk-ant-api03-...' },
    models: [
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', contextWindow: 200000, costTier: 'low', capabilities: ['chat', 'vision', 'function_calling'] },
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', contextWindow: 200000, costTier: 'medium', capabilities: ['chat', 'vision', 'function_calling'] },
      { id: 'claude-opus-4', label: 'Claude Opus 4', contextWindow: 200000, costTier: 'high', capabilities: ['chat', 'vision', 'function_calling'] },
    ],
  },
  {
    id: 'openai', name: 'OpenAI', icon: '🧠', region: 'international',
    requiredFields: ['apiKey'], optionalFields: ['baseUrl'],
    placeholder: { apiKey: 'sk-proj-...' },
    models: [
      { id: 'gpt-4o', label: 'GPT-4o', contextWindow: 128000, costTier: 'medium', capabilities: ['chat', 'vision', 'function_calling'] },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', contextWindow: 128000, costTier: 'low', capabilities: ['chat', 'vision', 'function_calling'] },
      { id: 'gpt-4.5-preview', label: 'GPT-4.5 Preview', contextWindow: 128000, costTier: 'high', capabilities: ['chat', 'vision', 'function_calling'] },
      { id: 'o3-mini', label: 'o3-mini', contextWindow: 200000, costTier: 'medium', capabilities: ['chat', 'function_calling'] },
    ],
  },
  {
    id: 'gemini', name: 'Google Gemini', icon: '✨', region: 'international',
    requiredFields: ['apiKey'], optionalFields: [],
    placeholder: { apiKey: 'AIzaSy...' },
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', contextWindow: 1000000, costTier: 'low', capabilities: ['chat', 'vision', 'function_calling'] },
      { id: 'gemini-2.0-pro', label: 'Gemini 2.0 Pro', contextWindow: 1000000, costTier: 'medium', capabilities: ['chat', 'vision', 'function_calling'] },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', contextWindow: 1000000, costTier: 'high', capabilities: ['chat', 'vision', 'function_calling'] },
    ],
  },
  {
    id: 'bedrock', name: 'AWS Bedrock', icon: '☁️', region: 'international',
    requiredFields: ['apiKey', 'secretKey', 'region'], optionalFields: [],
    placeholder: { apiKey: 'AKIA...', secretKey: 'wJal...', region: 'us-east-1' },
    models: [
      { id: 'us.anthropic.claude-haiku-4-5-20251001-v1:0', label: 'Claude Haiku 4.5 (Bedrock)', contextWindow: 200000, costTier: 'low', capabilities: ['chat', 'vision', 'function_calling'] },
      { id: 'us.anthropic.claude-sonnet-4-5-20250514-v1:0', label: 'Claude Sonnet 4.5 (Bedrock)', contextWindow: 200000, costTier: 'medium', capabilities: ['chat', 'vision', 'function_calling'] },
      { id: 'us.amazon.nova-pro-v1:0', label: 'Amazon Nova Pro', contextWindow: 300000, costTier: 'medium', capabilities: ['chat', 'function_calling'] },
      { id: 'us.amazon.nova-lite-v1:0', label: 'Amazon Nova Lite', contextWindow: 300000, costTier: 'low', capabilities: ['chat'] },
      { id: 'us.meta.llama3-3-70b-instruct-v1:0', label: 'Llama 3.3 70B (Bedrock)', contextWindow: 128000, costTier: 'low', capabilities: ['chat'] },
    ],
  },
  {
    id: 'deepseek', name: 'DeepSeek', icon: '🔬', region: 'international',
    requiredFields: ['apiKey'], optionalFields: ['baseUrl'],
    placeholder: { apiKey: 'sk-...' },
    baseUrl: 'https://api.deepseek.com',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek V3', contextWindow: 64000, costTier: 'low', capabilities: ['chat', 'function_calling'] },
      { id: 'deepseek-reasoner', label: 'DeepSeek R1', contextWindow: 64000, costTier: 'low', capabilities: ['chat'] },
    ],
  },
  {
    id: 'groq', name: 'Groq', icon: '⚡', region: 'international',
    requiredFields: ['apiKey'], optionalFields: [],
    placeholder: { apiKey: 'gsk_...' },
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', contextWindow: 128000, costTier: 'free', capabilities: ['chat', 'function_calling'] },
      { id: 'llama-3.1-405b-reasoning', label: 'Llama 3.1 405B', contextWindow: 128000, costTier: 'low', capabilities: ['chat'] },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', contextWindow: 32768, costTier: 'free', capabilities: ['chat', 'function_calling'] },
    ],
  },
  // ─── China providers ───
  {
    id: 'zhipu', name: '智谱 AI (GLM)', icon: '🧪', region: 'china',
    requiredFields: ['apiKey'], optionalFields: [],
    placeholder: { apiKey: 'zhipu-api-key...' },
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4-plus', label: 'GLM-4-Plus', contextWindow: 128000, costTier: 'medium', capabilities: ['chat', 'vision', 'function_calling'] },
      { id: 'glm-4-flash', label: 'GLM-4-Flash', contextWindow: 128000, costTier: 'free', capabilities: ['chat', 'function_calling'] },
      { id: 'glm-4-long', label: 'GLM-4-Long', contextWindow: 1000000, costTier: 'low', capabilities: ['chat'] },
    ],
  },
  {
    id: 'moonshot', name: 'Moonshot (Kimi)', icon: '🌙', region: 'china',
    requiredFields: ['apiKey'], optionalFields: [],
    placeholder: { apiKey: 'sk-...' },
    baseUrl: 'https://api.moonshot.cn/v1',
    models: [
      { id: 'moonshot-v1-8k', label: 'Moonshot V1 8K', contextWindow: 8000, costTier: 'low', capabilities: ['chat', 'function_calling'] },
      { id: 'moonshot-v1-32k', label: 'Moonshot V1 32K', contextWindow: 32000, costTier: 'low', capabilities: ['chat', 'function_calling'] },
      { id: 'moonshot-v1-128k', label: 'Moonshot V1 128K', contextWindow: 128000, costTier: 'medium', capabilities: ['chat'] },
    ],
  },
  {
    id: 'baidu', name: '百度文心', icon: '🐻', region: 'china',
    requiredFields: ['apiKey', 'secretKey'], optionalFields: [],
    placeholder: { apiKey: 'app-key...', secretKey: 'app-secret...' },
    models: [
      { id: 'ernie-4.0-8k', label: 'ERNIE 4.0', contextWindow: 8000, costTier: 'medium', capabilities: ['chat', 'function_calling'] },
      { id: 'ernie-3.5-128k', label: 'ERNIE 3.5 128K', contextWindow: 128000, costTier: 'low', capabilities: ['chat'] },
      { id: 'ernie-speed-128k', label: 'ERNIE Speed 128K', contextWindow: 128000, costTier: 'free', capabilities: ['chat'] },
    ],
  },
  {
    id: 'alibaba', name: '阿里通义千问', icon: '🐜', region: 'china',
    requiredFields: ['apiKey'], optionalFields: ['baseUrl'],
    placeholder: { apiKey: 'sk-...' },
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen-max', label: 'Qwen Max', contextWindow: 32000, costTier: 'medium', capabilities: ['chat', 'vision', 'function_calling'] },
      { id: 'qwen-plus', label: 'Qwen Plus', contextWindow: 131000, costTier: 'low', capabilities: ['chat', 'function_calling'] },
      { id: 'qwen-turbo', label: 'Qwen Turbo', contextWindow: 131000, costTier: 'free', capabilities: ['chat', 'function_calling'] },
    ],
  },
];

// ─── Service ────────────────────────────────────────────────────

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private readonly encKey: Buffer;

  constructor(
    @InjectRepository(UserProviderConfig)
    private readonly repo: Repository<UserProviderConfig>,
    private readonly configService: ConfigService,
  ) {
    const secret = this.configService.get<string>('PROVIDER_ENCRYPTION_KEY') || 'agentrix-default-provider-key-2026';
    this.encKey = scryptSync(secret, 'agentrix-salt', 32);
  }

  // ─── Encryption helpers ──────────

  private encrypt(plaintext: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('hex'), encrypted.toString('hex'), tag.toString('hex')].join(':');
  }

  private decrypt(ciphertext: string): string {
    const [ivHex, encHex, tagHex] = ciphertext.split(':');
    if (!ivHex || !encHex || !tagHex) throw new Error('Invalid encrypted data');
    const decipher = createDecipheriv('aes-256-gcm', this.encKey, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
  }

  // ─── Catalog ──────────

  getCatalog(): ProviderDef[] {
    return PROVIDER_CATALOG;
  }

  getProviderDef(providerId: string): ProviderDef | undefined {
    return PROVIDER_CATALOG.find(p => p.id === providerId);
  }

  // ─── CRUD ──────────

  async getUserConfigs(userId: string) {
    const configs = await this.repo.find({ where: { userId }, order: { createdAt: 'ASC' } });
    return configs.map(c => ({
      id: c.id,
      providerId: c.providerId,
      selectedModel: c.selectedModel,
      baseUrl: c.baseUrl,
      region: c.region,
      isActive: c.isActive,
      lastTestedAt: c.lastTestedAt,
      lastTestResult: c.lastTestResult,
      apiKeyPrefix: this.getKeyPrefix(c),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  private getKeyPrefix(config: UserProviderConfig): string {
    try {
      const key = this.decrypt(config.encryptedApiKey);
      return key.length > 8 ? key.slice(0, 4) + '...' + key.slice(-4) : '****';
    } catch {
      return '****';
    }
  }

  async upsertConfig(userId: string, dto: {
    providerId: string;
    apiKey: string;
    secretKey?: string;
    baseUrl?: string;
    region?: string;
    selectedModel: string;
  }) {
    const provider = this.getProviderDef(dto.providerId);
    if (!provider) throw new BadRequestException(`Unknown provider: ${dto.providerId}`);

    const validModelIds = provider.models.map(m => m.id);
    if (!validModelIds.includes(dto.selectedModel)) {
      throw new BadRequestException(`Invalid model "${dto.selectedModel}" for provider "${dto.providerId}"`);
    }

    let config = await this.repo.findOne({ where: { userId, providerId: dto.providerId } });
    if (!config) {
      config = this.repo.create({ userId, providerId: dto.providerId });
    }

    config.encryptedApiKey = this.encrypt(dto.apiKey);
    config.encryptedSecretKey = dto.secretKey ? this.encrypt(dto.secretKey) : undefined;
    config.baseUrl = dto.baseUrl || undefined;
    config.region = dto.region || undefined;
    config.selectedModel = dto.selectedModel;
    config.isActive = true;

    await this.repo.save(config);
    return { id: config.id, providerId: config.providerId, selectedModel: config.selectedModel };
  }

  async deleteConfig(userId: string, providerId: string) {
    const result = await this.repo.delete({ userId, providerId });
    if (result.affected === 0) throw new NotFoundException(`No config found for provider "${providerId}"`);
    return { success: true };
  }

  /** Get decrypted API key for a user + provider (used internally by chat flow) */
  async getDecryptedKey(userId: string, providerId: string): Promise<{ apiKey: string; secretKey?: string; baseUrl?: string; region?: string; model: string } | null> {
    const config = await this.repo.findOne({ where: { userId, providerId, isActive: true } });
    if (!config) return null;
    try {
      return {
        apiKey: this.decrypt(config.encryptedApiKey),
        secretKey: config.encryptedSecretKey ? this.decrypt(config.encryptedSecretKey) : undefined,
        baseUrl: config.baseUrl || undefined,
        region: config.region || undefined,
        model: config.selectedModel,
      };
    } catch {
      return null;
    }
  }

  // ─── Test connectivity ──────────

  async testProvider(userId: string, dto: { providerId: string; apiKey: string; secretKey?: string; baseUrl?: string; region?: string; model: string }): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const provider = this.getProviderDef(dto.providerId);
    if (!provider) throw new BadRequestException(`Unknown provider: ${dto.providerId}`);

    const start = Date.now();
    try {
      await this.doTestCall(dto);
      const latencyMs = Date.now() - start;

      // Update last test result in DB if config exists
      const config = await this.repo.findOne({ where: { userId, providerId: dto.providerId } });
      if (config) {
        config.lastTestedAt = new Date();
        config.lastTestResult = 'success';
        await this.repo.save(config);
      }

      return { success: true, latencyMs };
    } catch (err: any) {
      const latencyMs = Date.now() - start;

      const config = await this.repo.findOne({ where: { userId, providerId: dto.providerId } });
      if (config) {
        config.lastTestedAt = new Date();
        config.lastTestResult = 'failed';
        await this.repo.save(config);
      }

      return { success: false, latencyMs, error: err.message || 'Connection failed' };
    }
  }

  private async doTestCall(dto: { providerId: string; apiKey: string; secretKey?: string; baseUrl?: string; region?: string; model: string }): Promise<void> {
    const testMessage = [{ role: 'user', content: 'Say "hello" in one word.' }];

    switch (dto.providerId) {
      case 'anthropic': {
        const url = (dto.baseUrl || 'https://api.anthropic.com') + '/v1/messages';
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': dto.apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: dto.model, max_tokens: 10, messages: testMessage }),
          signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text().then(t => t.slice(0, 200))}`);
        break;
      }
      case 'openai':
      case 'deepseek':
      case 'groq':
      case 'moonshot':
      case 'alibaba': {
        // All OpenAI-compatible APIs
        const defaultUrls: Record<string, string> = {
          openai: 'https://api.openai.com/v1',
          deepseek: 'https://api.deepseek.com',
          groq: 'https://api.groq.com/openai/v1',
          moonshot: 'https://api.moonshot.cn/v1',
          alibaba: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        };
        const base = dto.baseUrl || defaultUrls[dto.providerId] || 'https://api.openai.com/v1';
        const resp = await fetch(`${base}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${dto.apiKey}` },
          body: JSON.stringify({ model: dto.model, max_tokens: 10, messages: testMessage }),
          signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text().then(t => t.slice(0, 200))}`);
        break;
      }
      case 'gemini': {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${dto.model}:generateContent?key=${dto.apiKey}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Say hello' }] }], generationConfig: { maxOutputTokens: 10 } }),
          signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text().then(t => t.slice(0, 200))}`);
        break;
      }
      case 'zhipu': {
        const resp = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${dto.apiKey}` },
          body: JSON.stringify({ model: dto.model, max_tokens: 10, messages: testMessage }),
          signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text().then(t => t.slice(0, 200))}`);
        break;
      }
      case 'bedrock': {
        // For Bedrock we test with SigV4 — simplified: just check credentials are valid format
        if (!dto.apiKey || !dto.secretKey || !dto.region) {
          throw new Error('AWS Access Key, Secret Key, and Region are all required');
        }
        if (dto.apiKey.length < 16) throw new Error('Invalid AWS Access Key format');
        if (dto.secretKey.length < 16) throw new Error('Invalid AWS Secret Key format');
        // A full SigV4 test would require aws-sdk; for now we validate format
        this.logger.log(`Bedrock credentials format validated for region ${dto.region}`);
        break;
      }
      case 'baidu': {
        // Baidu uses API Key + Secret Key to get an access token first
        if (!dto.apiKey || !dto.secretKey) throw new Error('API Key and Secret Key are required for Baidu');
        const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(dto.apiKey)}&client_secret=${encodeURIComponent(dto.secretKey)}`;
        const tokenResp = await fetch(tokenUrl, { method: 'POST', signal: AbortSignal.timeout(10000) });
        if (!tokenResp.ok) throw new Error(`Token request failed: HTTP ${tokenResp.status}`);
        const tokenData = await tokenResp.json() as any;
        if (!tokenData.access_token) throw new Error('Failed to get access token');
        break;
      }
      default:
        throw new Error(`Test not implemented for provider: ${dto.providerId}`);
    }
  }
}
