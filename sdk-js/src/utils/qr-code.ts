/**
 * QR Code Utilities
 * 
 * Generates QR codes for payment links and wallet addresses
 */

export interface QRCodeOptions {
  size?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface PaymentQRData {
  type: 'payment' | 'wallet' | 'link';
  data: string;
  amount?: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Generate QR code data URL for payment
 * 
 * Note: This is a utility function. In production, you would use a QR code library
 * like 'qrcode' or 'qrcode.react' to generate the actual QR code image.
 */
export function generatePaymentQRData(payment: PaymentQRData): string {
  const qrData: any = {
    type: payment.type,
    data: payment.data,
  };

  if (payment.amount) {
    qrData.amount = payment.amount;
  }
  if (payment.currency) {
    qrData.currency = payment.currency;
  }
  if (payment.description) {
    qrData.description = payment.description;
  }
  if (payment.metadata) {
    qrData.metadata = payment.metadata;
  }

  // Return JSON string that can be encoded in QR code
  return JSON.stringify(qrData);
}

/**
 * Generate wallet address QR code
 */
export function generateWalletQR(address: string, chain?: string): string {
  const qrData: PaymentQRData = {
    type: 'wallet',
    data: address,
    metadata: chain ? { chain } : undefined,
  };

  return generatePaymentQRData(qrData);
}

/**
 * Generate payment link QR code
 */
export function generatePaymentLinkQR(
  paymentLink: string,
  amount?: number,
  currency?: string
): string {
  const qrData: PaymentQRData = {
    type: 'link',
    data: paymentLink,
    amount,
    currency,
  };

  return generatePaymentQRData(qrData);
}

/**
 * Parse QR code data
 */
export function parseQRData(qrDataString: string): PaymentQRData | null {
  try {
    const data = JSON.parse(qrDataString);
    return data as PaymentQRData;
  } catch (error) {
    // If not JSON, treat as plain address/link
    return {
      type: 'wallet',
      data: qrDataString,
    };
  }
}

