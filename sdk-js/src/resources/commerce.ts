/**
 * Commerce resource for Agentrix SDK
 * 
 * Unified commerce skill combining payment + commission capabilities
 * 
 * Fee Structure:
 * - Pure Crypto (on-chain): 0% (free)
 * - On-ramp (Transak buy): +0.1%
 * - Off-ramp (Transak sell): +0.1%
 * - Split: 0.3% (min 0.1 USDC)
 */

import { AgentrixClient } from '../client';

// ============ Types ============

export type PaymentType = 'CRYPTO_DIRECT' | 'ONRAMP' | 'OFFRAMP' | 'MIXED';
export type SplitPlanStatus = 'draft' | 'active' | 'archived';
export type PoolStatus = 'draft' | 'funded' | 'active' | 'completed' | 'cancelled';
export type MilestoneStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'released';

export interface FeeConfig {
  onrampFeeBps: number;   // On-ramp fee (default 10 = 0.1%)
  offrampFeeBps: number;  // Off-ramp fee (default 10 = 0.1%)
  splitFeeBps: number;    // Split fee (default 30 = 0.3%)
  minSplitFee: number;    // Min split fee (default 100000 = 0.1 USDC)
}

export interface SplitRule {
  recipient: string;
  shareBps: number;
  role: 'platform' | 'merchant' | 'agent' | 'referrer' | 'custom';
}

