/**
 * Agentrix SDK - Main entry point
 */

import { AgentrixConfig } from './types/common';
import { AgentrixClient } from './client';
import { PaymentResource } from './resources/payments';
import { AgentResource } from './resources/agents';
import { MerchantResource } from './resources/merchants';
import { SubscriptionResource } from './resources/subscriptions';
import { CommissionResource } from './resources/commissions';
import { CommerceResource } from './resources/commerce';
import { TipResource } from './resources/tips';
import { GamingResource } from './resources/gaming';
import { MarketplaceResource } from './resources/marketplace';
import { CryptoPaymentResource } from './resources/crypto-payment';
import { ManagedSigningResource } from './resources/managed-signing';
import { TokenAuthorizationResource } from './resources/token-authorization';
import { IntentResource } from './resources/intent';
import { PaymentLinksResource } from './resources/payment-links';
import { RiskControlResource } from './resources/risk-control';
import { ComplianceResource } from './resources/compliance';
import { LedgerResource } from './resources/ledger';
import { AgentRuntimeResource } from './resources/agent-runtime';
import { UserResource } from './resources/user';
import { WebhookHandler } from './resources/webhooks';
import { PricingResource } from './resources/pricing';
import { TaxResource } from './resources/tax';
import { CartResource } from './resources/cart';
import { SandboxResource } from './resources/sandbox';
import { AgentTemplateResource } from './resources/agent-templates';
import { AgentCapabilitiesResource } from './resources/agent-capabilities';
import { AgentAuthorizationResource } from './resources/agent-authorization';
import { AirdropResource } from './resources/airdrop';
import { AutoEarnResource } from './resources/auto-earn';
import { MPCWalletResource } from './resources/mpc-wallet';
import { AIEcosystemIntegration } from './resources/ai-ecosystem';
import { SkillResource } from './resources/skills';
import { validateApiKey } from './utils/validation';

export class Agentrix {
  public payments: PaymentResource;
  public agents: AgentResource;
  public merchants: MerchantResource;
  public subscriptions: SubscriptionResource;
  public commissions: CommissionResource;
  public commerce: CommerceResource; // Unified commerce skill
  public tips: TipResource;
  public gaming: GamingResource;
  public marketplace: MarketplaceResource;
  public crypto: CryptoPaymentResource;
  public managedSigning: ManagedSigningResource;
  public tokenAuthorization: TokenAuthorizationResource;
  public intent: IntentResource;
  public paymentLinks: PaymentLinksResource;
  public riskControl: RiskControlResource;
  public compliance: ComplianceResource;
  public ledger: LedgerResource;
  public agentRuntime: AgentRuntimeResource;
  public users: UserResource;
  public pricing: PricingResource;
  public tax: TaxResource;
  public cart: CartResource;
  public sandbox: SandboxResource;
  public agentTemplates: AgentTemplateResource;
  public capabilities: AgentCapabilitiesResource;
  public webhooks: WebhookHandler;
  
  // Agent 核心功能模块
  public agentAuthorization: AgentAuthorizationResource;
  public airdrop: AirdropResource;
  public autoEarn: AutoEarnResource;
  public mpcWallet: MPCWalletResource;
  
  // AX Skill - 开发者写一次，自动生成各平台格式
  public skills: SkillResource;

  private client: AgentrixClient;

  constructor(config: AgentrixConfig) {
    validateApiKey(config.apiKey);

    this.client = new AgentrixClient(config);
    this.payments = new PaymentResource(this.client);
    this.agents = new AgentResource(this.client);
    this.merchants = new MerchantResource(this.client);
    this.subscriptions = new SubscriptionResource(this.client);
    this.commissions = new CommissionResource(this.client);
    this.commerce = new CommerceResource(this.client);
    this.tips = new TipResource(this.client);
    this.gaming = new GamingResource(this.client);
    this.marketplace = new MarketplaceResource(this.client);
    this.crypto = new CryptoPaymentResource(this.client);
    this.managedSigning = new ManagedSigningResource(this.client);
    this.tokenAuthorization = new TokenAuthorizationResource(this.client);
    this.intent = new IntentResource(this.client);
    this.paymentLinks = new PaymentLinksResource(this.client);
    this.riskControl = new RiskControlResource(this.client);
    this.compliance = new ComplianceResource(this.client);
    this.ledger = new LedgerResource(this.client);
    this.agentRuntime = new AgentRuntimeResource(this.client);
    this.users = new UserResource(this.client);
    this.pricing = new PricingResource(this.client);
    this.tax = new TaxResource(this.client);
    this.cart = new CartResource(this.client);
    this.sandbox = new SandboxResource(this.client);
    this.agentTemplates = new AgentTemplateResource(this.client);
    this.capabilities = new AgentCapabilitiesResource(this.client);
    this.webhooks = new WebhookHandler(config.webhookSecret || '');
    
    // 初始化 Agent 核心功能模块
    this.agentAuthorization = new AgentAuthorizationResource(this.client);
    this.airdrop = new AirdropResource(this.client);
    this.autoEarn = new AutoEarnResource(this.client);
    this.mpcWallet = new MPCWalletResource(this.client);
    
    // 初始化 AX Skill 模块
    this.skills = new SkillResource(this.client);
    
    // Make marketplace available to agents for unified search
    (this.client as any).marketplace = this.marketplace;
  }

