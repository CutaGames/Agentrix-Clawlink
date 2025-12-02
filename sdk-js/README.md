# PayMind SDK for JavaScript/TypeScript

Official PayMind SDK for JavaScript and TypeScript. Unified payment layer for AI Agents, merchants, and applications.

## Installation

```bash
npm install @paymind/sdk
```

## Quick Start

```typescript
import { PayMind } from '@paymind/sdk';

// Initialize the SDK
const paymind = new PayMind({
  apiKey: 'your-api-key-here',
  baseUrl: 'https://api.paymind.com/api', // Optional, defaults to production
});

// Create a payment
const payment = await paymind.payments.create({
  amount: 7999,
  currency: 'CNY',
  description: 'Product purchase',
  metadata: {
    orderId: '12345',
  },
});

console.log('Payment created:', payment.id);
```

## Features

- ✅ **Payment Processing** - Create, query, and manage payments
- ✅ **AI Agent Support** - Auto-pay grants, earnings, commissions
- ✅ **Merchant Tools** - Product management, order tracking
- ✅ **Smart Routing** - Automatic payment method selection
- ✅ **Webhook Handling** - Secure webhook event processing
- ✅ **TypeScript Support** - Full type definitions included

## Documentation

### Payment Operations

```typescript
// Create a payment
const payment = await paymind.payments.create({
  amount: 100,
  currency: 'USD',
  description: 'Product purchase',
});

// Get payment status
const status = await paymind.payments.get(payment.id);

// Get routing recommendation
const routing = await paymind.payments.getRouting({
  amount: 100,
  currency: 'USD',
  userCountry: 'US',
  merchantCountry: 'CN',
});
```

### AI Agent Operations

```typescript
// Create auto-pay grant
const grant = await paymind.agents.createAutoPayGrant({
  agentId: 'agent_123',
  singleLimit: 100,
  dailyLimit: 1000,
  currency: 'USD',
  expiresInDays: 30,
});

// Get agent earnings
const earnings = await paymind.agents.getEarnings('agent_123');

// Get commissions
const commissions = await paymind.agents.getCommissions('agent_123');
```

### Merchant Operations

```typescript
// Create a product
const product = await paymind.merchants.createProduct({
  name: 'Product Name',
  description: 'Product description',
  price: 99.99,
  currency: 'USD',
});

// List products
const products = await paymind.merchants.listProducts({
  page: 1,
  limit: 20,
});
```

### Subscription Operations

```typescript
// Create a subscription plan
const plan = await paymind.subscriptions.createPlan({
  name: 'Premium Monthly',
  amount: 29.99,
  currency: 'USD',
  interval: 'month',
});

// Create a subscription
const subscription = await paymind.subscriptions.create({
  planId: plan.id,
  userId: 'user_123',
});

// Cancel subscription
await paymind.subscriptions.cancel(subscription.id);
```

### Commission Operations

```typescript
// Create a commission
const commission = await paymind.commissions.create({
  paymentId: 'pay_123',
  agentId: 'agent_123',
  rate: 0.1, // 10%
});

// Settle commission
await paymind.commissions.settle(commission.id);
```

### Tip Operations

```typescript
// Create a tip
const tip = await paymind.tips.create({
  amount: 5.0,
  currency: 'USD',
  creatorId: 'creator_123',
  message: 'Great content!',
});

// Get creator statistics
const stats = await paymind.tips.getCreatorStats('creator_123');
```

### Gaming Operations

```typescript
// Purchase game item
const purchase = await paymind.gaming.purchaseItem({
  userId: 'user_123',
  itemId: 'sword_legendary',
  itemType: 'weapon',
});

// Purchase multiple items
const purchases = await paymind.gaming.purchaseBatch([
  { userId: 'user_123', itemId: 'item1', itemType: 'weapon' },
  { userId: 'user_123', itemId: 'item2', itemType: 'skin' },
]);
```

### Batch Operations

```typescript
// Create multiple payments in batch
const payments = await paymind.payments.createBatch([
  { amount: 0.5, currency: 'USD', description: 'Payment 1' },
  { amount: 0.3, currency: 'USD', description: 'Payment 2' },
]);

// Poll payment status
const payment = await paymind.payments.pollStatus('pay_123', {
  interval: 2000,
  timeout: 60000,
  onStatusChange: (status) => console.log('Status:', status),
});
```

### Marketplace Operations (Bidirectional Marketplace)

**Merchant publishes product to Marketplace:**