export interface SplitPlan {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  productType: string;
  rules: SplitRule[];
  feeConfig: FeeConfig;
  tiers?: { minAmount: number; adjustedBps: number }[];
  volumeCap?: { maxVolume: number; period: 'daily' | 'weekly' | 'monthly' };
  status: SplitPlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetPool {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  totalBudget: string;
  fundedAmount: string;
  reservedAmount: string;
  releasedAmount: string;
  currency: string;
  status: PoolStatus;
  deadline: string;
  qualityGate: {
    minQualityScore: number;
    requiresApproval: boolean;
    autoReleaseDelay: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  poolId: string;
  title: string;
  description?: string;
  budgetAmount: string;
  percentOfPool: number;
  status: MilestoneStatus;
  participants: { address: string; shareBps: number }[];
  artifacts?: string[];
  qualityScore?: number;
  approver?: string;
  submittedAt?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface AllocationPreview {
  recipient: string;
  role: string;
  shareBps: number;
  grossAmount: string;
  fee: string;
  netAmount: string;
}

export interface AllocationResult {
  planId: string;
  paymentType: PaymentType;
  totalAmount: string;
  platformFee: string;
  distributableAmount: string;
  allocations: AllocationPreview[];
}

// ============ Request Types ============

export interface CreateSplitPlanRequest {
  name: string;
  description?: string;
  productType: string;
  rules: SplitRule[];
  feeConfig?: Partial<FeeConfig>;
  tiers?: { minAmount: number; adjustedBps: number }[];
  volumeCap?: { maxVolume: number; period: 'daily' | 'weekly' | 'monthly' };
}

export interface UpdateSplitPlanRequest {
  name?: string;
  description?: string;
  rules?: SplitRule[];
  feeConfig?: Partial<FeeConfig>;
  tiers?: { minAmount: number; adjustedBps: number }[];
  volumeCap?: { maxVolume: number; period: 'daily' | 'weekly' | 'monthly' };
}

export interface PreviewAllocationRequest {
  planId: string;
  amount: string;
  paymentType: PaymentType;
}

export interface CreateBudgetPoolRequest {
  name: string;
  description?: string;
  totalBudget: string;
  currency?: string;
  deadline: string;
  qualityGate?: {
    minQualityScore?: number;
    requiresApproval?: boolean;
    autoReleaseDelay?: number;
  };
}

export interface FundPoolRequest {
  amount: string;
  source: 'wallet' | 'transak' | 'external';
  txHash?: string;
}

export interface CreateMilestoneRequest {
  poolId: string;
  title: string;
  description?: string;
  percentOfPool: number;
  participants: { address: string; shareBps: number }[];
}

export interface SubmitMilestoneRequest {
  deliverableHash: string;
  artifacts?: string[];
}

export interface ApproveMilestoneRequest {
  qualityScore: number;
  feedback?: string;
}

export interface RejectMilestoneRequest {
  reason: string;
}

// ============ Commerce Resource ============

export class CommerceResource {
  constructor(private client: AgentrixClient) {}

  // ================== Split Plans ==================

  /**
   * Create a split plan
   */
  async createSplitPlan(request: CreateSplitPlanRequest): Promise<SplitPlan> {
    if (!request.name) throw new Error('Plan name is required');
    if (!request.rules || request.rules.length === 0) {
      throw new Error('At least one split rule is required');
    }
    
    // Validate shares sum to 100%
    const totalBps = request.rules.reduce((sum, r) => sum + r.shareBps, 0);
    if (totalBps !== 10000) {
      throw new Error('Split rules must sum to 10000 bps (100%)');
    }

    return this.client.post<SplitPlan>('/commerce/split-plans', request);
  }

  /**
   * Get split plan by ID
   */
  async getSplitPlan(id: string): Promise<SplitPlan> {
    if (!id) throw new Error('Plan ID is required');
    return this.client.get<SplitPlan>(`/commerce/split-plans/${id}`);
  }

  /**
   * Update split plan
   */
  async updateSplitPlan(id: string, request: UpdateSplitPlanRequest): Promise<SplitPlan> {
    if (!id) throw new Error('Plan ID is required');
    return this.client.patch<SplitPlan>(`/commerce/split-plans/${id}`, request);
  }

  /**
   * Activate split plan
   */
  async activateSplitPlan(id: string): Promise<SplitPlan> {
    if (!id) throw new Error('Plan ID is required');
    return this.client.post<SplitPlan>(`/commerce/split-plans/${id}/activate`);
  }

  /**
   * Archive split plan
   */
  async archiveSplitPlan(id: string): Promise<SplitPlan> {
    if (!id) throw new Error('Plan ID is required');
    return this.client.post<SplitPlan>(`/commerce/split-plans/${id}/archive`);
  }

  /**
   * List split plans
   */
  async listSplitPlans(params?: {
    status?: SplitPlanStatus;
    productType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: SplitPlan[]; pagination: any }> {
    return this.client.get('/commerce/split-plans', { params });
  }

  /**
   * Preview allocation without executing
   */
  async previewAllocation(request: PreviewAllocationRequest): Promise<AllocationResult> {
    if (!request.planId) throw new Error('Plan ID is required');
    if (!request.amount) throw new Error('Amount is required');
    return this.client.post<AllocationResult>('/commerce/split-plans/preview', request);
  }

  /**
   * Get default templates for product types
   */
  async getDefaultTemplates(): Promise<Record<string, Omit<CreateSplitPlanRequest, 'name'>>> {
    return this.client.get('/commerce/split-plans/templates');
  }

  // ================== Budget Pools ==================

  /**
   * Create a budget pool
   */
  async createBudgetPool(request: CreateBudgetPoolRequest): Promise<BudgetPool> {
    if (!request.name) throw new Error('Pool name is required');
    if (!request.totalBudget) throw new Error('Total budget is required');
    if (!request.deadline) throw new Error('Deadline is required');
    return this.client.post<BudgetPool>('/commerce/budget-pools', request);
  }

  /**
   * Get budget pool by ID
   */
  async getBudgetPool(id: string): Promise<BudgetPool> {
    if (!id) throw new Error('Pool ID is required');
    return this.client.get<BudgetPool>(`/commerce/budget-pools/${id}`);
  }

  /**
   * Fund a budget pool
   */
  async fundBudgetPool(id: string, request: FundPoolRequest): Promise<BudgetPool> {
    if (!id) throw new Error('Pool ID is required');
    if (!request.amount) throw new Error('Amount is required');
    return this.client.post<BudgetPool>(`/commerce/budget-pools/${id}/fund`, request);
  }

  /**
   * Activate a budget pool
   */
  async activateBudgetPool(id: string): Promise<BudgetPool> {
    if (!id) throw new Error('Pool ID is required');
    return this.client.post<BudgetPool>(`/commerce/budget-pools/${id}/activate`);
  }

  /**
   * Cancel a budget pool
   */
  async cancelBudgetPool(id: string, reason?: string): Promise<BudgetPool> {
    if (!id) throw new Error('Pool ID is required');
    return this.client.post<BudgetPool>(`/commerce/budget-pools/${id}/cancel`, { reason });
  }

  /**
   * List budget pools
   */
  async listBudgetPools(params?: {
    status?: PoolStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: BudgetPool[]; pagination: any }> {
    return this.client.get('/commerce/budget-pools', { params });
  }

  // ================== Milestones ==================

  /**
   * Create a milestone
   */
  async createMilestone(request: CreateMilestoneRequest): Promise<Milestone> {
    if (!request.poolId) throw new Error('Pool ID is required');
    if (!request.title) throw new Error('Title is required');
    if (!request.participants || request.participants.length === 0) {
      throw new Error('At least one participant is required');
    }
    
    // Validate participant shares
    const totalBps = request.participants.reduce((sum, p) => sum + p.shareBps, 0);
    if (totalBps !== 10000) {
      throw new Error('Participant shares must sum to 10000 bps (100%)');
    }

    return this.client.post<Milestone>('/commerce/milestones', request);
  }

  /**
   * Get milestone by ID
   */
  async getMilestone(id: string): Promise<Milestone> {
    if (!id) throw new Error('Milestone ID is required');
    return this.client.get<Milestone>(`/commerce/milestones/${id}`);
  }

  /**
   * Get milestones for a pool
   */
  async getPoolMilestones(poolId: string): Promise<Milestone[]> {
    if (!poolId) throw new Error('Pool ID is required');
    return this.client.get<Milestone[]>(`/commerce/budget-pools/${poolId}/milestones`);
  }

  /**
   * Start a milestone
   */
  async startMilestone(id: string): Promise<Milestone> {
    if (!id) throw new Error('Milestone ID is required');
    return this.client.post<Milestone>(`/commerce/milestones/${id}/start`);
  }

  /**
   * Submit milestone for review
   */
  async submitMilestone(id: string, request: SubmitMilestoneRequest): Promise<Milestone> {
    if (!id) throw new Error('Milestone ID is required');
    if (!request.deliverableHash) throw new Error('Deliverable hash is required');
    return this.client.post<Milestone>(`/commerce/milestones/${id}/submit`, request);
  }

  /**
   * Approve a milestone
   */
  async approveMilestone(id: string, request: ApproveMilestoneRequest): Promise<Milestone> {
    if (!id) throw new Error('Milestone ID is required');
    if (request.qualityScore < 0 || request.qualityScore > 100) {
      throw new Error('Quality score must be between 0 and 100');
    }
    return this.client.post<Milestone>(`/commerce/milestones/${id}/approve`, request);
  }

  /**
   * Reject a milestone
   */
  async rejectMilestone(id: string, request: RejectMilestoneRequest): Promise<Milestone> {
    if (!id) throw new Error('Milestone ID is required');
    if (!request.reason) throw new Error('Rejection reason is required');
    return this.client.post<Milestone>(`/commerce/milestones/${id}/reject`, request);
  }

  /**
   * Release milestone funds
   */
  async releaseMilestoneFunds(id: string): Promise<Milestone> {
    if (!id) throw new Error('Milestone ID is required');
    return this.client.post<Milestone>(`/commerce/milestones/${id}/release`);
  }

  // ================== Unified Commerce Actions ==================

  /**
   * Execute a commerce action via unified endpoint
   */
  async execute<T = any>(action: string, params: Record<string, any>): Promise<T> {
    return this.client.post<T>('/commerce/execute', { action, params });
  }

  /**
   * Calculate fees for a given amount and payment type
   */
  calculateFees(
    amount: number,
    paymentType: PaymentType,
    feeConfig?: Partial<FeeConfig>
  ): { platformFee: number; netAmount: number } {
    const config: FeeConfig = {
      onrampFeeBps: feeConfig?.onrampFeeBps ?? 10,
      offrampFeeBps: feeConfig?.offrampFeeBps ?? 10,
      splitFeeBps: feeConfig?.splitFeeBps ?? 30,
      minSplitFee: feeConfig?.minSplitFee ?? 100000,
    };

    let fee = 0;

    // Pure crypto is free
    if (paymentType === 'CRYPTO_DIRECT') {
      return { platformFee: 0, netAmount: amount };
    }

    // Base split fee
    fee = (amount * config.splitFeeBps) / 10000;
    if (fee < config.minSplitFee) {
      fee = config.minSplitFee;
    }

    // On-ramp fee
    if (paymentType === 'ONRAMP' || paymentType === 'MIXED') {
      fee += (amount * config.onrampFeeBps) / 10000;
    }

    // Off-ramp fee
    if (paymentType === 'OFFRAMP' || paymentType === 'MIXED') {
      fee += (amount * config.offrampFeeBps) / 10000;
    }

    return {
      platformFee: Math.round(fee),
      netAmount: amount - Math.round(fee),
    };
  }

  /**
   * Get fee structure documentation
   */
  getFeeStructure(): {
    cryptoDirect: string;
    onramp: string;
    offramp: string;
    split: string;
    minSplit: string;
  } {
    return {
      cryptoDirect: '0% (free)',
      onramp: '+0.1% (Transak buy crypto)',
      offramp: '+0.1% (Transak sell crypto)',
      split: '0.3% (revenue split)',
      minSplit: '0.1 USDC (minimum split fee)',
    };
  }
}
