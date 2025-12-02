# PayMind SDK Examples

This directory contains example code demonstrating how to use the PayMind SDK.

## Examples

### Node.js Examples

#### Basic Usage (`nodejs-basic.ts`)
Basic example showing how to:
- Initialize the SDK
- Get payment routing recommendations
- Create a payment
- Get payment status

**Run:**
```bash
cd sdk-js
npm install
npx ts-node examples/nodejs-basic.ts
```

#### AI Agent Integration (`ai-agent.ts`)
Example for AI Agent developers showing:
- Creating auto-pay grants
- Checking grant status
- Creating payments with agent ID
- Getting agent earnings and commissions

**Run:**
```bash
npx ts-node examples/ai-agent.ts
```

#### Merchant Integration (`merchant.ts`)
Example for merchants showing:
- Creating products
- Listing products
- Managing orders
- Creating payments for products

**Run:**
```bash
npx ts-node examples/merchant.ts
```

#### Webhook Handling (`webhook-express.ts`)
Express.js server example showing:
- Setting up webhook endpoint
- Verifying webhook signatures
- Handling different event types

**Run:**
```bash
npm install express @types/express
npx ts-node examples/webhook-express.ts
```

### Browser Example

#### Basic Browser Usage (`browser-basic.html`)
HTML example showing SDK usage in browser:
- Creating payments
- Getting routing recommendations
- Querying payment status

**Usage:**
1. Open `browser-basic.html` in a browser
2. Update API_KEY and API_URL in the script
3. Click buttons to test functionality

## Environment Variables

Set these environment variables before running examples:

```bash
export PAYMIND_API_KEY="your-api-key-here"
export PAYMIND_API_URL="http://localhost:3001/api"  # or production URL
export PAYMIND_WEBHOOK_SECRET="your-webhook-secret"  # for webhook examples
```

## Notes

- All examples use TypeScript
- Make sure to install dependencies: `npm install`
- Update API keys and URLs before running
- Examples connect to local development server by default

