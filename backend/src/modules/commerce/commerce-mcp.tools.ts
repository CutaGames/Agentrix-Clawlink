/**
 * Commerce MCP Tools Registration
 * 
 * Unified commerce skill for AI agents: payment + commission + budget pools
 * 
 * Fee Structure:
 * - Pure Crypto: 0% (free)
 * - On-ramp: +0.1%
 * - Off-ramp: +0.1%
 * - Split: 0.3% (min 0.1 USDC)
 */

// ============ Main Commerce Tool ============
export const commerceTool = {
  name: 'commerce',
  description: 'Unified commerce skill: pay, split, budget pool, settlements. Supports multi-party revenue sharing, milestone-based payouts, and on-chain settlements.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'The commerce action to perform',
        enum: [
          // Split Plan Actions
          'create_split_plan',
          'get_split_plan',
          'update_split_plan',
          'activate_split_plan',
          'archive_split_plan',
          'list_split_plans',
          'preview_allocation',
          // Budget Pool Actions
          'create_budget_pool',
          'get_budget_pool',
          'fund_budget_pool',
          'activate_budget_pool',
          'cancel_budget_pool',
          'list_budget_pools',
          // Milestone Actions
          'create_milestone',
          'get_milestone',
          'start_milestone',
          'submit_milestone',
          'approve_milestone',
          'reject_milestone',
          'release_milestone_funds',
          // Utility Actions
          'calculate_fees',
          'get_fee_structure',
        ],
      },
      mode: {
        type: 'string',
        enum: ['PAY_ONLY', 'SPLIT_ONLY', 'PAY_AND_SPLIT'],
        description: 'Commerce operation mode',
      },
      params: {
        type: 'object',
        description: 'Action-specific parameters',
      },
    },
    required: ['action'],
  },
};

// ============ Split Plan Tool ============
export const splitPlanTool = {
  name: 'split_plan',
  description: 'Create and manage revenue split plans for multi-party transactions. Define how payments are distributed among participants (merchants, agents, referrers).',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'get', 'update', 'activate', 'archive', 'list', 'preview'],
      },
      planId: {
        type: 'string',
        description: 'Split plan ID (for get/update/activate/archive)',
      },
      name: {
        type: 'string',
        description: 'Plan name (for create)',
      },
      productType: {
        type: 'string',
        description: 'Product type: skill, subscription, marketplace, custom',
      },
      rules: {
        type: 'array',
        description: 'Array of split rules defining recipient shares',
        items: {
          type: 'object',
          properties: {
            recipient: { type: 'string', description: 'Wallet address or user ID' },
            shareBps: { type: 'number', description: 'Share in basis points (10000 = 100%)' },
            role: { type: 'string', enum: ['platform', 'merchant', 'agent', 'referrer', 'custom'] },
          },
        },
      },
      feeConfig: {
        type: 'object',
        description: 'Custom fee configuration',
        properties: {
          onrampFeeBps: { type: 'number', description: 'On-ramp fee (default: 10 = 0.1%)' },
          offrampFeeBps: { type: 'number', description: 'Off-ramp fee (default: 10 = 0.1%)' },
          splitFeeBps: { type: 'number', description: 'Split fee (default: 30 = 0.3%)' },
          minSplitFee: { type: 'number', description: 'Min split fee in micro units (default: 100000 = 0.1 USDC)' },
        },
      },
      // Preview parameters
      amount: {
        type: 'string',
        description: 'Amount for allocation preview (in micro units)',
      },
      paymentType: {
        type: 'string',
        enum: ['CRYPTO_DIRECT', 'ONRAMP', 'OFFRAMP', 'MIXED'],
        description: 'Payment type for fee calculation',
      },
    },
    required: ['action'],
  },
};

// ============ Budget Pool Tool ============
export const budgetPoolTool = {
  name: 'budget_pool',
  description: 'Create and manage budget pools for multi-agent collaboration tasks. Supports milestone-based payouts with quality gates.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'get', 'fund', 'activate', 'cancel', 'list'],
      },
      poolId: {
        type: 'string',
        description: 'Budget pool ID',
      },
      name: {
        type: 'string',
        description: 'Pool name',
      },
      totalBudget: {
        type: 'string',
        description: 'Total budget in micro units',
      },
      deadline: {
        type: 'string',
        description: 'Deadline ISO date string',
      },
      qualityGate: {
        type: 'object',
        properties: {
          minQualityScore: { type: 'number', description: 'Min quality score 0-100' },
          requiresApproval: { type: 'boolean', description: 'Requires manual approval' },
          autoReleaseDelay: { type: 'number', description: 'Auto-release delay in seconds' },
        },
      },
      // Funding parameters
      amount: {
        type: 'string',
        description: 'Amount to fund',
      },
      source: {
        type: 'string',
        enum: ['wallet', 'transak', 'external'],
        description: 'Funding source',
      },
    },
    required: ['action'],
  },
};

// ============ Milestone Tool ============
export const milestoneTool = {
  name: 'milestone',
  description: 'Manage milestones within budget pools. Create, start, submit, approve/reject, and release funds for completed work.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'get', 'start', 'submit', 'approve', 'reject', 'release'],
      },
      milestoneId: {
        type: 'string',
        description: 'Milestone ID',
      },
      poolId: {
        type: 'string',
        description: 'Parent budget pool ID (for create)',
      },
      title: {
        type: 'string',
        description: 'Milestone title',
      },
      percentOfPool: {
        type: 'number',
        description: 'Percentage of pool budget (in basis points, 10000 = 100%)',
      },
      participants: {
        type: 'array',
        description: 'Milestone participants',
        items: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'Wallet address' },
            shareBps: { type: 'number', description: 'Share in basis points' },
          },
        },
      },
      // Submit parameters
      deliverableHash: {
        type: 'string',
        description: 'Hash of deliverable for verification',
      },
      artifacts: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of artifact URLs or IPFS hashes',
      },
      // Approve parameters
      qualityScore: {
        type: 'number',
        description: 'Quality score 0-100',
      },
      feedback: {
        type: 'string',
        description: 'Approval feedback',
      },
      // Reject parameters
      reason: {
        type: 'string',
        description: 'Rejection reason',
      },
    },
    required: ['action'],
  },
};

// ============ Fee Calculator Tool ============
export const feeCalculatorTool = {
  name: 'calculate_commerce_fees',
  description: 'Calculate platform fees for a given amount and payment type. Pure crypto is free, on-ramp/off-ramp adds +0.1% each, split is 0.3% (min 0.1 USDC).',
  inputSchema: {
    type: 'object',
    properties: {
      amount: {
        type: 'number',
        description: 'Amount in micro units (1 USDC = 1000000)',
      },
      paymentType: {
        type: 'string',
        enum: ['CRYPTO_DIRECT', 'ONRAMP', 'OFFRAMP', 'MIXED'],
        description: 'Payment type: CRYPTO_DIRECT (free), ONRAMP (+0.1%), OFFRAMP (+0.1%), MIXED (both)',
      },
    },
    required: ['amount', 'paymentType'],
  },
};

// ============ Export All Tools ============
export const commerceMcpTools = [
  commerceTool,
  splitPlanTool,
  budgetPoolTool,
  milestoneTool,
  feeCalculatorTool,
];

/**
 * Get tool by name
 */
export function getCommerceTool(name: string) {
  return commerceMcpTools.find((t) => t.name === name);
}

/**
 * Get all commerce tool names
 */
export function getCommerceToolNames(): string[] {
  return commerceMcpTools.map((t) => t.name);
}
