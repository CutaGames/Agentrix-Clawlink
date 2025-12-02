/**
 * Pricing resource for Agentrix SDK
 */

import { AgentrixClient } from '../client';

export interface ProductPrice {
  amount: number;
  currency: string;
  taxIncluded: boolean;
  taxRate: number;
  taxAmount: number;
  basePrice: number;
  priceDifference: number;
  reason: string;
}

export interface TotalPrice {
  basePrice: number;
  taxAmount: number;
  taxRate: number;
  totalPrice: number;
  currency: string;
}

export interface CurrencyConversion {
  amount: number;
  currency: string;
}

export class PricingResource {
  constructor(private client: AgentrixClient) {}

  /**
   * Get product price for a specific country
   */
  async getProductPrice(
    productId: string,
    countryCode: string,
    regionCode?: string,
  ): Promise<ProductPrice> {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    if (!countryCode) {
      throw new Error('Country code is required');
    }

    return this.client.get<ProductPrice>(
      `/api/v2/pricing/products/${productId}/price`,
      {
        params: {
          country: countryCode,
          region: regionCode,
        },
      },
    );
  }

  /**
   * Get total price (including tax) for a product
   */
  async getTotalPrice(
    productId: string,
    countryCode: string,
    regionCode?: string,
  ): Promise<TotalPrice> {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    if (!countryCode) {
      throw new Error('Country code is required');
    }

    return this.client.get<TotalPrice>(
      `/api/v2/pricing/products/${productId}/total`,
      {
        params: {
          country: countryCode,
          region: regionCode,
        },
      },
    );
  }

  /**
   * Convert currency
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<CurrencyConversion> {
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!fromCurrency) {
      throw new Error('From currency is required');
    }
    if (!toCurrency) {
      throw new Error('To currency is required');
    }

    const result = await this.client.post<{ amount: number; currency: string }>(
      '/api/v2/pricing/convert',
      {
        amount,
        fromCurrency,
        toCurrency,
      },
    );

    return {
      amount: result.amount,
      currency: result.currency,
    };
  }
}

