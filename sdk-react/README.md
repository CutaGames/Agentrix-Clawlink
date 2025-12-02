# PayMind React SDK

React components and hooks for PayMind payment integration.

## Installation

```bash
npm install @paymind/react @paymind/sdk
```

## Quick Start

```tsx
import { PayMindProvider, usePayment } from '@paymind/react';

function App() {
  return (
    <PayMindProvider
      config={{
        apiKey: 'your-api-key',
        baseUrl: 'https://api.paymind.com/api',
      }}
    >
      <PaymentComponent />
    </PayMindProvider>
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
import { PaymentButton } from '@paymind/react';

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

