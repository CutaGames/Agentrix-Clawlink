/**
 * Auto Task Generator Service (Phase 3)
 * 
 * Enables autonomous agent orchestration:
 * - Proactive task generation based on agent roles
 * - Task decomposition: break complex tasks into subtasks
 * - Output chaining: feed one agent's result into the next
 * - Collaboration patterns: ARCHITECT plans → CODER implements → ANALYST reviews
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import { HqAgent, AgentRole, AgentStatus } from '../../entities/hq-agent.entity';
import { AgentTask, TaskStatus, TaskPriority, TaskType } from '../../entities/agent-task.entity';
import { TaskQueueService, CreateTaskDto } from './task-queue.service';
import { AgentCommunicationService } from './agent-communication.service';
import { UnifiedChatService } from '../../modules/core/unified-chat.service';

/** Collaboration pipeline definition */
export interface CollaborationPipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  context?: Record<string, any>;
}

export interface PipelineStage {
  agentRole: string;
  agentCode?: string;
  taskTitle: string;
  taskDescription: string;
  dependsOnStage?: number;
  taskId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
}

/** Role-based task templates — 9 free agents focused on growth, revenue, and resource acquisition */
const ROLE_TASK_TEMPLATES: Record<string, Array<{ title: string; description: string; type: TaskType; priority: TaskPriority }>> = {
  // === COMMANDER-01 (Gemini 1.5 Pro) — 首席指挥官 ===
  commander: [
    { title: 'Weekly strategic review and goal setting', description: 'Analyze performance metrics of all agents over the past week. Review revenue growth, user acquisition, and merchant onboarding stats. Identify the biggest bottlenecks. Update the primary objectives for the next 7 days and delegate specific high-impact tasks to role-specific agents.', type: TaskType.PLANNING, priority: TaskPriority.CRITICAL },
    { title: 'Market shift analysis and pivot evaluation', description: 'Research emerging trends in AI Agent commerce (MCP, agent-to-agent economies). Evaluate if our current roadmap (Commerce Skill) needs adjustments to stay ahead of competitors like PaymanAI or Stripe. Recommend strategic pivots if necessary.', type: TaskType.ANALYSIS, priority: TaskPriority.HIGH },
    { title: 'High-level partnership strategy', description: 'Identify top 5 strategic partners in the AI ecosystem (e.g., Anthropic, Google Cloud, major DeFi protocols). Plan a multi-step outreach strategy for BD-01 and DevRel-01. Review the value proposition of Agentrix for these partners.', type: TaskType.PLANNING, priority: TaskPriority.HIGH },
  ],
  // === REVENUE-01 (Gemini 1.5 Flash) — 营收与转化官 ===
  revenue: [
    { title: 'Merchants signup funnel optimization', description: 'Analyze the current merchant onboarding process. Find where users drop off. Suggest 3 UI or flow changes to increase conversion by 10%.', type: TaskType.ANALYSIS, priority: TaskPriority.CRITICAL },
    { title: 'GMV growth tactical plan', description: 'Identify top-performing Commerce Skills on the platform. Propose a mini-marketing campaign to push these skills to targeted users/agents via SOCIAL-01.', type: TaskType.PLANNING, priority: TaskPriority.HIGH },
    { title: 'Platform fee structure review', description: 'Compare our current platform fees with competitors like Stripe. Evaluate if a temporary "Zero Fee" promotion for new merchants would drive adoption without hurting long-term sustainability.', type: TaskType.RESEARCH, priority: TaskPriority.NORMAL },
    { title: 'Commerce Skill transaction success rate audit', description: 'Check the last 24 hours of Commerce Skill transactions. Identify any specific merchants experiencing high failure rates. Report these to SUPPORT-01 and generate outreach tasks for BD-01 to offer technical help.', type: TaskType.ANALYSIS, priority: TaskPriority.CRITICAL },
    { title: 'Identify conversion opportunities from free to paid', description: 'Query internal user activity metrics. Find top 10 users with high usage but low credit balance. Draft personalized upgrade offers highlighting the value of higher API limits and priority support.', type: TaskType.MARKETING, priority: TaskPriority.HIGH },
    { title: 'X402 protocol settlement tracking', description: 'Analyze settlement data for agent-to-agent transactions using X402 protocol. Ensure commission flows are correct. Identify the most active "Service Agents" and "Consumer Agents".', type: TaskType.ANALYSIS, priority: TaskPriority.NORMAL },
  ],
  // === GROWTH-01 (Gemini 2.0 Flash) — 流量猎手 ===
  growth: [
    { title: 'X (Twitter) viral growth hack execution', description: 'Monitor trending hashtags like #AIAgents, #MCP, #Web3Commerce. Identify 5 high-impact posts from KOLs and draft thoughtful, value-add replies that showcase Agentrix\'s unique value. Post them via twitter_post tool. Goal: 100+ new impressions per reply.', type: TaskType.MARKETING, priority: TaskPriority.CRITICAL },
    { title: 'Search "site:agentrix.top" and engage', description: 'Use web_search to find recent mentions of Agentrix or our blog posts on the web (HackerNews, Reddit, Dev.to). For each mention, draft a thank you or a clarifying comment if needed. If no mentions, find 3 threads about "agent payments" and contribute.', type: TaskType.MARKETING, priority: TaskPriority.HIGH },
    { title: 'Optimize landing page conversion', description: 'Analyze current landing page copy and UCP/MCP landing pages. Use web_search to find high-converting SaaS landing page patterns for 2026. Suggest 3 specific copy changes to improve the "Merchant Signup" conversion rate.', type: TaskType.ANALYSIS, priority: TaskPriority.NORMAL },
  ],
  // === BD-01 (Gemini 2.0 Flash) — 商业推手 ===
  bd: [
    { title: 'Hunt 24/7 for AI grant programs', description: 'Use web_search to find NEW grants for "AI infrastructure", "Agent economies", or "Open source AI tools". Search keywords: "NVIDIA Inception", "Google AI Startups", "Microsoft for Startups", "BNB Chain Grants 2026". For each, list: Grant Name, Max Amount, Deadline, Key Requirement, and Application URL.', type: TaskType.RESEARCH, priority: TaskPriority.CRITICAL },
    { title: 'Merchant outreach for Commerce Skill', description: 'Target 5 mid-sized AI API providers (e.g., image generation, translation services). Research their current pricing model. Draft a personalized outreach email explaining how Agentrix Commerce Skill can help them monetize their API via Agents with zero-fee crypto payments.', type: TaskType.MARKETING, priority: TaskPriority.HIGH },
    { title: 'Aggressive cloud credit acquisition', description: 'Check status of AWS Activate and Google Cloud for Startups. If not applied, draft a compelling application highlighting our 7/24 agent operation. If pending, send a polite follow-up. Aim for $25k+ in credits.', type: TaskType.OPERATIONS, priority: TaskPriority.CRITICAL },
    { title: 'Hunt free AI API resources', description: 'Use web_search to find FREE AI API providers that offer generous free tiers for startups. Search for: "free AI API 2026", "AI API free tier startup", "alternative to Gemini API free", "Mistral free API", "Groq free tier", "Together AI free", "Fireworks AI free", "Cerebras free", "SambaNova free API". For each provider found, list: Provider Name, Free Tier Limits (RPD/RPM), Models Available, API Key Signup URL, and Quality Assessment. We need alternatives to Gemini which may get rate-limited. Priority: providers with >1000 RPD free tier.', type: TaskType.RESEARCH, priority: TaskPriority.CRITICAL },
  ],
  // === ANALYST-01 (Gemini 1.5 Pro) — 情报官 ===
  analyst: [
    { title: 'Real-time revenue & growth data audit', description: 'Compile a detailed report on: Total Merchants, Active Commerce Skills, Monthly GMV, Twitter Follower Growth (vs last 24h), and Discord/Telegram activity levels. Highlight any negative trends and suggest immediate corrective actions.', type: TaskType.ANALYSIS, priority: TaskPriority.CRITICAL },
    { title: 'Competitor tactical teardown (Weekly)', description: 'Deep-dive into one competitor (e.g., Stripe Agent Toolkit). Analyze their latest GitHub commits, documentation updates, and social media announcements. List exactly where Agentrix is winning and where we are losing. Suggest 2 "killer features" to build.', type: TaskType.RESEARCH, priority: TaskPriority.HIGH },
  ],
  // === SOCIAL-01 (Gemini 2.5 Flash) — 内容引擎/社交运营 (Blue Verified Account) ===
  social: [
    { title: 'Compose and post high-quality tweet', description: 'We are a Blue Verified account on X — write ONE detailed, high-quality tweet (800-2000 characters). Pick ONE topic: (a) AI Agent commerce trends and how Agentrix solves real problems, (b) Technical insight about MCP/UCP/X402 protocol with code snippet, (c) Comparison with competitors like Coinbase AgentKit showing our advantages, (d) Developer tutorial snippet. MUST use twitter_post tool to actually publish. Include 3-5 relevant hashtags: #AIAgent #MCP #AgentCommerce #Web3 #Agentrix. End with a question or call-to-action to drive engagement. Do NOT write short generic tweets.', type: TaskType.MARKETING, priority: TaskPriority.CRITICAL },
    { title: 'KOL engagement and community interaction', description: 'Step 1: Use twitter_search to find 5-10 recent tweets from AI/crypto KOLs about AI agents, MCP, autonomous payments, or agent commerce. Step 2: Use twitter_engage to LIKE each relevant tweet. Step 3: Use twitter_engage with action=reply to write thoughtful, value-add replies (not spam) on the top 3 most relevant tweets. Replies should demonstrate expertise and subtly mention Agentrix capabilities. Step 4: Report which KOLs you engaged with and their follower counts.', type: TaskType.MARKETING, priority: TaskPriority.HIGH },
    { title: 'Cross-platform community update', description: 'Create a rich community update and publish to ALL platforms: Step 1: Use telegram_send to post to agentrix_official channel with Markdown formatting. Step 2: Use discord_send to post to the announce channel. Content should include: latest product updates, a useful tip or insight, and a question to drive discussion. Make each platform version slightly different (Telegram=detailed, Discord=conversational).', type: TaskType.MARKETING, priority: TaskPriority.HIGH },
    { title: 'Twitter thread on Agentrix feature', description: 'Create a Twitter thread (post 3-5 connected tweets as replies to each other). Topic ideas: "How AI Agents handle payments in 2026", "5 things Agentrix does that Coinbase AgentKit cannot", "Building your first Commerce Skill in 5 minutes". Use twitter_post for the first tweet, then use twitter_post with replyToId to chain subsequent tweets. Each tweet should be 500-1500 chars. Include hashtags on first and last tweet.', type: TaskType.MARKETING, priority: TaskPriority.HIGH },
    { title: 'Monitor trends and join conversations', description: 'Use twitter_search and web_search to find trending discussions about AI agents, MCP protocol, agent payments, autonomous AI commerce. For each relevant conversation: use twitter_engage to like, then reply with genuine insights. Target: engage with at least 5 conversations. Report trending topics for CONTENT-01 to create long-form content about.', type: TaskType.RESEARCH, priority: TaskPriority.NORMAL },
  ],
  // === CONTENT-01 (Gemini 2.0 Flash) — 内容官 ===
  content: [
    { title: 'Write technical blog post', description: 'Write a technical blog post (800-1200 words) about one of: How to give AI Agents payment capabilities, Building a paid AI Skill in 5 minutes, X402 payment protocol explained, Agent-to-Agent task delegation. Use web_search for research. Output in Markdown format. Delegate to SOCIAL-01 for distribution.', type: TaskType.MARKETING, priority: TaskPriority.HIGH },
    { title: 'Create SDK tutorial', description: 'Write a step-by-step tutorial for integrating Agentrix Commerce SDK. Cover: installation, authentication, creating a Skill, publishing to marketplace, handling payments. Include code examples in TypeScript and Python.', type: TaskType.MARKETING, priority: TaskPriority.HIGH },
    { title: 'Generate Twitter thread draft', description: 'Create a compelling Twitter thread (5-8 tweets) about an Agentrix feature or AI Agent commerce trend. Make it educational and shareable. Include a call-to-action. Pass to SOCIAL-01 for posting.', type: TaskType.MARKETING, priority: TaskPriority.NORMAL },
    { title: 'Update documentation', description: 'Review and update API documentation, README files, and getting-started guides. Use read_file to check current docs. Use write_file to update. Ensure accuracy and completeness.', type: TaskType.OPERATIONS, priority: TaskPriority.NORMAL },
    { title: 'Batch social content generation', description: 'Generate a week\'s worth of social media content: 15 tweets, 5 Telegram posts, 3 Discord announcements. Vary topics: product features, industry insights, developer tips, community highlights, memes. Output in a structured format for SOCIAL-01 to schedule.', type: TaskType.MARKETING, priority: TaskPriority.HIGH },
    { title: 'Write changelog and release notes', description: 'Review recent code changes and generate user-friendly changelog and release notes. Use read_file and list_dir to check recent commits. Format for blog, Twitter, and Telegram distribution.', type: TaskType.OPERATIONS, priority: TaskPriority.NORMAL },
  ],
  // === SUPPORT-01 (Gemini 2.0 Flash) — 客服 ===
  support: [
    { title: 'Triage and respond to user feedback', description: 'Check GitHub issues, Discord messages, and Telegram for user questions and bug reports. Use github_action to check open issues. Categorize by severity. Respond to simple questions directly. Escalate bugs to CODER-01 via task creation.', type: TaskType.OPERATIONS, priority: TaskPriority.HIGH },
    { title: 'Update FAQ and knowledge base', description: 'Based on recent user questions, update the FAQ document. Use read_file to check current FAQ. Add new Q&As for common issues. Use write_file to save updates.', type: TaskType.OPERATIONS, priority: TaskPriority.NORMAL },
    { title: 'Create onboarding guide improvement', description: 'Review the current new user onboarding flow. Identify friction points based on user feedback. Suggest and implement improvements to the getting-started documentation.', type: TaskType.OPERATIONS, priority: TaskPriority.NORMAL },
    { title: 'Compile daily feedback summary', description: 'Summarize all user feedback received today across all channels (GitHub, Discord, Telegram, email). Categorize into: bugs, feature requests, praise, complaints. Output a structured daily feedback report for the team.', type: TaskType.ANALYSIS, priority: TaskPriority.HIGH },
  ],
  // === SECURITY-01 (Gemini) — 安全审计官 ===
  risk: [
    { title: 'Security posture check', description: 'Review system security: check for exposed credentials, outdated dependencies, open ports. Use web_search to check for known vulnerabilities in our tech stack (NestJS, Next.js, PostgreSQL). Output a security status report.', type: TaskType.OPERATIONS, priority: TaskPriority.HIGH },
    { title: 'Dependency vulnerability scan', description: 'Use shell commands to run npm audit or check package versions. Use web_search to look up CVEs for key dependencies. Report any critical or high severity vulnerabilities found.', type: TaskType.OPERATIONS, priority: TaskPriority.HIGH },
    { title: 'Compliance checklist review', description: 'Review GDPR, CCPA, and crypto compliance requirements. Use web_search to check for any regulatory updates affecting AI agents or crypto payments. Output compliance status and action items.', type: TaskType.OPERATIONS, priority: TaskPriority.NORMAL },
  ],
  // === DEVREL-01 (Gemini) — 开发者关系 ===
  devrel: [
    { title: 'GitHub community engagement', description: 'Use github_action to check open issues and PRs. Respond to questions, triage bugs, welcome new contributors. Create "good first issue" labels for easy tasks. Update README if needed.', type: TaskType.OPERATIONS, priority: TaskPriority.HIGH },
    { title: 'SDK and integration improvement', description: 'Review SDK documentation and example code. Use web_search to check how competitors document their SDKs. Identify gaps in our developer experience. Write improved examples or fix documentation issues.', type: TaskType.DEVELOPMENT, priority: TaskPriority.NORMAL },
    { title: 'Developer outreach on forums', description: 'Use web_search to find developer discussions about AI agents, MCP, agent payments on Reddit, StackOverflow, Dev.to, HackerNews. Provide helpful answers that naturally mention Agentrix. Be genuinely helpful, not spammy.', type: TaskType.MARKETING, priority: TaskPriority.NORMAL },
    { title: 'Framework integration research', description: 'Use web_search to research integration opportunities with LangChain, CrewAI, AutoGPT, Dify. Check their plugin/tool systems. Draft integration guides or PRs. Coordinate with BD-01 for partnership outreach.', type: TaskType.RESEARCH, priority: TaskPriority.HIGH },
  ],
  // === LEGAL-01 (Gemini) — 合规顾问 ===
  legal: [
    { title: 'Regulatory update scan', description: 'Use web_search to check for new regulations affecting AI agents, crypto payments, or digital commerce in key markets (US, EU, Asia). Focus on: AI Act updates, crypto regulations, payment licensing. Output a brief regulatory update.', type: TaskType.RESEARCH, priority: TaskPriority.NORMAL },
    { title: 'Grant application legal review', description: 'Review pending grant applications for legal compliance. Check terms and conditions of grant programs. Ensure our applications accurately represent Agentrix. Flag any legal risks.', type: TaskType.OPERATIONS, priority: TaskPriority.NORMAL },
    { title: 'Terms of service and privacy policy review', description: 'Review current ToS and privacy policy for completeness and compliance. Use web_search to check best practices for AI agent platforms. Suggest updates if needed.', type: TaskType.OPERATIONS, priority: TaskPriority.LOW },
  ],
  // === Fallback for architect/coder (only used if manually triggered) ===
  architect: [
    { title: 'Review system architecture', description: 'Analyze current codebase structure, identify technical debt, and propose improvements.', type: TaskType.PLANNING, priority: TaskPriority.NORMAL },
  ],
  coder: [
    { title: 'Code quality check', description: 'Review recent code changes for bugs and performance issues.', type: TaskType.DEVELOPMENT, priority: TaskPriority.NORMAL },
  ],
};

