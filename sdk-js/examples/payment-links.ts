/**
 * Payment Links Example
 * 
 * Demonstrates agent-friendly payment link generation
 */

import { Agentrix } from '../src';

async function paymentLinksExample() {
  const agentrix = new Agentrix({
    apiKey: process.env.AGENTRIX_API_KEY || 'your-api-key',
    baseUrl: process.env.AGENTRIX_API_URL || 'http://localhost:3001/api',
  });

  try {
    // ============================================
    // Part 1: Create simple payment link
    // ============================================
    console.log('🔗 Part 1: Create payment link');
    console.log('='.repeat(60));
    
    const link = await agentrix.paymentLinks.create({
      amount: 99.99,
      currency: 'USD',
      description: 'Premium subscription',
      shortUrl: true,
      expiresIn: 3600, // 1 hour
    });
    
    console.log('Payment link created:');
    console.log(`  ID: ${link.id}`);
    console.log(`  URL: ${link.url}`);
    console.log(`  Short URL: ${link.shortUrl}`);
    console.log(`  Expires at: ${link.expiresAt}`);
    console.log('');

    // ============================================
    // Part 2: Create agent-friendly links
    // ============================================
    console.log('🤖 Part 2: Create agent-friendly links');
    console.log('='.repeat(60));
    
    const agentLinks = await agentrix.paymentLinks.createAgentFriendly({
      amount: 120,
      currency: 'USD',
      description: 'Purchase: Nike Air Max 2024',
      productId: 'prod_123',
      merchantId: 'merchant_123',
      agentId: 'agent_123',
      shortUrl: true,
    });
    
    console.log('Agent-friendly links:');
    console.log(`  Universal: ${agentLinks.platformLinks.universal}`);
    console.log(`  ChatGPT: ${agentLinks.platformLinks.chatgpt}`);
    console.log(`  Claude: ${agentLinks.platformLinks.claude}`);
    console.log(`  DeepSeek: ${agentLinks.platformLinks.deepseek}`);
    console.log('');
    console.log('📝 Agent can use these links in:');
    console.log('   - ChatGPT: Direct clickable link');
    console.log('   - Claude: Function call result');
    console.log('   - DeepSeek: Tool response');
    console.log('');

    // ============================================
    // Part 3: Use in Agent workflow
    // ============================================
    console.log('🔄 Part 3: Agent workflow');
    console.log('='.repeat(60));
    
    // Agent searches for product
    const products = await agentrix.agents.searchProducts('running shoes under 150');
    
    if (products.length > 0) {
      const product = products[0];
      
      // Agent creates payment link
      const paymentLink = await agentrix.paymentLinks.createAgentFriendly({
        amount: product.metadata?.price || 0,
        currency: product.metadata?.currency || 'USD',
        description: `Purchase: ${product.title}`,
        productId: product.productId,
        merchantId: product.merchantId,
        agentId: 'agent_123',
      });
      
      console.log('Agent workflow:');
      console.log('  1. User: "我要买跑鞋"');
      console.log('  2. Agent searches products');
      console.log(`  3. Agent recommends: ${product.title}`);
      console.log(`  4. Agent generates payment link`);
      console.log(`  5. Payment URL: ${paymentLink.platformLinks.universal}`);
      console.log('  6. User clicks link → completes payment');
      console.log('');
    }

    // ============================================
    // Part 4: List and manage links
    // ============================================
    console.log('📋 Part 4: List payment links');
    console.log('='.repeat(60));
    
    const links = await agentrix.paymentLinks.list({
      agentId: 'agent_123',
      status: 'active',
      page: 1,
      limit: 10,
    });
    
    console.log(`Total links: ${links.pagination?.total || 0}`);
    links.data.forEach((link, index) => {
      console.log(`${index + 1}. ${link.id} - ${link.amount} ${link.currency} - ${link.status}`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

paymentLinksExample();

