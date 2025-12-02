/**
 * Semantic Search Utilities
 * 
 * Provides local embedding support with cloud fallback
 * and client-side re-ranking capabilities
 */

export interface EmbeddingOptions {
  useLocalModel?: boolean;
  model?: 'minilm' | 'qwen' | 'openai';
  dimensions?: number;
}

export interface SearchResult {
  merchantId: string;
  productId?: string;
  title: string;
  description: string;
  paymentMethods: string[];
  actions: Array<{
    type: 'payment_link' | 'checkout' | 'order';
    url: string;
    metadata?: Record<string, any>;
  }>;
  score: number;
  relevance: number;
  metadata?: Record<string, any>;
}

export interface ReRankOptions {
  userPreferences?: {
    preferredPaymentMethods?: string[];
    preferredMerchants?: string[];
    priceRange?: { min?: number; max?: number };
    categories?: string[];
  };
  location?: {
    country?: string;
    city?: string;
    coordinates?: { lat: number; lng: number };
  };
  history?: {
    previousPurchases?: string[];
    preferredCategories?: string[];
  };
  weights?: {
    relevance?: number; // Default: 0.4
    userPreference?: number; // Default: 0.3
    location?: number; // Default: 0.1
    history?: number; // Default: 0.2
  };
}

/**
 * Local embedding model (optional)
 * Falls back to cloud API if not available
 */
export class LocalEmbeddingModel {
  private model: any = null;
  private initialized: boolean = false;

  async initialize(model: 'minilm' | 'qwen' = 'minilm'): Promise<boolean> {
    try {
      // Try to load local model (if available)
      // This is optional - SDK will fallback to cloud if not available
      // In production, you might use @xenova/transformers or similar
      
      // For now, return false to indicate local model not available
      // In actual implementation, you would:
      // 1. Check if model files are available
      // 2. Load the model
      // 3. Return true if successful
      
      this.initialized = false;
      return false;
    } catch (error) {
      console.warn('Local embedding model not available, will use cloud API');
      this.initialized = false;
      return false;
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!this.initialized || !this.model) {
      throw new Error('Local model not initialized');
    }
    
    // Generate embedding using local model
    // This would use the actual model implementation
    return [];
  }

  isAvailable(): boolean {
    return this.initialized && this.model !== null;
  }
}

/**
 * Re-rank search results based on user preferences and context
 */
export function reRankResults(
  results: SearchResult[],
  options: ReRankOptions = {}
): SearchResult[] {
  const weights = {
    relevance: 0.4,
    userPreference: 0.3,
    location: 0.1,
    history: 0.2,
    ...options.weights,
  };

  // Normalize weights to sum to 1
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  Object.keys(weights).forEach((key) => {
    weights[key as keyof typeof weights] /= totalWeight;
  });

  return results.map((result) => {
    let finalScore = result.relevance * weights.relevance;

    // User preference scoring
    if (options.userPreferences) {
      let preferenceScore = 0;
      
      // Payment method preference
      if (options.userPreferences.preferredPaymentMethods) {
        const matchingMethods = result.paymentMethods.filter((method) =>
          options.userPreferences!.preferredPaymentMethods!.includes(method)
        );
        preferenceScore += (matchingMethods.length / result.paymentMethods.length) * 0.3;
      }

      // Merchant preference
      if (options.userPreferences.preferredMerchants?.includes(result.merchantId)) {
        preferenceScore += 0.3;
      }

      // Category preference
      if (options.userPreferences.categories?.includes(result.metadata?.category)) {
        preferenceScore += 0.2;
      }

      // Price range preference
      if (options.userPreferences.priceRange) {
        const price = result.metadata?.price;
        if (price) {
          const { min, max } = options.userPreferences.priceRange;
          if ((!min || price >= min) && (!max || price <= max)) {
            preferenceScore += 0.2;
          }
        }
      }

      finalScore += preferenceScore * weights.userPreference;
    }

    // Location scoring
    if (options.location) {
      let locationScore = 0;
      
      if (options.location.country && result.metadata?.deliveryCountries?.includes(options.location.country)) {
        locationScore += 0.5;
      }
      
      if (options.location.city && result.metadata?.deliveryCities?.includes(options.location.city)) {
        locationScore += 0.5;
      }

      finalScore += locationScore * weights.location;
    }

    // History scoring
    if (options.history) {
      let historyScore = 0;
      
      if (options.history.previousPurchases?.includes(result.merchantId)) {
        historyScore += 0.5;
      }
      
      if (options.history.preferredCategories?.includes(result.metadata?.category)) {
        historyScore += 0.5;
      }

      finalScore += historyScore * weights.history;
    }

    return {
      ...result,
      score: finalScore,
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Format search results for easy consumption by Agents
 */
export function formatSearchResults(
  results: SearchResult[],
  options?: {
    includePaymentLinks?: boolean;
    maxResults?: number;
  }
): SearchResult[] {
  const maxResults = options?.maxResults || 10;
  
  return results.slice(0, maxResults).map((result) => {
    // Ensure payment links are included
    if (options?.includePaymentLinks && result.actions.length === 0) {
      result.actions.push({
        type: 'payment_link',
        url: result.metadata?.payUrl || `https://paymind.ai/checkout/${result.productId || result.merchantId}`,
        metadata: {
          productId: result.productId,
          merchantId: result.merchantId,
        },
      });
    }

    return result;
  });
}