```typescript
// Create product and make it available to AI Agents
const product = await paymind.merchants.createProduct({
  name: 'Nike Air Max 2024',
  description: 'Premium running shoes...',
  price: 120,
  currency: 'USD',
  availableToAgents: true, // ✅ Makes product discoverable
  commissionRate: 0.1, // 10% commission for agents
});
// Product is automatically:
// 1. Stored in database
// 2. Embedded for semantic search
// 3. Indexed in vector database
// 4. Synced to Marketplace Catalog
```

**AI Agent searches products (semantic search):**

```typescript
// Agent searches products using natural language
const results = await paymind.agents.searchProducts(
  '适合跑步的鞋子，不要超过150美元',
  {
    priceMax: 150,
    currency: 'USD',
    inStock: true,
  }
);
// Returns products matching semantic query
```

**AI Agent creates order:**

```typescript
// Agent creates order for user
const order = await paymind.agents.createOrder({
  productId: 'prod_123',
  userId: 'user_123',
  quantity: 1,
  shippingAddress: { ... },
});
// PayMind will:
// 1. Create order draft
// 2. Call merchant callback for real-time price/inventory
// 3. Generate final order and payment link
```

**Marketplace direct access:**

```typescript
// Simple search (recommended for agents)
const results = await paymind.marketplace.search('running shoes', {
  filters: { priceMax: 150 },
  limit: 10,
});

// Advanced search with re-ranking
const advancedResults = await paymind.marketplace.searchProducts({
  query: 'running shoes',
  filters: { priceMax: 150 },
  sortBy: 'relevance',
}, {
  userPreferences: {
    preferredPaymentMethods: ['USDC', 'Apple Pay'],
    priceRange: { min: 50, max: 150 },
  },
  location: { country: 'USA' },
});

// Get recommended products for agent
const recommended = await paymind.marketplace.getRecommendedProducts('agent_123');
```

**Semantic Search Features:**

- ✅ **Unified Search API** - All agents use the same search standard
- ✅ **Local + Cloud Embedding** - Optional local model with cloud fallback
- ✅ **Client-side Re-ranking** - User preferences, location, history
- ✅ **Automatic Payment Links** - Results include ready-to-use payment URLs
- ✅ **No Embedding Knowledge Required** - Agents just call the API

### Webhook Handling

```typescript
import express from 'express';
import { PayMind } from '@paymind/sdk';

const app = express();
const paymind = new PayMind({
  apiKey: 'your-api-key',
  webhookSecret: 'your-webhook-secret',
});

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const event = paymind.webhooks.constructEvent(
      req.body,
      req.headers['paymind-signature'] as string
    );

    switch (event.type) {
      case 'payment.completed':
        console.log('Payment completed:', event.data);
        break;
      case 'payment.failed':
        console.log('Payment failed:', event.data);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});
```

## Error Handling

```typescript
import { PayMindSDKError, PayMindAPIError } from '@paymind/sdk';

try {
  const payment = await paymind.payments.create({...});
} catch (error) {
  if (error instanceof PayMindAPIError) {
    console.error('API Error:', error.code, error.message);
    console.error('Status Code:', error.statusCode);
  } else if (error instanceof PayMindSDKError) {
    console.error('SDK Error:', error.code, error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Configuration

```typescript
const paymind = new PayMind({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.paymind.com/api', // Optional
  timeout: 30000, // Optional, default 30s
  retries: 3, // Optional, default 3
  webhookSecret: 'your-webhook-secret', // Optional, for webhook verification
});
```

## Examples

See the `examples/` directory for complete examples:
- Node.js backend integration (`nodejs-basic.ts`)
- AI Agent integration (`ai-agent.ts`)
- Merchant integration (`merchant.ts`)
- Webhook handling (`webhook-express.ts`)
- Browser frontend integration (`browser-basic.html`)
- Subscription management (`subscription.ts`)
- Batch payments (`batch-payment.ts`)
- Tips/Creator monetization (`tip.ts`)
- Gaming in-app purchases (`gaming.ts`)
- Commission and revenue sharing (`commission.ts`)
- **Marketplace & AI Agent integration** (`marketplace-agent.ts`) ⭐
- **Marketplace merchant integration** (`marketplace-merchant.ts`) ⭐
- **Semantic search** (`semantic-search.ts`) ⭐

## License

MIT

## Support

- Documentation: https://docs.paymind.com
- Issues: https://github.com/paymind/sdk-js/issues
- Email: support@paymind.com

