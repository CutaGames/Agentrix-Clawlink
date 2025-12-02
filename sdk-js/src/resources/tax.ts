/**
 * Tax resource for Agentrix SDK
 */

import { AgentrixClient } from '../client';

export interface TaxRate {
  id: string;
  countryCode: string;
  regionCode?: string;
  taxType: string;
  rate: number;
  effectiveDate: string;
  endDate?: string;
}

export interface TaxCalculation {
  rate: number;
  amount: number;
  taxType: string;
}

export interface TaxReport {
  merchantId: string;
  startDate: string;
  endDate: string;
  totalTax: number;
  breakdown: Array<{
    countryCode: string;
    taxAmount: number;
    taxType: string;
    transactionCount: number;
  }>;
}

export class TaxResource {
  constructor(private client: AgentrixClient) {}

  /**
   * Get tax rate for a country/region
   */
  async getTaxRate(
    countryCode: string,
    regionCode?: string,
    taxType?: string,
  ): Promise<TaxRate> {
    if (!countryCode) {
      throw new Error('Country code is required');
    }

    return this.client.get<TaxRate>(`/api/v2/tax/rates/${countryCode}`, {
      params: {
        region: regionCode,
        type: taxType,
      },
    });
  }

  /**
   * Calculate tax for an amount
   */
  async calculateTax(
    amount: number,
    countryCode: string,
    regionCode?: string,
  ): Promise<TaxCalculation> {
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!countryCode) {
      throw new Error('Country code is required');
    }

    return this.client.post<TaxCalculation>('/api/v2/tax/calculate', {
      amount,
      countryCode,
      regionCode,
    });
  }

  /**
   * Get tax report for a merchant
   */
  async getTaxReport(
    merchantId: string,
    startDate: string,
    endDate: string,
  ): Promise<TaxReport> {
    if (!merchantId) {
      throw new Error('Merchant ID is required');
    }
    if (!startDate) {
      throw new Error('Start date is required');
    }
    if (!endDate) {
      throw new Error('End date is required');
    }

    return this.client.get<TaxReport>(
      `/api/v2/tax/reports/${merchantId}`,
      {
        params: {
          startDate,
          endDate,
        },
      },
    );
  }
}

