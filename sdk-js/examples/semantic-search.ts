/**
 * Semantic Search Example
 * 
 * Demonstrates Agentrix SDK's unified semantic search capabilities:
 * 1. Simple search API for agents
 * 2. Optional local embedding with cloud fallback
 * 3. Client-side re-ranking with user preferences
 * 4. Automatic payment link generation
 */

import { Agentrix } from '../src';

async function semanticSearchExample() {
  const agentrix = new Agentrix({
    apiKey: process.env.AGENTRIX_API_KEY || 'your-api-key',
    baseUrl: process.env.AGENTRIX_API_URL || 'http://localhost:3001/api',
  });

  try {
    // ============================================
    // Part 1: Initialize local embedding (optional)
    // ============================================
    console.log('🔧 Part 1: Initialize local embedding (optional)');
    console.log('='.repeat(60));
    
    // Try to initialize local embedding model
    // If not available, SDK will automatically fallback to cloud API
    const localModelAvailable = await agentrix.marketplace.initializeLocalEmbedding('minilm');
    
    if (localModelAvailable) {
      console.log('✅ Local embedding model initialized');
      console.log('   Using local model for faster queries');
    } else {
      console.log('ℹ️  Local embedding model not available');
      console.log('   SDK will use Agentrix cloud embedding API');
      console.log('   (This is the default and recommended approach)');
    }
    console.log('');

    // ============================================
    // Part 2: Simple semantic search (Agent use case)
    // ============================================
    console.log('🔍 Part 2: Simple semantic search');
    console.log('='.repeat(60));
    
    // Agent receives user query: "帮我买张明天的机票"
    const userQuery = '帮我买张明天的机票';
    console.log(`User query: "${userQuery}"`);
    console.log('');
    
    // Agent simply calls SDK - no embedding/vector DB knowledge needed
    const results = await agentrix.agents.searchProducts(userQuery, {
      priceMax: 1000,
      currency: 'USD',
    });
    
    console.log(`✅ Found ${results.length} results`);
    console.log('');
    
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.title}`);
      console.log(`   Description: ${result.description}`);
      console.log(`   Payment methods: ${result.paymentMethods.join(', ')}`);
      console.log(`   Payment link: ${result.actions[0]?.url}`);
      console.log(`   Relevance score: ${result.relevance.toFixed(2)}`);
      console.log('');
    });
    
    console.log('📝 What happens behind the scenes:');
    console.log('   1. Query → Embedding (local or cloud)');
    console.log('   2. Vector search in Agentrix database');
    console.log('   3. Results returned to Agent');
    console.log('   4. Agent displays to user');
    console.log('');

    // ============================================
    // Part 3: Advanced search with re-ranking
    // ============================================
    console.log('⭐ Part 3: Advanced search with user preferences');
    console.log('='.repeat(60));
    
    // Search with user preferences for better results
    const advancedResults = await agentrix.marketplace.searchProducts(
      {
        query: 'buy coffee',
        filters: {
          priceMax: 50,
          currency: 'USD',
        },
        limit: 10,
        sortBy: 'relevance',
      },
      {
        // User preferences for re-ranking
        userPreferences: {
          preferredPaymentMethods: ['USDC', 'Apple Pay'],
          preferredMerchants: ['merchant_123'],
          priceRange: { min: 5, max: 20 },
          categories: ['food', 'beverages'],
        },
        location: {
          country: 'USA',
          city: 'New York',
        },
        history: {
          previousPurchases: ['merchant_123'],
          preferredCategories: ['food'],
        },
        weights: {
          relevance: 0.4,
          userPreference: 0.3,
          location: 0.1,
          history: 0.2,
        },
      }
    );
    
    console.log(`✅ Found ${advancedResults.total} results (re-ranked)`);
    console.log('');
    
    advancedResults.products.slice(0, 3).forEach((product, index) => {
      console.log(`${index + 1}. ${product.title}`);
      console.log(`   Price: ${product.price} ${product.currency}`);
      console.log(`   Payment URL: ${product.payUrl}`);
      console.log('');
    });
    
    console.log('📝 Re-ranking benefits:');
    console.log('   - Results match user payment preferences');
    console.log('   - Preferred merchants ranked higher');
    console.log('   - Location-based relevance');
    console.log('   - History-based personalization');
    console.log('');

    // ============================================
    // Part 4: Direct marketplace search
    // ============================================
    console.log('🛒 Part 4: Direct marketplace search');
    console.log('='.repeat(60));
    
    // Simple search method for quick queries
    const quickResults = await agentrix.marketplace.search('running shoes under 150', {
      filters: {
        priceMax: 150,
        currency: 'USD',
        inStock: true,
      },
      limit: 5,
    });
    
    console.log(`✅ Found ${quickResults.length} results`);
    console.log('');
    
    quickResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.title}`);
      console.log(`   ${result.description}`);
      console.log(`   Actions: ${result.actions.map(a => a.type).join(', ')}`);
      console.log(`   Payment link: ${result.actions[0]?.url}`);
      console.log('');
    });

    // ============================================
    // Part 5: Agent workflow - Search → Recommend → Pay
    // ============================================
    console.log('🤖 Part 5: Complete Agent workflow');
    console.log('='.repeat(60));
    
    // 1. User query
    const query = '适合跑步的鞋子，不要超过150美元';
    console.log(`1. User: "${query}"`);
    
    // 2. Agent searches
    const searchResults = await agentrix.agents.searchProducts(query, {
      priceMax: 150,
      currency: 'USD',
      inStock: true,
    });
    
    console.log(`2. Agent searches → Found ${searchResults.length} products`);
    
    // 3. Agent recommends
    if (searchResults.length > 0) {
      const topResult = searchResults[0];
      console.log(`3. Agent recommends: "${topResult.title}"`);
      console.log(`   Price: ${topResult.metadata?.price} ${topResult.metadata?.currency}`);
      console.log(`   Payment link: ${topResult.actions[0]?.url}`);
      
      // 4. User decides to purchase
      console.log('4. User: "好的，我要买这个"');
      
      // 5. Agent creates order
      const order = await agentrix.agents.createOrder({
        productId: topResult.productId || '',
        userId: 'user_123',
        quantity: 1,
      });
      
      console.log(`5. Agent creates order: ${order.id}`);
      
      // 6. Create payment
      const payment = await agentrix.payments.create({
        amount: topResult.metadata?.price || 0,
        currency: topResult.metadata?.currency || 'USD',
        description: `Purchase: ${topResult.title}`,
        merchantId: topResult.merchantId,
        agentId: 'agent_123',
        metadata: {
          orderId: order.id,
          productId: topResult.productId,
        },
      });
      
      console.log(`6. Payment created: ${payment.id}`);
      console.log('   ✅ Complete workflow: Search → Recommend → Order → Pay');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

semanticSearchExample();

