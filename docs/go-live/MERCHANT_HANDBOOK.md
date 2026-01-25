# Agentrix Merchant Handbook (V1.0)

Welcome to the Agentrix ecosystem. This guide will help you integrate your business with our AI-powered payment and agent platform.

## 1. Quickstart (10 Minutes Integration)

1.  **Register**: Go to [Agentrix Merchant Portal](http://localhost:3000/app/register/merchant) and create your account.
2.  **API Keys**: Navigate to **Settings > API Keys** to generate your `Client ID` and `Secret Key`.
3.  **Create Product**: Add your first product in the **Products** tab. You will get a `Product ID`.
4.  **Test Checkout**: Use our [Checkout Demo](http://localhost:3000/pay/merchant-demo) to simulate a payment using your Product ID.

## 2. Webhook Integration

Agentrix sends real-time notifications to your server when events occur (e.g., `order.paid`, `refund.processed`).

### Webhook Security (Signature Verification)

All webhook requests include an `X-Agentrix-Signature` header. You **must** verify this signature to ensure the request came from Agentrix.

**Algorithm**: HMAC-SHA256
**Payload**: Raw JSON body of the request
**Secret**: Your Webhook Secret (found in Merchant Dashboard > Webhooks)

#### Node.js Example

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return digest === signature;
}

// In your Express route:
app.post('/webhooks/agentrix', (req, res) => {
  const signature = req.headers['x-agentrix-signature'];
  const rawBody = JSON.stringify(req.body); // Ensure you use raw body if possible
  
  if (verifySignature(rawBody, signature, process.env.AGENTRIX_WEBHOOK_SECRET)) {
    console.log('Verified Webhook:', req.body.event);
    res.status(200).send('OK');
  } else {
    res.status(401).send('Invalid Signature');
  }
});
```

## 3. Order Management

-   **Fulfillment**: When an order is paid, it appears in your **Orders** list. You can update the status to `SHIPPED` or `DELIVERED`.
-   **Refunds**: Customers can request refunds. You can approve or reject these in the **Refunds** tab. Approved refunds are processed automatically via the connected payment gateway.

## 4. Settlement & Withdrawals

-   **Settlement**: Funds are settled to your Agentrix Merchant Account according to your plan (e.g., T+1).
-   **Withdrawals**: You can withdraw funds to your connected Bank Account (Stripe) or Crypto Wallet (USDC/USDT).

## 5. FAQ & Troubleshooting

**Q: Why is my API call returning 401 Unauthorized?**
A: Ensure you are passing the `Authorization: Bearer <token>` header and that your API key is active.

**Q: I'm not receiving webhooks.**
A: Check your Webhook URL in the dashboard. Ensure your server is reachable from the internet and returns a `200 OK` response.

**Q: How do I test without real money?**
A: Use the **Sandbox** environment and test card numbers provided in the dashboard.

---
*For technical support, contact dev-support@agentrix.io*