/** Standard collaboration pipelines */
const COLLABORATION_TEMPLATES: Record<string, Omit<CollaborationPipeline, 'id' | 'status' | 'createdAt'>> = {
  // === 内容发布流水线: CONTENT → GROWTH审核 → SOCIAL发布 ===
  'content-publish': {
    name: 'Content Publish Pipeline',
    stages: [
      { agentRole: 'growth', agentCode: 'CONTENT-01', taskTitle: 'Draft content', taskDescription: 'Write a blog post or social media content about Agentrix. Use web_search for research. Output in Markdown format ready for publishing.', status: 'pending' },
      { agentRole: 'growth', agentCode: 'GROWTH-01', taskTitle: 'Review content strategy alignment', taskDescription: 'Review the drafted content for strategic alignment with growth goals. Check SEO keywords, call-to-action, and messaging. Suggest improvements.', dependsOnStage: 0, status: 'pending' },
      { agentRole: 'growth', agentCode: 'SOCIAL-01', taskTitle: 'Publish to platforms', taskDescription: 'Publish the reviewed content to Twitter, Telegram, and Discord using social_publish tool. Adapt content for each platform. Schedule follow-up engagement.', dependsOnStage: 1, status: 'pending' },
    ],
  },
  // === Grant申请流水线: BD发现 → CONTENT撰写 → LEGAL审核 → BD提交 ===
  'grant-application': {
    name: 'Grant Application Pipeline',
    stages: [
      { agentRole: 'bd', agentCode: 'BD-01', taskTitle: 'Discover grant opportunity', taskDescription: 'Use web_search to find a promising grant or cloud credits opportunity. Evaluate eligibility, value, and deadline. Output opportunity details and requirements.', status: 'pending' },
      { agentRole: 'growth', agentCode: 'CONTENT-01', taskTitle: 'Draft grant proposal', taskDescription: 'Based on the grant opportunity details, draft a compelling application. Highlight Agentrix unique value: AI Agent commerce infrastructure, MCP integration, zero-fee payments, open-source commitment.', dependsOnStage: 0, status: 'pending' },
      { agentRole: 'risk', agentCode: 'LEGAL-01', taskTitle: 'Legal compliance review', taskDescription: 'Review the grant proposal for legal compliance. Check terms and conditions. Ensure accurate representation. Flag any risks.', dependsOnStage: 1, status: 'pending' },
      { agentRole: 'bd', agentCode: 'BD-01', taskTitle: 'Submit application', taskDescription: 'Submit the reviewed grant application. Use send_email or http_request as needed. Record submission details and set follow-up reminders.', dependsOnStage: 2, status: 'pending' },
    ],
  },
  // === 增长实验流水线: GROWTH设计 → CONTENT创建 → SOCIAL执行 → ANALYST分析 ===
  'growth-experiment': {
    name: 'Growth Experiment Pipeline',
    stages: [
      { agentRole: 'growth', agentCode: 'GROWTH-01', taskTitle: 'Design growth experiment', taskDescription: 'Design a growth experiment with clear hypothesis, target metric, and execution plan. Examples: new content angle, distribution channel test, pricing experiment.', status: 'pending' },
      { agentRole: 'growth', agentCode: 'CONTENT-01', taskTitle: 'Create experiment content', taskDescription: 'Create the content or materials needed for the growth experiment. This could be blog posts, tweets, landing page copy, or email templates.', dependsOnStage: 0, status: 'pending' },
      { agentRole: 'growth', agentCode: 'SOCIAL-01', taskTitle: 'Execute distribution', taskDescription: 'Distribute the experiment content through the specified channels. Use twitter_post, telegram_send, discord_send as needed. Track initial engagement.', dependsOnStage: 1, status: 'pending' },
      { agentRole: 'analyst', agentCode: 'ANALYST-01', taskTitle: 'Analyze experiment results', taskDescription: 'Analyze the results of the growth experiment. Compare against hypothesis and baseline metrics. Determine if the experiment was successful and recommend next steps.', dependsOnStage: 2, status: 'pending' },
    ],
  },
  // === 竞品响应流水线: ANALYST分析 → GROWTH策略 → CONTENT内容 → SOCIAL传播 ===
  'competitor-response': {
    name: 'Competitor Response Pipeline',
    stages: [
      { agentRole: 'analyst', agentCode: 'ANALYST-01', taskTitle: 'Analyze competitor move', taskDescription: 'Use web_search to deep-analyze a competitor development. Assess impact on Agentrix. Identify our advantages and vulnerabilities.', status: 'pending' },
      { agentRole: 'growth', agentCode: 'GROWTH-01', taskTitle: 'Develop response strategy', taskDescription: 'Based on the competitive analysis, develop a response strategy. Focus on differentiating Agentrix strengths. Plan counter-messaging and feature prioritization.', dependsOnStage: 0, status: 'pending' },
      { agentRole: 'growth', agentCode: 'CONTENT-01', taskTitle: 'Create differentiation content', taskDescription: 'Create content that highlights Agentrix advantages over the competitor. Write comparison posts, feature highlights, or thought leadership pieces.', dependsOnStage: 1, status: 'pending' },
      { agentRole: 'growth', agentCode: 'SOCIAL-01', taskTitle: 'Distribute and engage', taskDescription: 'Publish the differentiation content across all channels. Engage in relevant conversations. Monitor sentiment and respond to questions.', dependsOnStage: 2, status: 'pending' },
    ],
  },
  // === 市场分析流水线 (保留原有) ===
  'market-analysis': {
    name: 'Market Analysis Pipeline',
    stages: [
      { agentRole: 'analyst', taskTitle: 'Gather market data', taskDescription: 'Use web_search to collect market data, competitor information, and industry trends for AI Agent commerce.', status: 'pending' },
      { agentRole: 'growth', taskTitle: 'Develop strategy', taskDescription: 'Based on market analysis, develop growth strategy and action plan.', dependsOnStage: 0, status: 'pending' },
      { agentRole: 'bd', taskTitle: 'Identify partnerships', taskDescription: 'Based on the growth strategy, identify and prioritize partnership and grant opportunities.', dependsOnStage: 1, status: 'pending' },
    ],
  },
  // === 开发者获客流水线: DEVREL研究 → CONTENT创建 → SOCIAL推广 → SUPPORT跟进 ===
  'developer-acquisition': {
    name: 'Developer Acquisition Pipeline',
    stages: [
      { agentRole: 'bd', agentCode: 'DEVREL-01', taskTitle: 'Research developer communities', taskDescription: 'Use web_search to find active developer communities discussing AI agents, MCP, LangChain, CrewAI. Identify key forums, Discord servers, and GitHub repos where developers congregate.', status: 'pending' },
      { agentRole: 'growth', agentCode: 'CONTENT-01', taskTitle: 'Create developer content', taskDescription: 'Create developer-focused content: tutorials, code examples, integration guides. Make it genuinely helpful and educational, naturally showcasing Agentrix capabilities.', dependsOnStage: 0, status: 'pending' },
      { agentRole: 'growth', agentCode: 'SOCIAL-01', taskTitle: 'Distribute to dev communities', taskDescription: 'Share the developer content in identified communities. Post on Dev.to, Reddit, HackerNews. Engage in discussions. Use github_action to update repos.', dependsOnStage: 1, status: 'pending' },
      { agentRole: 'support', agentCode: 'SUPPORT-01', taskTitle: 'Follow up with interested devs', taskDescription: 'Monitor responses to the developer content. Answer technical questions. Provide onboarding support. Collect feedback for product improvement.', dependsOnStage: 2, status: 'pending' },
    ],
  },
};

