# PayMind SDK for Python

Official PayMind SDK for Python. Unified payment layer for AI Agents, merchants, and applications.

## Installation

```bash
pip install paymind-sdk
```

## Quick Start

```python
from paymind import PayMind

# Initialize the SDK
paymind = PayMind(
    api_key="your-api-key-here",
    base_url="https://api.paymind.com/api",  # Optional, defaults to production
)

# Create a payment
payment = paymind.payments.create({
    "amount": 7999,
    "currency": "CNY",
    "description": "Product purchase",
    "metadata": {
        "orderId": "12345",
    },
})

print(f"Payment created: {payment['id']}")
```

## Features

- ✅ **Payment Processing** - Create, query, and manage payments
- ✅ **AI Agent Support** - Auto-pay grants, earnings, commissions
- ✅ **Merchant Tools** - Product management, order tracking
- ✅ **Smart Routing** - Automatic payment method selection
- ✅ **Webhook Handling** - Secure webhook event processing

## Documentation

### Payment Operations

```python
# Create a payment
payment = paymind.payments.create({
    "amount": 100,
    "currency": "USD",
    "description": "Product purchase",
})

# Get payment status
status = paymind.payments.get(payment["id"])

# Get routing recommendation
routing = paymind.payments.get_routing(
    amount=100,
    currency="USD",
    user_country="US",
    merchant_country="CN",
)
```

### AI Agent Operations

```python
# Create auto-pay grant
grant = paymind.agents.create_auto_pay_grant(
    agent_id="agent_123",
    single_limit=100,
    daily_limit=1000,
    currency="USD",
    expires_in_days=30,
)

# Get agent earnings
earnings = paymind.agents.get_earnings("agent_123")

# Get commissions
commissions = paymind.agents.get_commissions("agent_123")
```

### Merchant Operations

```python
# Create a product
product = paymind.merchants.create_product({
    "name": "Product Name",
    "description": "Product description",
    "price": 99.99,
    "currency": "USD",
})

# List products
products = paymind.merchants.list_products(page=1, limit=20)
```

### Webhook Handling

```python
from flask import Flask, request
from paymind import PayMind

app = Flask(__name__)
paymind = PayMind(
    api_key="your-api-key",
    webhook_secret="your-webhook-secret",
)

@app.route("/webhook", methods=["POST"])
def webhook():
    try:
        event = paymind.webhooks.construct_event(
            request.data.decode("utf-8"),
            request.headers.get("PayMind-Signature", "")
        )

        if event["type"] == "payment.completed":
            print(f"Payment completed: {event['data']}")
        elif event["type"] == "payment.failed":
            print(f"Payment failed: {event['data']}")

        return {"received": True}, 200
    except ValueError as e:
        return {"error": str(e)}, 400
```

## Error Handling

```python
from paymind.utils.errors import PayMindError, PayMindAPIError

try:
    payment = paymind.payments.create({...})
except PayMindAPIError as e:
    print(f"API Error: {e.code} - {e.message}")
    print(f"Status Code: {e.status_code}")
except PayMindError as e:
    print(f"SDK Error: {e.code} - {e.message}")
except Exception as e:
    print(f"Unknown error: {e}")
```

## Configuration

```python
paymind = PayMind(
    api_key="your-api-key",
    base_url="https://api.paymind.com/api",  # Optional
    timeout=30,  # Optional, default 30s
    retries=3,  # Optional, default 3
    webhook_secret="your-webhook-secret",  # Optional, for webhook verification
)
```

## Examples

See the `examples/` directory for complete examples:
- Flask/FastAPI integration
- AI Agent integration
- Webhook handling

## License

MIT

## Support

- Documentation: https://docs.paymind.com
- Issues: https://github.com/paymind/sdk-python/issues
- Email: support@paymind.com

