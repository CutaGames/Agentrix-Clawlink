import { Injectable, Logger } from '@nestjs/common';

/**
 * Task complexity tiers for model routing.
 *
 * LIGHT  – simple Q&A, classification, extraction, formatting, greetings
 * MEDIUM – multi-step reasoning, code generation, analysis, summarization
 * HEAVY  – complex chain-of-thought, creative writing, tool-use chains, agentic planning
 */
export enum TaskTier {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
}

/**
 * Model definition with pricing metadata.
 * Costs are in USD per 1M tokens.
 */
export interface ModelConfig {
  id: string;
  /** Provider key used for API routing */
  provider: 'bedrock' | 'deepseek' | 'alibaba' | 'openai' | 'anthropic';
  /** Display name */
  name: string;
  /** Cost per 1M input tokens (USD) */
  inputCostPer1M: number;
  /** Cost per 1M output tokens (USD) */
  outputCostPer1M: number;
  /** Max context window */
  maxTokens: number;
  /** Which task tiers this model can handle */
  tiers: TaskTier[];
}

/**
 * Result of routing a request to the optimal model.
 */
export interface RoutingResult {
  model: ModelConfig;
  tier: TaskTier;
  reason: string;
}

/**
 * Smart LLM Router — classifies tasks and routes to the cheapest adequate model.
 *
 * Architecture:
 *   OpenClaw instance → Agentrix LLM Gateway (/api/llm/v1/chat/completions)
 *                                  ↓
 *                         LlmRouterService.route(prompt)
 *                                  ↓
 *                 ┌──────────┬─────────────┬───────────────┐
 *                LIGHT      MEDIUM        HEAVY
 *            Nova Micro   Qwen 3 Plus   Claude Haiku 4.5
 *            $0.035/$0.14  ~$0.15/$0.60   ~$1.00/$5.00
 *
 * Each OpenClaw container connects to our gateway as its "LLM provider" so we
 * can transparently route without the user knowing which model is used.
 */
@Injectable()
export class LlmRouterService {
  private readonly logger = new Logger(LlmRouterService.name);

  /**
   * Model catalog — ordered cheapest-first within each tier.
   * Prices as of early 2026 (Bedrock / Alibaba Cloud / API pricing).
   */
  private readonly models: ModelConfig[] = [
    // ── LIGHT tier (cheapest, simple tasks) ───────────────────────
    {
      id: 'amazon.nova-micro-v1',
      provider: 'bedrock',
      name: 'Amazon Nova Micro',
      inputCostPer1M: 0.035,
      outputCostPer1M: 0.14,
      maxTokens: 128_000,
      tiers: [TaskTier.LIGHT],
    },
    {
      id: 'amazon.nova-lite-v1',
      provider: 'bedrock',
      name: 'Amazon Nova Lite',
      inputCostPer1M: 0.06,
      outputCostPer1M: 0.24,
      maxTokens: 300_000,
      tiers: [TaskTier.LIGHT, TaskTier.MEDIUM],
    },
    // ── MEDIUM tier ──────────────────────────────────────────────
    {
      id: 'qwen-plus',
      provider: 'alibaba',
      name: 'Qwen 3.5 Plus',
      inputCostPer1M: 0.15,
      outputCostPer1M: 0.60,
      maxTokens: 131_072,
      tiers: [TaskTier.MEDIUM],
    },
    {
      id: 'deepseek-chat',
      provider: 'deepseek',
      name: 'DeepSeek V3',
      inputCostPer1M: 0.27,
      outputCostPer1M: 1.10,
      maxTokens: 128_000,
      tiers: [TaskTier.MEDIUM, TaskTier.HEAVY],
    },
    {
      id: 'amazon.nova-pro-v1',
      provider: 'bedrock',
      name: 'Amazon Nova Pro',
      inputCostPer1M: 0.80,
      outputCostPer1M: 3.20,
      maxTokens: 300_000,
      tiers: [TaskTier.MEDIUM, TaskTier.HEAVY],
    },
    // ── HEAVY tier ───────────────────────────────────────────────
    {
      id: 'anthropic.claude-3-5-haiku-20241022-v1:0',
      provider: 'bedrock',
      name: 'Claude 3.5 Haiku',
      inputCostPer1M: 0.80,
      outputCostPer1M: 4.00,
      maxTokens: 200_000,
      tiers: [TaskTier.HEAVY],
    },
    {
      id: 'anthropic.claude-haiku-4-5-v1:0',
      provider: 'bedrock',
      name: 'Claude Haiku 4.5',
      inputCostPer1M: 1.00,
      outputCostPer1M: 5.00,
      maxTokens: 200_000,
      tiers: [TaskTier.HEAVY],
    },
  ];

