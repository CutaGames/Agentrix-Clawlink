/**
 * Tip/Creator monetization example
 */

import { Agentrix } from '../src';

async function tipExample() {
  const agentrix = new Agentrix({
    apiKey: process.env.AGENTRIX_API_KEY || 'your-api-key',
    baseUrl: process.env.AGENTRIX_API_URL || 'http://localhost:3001/api',
  });

  const creatorId = 'creator_123';

  try {
    // 1. Create a tip
    console.log('Creating tip...');
    const tip = await agentrix.tips.create({
      amount: 5.0,
      currency: 'USD',
      creatorId,
      message: 'Great content! Keep it up!',
      useAutoPay: true, // Use X402 auto-pay if available
    });
    console.log('Tip created:', tip.id);
    console.log('Amount:', tip.amount, tip.currency);
    console.log('Creator:', tip.creatorId);

    // 2. List tips for a creator
    console.log('\nListing tips for creator...');
    const tips = await agentrix.tips.list({
      creatorId,
      page: 1,
      limit: 20,
    });
    console.log('Total tips:', tips.pagination.total);
    console.log('Tips:', tips.data.length);

    // 3. Get creator statistics
    console.log('\nGetting creator statistics...');
    const stats = await agentrix.tips.getCreatorStats(creatorId, {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
    });
    console.log('Creator Stats:');
    console.log('  Total tips:', stats.tipCount);
    console.log('  Total amount:', stats.totalAmount, stats.currency);
    console.log('  Average tip:', stats.averageAmount, stats.currency);

  } catch (error) {
    console.error('Error:', error);
  }
}

tipExample();

