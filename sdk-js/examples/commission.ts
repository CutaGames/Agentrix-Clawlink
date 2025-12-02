/**
 * Commission and revenue sharing example
 */

import { Agentrix } from '../src';

async function commissionExample() {
  const agentrix = new Agentrix({
    apiKey: process.env.AGENTRIX_API_KEY || 'your-api-key',
    baseUrl: process.env.AGENTRIX_API_URL || 'http://localhost:3001/api',
  });

  const agentId = 'agent_123';
  const paymentId = 'pay_123';

  try {
    // 1. Create a commission (10% of payment)
    console.log('Creating commission...');
    const commission = await agentrix.commissions.create({
      paymentId,
      agentId,
      rate: 0.1, // 10%
      metadata: {
        source: 'product_recommendation',
      },
    });
    console.log('Commission created:', commission.id);
    console.log('Amount:', commission.amount, commission.currency);
    console.log('Rate:', commission.rate * 100, '%');
    console.log('Status:', commission.status);

    // 2. List commissions for an agent
    console.log('\nListing commissions...');
    const commissions = await agentrix.commissions.list({
      agentId,
      status: 'pending',
      page: 1,
      limit: 20,
    });
    console.log('Pending commissions:', commissions.data.length);
    console.log('Total pending amount:', 
      commissions.data.reduce((sum, c) => sum + c.amount, 0), 
      commissions.data[0]?.currency || 'USD'
    );

    // 3. Settle a single commission
    console.log('\nSettling commission...');
    const settled = await agentrix.commissions.settle(commission.id);
    console.log('Commission settled:', settled.id);
    console.log('Settled at:', settled.settledAt);

    // 4. Settle multiple commissions in batch
    console.log('\nSettling multiple commissions...');
    const pendingCommissions = commissions.data.filter(c => c.status === 'pending');
    if (pendingCommissions.length > 0) {
      const ids = pendingCommissions.map(c => c.id);
      const batchSettled = await agentrix.commissions.settleBatch(ids);
      console.log(`Settled ${batchSettled.length} commissions`);
    }

    // 5. Get agent earnings (includes commissions)
    console.log('\nGetting agent earnings...');
    const earnings = await agentrix.agents.getEarnings(agentId);
    console.log('Total earnings:', earnings.totalEarnings, earnings.currency);
    console.log('Total commissions:', earnings.totalCommissions, earnings.currency);
    console.log('Settled amount:', earnings.settledAmount, earnings.currency);

  } catch (error) {
    console.error('Error:', error);
  }
}

commissionExample();

