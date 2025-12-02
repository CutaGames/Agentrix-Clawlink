/**
 * Basic Node.js example
 */

import { PayMind } from '../src';

async function main() {
  // Initialize SDK
  const paymind = new PayMind({
    apiKey: process.env.PAYMIND_API_KEY || 'your-api-key',
    baseUrl: process.env.PAYMIND_API_URL || 'http://localhost:3001/api',
  });

  try {
    // Get payment routing recommendation
    console.log('Getting payment routing...');
    const routing = await paymind.payments.getRouting({
      amount: 100,
      currency: 'USD',
      userCountry: 'US',
      merchantCountry: 'CN',
    });
    console.log('Recommended method:', routing.recommendedMethod);
    console.log('Reason:', routing.reason);

    // Create a payment
    console.log('\nCreating payment...');
    const payment = await paymind.payments.create({
      amount: 100,
      currency: 'USD',
      description: 'Test payment',
      metadata: {
        orderId: 'test-order-123',
      },
    });
    console.log('Payment created:', payment.id);
    console.log('Status:', payment.status);

    // Get payment status
    console.log('\nGetting payment status...');
    const status = await paymind.payments.get(payment.id);
    console.log('Payment status:', status.status);

  } catch (error) {
    console.error('Error:', error);
  }
}

main();

