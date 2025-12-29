import React, { useEffect, useState } from 'react';

interface TransakWidgetProps {
  apiKey?: string;
  environment?: 'STAGING' | 'PRODUCTION';
  amount?: number;
  fiatCurrency?: string;
  cryptoCurrency?: string;
  network?: string;
  walletAddress?: string;
  orderId: string;
  userId?: string;
  email?: string;
  directPayment?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  onEvent?: (eventType: string, data?: any) => void;
  onClose?: () => void;
}

export const TransakWidget: React.FC<TransakWidgetProps> = ({ orderId, onSuccess, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        const response = await fetch(`https://api.agentrix.top/api/payment/transak/session/${orderId}`, {
          method: 'POST',
        });

        if (!response.ok) throw new Error('Failed to create session');

        const data = await response.json();
        setUrl(data.url);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) fetchSession();
  }, [orderId]);

  if (loading) return <div className="p-10 text-center">Loading Transak...</div>;
  if (error) return <div className="p-10 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="w-full h-[600px]">
      {url && <iframe src={url} className="w-full h-full border-0" allow="camera;microphone;fullscreen;payment" />}
    </div>
  );
};

export default TransakWidget;

