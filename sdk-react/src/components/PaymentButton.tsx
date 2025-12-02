/**
 * Payment Button Component
 */

import React, { useState } from 'react';
import { usePayment } from '../hooks/usePayment';
import { CreatePaymentRequest } from '@agentrix/sdk';

interface PaymentButtonProps {
  request: CreatePaymentRequest;
  onSuccess?: (payment: any) => void;
  onError?: (error: Error) => void;
  className?: string;
  children?: React.ReactNode;
}

export function PaymentButton({
  request,
  onSuccess,
  onError,
  className = '',
  children,
}: PaymentButtonProps) {
  const { createPayment, loading, error } = usePayment();
  const [processing, setProcessing] = useState(false);

  const handleClick = async () => {
    setProcessing(true);
    try {
      const payment = await createPayment(request);
      onSuccess?.(payment);
    } catch (err: any) {
      onError?.(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading || processing}
      className={className}
    >
      {loading || processing ? 'Processing...' : children || 'Pay Now'}
    </button>
  );
}

