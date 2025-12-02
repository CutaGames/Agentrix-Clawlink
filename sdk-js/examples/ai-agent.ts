/**
 * AI Agent integration example
 */

import { PayMind } from '../src';

async function aiAgentExample() {
  const paymind = new PayMind({
    apiKey: process.env.PAYMIND_API_KEY || 'your-api-key',
    baseUrl: process.env.PAYMIND_API_URL || 'http://localhost:3001/api',
  });

  const agentId = 'agent_123';

  try {
    // 1. Create auto-pay grant for the agent
    console.log('Creating auto-pay grant...');
    const grant = await paymind.agents.createAutoPayGrant({
      agentId,
      singleLimit: 50, // $50 per transaction
      dailyLimit: 500, // $500 per day
      currency: 'USD',
      expiresInDays: 30,
    });
    console.log('Auto-pay grant created:', grant.id);
    console.log('Limits:', {
      single: grant.singleLimit,
      daily: grant.dailyLimit,
    });

    // 2. Check existing grant
    console.log('\nChecking existing grant...');
    const existingGrant = await paymind.agents.getAutoPayGrant();
    if (existingGrant) {
      console.log('Grant found:', existingGrant.id);
      console.log('Used today:', existingGrant.usedToday);
    }

    // 3. Create a payment (agent can pay automatically if grant exists)
    console.log('\nCreating payment...');
    const payment = await paymind.payments.create({
      amount: 25,
      currency: 'USD',
      description: 'AI service payment',
      agentId,
      metadata: {
        service: 'image-generation',
      },
    });
    console.log('Payment created:', payment.id);

    // 4. Get agent earnings
    console.log('\nGetting agent earnings...');
    const earnings = await paymind.agents.getEarnings(agentId);
    console.log('Total earnings:', earnings.totalEarnings);
    console.log('Total commissions:', earnings.totalCommissions);

    // 5. Get agent commissions
    console.log('\nGetting agent commissions...');
    const commissions = await paymind.agents.getCommissions(agentId, {
      page: 1,
      limit: 10,
    });
    console.log('Commissions:', commissions.data.length);

  } catch (error) {
    console.error('Error:', error);
  }
}

aiAgentExample();