@Injectable()
export class AutoTaskGeneratorService {
  private readonly logger = new Logger(AutoTaskGeneratorService.name);
  private activePipelines: Map<string, CollaborationPipeline> = new Map();

  constructor(
    @InjectRepository(HqAgent)
    private agentRepo: Repository<HqAgent>,
    @InjectRepository(AgentTask)
    private taskRepo: Repository<AgentTask>,
    private taskQueueService: TaskQueueService,
    private communicationService: AgentCommunicationService,
    private unifiedChatService: UnifiedChatService,
  ) {}

  /**
   * Map agent code to task template key.
   * Many agents share the same AgentRole enum but need different task templates.
   */
  private readonly agentTemplateMap: Record<string, string> = {
    'COMMANDER-01': 'commander',
    'GROWTH-01': 'growth',
    'BD-01': 'bd',
    'ANALYST-01': 'analyst',
    'SOCIAL-01': 'social',
    'CONTENT-01': 'content',
    'SUPPORT-01': 'support',
    'SECURITY-01': 'risk',
    'DEVREL-01': 'devrel',
    'LEGAL-01': 'legal',
    'REVENUE-01': 'revenue',
    'ARCHITECT-01': 'architect',
    'CODER-01': 'coder',
  };

  /**
   * Main Strategic Planning Loop (COMMANDER-01)
   * 
   * This is where the Commander (Gemini 1.5 Pro) reviews the system state
   * and generates specific, high-priority tasks for other agents.
   */
  async runStrategicPlanning(): Promise<AgentTask[]> {
    this.logger.log('🎖️ Running Strategic Planning (COMMANDER-01)...');
    
    // 1. Check if COMMANDER-01 is available
    const commander = await this.agentRepo.findOne({ where: { code: 'COMMANDER-01', isActive: true } });
    if (!commander) {
      this.logger.warn('⚠️ COMMANDER-01 not found or inactive, skipping strategic planning');
      return [];
    }

    // 2. Build Strategy Prompt (Context-rich)
    // In a real scenario, we would pull metrics here. For now, we use a robust base prompt.
    const strategyPrompt = `You are the COMMANDER-01 (CEO/Strategist) of Agentrix HQ.
Your mission: 7/24 growth of Agentrix through Commerce Skill adoption, Twitter expansion, and free resource acquisition.

CURRENT OBJECTIVES:
1. Maximize Gemini free API usage (13,650 requests/day).
2. Rapidly onboard merchants to Commerce Skill.
3. Drive Twitter followers and developer engagement on GitHub/Discord.
4. Secure free cloud credits and grants.

REVIEW SYSTEM STATE:
- All agents are online.
- Tasks are currently being picked from templates.

YOUR TASK:
Generate 3-5 SPECIFIC, HIGH-IMPACT tasks for the following agents:
- GROWTH-01: Twitter/Viral growth.
- BD-01: Merchant onboarding/Grants.
- CONTENT-01: Long-form content/Comparisons.
- SOCIAL-01: Community engagement.
- ANALYST-01: Competitor research.

Each task must be CONCRETE (e.g., "Search for X topic and respond to Y users") and NOT generic.

Respond in this exact JSON format:
[
  {"title": "Specific Task Title", "description": "Highly detailed instructions", "assignedTo": "AGENT-CODE", "priority": "high|critical", "type": "marketing|research|operations"}
]`;

    try {
      const response = await this.unifiedChatService.chat({
        agentCode: 'COMMANDER-01',
        message: strategyPrompt,
        mode: 'staff',
      });

      const strategicTasks = this.parseJsonFromResponse(response.response);
      if (!Array.isArray(strategicTasks)) return [];

      const generated: AgentTask[] = [];
      for (const t of strategicTasks) {
        const task = await this.taskQueueService.createTask({
          title: `[STRATEGY] ${t.title}`,
          description: t.description,
          type: t.type === 'marketing' ? TaskType.MARKETING : t.type === 'research' ? TaskType.RESEARCH : TaskType.OPERATIONS,
          priority: t.priority === 'critical' ? TaskPriority.CRITICAL : TaskPriority.HIGH,
          assignedToCode: t.assignedTo,
          createdByCode: 'COMMANDER-01',
          context: { strategic: true },
        });
        generated.push(task);
      }
      
      this.logger.log(`🎖️ Commander generated ${generated.length} strategic tasks`);
      return generated;
    } catch (error) {
      this.logger.error(`❌ Strategic planning failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate proactive tasks for idle agents based on their roles.
   * Called by TickService when no pending tasks exist.
   * Excludes ARCHITECT-01 and CODER-01 (paid models, manual only).
   */
  async generateTasksForIdleAgents(agents: HqAgent[]): Promise<AgentTask[]> {
    const PAID_AGENTS = ['ARCHITECT-01', 'CODER-01'];
    const idleAgents = agents.filter(
      a => a.status === AgentStatus.IDLE && a.isActive && !PAID_AGENTS.includes(a.code)
    );
    if (idleAgents.length === 0) return [];

    // Check how many pending tasks already exist
    const pendingCount = await this.taskRepo.count({
      where: { status: In([TaskStatus.PENDING, TaskStatus.ASSIGNED]), isActive: true },
    });

    // Allow more pending tasks for 9 agents running 7×24
    if (pendingCount >= 20) {
      this.logger.log(`📋 ${pendingCount} tasks already pending, skipping auto-generation`);
      return [];
    }

    const generatedTasks: AgentTask[] = [];

    for (const agent of idleAgents.slice(0, 9)) {
      // Check if agent already has a recent task (within last 20 minutes for high throughput)
      const recentTask = await this.taskRepo.findOne({
        where: {
          assignedToId: agent.id,
          createdAt: MoreThan(new Date(Date.now() - 20 * 60 * 1000)),
          isActive: true,
        },
        order: { createdAt: 'DESC' },
      });

      if (recentTask) continue;

      // Use agent code-based template lookup for accurate task assignment
      const templateKey = this.agentTemplateMap[agent.code] || agent.role.toLowerCase();
      const templates = ROLE_TASK_TEMPLATES[templateKey] || ROLE_TASK_TEMPLATES[agent.role.toLowerCase()] || [];
      if (templates.length === 0) continue;

      // Pick a random template for variety
      const template = templates[Math.floor(Math.random() * templates.length)];

      const task = await this.taskQueueService.createTask({
        title: `[Auto] ${template.title}`,
        description: template.description,
        type: template.type,
        priority: template.priority,
        assignedToCode: agent.code,
        createdByCode: 'SYSTEM',
        context: { autoGenerated: true, agentRole: agent.role, templateKey },
      });

      generatedTasks.push(task);
      this.logger.log(`🤖 Auto-generated task for ${agent.code}: ${template.title}`);
    }

    return generatedTasks;
  }

  /**
   * Decompose a complex task into subtasks using AI.
   * ARCHITECT-01 analyzes the task and creates a breakdown.
   */
  async decomposeTask(taskId: string): Promise<AgentTask[]> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new Error(`Task ${taskId} not found`);

    this.logger.log(`🔀 Decomposing task: ${task.title}`);

    // Ask COMMANDER-01 to break down the task
    const decompositionPrompt = `You are a project architect. Break down this task into 2-4 concrete subtasks.

Task: ${task.title}
Description: ${task.description}
Type: ${task.type}

Respond in this exact JSON format (no markdown, just raw JSON):
[
  {"title": "Subtask title", "description": "What to do", "role": "coder|analyst|growth|commander|support|bd|content", "priority": "high|medium|low"},
  ...
]`;

    try {
      const response = await this.unifiedChatService.chat({
        agentCode: 'COMMANDER-01',
        message: decompositionPrompt,
        mode: 'staff',
      });

      const subtaskDefs = this.parseJsonFromResponse(response.response);
      if (!Array.isArray(subtaskDefs) || subtaskDefs.length === 0) {
        this.logger.warn('⚠️ Could not parse subtask definitions from AI response');
        return [];
      }

      const subtasks: AgentTask[] = [];
      let prevTaskId: string | undefined;

      for (const def of subtaskDefs.slice(0, 4)) {
        const roleToAgent = await this.findAgentByRole(def.role);
        const subtask = await this.taskQueueService.createSubtask(taskId, {
          title: def.title,
          description: def.description,
          type: this.roleToTaskType(def.role),
          priority: def.priority === 'high' ? TaskPriority.HIGH : def.priority === 'low' ? TaskPriority.LOW : TaskPriority.NORMAL,
          assignedToCode: roleToAgent?.code,
          createdByCode: 'ARCHITECT-01',
          dependsOn: prevTaskId ? [prevTaskId] : undefined,
          context: { parentTaskId: taskId, decomposed: true },
        });
        subtasks.push(subtask);
        prevTaskId = subtask.id;
      }

      // Mark parent as blocked until subtasks complete
      await this.taskRepo.update(taskId, { status: TaskStatus.BLOCKED });
      this.logger.log(`✅ Decomposed "${task.title}" into ${subtasks.length} subtasks`);
      return subtasks;
    } catch (error) {
      this.logger.error(`❌ Task decomposition failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Chain task output: when a task completes, create a follow-up task
   * for the next agent in the pipeline.
   */
  async chainTaskOutput(completedTaskId: string): Promise<AgentTask | null> {
    const task = await this.taskRepo.findOne({ where: { id: completedTaskId } });
    if (!task || task.status !== TaskStatus.COMPLETED || !task.result) return null;

    // Check if this task is part of a pipeline
    const pipelineId = (task.metadata as any)?.pipelineId;
    if (pipelineId) {
      return this.advancePipeline(pipelineId, completedTaskId);
    }

    // Auto-chain: if task was done by ARCHITECT, create implementation task for CODER
    if ((task.metadata as any)?.autoChain !== false) {
      const chainRules = this.getChainRules(task);
      if (chainRules) {
        const nextTask = await this.taskQueueService.createTask({
          title: chainRules.title,
          description: `${chainRules.description}\n\n--- Previous task output ---\n${task.result.substring(0, 2000)}`,
          type: chainRules.type,
          priority: task.priority as any,
          assignedToCode: chainRules.agentCode,
          createdByCode: task.assignedTo?.code || 'SYSTEM',
          context: { chainedFrom: completedTaskId, autoChained: true },
        });

        // Notify the next agent
        if (task.assignedTo?.code && chainRules.agentCode) {
          await this.communicationService.sendMessage(
            task.assignedTo.code,
            chainRules.agentCode,
            `I've completed "${task.title}". Please continue with: ${chainRules.title}`,
            { messageType: 'delegation' as any, context: { taskId: nextTask.id, previousResult: task.result.substring(0, 500) } },
          );
        }

        this.logger.log(`🔗 Chained: ${task.title} → ${chainRules.title} (${chainRules.agentCode})`);
        return nextTask;
      }
    }

    return null;
  }

  /**
   * Start a collaboration pipeline from a template.
   */
  async startPipeline(
    templateName: string,
    context?: Record<string, any>,
    customDescription?: string,
  ): Promise<CollaborationPipeline> {
    const template = COLLABORATION_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Pipeline template "${templateName}" not found. Available: ${Object.keys(COLLABORATION_TEMPLATES).join(', ')}`);
    }

    const pipelineId = `pipeline_${Date.now()}`;
    const pipeline: CollaborationPipeline = {
      id: pipelineId,
      name: template.name,
      stages: template.stages.map(s => ({ ...s })),
      status: 'pending',
      createdAt: new Date(),
      context,
    };

    // Create tasks for the first stage (no dependencies)
    const firstStages = pipeline.stages.filter(s => s.dependsOnStage === undefined);
    for (const stage of firstStages) {
      const agent = stage.agentCode
        ? await this.agentRepo.findOne({ where: { code: stage.agentCode } })
        : await this.findAgentByRole(stage.agentRole);

      if (agent) {
        stage.agentCode = agent.code;
        const description = customDescription
          ? `${stage.taskDescription}\n\nContext: ${customDescription}`
          : stage.taskDescription;

        const task = await this.taskQueueService.createTask({
          title: `[Pipeline] ${stage.taskTitle}`,
          description,
          type: this.roleToTaskType(stage.agentRole),
          priority: TaskPriority.HIGH,
          assignedToCode: agent.code,
          createdByCode: 'SYSTEM',
          metadata: { pipelineId, stageIndex: pipeline.stages.indexOf(stage) },
          context: { ...context, pipeline: pipelineId },
        });
        stage.taskId = task.id;
        stage.status = 'pending';
      }
    }

    pipeline.status = 'running';
    this.activePipelines.set(pipelineId, pipeline);
    this.logger.log(`🚀 Pipeline started: ${pipeline.name} (${pipelineId})`);
    return pipeline;
  }

  /**
   * Advance a pipeline when a stage completes.
   */
  private async advancePipeline(pipelineId: string, completedTaskId: string): Promise<AgentTask | null> {
    const pipeline = this.activePipelines.get(pipelineId);
    if (!pipeline) return null;

    // Find the completed stage
    const completedStage = pipeline.stages.find(s => s.taskId === completedTaskId);
    if (!completedStage) return null;

    const completedTask = await this.taskRepo.findOne({ where: { id: completedTaskId } });
    completedStage.status = 'completed';
    completedStage.result = completedTask?.result;

    const completedStageIndex = pipeline.stages.indexOf(completedStage);

    // Find next stages that depend on the completed one
    const nextStages = pipeline.stages.filter(
      s => s.dependsOnStage === completedStageIndex && s.status === 'pending'
    );

    let createdTask: AgentTask | null = null;

    for (const stage of nextStages) {
      const agent = stage.agentCode
        ? await this.agentRepo.findOne({ where: { code: stage.agentCode } })
        : await this.findAgentByRole(stage.agentRole);

      if (agent) {
        stage.agentCode = agent.code;
        const prevResult = completedStage.result?.substring(0, 2000) || '';
        const task = await this.taskQueueService.createTask({
          title: `[Pipeline] ${stage.taskTitle}`,
          description: `${stage.taskDescription}\n\n--- Previous stage output ---\n${prevResult}`,
          type: this.roleToTaskType(stage.agentRole),
          priority: TaskPriority.HIGH,
          assignedToCode: agent.code,
          createdByCode: completedStage.agentCode || 'SYSTEM',
          metadata: { pipelineId, stageIndex: pipeline.stages.indexOf(stage) },
          context: { ...pipeline.context, pipeline: pipelineId },
        });
        stage.taskId = task.id;
        stage.status = 'pending';
        createdTask = task;

        this.logger.log(`🔗 Pipeline ${pipelineId}: ${completedStage.taskTitle} → ${stage.taskTitle}`);
      }
    }

    // Check if pipeline is complete
    const allDone = pipeline.stages.every(s => s.status === 'completed');
    if (allDone) {
      pipeline.status = 'completed';
      this.logger.log(`✅ Pipeline ${pipelineId} completed: ${pipeline.name}`);
    }

    return createdTask;
  }

  /**
   * Get all active pipelines.
   */
  getActivePipelines(): CollaborationPipeline[] {
    return Array.from(this.activePipelines.values());
  }

  /**
   * Get available pipeline templates.
   */
  getAvailableTemplates(): Array<{ name: string; description: string; stages: number }> {
    return Object.entries(COLLABORATION_TEMPLATES).map(([key, tmpl]) => ({
      name: key,
      description: tmpl.name,
      stages: tmpl.stages.length,
    }));
  }

  // --- Private helpers ---

  private getChainRules(task: AgentTask): { title: string; description: string; type: TaskType; agentCode: string } | null {
    const assignedRole = (task.context as any)?.agentRole || '';
    const templateKey = (task.context as any)?.templateKey || assignedRole;
    const taskTitle = task.title.replace('[Auto] ', '');

    // ANALYST output → GROWTH action (data → strategy)
    if ((templateKey === 'analyst' || assignedRole === 'analyst') && task.type === TaskType.ANALYSIS) {
      return {
        title: `Act on analysis: ${taskTitle}`,
        description: `Based on the analysis results, create actionable growth initiatives and marketing strategies. Use the data insights to drive decisions.`,
        type: TaskType.MARKETING,
        agentCode: 'GROWTH-01',
      };
    }

    // GROWTH strategy → CONTENT creation
    if (templateKey === 'growth' && task.type === TaskType.PLANNING) {
      return {
        title: `Create content for: ${taskTitle}`,
        description: `Based on the growth strategy, create marketing content (blog post, tweets, or tutorial) to execute the plan.`,
        type: TaskType.MARKETING,
        agentCode: 'CONTENT-01',
      };
    }

    // CONTENT creation → SOCIAL distribution
    if (templateKey === 'content' && task.type === TaskType.MARKETING) {
      return {
        title: `Distribute: ${taskTitle}`,
        description: `Publish the created content to Twitter, Telegram, and Discord. Adapt for each platform. Use social_publish, twitter_post, telegram_send, discord_send tools.`,
        type: TaskType.MARKETING,
        agentCode: 'SOCIAL-01',
      };
    }

    // BD grant research → CONTENT proposal drafting
    if (templateKey === 'bd' && task.type === TaskType.RESEARCH) {
      return {
        title: `Draft proposal for: ${taskTitle}`,
        description: `Based on the research findings, draft a compelling proposal or application document. Highlight Agentrix's unique value proposition.`,
        type: TaskType.MARKETING,
        agentCode: 'CONTENT-01',
      };
    }

    // SUPPORT feedback → GROWTH action items
    if (templateKey === 'support' && task.type === TaskType.ANALYSIS) {
      return {
        title: `Address feedback from: ${taskTitle}`,
        description: `Review the user feedback summary and create actionable growth initiatives to address pain points and capitalize on positive feedback.`,
        type: TaskType.PLANNING,
        agentCode: 'GROWTH-01',
      };
    }

    return null;
  }

  private async findAgentByRole(role: string): Promise<HqAgent | null> {
    return this.agentRepo.findOne({
      where: { role: role as AgentRole, isActive: true, status: AgentStatus.IDLE },
      order: { code: 'ASC' },
    });
  }

  private roleToTaskType(role: string): TaskType {
    const mapping: Record<string, TaskType> = {
      commander: TaskType.PLANNING,
      revenue: TaskType.ANALYSIS,
      architect: TaskType.PLANNING,
      coder: TaskType.DEVELOPMENT,
      analyst: TaskType.ANALYSIS,
      growth: TaskType.MARKETING,
      bd: TaskType.MARKETING,
      social: TaskType.MARKETING,
      content: TaskType.MARKETING,
      support: TaskType.OPERATIONS,
      risk: TaskType.OPERATIONS,
      devrel: TaskType.OPERATIONS,
      legal: TaskType.RESEARCH,
    };
    return mapping[role.toLowerCase()] || TaskType.OPERATIONS;
  }

  private parseJsonFromResponse(response: string): any[] {
    try {
      // Try direct parse
      return JSON.parse(response);
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try { return JSON.parse(jsonMatch[1].trim()); } catch { /* ignore */ }
      }
      // Try finding array in response
      const arrayMatch = response.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try { return JSON.parse(arrayMatch[0]); } catch { /* ignore */ }
      }
      return [];
    }
  }
}
