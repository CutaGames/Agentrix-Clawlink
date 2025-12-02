/**
 * Subscription management example
 */

import { Agentrix } from '../src';

async function subscriptionExample() {
  const agentrix = new Agentrix({
    apiKey: process.env.AGENTRIX_API_KEY || 'your-api-key',
    baseUrl: process.env.AGENTRIX_API_URL || 'http://localhost:3001/api',
  });

  try {
    // 1. Create a subscription plan
    console.log('Creating subscription plan...');
    const plan = await agentrix.subscriptions.createPlan({
      name: 'Premium Monthly',
      description: 'Premium subscription - Monthly',
      amount: 29.99,
      currency: 'USD',
      interval: 'month',
      intervalCount: 1,
    });
    console.log('Plan created:', plan.id);
    console.log('Plan name:', plan.name);
    console.log('Price:', plan.amount, plan.currency);

    // 2. Create a subscription
    console.log('\nCreating subscription...');
    const subscription = await agentrix.subscriptions.create({
      planId: plan.id,
      userId: 'user_123',
      paymentMethod: 'stripe',
    });
    console.log('Subscription created:', subscription.id);
    console.log('Status:', subscription.status);
    console.log('Period:', subscription.currentPeriodStart, 'to', subscription.currentPeriodEnd);

    // 3. List subscriptions
    console.log('\nListing subscriptions...');
    const subscriptions = await agentrix.subscriptions.list({
      page: 1,
      limit: 10,
    });
    console.log('Total subscriptions:', subscriptions.pagination.total);

    // 4. Cancel subscription (at period end)
    console.log('\nCancelling subscription...');
    const cancelled = await agentrix.subscriptions.cancel(subscription.id, true);
    console.log('Subscription cancelled:', cancelled.id);
    console.log('Cancel at period end:', cancelled.cancelAtPeriodEnd);

    // 5. Resume subscription
    console.log('\nResuming subscription...');
    const resumed = await agentrix.subscriptions.resume(subscription.id);
    console.log('Subscription resumed:', resumed.id);
    console.log('Status:', resumed.status);

  } catch (error) {
    console.error('Error:', error);
  }
}

subscriptionExample();

