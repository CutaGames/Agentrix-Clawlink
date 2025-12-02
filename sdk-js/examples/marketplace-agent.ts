/**
 * Marketplace and AI Agent integration example
 * 
 * This demonstrates the bidirectional marketplace functionality:
 * 1. Merchant publishes product → Marketplace
 * 2. AI Agent searches and retrieves products
 * 3. Agent recommends products to user
 * 4. Agent creates order and initiates payment
 */

import { PayMind } from '../src';

async function marketplaceAgentExample() {
  const paymind = new PayMind({
    apiKey: process.env.PAYMIND_API_KEY || 'your-api-key',
    baseUrl: process.env.PAYMIND_API_URL || 'http://localhost:3001/api',
  });

  try {
    // ============================================
    // Part 1: Merchant publishes product to Marketplace
    // ============================================
    console.log('📦 Part 1: Merchant publishes product to Marketplace');
    console.log('='.repeat(60));
    
    const product = await paymind.merchants.createProduct({
      name: 'Nike Air Max 2024',
      description: 'Premium running shoes with advanced cushioning technology. Perfect for long-distance running and daily workouts.',
      price: 120,
      currency: 'USD',
      category: 'shoes',
      inventory: 50,
      media: [
        'https://example.com/nike-air-max-1.jpg',
        'https://example.com/nike-air-max-2.jpg',
      ],
      attributes: {
        size: ['8', '9', '10', '11', '12'],
        color: ['black', 'white', 'red'],
        brand: 'Nike',
        type: 'running',
      },
      availableToAgents: true, // ✅ Key: Makes product available in Marketplace
      commissionRate: 0.1, // 10% commission for agents
      delivery: 'Worldwide',
    });
    
    console.log('✅ Product created:', product.id);
    console.log('   Title:', product.name);
    console.log('   Price:', product.price, product.currency);
    console.log('   Available to Agents:', product.availableToAgents || true);
    console.log('   Commission Rate:', (product.commissionRate || 0.1) * 100, '%');
    console.log('');
    console.log('📝 What happens behind the scenes:');
    console.log('   1. Product stored in database');
    console.log('   2. Embedding generated for title + description');
    console.log('   3. Indexed in vector database (for semantic search)');
    console.log('   4. Synced to Marketplace Catalog');
    console.log('   5. Now available for AI Agent retrieval');
    console.log('');

    // ============================================
    // Part 2: AI Agent searches products (semantic search)
    // ============================================
    console.log('🤖 Part 2: AI Agent searches products');
    console.log('='.repeat(60));
    
    // User says: "帮我找一双适合跑步的鞋子，不要超过150美元"
    const userQuery = '适合跑步的鞋子，不要超过150美元';
    console.log(`User query: "${userQuery}"`);
    console.log('');
    
    // Agent SDK automatically:
    // 1. Identifies product search intent
    // 2. Calls PayMind Marketplace API
    // 3. Performs semantic vector search
    // 4. Applies filters (price < 150)
    // 5. Returns structured results
    
    const searchResults = await paymind.agents.searchProducts(userQuery, {
      priceMax: 150,
      currency: 'USD',
      inStock: true,
    });
    
    console.log('✅ Search results:', searchResults.products?.length || 0, 'products found');
    console.log('');
    
    if (searchResults.products && searchResults.products.length > 0) {
      searchResults.products.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.title}`);
        console.log(`      Price: ${product.price} ${product.currency}`);
        console.log(`      Stock: ${product.stock}`);
        console.log(`      Delivery: ${product.delivery || 'N/A'}`);
        console.log('');
      });
    }
    
    console.log('📝 Agent can now:');
    console.log('   - Convert results to natural language');
    console.log('   - Recommend products to user');
    console.log('   - Generate payment links');
    console.log('');

    // ============================================
    // Part 3: Agent recommends product to user
    // ============================================
    console.log('💬 Part 3: Agent recommends product');
    console.log('='.repeat(60));
    
    if (searchResults.products && searchResults.products.length > 0) {
      const recommendedProduct = searchResults.products[0];
      
      console.log('Agent recommendation:');
      console.log(`   "我为您找到了 ${recommendedProduct.title}`);
      console.log(`   价格: ${recommendedProduct.price} ${recommendedProduct.currency}`);
      console.log(`   库存: ${recommendedProduct.stock} 件`);
      console.log(`   配送: ${recommendedProduct.delivery || '全球配送'}`);
      console.log(`   这是适合跑步的优质选择！"`);
      console.log('');
    }

    // ============================================
    // Part 4: User decides to purchase → Agent creates order
    // ============================================
    console.log('🛒 Part 4: Agent creates order');
    console.log('='.repeat(60));
    
    if (searchResults.products && searchResults.products.length > 0) {
      const productToBuy = searchResults.products[0];
      
      // Agent creates order
      // PayMind will:
      // 1. Create order draft in PayMind OMS
      // 2. Call merchant callback API to get real-time price/inventory
      // 3. Merchant confirms and returns to PayMind
      // 4. PayMind generates final order and payment link
      
      const order = await paymind.agents.createOrder({
        productId: productToBuy.productId,
        userId: 'user_123',
        quantity: 1,
        shippingAddress: {
          name: 'John Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          zipCode: '10001',
          phone: '+1-555-1234',
        },
        metadata: {
          source: 'ai_agent',
          agentId: 'agent_123',
        },
      });
      
      console.log('✅ Order created:', order.id);
      console.log('   Status:', order.status);
      console.log('   Amount:', order.amount, order.currency);
      console.log('');
      console.log('📝 Order flow:');
      console.log('   Agent → PayMind → Merchant → PayMind → Agent → User');
      console.log('');

      // ============================================
      // Part 5: Create payment for the order
      // ============================================
      console.log('💳 Part 5: Create payment');
      console.log('='.repeat(60));
      
      const payment = await paymind.payments.create({
        amount: order.amount,
        currency: order.currency,
        description: `Purchase: ${productToBuy.title}`,
        merchantId: productToBuy.merchantId,
        agentId: 'agent_123',
        metadata: {
          orderId: order.id,
          productId: productToBuy.productId,
          commissionRate: productToBuy.commissionRate || 0.1,
        },
      });
      
      console.log('✅ Payment created:', payment.id);
      console.log('   Payment URL:', payment.metadata?.payUrl || 'N/A');
      console.log('');
      console.log('📝 Agent can now:');
      console.log('   - Send payment link to user');
      console.log('   - Track payment status');
      console.log('   - Receive commission when payment completes');
      console.log('');
    }

    // ============================================
    // Part 6: Get recommended products for agent
    // ============================================
    console.log('⭐ Part 6: Get recommended products for agent');
    console.log('='.repeat(60));
    
    const recommended = await paymind.agents.getRecommendedProducts('agent_123', {
      limit: 5,
      category: 'shoes',
    });
    
    console.log('✅ Recommended products:', recommended.products?.length || 0);
    console.log('   (Based on agent recommendation history and performance)');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

marketplaceAgentExample();