  /**
   * 获取 AI 生态集成工具
   * 用于接入 GPTs、Claude MCP 等 AI 系统
   */
  static get AIIntegration() {
    return AIEcosystemIntegration;
  }

  /**
   * 启用 Marketplace 能力（一行代码）
   * Agent 接入后自动拥有所有交易能力
   */
  enableMarketplace(options?: {
    autoSearch?: boolean;
    showPrices?: boolean;
    enableCart?: boolean;
    enableRAG?: boolean;
  }): void {
    this.capabilities.enableMarketplace(options);
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    validateApiKey(apiKey);
    this.client.setApiKey(apiKey);
  }

  /**
   * Set base URL
   */
  setBaseURL(baseURL: string): void {
    this.client.setBaseURL(baseURL);
  }
}

// Export types
export * from './types/common';
export * from './types/payment';
export * from './types/agent';
export * from './types/merchant';
export * from './types/agent-capabilities';

// Export resource types
export * from './resources/subscriptions';
// Export CommissionResource but not Commission type (conflicts with types/agent.ts)
export { CommissionResource, CreateCommissionRequest } from './resources/commissions';
export * from './resources/tips';
export * from './resources/gaming';
// Export marketplace types but not Order (conflicts with types/merchant.ts) and SearchResult (conflicts with utils/semantic-search.ts)
export { MarketplaceResource, MarketplaceProduct, SearchProductsRequest, CreateOrderRequest } from './resources/marketplace';
export * from './resources/crypto-payment';
export * from './resources/managed-signing';
export * from './resources/token-authorization';
// Export IntentResource but not PaymentIntent (conflicts with types/payment.ts)
export { IntentResource, ParseIntentRequest, IntentParseResponse } from './resources/intent';
export * from './resources/payment-links';
export * from './resources/risk-control';
export * from './resources/compliance';
export * from './resources/ledger';
export * from './resources/agent-runtime';
export * from './resources/user';
export * from './resources/cart';
export * from './resources/sandbox';
export * from './resources/agent-templates';
export * from './resources/agent-capabilities';

// Export new Agent core modules (with selective exports to avoid conflicts)
export { 
  AgentAuthorizationResource,
  AgentAuthorizationType,
  AgentAuthorizationStatus,
  AgentStrategyType,
  type AgentAuthorization,
  type CreateAgentAuthorizationParams,
  type PermissionCheckResult
} from './resources/agent-authorization';
export * from './resources/airdrop';
export { 
  AutoEarnResource,
  TasksResource,
  StrategiesResource,
  ArbitrageResource,
  LaunchpadResource,
  AutoEarnTaskType,
  AutoEarnStrategyType,
  type Task,
  type Strategy,
  type ArbitrageOpportunity,
  type LaunchpadProject,
  type EarningsStats
} from './resources/auto-earn';
export * from './resources/mpc-wallet';
export * from './resources/ai-ecosystem';

// Export Skills module
export { SkillResource, AXSkillDefinition, AXSkill, SkillExecutionResult } from './resources/skills';

// Export semantic search utilities
export * from './utils/semantic-search';

// Export wallet and UI utilities
export * from './utils/wallet-detection';
export * from './utils/chain-switching';
export * from './utils/token-authorization';
export * from './utils/batch-signing';
export * from './utils/qr-code';
export * from './utils/theme';

// Export errors
export * from './utils/errors';

// Export webhook handler
export { WebhookHandler } from './resources/webhooks';

// Default export
export default Agentrix;

