/**
 * Batch payment example
 */

import { PayMind } from '../src';

async function batchPaymentExample() {
  const paymind = new PayMind({
    apiKey: process.env.PAYMIND_API_KEY || 'your-api-key',
    baseUrl: process.env.PAYMIND_API_URL || 'http://localhost:3001/api',
  });

  try {
    // Create multiple payments in batch
    console.log('Creating batch payments...');
    const payments = await paymind.payments.createBatch([
      {
        amount: 0.5,
        currency: 'USD',
        description: 'API call #1',
        metadata: { apiEndpoint: '/v1/generate' },
      },
      {
        amount: 0.3,
        currency: 'USD',
        description: 'API call #2',
        metadata: { apiEndpoint: '/v1/analyze' },
      },
      {
        amount: 0.2,
        currency: 'USD',
        description: 'API call #3',
        metadata: { apiEndpoint: '/v1/summarize' },
      },
    ]);

    console.log(`Created ${payments.length} payments:`);
    payments.forEach((payment, index) => {
      console.log(`  ${index + 1}. ${payment.id} - ${payment.amount} ${payment.currency} - ${payment.status}`);
    });

    // Poll payment status
    console.log('\nPolling payment status...');
    for (const payment of payments) {
      try {
        const completed = await paymind.payments.pollStatus(payment.id, {
          interval: 2000,
          timeout: 30000,
          onStatusChange: (status) => {
            console.log(`  Payment ${payment.id} status: ${status}`);
          },
        });
        console.log(`  Payment ${payment.id} completed: ${completed.status}`);
      } catch (error: any) {
        console.error(`  Error polling payment ${payment.id}:`, error.message);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

batchPaymentExample();

