/**
 * Intent Payment Example
 * 
 * Demonstrates natural language to payment intent conversion
 */

import { Agentrix } from '../src';

async function intentPaymentExample() {
  const agentrix = new Agentrix({
    apiKey: process.env.AGENTRIX_API_KEY || 'your-api-key',
    baseUrl: process.env.AGENTRIX_API_URL || 'http://localhost:3001/api',
  });

  try {
    // ============================================
    // Part 1: Parse natural language to intent
    // ============================================
    console.log('💬 Part 1: Parse natural language to intent');
    console.log('='.repeat(60));
    
    const userQueries = [
      '帮我买一双Nike跑鞋，价格不要超过150美元',
      '我要订阅Premium会员，月付',
      '给这个创作者打赏5美元',
      '购买明天的机票，从纽约到洛杉矶',
    ];

    for (const query of userQueries) {
      console.log(`\nUser: "${query}"`);
      
      const intentResponse = await agentrix.intent.parseIntent({
        query,
        context: {
          userId: 'user_123',
          location: {
            country: 'USA',
            city: 'New York',
          },
          preferences: {
            preferredPaymentMethods: ['USDC', 'Apple Pay'],
            preferredCurrency: 'USD',
          },
        },
      });
      
      console.log('Intent parsed:');
      console.log(`  Type: ${intentResponse.intent.type}`);
      console.log(`  Amount: ${intentResponse.intent.amount} ${intentResponse.intent.currency}`);
      console.log(`  Confidence: ${(intentResponse.intent.confidence * 100).toFixed(1)}%`);
      
      if (intentResponse.intent.missingFields && intentResponse.intent.missingFields.length > 0) {
        console.log(`  Missing fields: ${intentResponse.intent.missingFields.join(', ')}`);
      }
      
      if (intentResponse.suggestions && intentResponse.suggestions.length > 0) {
        console.log('  Suggestions:');
        intentResponse.suggestions.forEach((suggestion) => {
          console.log(`    - ${suggestion.field}: ${suggestion.value} (${suggestion.reason})`);
        });
      }
    }
    console.log('');

    // ============================================
    // Part 2: Complete intent with missing fields
    // ============================================
    console.log('✅ Part 2: Complete intent');
    console.log('='.repeat(60));
    
    const incompleteIntent = await agentrix.intent.parseIntent({
      query: '我要买一双鞋',
    });
    
    if (incompleteIntent.intent.missingFields && incompleteIntent.intent.missingFields.length > 0) {
      console.log('Intent has missing fields, completing...');
      
      const completed = await agentrix.intent.completeIntent(
        incompleteIntent.intent.metadata?.intentId || 'temp',
        {
          productId: 'prod_123',
          quantity: 1,
          shippingAddress: {
            name: 'John Doe',
            address: '123 Main St',
            city: 'New York',
            state: 'NY',
            country: 'USA',
            zipCode: '10001',
          },
        }
      );
      
      console.log('Intent completed:');
      console.log(`  Product ID: ${completed.productId}`);
      console.log(`  Quantity: ${completed.quantity}`);
      console.log(`  Shipping: ${completed.metadata?.shippingAddress?.city}`);
    }
    console.log('');

    // ============================================
    // Part 3: Convert intent to payment request
    // ============================================
    console.log('💳 Part 3: Convert intent to payment');
    console.log('='.repeat(60));
    
    const intent = await agentrix.intent.parseIntent({
      query: '购买Nike Air Max，价格120美元',
    });
    
    const paymentRequest = await agentrix.intent.toPaymentRequest(intent.intent);
    
    console.log('Payment request generated:');
    console.log(`  Amount: ${paymentRequest.paymentRequest.amount}`);
    console.log(`  Currency: ${paymentRequest.paymentRequest.currency}`);
    console.log(`  Description: ${paymentRequest.paymentRequest.description}`);
    
    if (paymentRequest.orderRequest) {
      console.log(`  Order ID: ${paymentRequest.orderRequest.orderId}`);
    }
    console.log('');

    // ============================================
    // Part 4: Complete workflow
    // ============================================
    console.log('🔄 Part 4: Complete workflow');
    console.log('='.repeat(60));
    
    // 1. User says natural language
    const userQuery = '帮我买一张明天的机票，从纽约到洛杉矶，不要超过500美元';
    console.log(`1. User: "${userQuery}"`);
    
    // 2. Parse intent
    const parsed = await agentrix.intent.parseIntent({ query: userQuery });
    console.log(`2. Intent parsed: ${parsed.intent.type}`);
    console.log(`   Amount: ${parsed.intent.amount} ${parsed.intent.currency}`);
    
    // 3. Search products
    const products = await agentrix.agents.searchProducts(userQuery, {
      priceMax: parsed.intent.amount || 500,
    });
    console.log(`3. Products found: ${products.length}`);
    
    // 4. Convert to payment
    if (products.length > 0 && parsed.intent.amount) {
      const payment = await agentrix.payments.create({
        amount: parsed.intent.amount,
        currency: parsed.intent.currency || 'USD',
        description: parsed.intent.description || 'Flight ticket',
        metadata: {
          intentId: parsed.intent.metadata?.intentId,
          productId: products[0].productId,
        },
      });
      
      console.log(`4. Payment created: ${payment.id}`);
      console.log('   ✅ Complete: Intent → Search → Payment');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

intentPaymentExample();