  /**
   * Keyword-based heuristics for fast task classification.
   * A lightweight classifier that avoids an extra LLM call.
   */
  private readonly heavySignals = [
    /\b(analyze|analyse|debug|refactor|architect|design pattern|trade-?off)\b/i,
    /\b(write (?:a |an )?(?:essay|article|story|report|proposal|plan))\b/i,
    /\b(step[- ]by[- ]step|chain[- ]of[- ]thought|reason(?:ing)?)\b/i,
    /\b(compare (?:and|&) contrast|pros (?:and|&) cons)\b/i,
    /```[\s\S]{200,}/,  // large code blocks → likely code tasks
    /\b(implement|build|create|develop)\b.*\b(function|class|module|service|component|api)\b/i,
  ];

  private readonly lightSignals = [
    /^(hi|hello|hey|thanks|ok|yes|no|sure)\b/i,
    /\b(what is|who is|when was|where is|define|meaning of)\b/i,
    /\b(translate|convert|format|list|summarize in \d+ words)\b/i,
    /\b(weather|time|date|price of)\b/i,
  ];

  /**
   * Classify a prompt into a task tier.
   */
  classifyTask(prompt: string): TaskTier {
    // Short prompts (< 50 chars) are almost always simple
    if (prompt.length < 50 && this.lightSignals.some(r => r.test(prompt))) {
      return TaskTier.LIGHT;
    }

    // Check heavy signals
    if (this.heavySignals.some(r => r.test(prompt))) {
      return TaskTier.HEAVY;
    }

    // Check light signals
    if (this.lightSignals.some(r => r.test(prompt))) {
      return TaskTier.LIGHT;
    }

    // Default: medium for anything in between
    return TaskTier.MEDIUM;
  }

  /**
   * Route a prompt to the most cost-effective model that can handle it.
   */
  route(prompt: string): RoutingResult {
    const tier = this.classifyTask(prompt);

    // Find cheapest model that supports this tier (models are pre-sorted by cost)
    const eligible = this.models.filter(m => m.tiers.includes(tier));
    const model = eligible[0]; // already sorted cheapest first

    if (!model) {
      // Fallback to Qwen Plus if no model found (shouldn't happen)
      this.logger.warn(`No model found for tier ${tier}, falling back to qwen-plus`);
      const fallback = this.models.find(m => m.id === 'qwen-plus')!;
      return { model: fallback, tier, reason: 'fallback' };
    }

    this.logger.debug(`Routed [${tier}] → ${model.name} (${model.id})`);
    return { model, tier, reason: `cheapest-for-${tier}` };
  }

  /**
   * Estimate monthly cost for a user given their token allocation.
   *
   * @param totalTokens Total tokens per month (e.g. 10_000_000 for 10M)
   * @param tierDistribution Percentage of requests per tier (should sum to 1.0)
   * @param inputOutputRatio Fraction of tokens that are input (rest = output)
   */
  estimateMonthlyCost(
    totalTokens: number,
    tierDistribution = { light: 0.55, medium: 0.30, heavy: 0.15 },
    inputOutputRatio = 0.60,
  ): {
    totalCost: number;
    breakdown: Array<{ tier: string; model: string; tokens: number; cost: number }>;
  } {
    const breakdown: Array<{ tier: string; model: string; tokens: number; cost: number }> = [];
    let totalCost = 0;

    for (const [tier, fraction] of Object.entries(tierDistribution)) {
      const tierTokens = totalTokens * fraction;
      const inputTokens = tierTokens * inputOutputRatio;
      const outputTokens = tierTokens * (1 - inputOutputRatio);

      // Get cheapest model for this tier
      const { model } = this.route(
        tier === 'light' ? 'hello' : tier === 'heavy' ? 'analyze and implement' : 'summarize this',
      );

      const inputCost = (inputTokens / 1_000_000) * model.inputCostPer1M;
      const outputCost = (outputTokens / 1_000_000) * model.outputCostPer1M;
      const cost = inputCost + outputCost;

      breakdown.push({ tier, model: model.name, tokens: tierTokens, cost: +cost.toFixed(4) });
      totalCost += cost;
    }

    return { totalCost: +totalCost.toFixed(2), breakdown };
  }

  /** Return all registered models for admin/debug */
  getModelCatalog(): ModelConfig[] {
    return [...this.models];
  }
}
