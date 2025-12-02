/**
 * Webhook handling example with Express.js
 */

import express from 'express';
import { PayMind } from '../src';

const app = express();
const port = 3000;

// Initialize PayMind SDK
const paymind = new PayMind({
  apiKey: process.env.PAYMIND_API_KEY || 'your-api-key',
  webhookSecret: process.env.PAYMIND_WEBHOOK_SECRET || 'your-webhook-secret',
});

// Middleware to parse raw body for webhook signature verification
app.use('/webhook', express.raw({ type: 'application/json' }));

// Webhook endpoint
app.post('/webhook', (req, res) => {
  try {
    const signature = req.headers['paymind-signature'] as string;
    
    if (!signature) {
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify and parse webhook event
    const event = paymind.webhooks.constructEvent(
      req.body,
      signature
    );

    console.log('Webhook event received:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'payment.completed':
        handlePaymentCompleted(event.data);
        break;

      case 'payment.failed':
        handlePaymentFailed(event.data);
        break;

      case 'payment.cancelled':
        handlePaymentCancelled(event.data);
        break;

      case 'commission.settled':
        handleCommissionSettled(event.data);
        break;

      default:
        console.log('Unknown event type:', event.type);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

function handlePaymentCompleted(data: any) {
  console.log('Payment completed:', {
    paymentId: data.id,
    amount: data.amount,
    currency: data.currency,
    transactionHash: data.transactionHash,
  });
  
  // Update your database, send notification, etc.
}

function handlePaymentFailed(data: any) {
  console.log('Payment failed:', {
    paymentId: data.id,
    error: data.error,
  });
  
  // Handle failed payment, notify user, etc.
}

function handlePaymentCancelled(data: any) {
  console.log('Payment cancelled:', {
    paymentId: data.id,
  });
}

function handleCommissionSettled(data: any) {
  console.log('Commission settled:', {
    commissionId: data.id,
    amount: data.amount,
    agentId: data.agentId,
  });
}

app.listen(port, () => {
  console.log(`Webhook server listening on port ${port}`);
  console.log(`Webhook URL: http://localhost:${port}/webhook`);
});

