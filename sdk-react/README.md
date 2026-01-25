# Agentrix React SDK

React components and hooks for Agentrix payment integration.

## Installation

```bash
npm install @agentrix/react @agentrix/sdk
```

## Quick Start

```tsx
import { AgentrixProvider, usePayment } from '@agentrix/react';

function App() {
  return (
    <AgentrixProvider
      config={{
        apiKey: 'your-api-key',
        baseUrl: 'https://api.agentrix.com/api',
      }}
    >
      <PaymentComponent />
    </AgentrixProvider>
  );
}

function PaymentComponent() {
  const { createPayment, loading } = usePayment();

  const handlePay = async () => {
    const payment = await createPayment({
      amount: 100,
      currency: 'USD',
      description: 'Product purchase',
    });
    console.log('Payment created:', payment.id);
  };

  return (
    <button onClick={handlePay} disabled={loading}>
      {loading ? 'Processing...' : 'Pay Now'}
    </button>
  );
}
```

## Components

### PaymentButton

```tsx
import { PaymentButton } from '@agentrix/react';

<PaymentButton
  request={{
    amount: 100,
    currency: 'USD',
    description: 'Product purchase',
  }}
  onSuccess={(payment) => console.log('Success:', payment)}
  onError={(error) => console.error('Error:', error)}
>
  Pay $100
</PaymentButton>
```

## Hooks

### usePayment

```tsx
const {
  createPayment,
  getPayment,
  cancelPayment,
  getRouting,
  loading,
  error,
} = usePayment();
```

### useAgent

```tsx
const {
  createAutoPayGrant,
  getAutoPayGrant,
  getEarnings,
  getCommissions,
  loading,
  error,
} = useAgent();
```

## License

MIT

