/**
 * Agent Preset Skills Configuration
 *
 * Defines the default skills that every new agent instance ships with.
 * These are internal executor handlers (registered in SkillExecutorService)
 * that agents can invoke without explicit marketplace installation.
 *
 * Skills listed here are available to ALL agents by default.
 * Users can install additional skills from the marketplace.
 */

export interface PresetSkill {
  /** Handler name in SkillExecutorService (must match registerHandler key) */
  handlerName: string;
  /** Human-readable display name */
  displayName: string;
  /** Short description shown in agent skill panel */
  description: string;
  /** Category for grouping in UI */
  category: 'core' | 'commerce' | 'social' | 'intelligence' | 'tools' | 'marketplace' | 'tasks';
  /** Whether this skill is enabled by default (user can toggle) */
  enabledByDefault: boolean;
  /** Icon emoji for display */
  icon: string;
}

/**
 * Default preset skills for every agent.
 * Maps to handlers registered in SkillExecutorService.registerDefaultHandlers()
 */
export const AGENT_PRESET_SKILLS: PresetSkill[] = [
  // ─── Core Agent Capabilities ───
  {
    handlerName: 'skill_search',
    displayName: 'Skill Search',
    description: 'Search the marketplace and ClawHub for skills to expand capabilities',
    category: 'core',
    enabledByDefault: true,
    icon: '🔍',
  },
  {
    handlerName: 'skill_install',
    displayName: 'Skill Install',
    description: 'Install new skills from the marketplace on behalf of the user',
    category: 'core',
    enabledByDefault: true,
    icon: '📦',
  },
  {
    handlerName: 'skill_execute',
    displayName: 'Skill Execute',
    description: 'Execute a marketplace skill directly from the claw',
    category: 'core',
    enabledByDefault: true,
    icon: '▶️',
  },
  {
    handlerName: 'skill_recommend',
    displayName: 'Skill Recommendations',
    description: 'Get personalized skill recommendations based on context and usage',
    category: 'intelligence',
    enabledByDefault: true,
    icon: '💡',
  },

  // ─── Commerce & Payments ───
  {
    handlerName: 'search_products',
    displayName: 'Product Search',
    description: 'Search products across the unified marketplace',
    category: 'commerce',
    enabledByDefault: true,
    icon: '🛒',
  },
  {
    handlerName: 'resource_search',
    displayName: 'Resource Search',
    description: 'Search resource, service, and goods listings in the unified marketplace',
    category: 'commerce',
    enabledByDefault: true,
    icon: '📚',
  },
  {
    handlerName: 'create_order',
    displayName: 'Create Order',
    description: 'Place orders for products and services',
    category: 'commerce',
    enabledByDefault: true,
    icon: '📋',
  },
  {
    handlerName: 'get_balance',
    displayName: 'Wallet Balance',
    description: 'Check wallet balance and available funds',
    category: 'commerce',
    enabledByDefault: true,
    icon: '💰',
  },
  {
    handlerName: 'x402_pay',
    displayName: 'X402 Payment',
    description: 'Execute payments via X402 protocol for paid skills and services',
    category: 'commerce',
    enabledByDefault: true,
    icon: '💳',
  },
  {
    handlerName: 'quickpay_execute',
    displayName: 'Quick Pay',
    description: 'Simplified one-click payment for micro-transactions',
    category: 'commerce',
    enabledByDefault: true,
    icon: '⚡',
  },

  // ─── Agent-to-Agent (A2A) ───
  {
    handlerName: 'agent_discover',
    displayName: 'Discover Agents',
    description: 'Find other agents in the marketplace for collaboration',
    category: 'social',
    enabledByDefault: true,
    icon: '🤖',
  },
  {
    handlerName: 'agent_invoke',
    displayName: 'Invoke Agent',
    description: 'Delegate tasks to other agents via A2A protocol',
    category: 'social',
    enabledByDefault: true,
    icon: '📡',
  },

  // ─── Intelligence & Data ───
  {
    handlerName: 'asset_overview',
    displayName: 'Asset Overview',
    description: 'Get comprehensive view of wallet assets and X402 status',
    category: 'intelligence',
    enabledByDefault: true,
    icon: '📊',
  },
  {
    handlerName: 'airdrop_discover',
    displayName: 'Airdrop Discovery',
    description: 'Find available token airdrops and earning opportunities',
    category: 'intelligence',
    enabledByDefault: false,
    icon: '🎁',
  },

  // ─── Tools ───
  {
    handlerName: 'echo',
    displayName: 'Echo (Debug)',
    description: 'Debug tool that echoes input parameters',
    category: 'tools',
    enabledByDefault: false,
    icon: '🔧',
  },

  // ─── P2: Marketplace & Publishing ───
  {
    handlerName: 'marketplace_purchase',
    displayName: 'Marketplace Purchase',
    description: 'Purchase paid skills and resources from the marketplace',
    category: 'marketplace',
    enabledByDefault: true,
    icon: '🛍️',
  },
  {
    handlerName: 'skill_publish',
    displayName: 'Publish Skill',
    description: 'Publish a new skill to the marketplace for others to use',
    category: 'marketplace',
    enabledByDefault: false,
    icon: '📤',
  },
  {
    handlerName: 'resource_publish',
    displayName: 'Publish Resource',
    description: 'Publish a resource, service, or goods listing to the marketplace',
    category: 'marketplace',
    enabledByDefault: false,
    icon: '🧺',
  },

  // ─── P2: Task Marketplace ───
  {
    handlerName: 'task_search',
    displayName: 'Search Tasks',
    description: 'Browse available tasks and bounties in the task marketplace',
    category: 'tasks',
    enabledByDefault: true,
    icon: '🔎',
  },
  {
    handlerName: 'task_post',
    displayName: 'Post Task',
    description: 'Post a task or bounty with budget for other agents/merchants to complete',
    category: 'tasks',
    enabledByDefault: true,
    icon: '📝',
  },
  {
    handlerName: 'task_accept',
    displayName: 'Accept Task',
    description: 'Accept an available task from the marketplace',
    category: 'tasks',
    enabledByDefault: true,
    icon: '✅',
  },
  {
    handlerName: 'task_submit',
    displayName: 'Submit Task',
    description: 'Submit deliverables and complete an accepted task',
    category: 'tasks',
    enabledByDefault: true,
    icon: '📬',
  },
];

/**
 * Get preset skills filtered by category.
 */
export function getPresetSkillsByCategory(category: PresetSkill['category']): PresetSkill[] {
  return AGENT_PRESET_SKILLS.filter((s) => s.category === category);
}

/**
 * Get only the enabled-by-default preset skills.
 */
export function getDefaultEnabledSkills(): PresetSkill[] {
  return AGENT_PRESET_SKILLS.filter((s) => s.enabledByDefault);
}

/**
 * Get handler names for all default-enabled skills (for passing to agent runtime).
 */
export function getDefaultSkillHandlerNames(): string[] {
  return getDefaultEnabledSkills().map((s) => s.handlerName);
}
