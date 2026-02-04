/**
 * Agentrix SDK - Budget Pool Example
 * 
 * This example demonstrates how to use the Commerce resource
 * to create and manage budget pools for milestone-based payments.
 * 
 * Use cases:
 * - Project-based payments with milestones
 * - Bounty programs
 * - Freelance contracts
 * - Grant distributions
 * 
 * Features covered:
 * - Creating budget pools
 * - Adding milestones with participants
 * - Funding pools
 * - Milestone workflow (submit → approve → release)
 * - Quality gates
 */

import { AgentrixSDK } from '@agentrix/sdk';

// Initialize SDK
const sdk = new AgentrixSDK({
  apiKey: process.env.AGENTRIX_API_KEY!,
  environment: 'sandbox',
});

async function main() {
  console.log('='.repeat(60));
  console.log('Agentrix Commerce - Budget Pool Example');
  console.log('='.repeat(60));
  console.log('');

  try {
    // ========================================
    // Step 1: Create a Budget Pool
    // ========================================
    console.log('💰 Step 1: Creating Budget Pool...');
    
    const pool = await sdk.commerce.createBudgetPool({
      name: 'AI Agent Development Bounty Q1',
      description: 'Bounty program for developing new AI agent capabilities',
      totalBudget: 10000, // $10,000 total
      currency: 'USDC',
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      approvalType: 'owner_only',
      autoReleaseDelay: 72, // 72 hours after approval
      metadata: {
        category: 'development',
        department: 'engineering',
      },
    });

    console.log(`✅ Budget Pool Created: ${pool.id}`);
    console.log(`   Name: ${pool.name}`);
    console.log(`   Budget: $${pool.totalBudget} ${pool.currency}`);
    console.log(`   Status: ${pool.status}`);
    console.log('');

    // ========================================
    // Step 2: Add Milestones
    // ========================================
    console.log('📌 Step 2: Creating Milestones...');

    // Milestone 1: Research Phase
    const milestone1 = await sdk.commerce.createMilestone({
      budgetPoolId: pool.id,
      title: 'Research & Design',
      description: 'Complete technical research and design documentation',
      amount: 2000, // $2,000
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
      participants: [
        { userId: 'user_alice', share: 6000 }, // 60%
        { userId: 'user_bob', share: 4000 },   // 40%
      ],
      qualityGates: [
        { name: 'Technical Review', required: true },
        { name: 'Design Approval', required: true },
      ],
      deliverables: [
        'Technical specification document',
        'Architecture diagram',
        'Risk assessment',
      ],
    });

    console.log(`   ✅ Milestone 1: ${milestone1.title} ($${milestone1.amount})`);

    // Milestone 2: Development Phase
    const milestone2 = await sdk.commerce.createMilestone({
      budgetPoolId: pool.id,
      title: 'Core Development',
      description: 'Implement core agent functionality',
      amount: 5000, // $5,000
      deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
      participants: [
        { userId: 'user_alice', share: 5000 },
        { userId: 'user_charlie', share: 5000 },
      ],
      qualityGates: [
        { name: 'Code Review', required: true },
        { name: 'Security Audit', required: true },
        { name: 'Performance Test', required: false },
      ],
    });

    console.log(`   ✅ Milestone 2: ${milestone2.title} ($${milestone2.amount})`);

    // Milestone 3: Testing & Launch
    const milestone3 = await sdk.commerce.createMilestone({
      budgetPoolId: pool.id,
      title: 'Testing & Launch',
      description: 'Complete testing and production deployment',
      amount: 3000, // $3,000
      deadline: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000), // 75 days
      participants: [
        { userId: 'user_bob', share: 3333 },
        { userId: 'user_charlie', share: 3333 },
        { userId: 'user_alice', share: 3334 },
      ],
    });

    console.log(`   ✅ Milestone 3: ${milestone3.title} ($${milestone3.amount})`);
    console.log('');

    // ========================================
    // Step 3: Fund the Pool
    // ========================================
    console.log('💵 Step 3: Funding Budget Pool...');
    
    const fundedPool = await sdk.commerce.fundBudgetPool(pool.id, {
      amount: 10000,
      currency: 'USDC',
      source: 'wallet',
      txHash: '0x1234...', // Simulated transaction hash
    });

    console.log(`✅ Pool Funded: $${fundedPool.funded} / $${fundedPool.totalBudget}`);
    console.log(`   Status: ${fundedPool.status}`); // Should be 'active' now
    console.log('');

    // ========================================
    // Step 4: Simulate Milestone Workflow
    // ========================================
    console.log('🔄 Step 4: Milestone Workflow Simulation...');
    
    // Start Milestone 1
    console.log('   Starting Milestone 1...');
    await sdk.commerce.startMilestone(milestone1.id);

    // Submit work (by participant)
    console.log('   Submitting work...');
    await sdk.commerce.submitMilestone(milestone1.id, {
      submissionUrl: 'https://github.com/org/repo/pull/123',
      notes: 'All deliverables completed as per specification',
      attachments: [
        { name: 'tech-spec.pdf', url: 'https://drive.google.com/...' },
        { name: 'architecture.png', url: 'https://drive.google.com/...' },
      ],
    });

    // Pass quality gates (by reviewer)
    console.log('   Passing quality gates...');
    await sdk.commerce.passQualityGate(pool.id, milestone1.id, 0); // Technical Review
    await sdk.commerce.passQualityGate(pool.id, milestone1.id, 1); // Design Approval

    // Approve milestone (by pool owner)
    console.log('   Approving milestone...');
    await sdk.commerce.approveMilestone(milestone1.id, {
      approvalNotes: 'Excellent work! All requirements met.',
      rating: 5,
    });

    // Release funds
    console.log('   Releasing funds...');
    const releaseResult = await sdk.commerce.releaseMilestone(milestone1.id);

    console.log(`✅ Funds Released for Milestone 1`);
    console.log('   Distributions:');
    releaseResult.distributions?.forEach((dist: any) => {
      console.log(`     - ${dist.userId}: $${dist.amount.toFixed(2)}`);
    });
    console.log('');

    // ========================================
    // Step 5: Get Pool Statistics
    // ========================================
    console.log('📊 Step 5: Pool Statistics...');
    
    const stats = await sdk.commerce.getPoolStats(pool.id);

    console.log(`   Total Budget: $${stats.totalBudget}`);
    console.log(`   Allocated: $${stats.allocated}`);
    console.log(`   Released: $${stats.released}`);
    console.log(`   Remaining: $${stats.remaining}`);
    console.log(`   Milestones: ${stats.completedMilestones}/${stats.totalMilestones} complete`);
    console.log('');

    // ========================================
    // Summary
    // ========================================
    console.log('='.repeat(60));
    console.log('✅ Budget Pool Example Complete!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Key Takeaways:');
    console.log('1. Budget pools enable milestone-based payments');
    console.log('2. Multiple participants can share milestone rewards');
    console.log('3. Quality gates ensure work meets standards before payment');
    console.log('4. Auto-release delays provide dispute resolution window');
    console.log('5. All fund movements are recorded on-chain');
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Advanced example: Bounty program
async function bountyProgramExample() {
  const sdk = new AgentrixSDK({
    apiKey: process.env.AGENTRIX_API_KEY!,
  });

  console.log('');
  console.log('🎯 Bounty Program Example');
  console.log('-'.repeat(40));

  // Create a pool for bug bounties
  const bountyPool = await sdk.commerce.createBudgetPool({
    name: 'Security Bug Bounty Program',
    totalBudget: 50000,
    currency: 'USDC',
    approvalType: 'committee', // Requires multiple approvals
    metadata: {
      type: 'bounty',
      severity_levels: {
        critical: 10000,
        high: 5000,
        medium: 1000,
        low: 250,
      },
    },
  });

  console.log(`✅ Bounty Pool Created: ${bountyPool.id}`);

  // Bounties are created as milestones when reported
  const bugReport = await sdk.commerce.createMilestone({
    budgetPoolId: bountyPool.id,
    title: 'Critical: SQL Injection in Auth Module',
    description: 'Found SQL injection vulnerability in login endpoint',
    amount: 10000, // Critical severity
    participants: [
      { userId: 'security_researcher_1', share: 10000 }, // 100% to reporter
    ],
    metadata: {
      severity: 'critical',
      cve: 'CVE-2026-XXXX',
      poc_url: 'https://gist.github.com/...',
    },
  });

  console.log(`✅ Bug Report Created: ${bugReport.title}`);
  console.log(`   Severity: Critical`);
  console.log(`   Reward: $${bugReport.amount}`);
}

// Agent task payment example
async function agentTaskExample() {
  const sdk = new AgentrixSDK({
    apiKey: process.env.AGENTRIX_API_KEY!,
  });

  console.log('');
  console.log('🤖 Agent Task Payment Example');
  console.log('-'.repeat(40));

  // Create a pool for agent task rewards
  const taskPool = await sdk.commerce.createBudgetPool({
    name: 'Agent Task Completion Rewards',
    totalBudget: 1000,
    currency: 'USDC',
    approvalType: 'auto', // Auto-approve based on completion
    autoReleaseDelay: 0, // Immediate release
  });

  // Quick task milestone
  const task = await sdk.commerce.createMilestone({
    budgetPoolId: taskPool.id,
    title: 'Data Processing Task #4521',
    description: 'Process and analyze 1000 records',
    amount: 5, // $5 per task
    participants: [
      { userId: 'agent_worker_12', share: 10000 },
    ],
    metadata: {
      taskType: 'data_processing',
      recordCount: 1000,
      autoVerify: true,
    },
  });

  console.log(`✅ Task Created: ${task.title}`);
  console.log(`   Reward: $${task.amount}`);
  console.log(`   Mode: Auto-approve + Immediate release`);
}

// Run main example
main().then(() => {
  // Uncomment to run additional examples
  // return bountyProgramExample();
  // return agentTaskExample();
});
