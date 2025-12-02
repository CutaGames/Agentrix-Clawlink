/**
 * Marketplace merchant integration example
 * 
 * Demonstrates how merchants can publish products to the Marketplace
 * and make them discoverable by AI Agents
 */

import { PayMind } from '../src';

async function marketplaceMerchantExample() {
  const paymind = new PayMind({
    apiKey: process.env.PAYMIND_API_KEY || 'your-api-key',
    baseUrl: process.env.PAYMIND_API_URL || 'http://localhost:3001/api',
  });

  try {
    // ============================================
    // Create products and publish to Marketplace
    // ============================================
    console.log('📦 Creating products for Marketplace');
    console.log('='.repeat(60));
    
    const products = [
      {
        name: 'Nike Air Max 2024',
        description: 'Premium running shoes with advanced cushioning technology. Perfect for long-distance running and daily workouts.',
        price: 120,
        currency: 'USD',
        category: 'shoes',
        inventory: 50,
        availableToAgents: true,
        commissionRate: 0.1, // 10% commission
      },
      {
        name: 'Apple iPhone 15 Pro',
        description: 'Latest iPhone with A17 Pro chip, titanium design, and advanced camera system.',
        price: 999,
        currency: 'USD',
        category: 'electronics',
        inventory: 30,
        availableToAgents: true,
        commissionRate: 0.05, // 5% commission
      },
      {
        name: 'Online Course: Machine Learning Basics',
        description: 'Comprehensive machine learning course covering fundamentals, algorithms, and practical applications.',
        price: 99,
        currency: 'USD',
        category: 'education',
        inventory: 999, // Digital product
        availableToAgents: true,
        commissionRate: 0.15, // 15% commission for digital products
      },
    ];

    const createdProducts = [];
    for (const productData of products) {
      const product = await paymind.merchants.createProduct(productData);
      createdProducts.push(product);
      console.log(`✅ Created: ${product.name} (${product.id})`);
      console.log(`   Price: ${product.price} ${product.currency}`);
      console.log(`   Available to Agents: ${product.availableToAgents || true}`);
      console.log(`   Commission: ${(product.commissionRate || 0) * 100}%`);
      console.log('');
    }

    console.log('📝 What happens when availableToAgents = true:');
    console.log('   1. Product stored in database');
    console.log('   2. Embedding generated for semantic search');
    console.log('   3. Indexed in vector database');
    console.log('   4. Synced to Marketplace Catalog');
    console.log('   5. Now discoverable by AI Agents via semantic search');
    console.log('');

    // ============================================
    // Test semantic search from merchant perspective
    // ============================================
    console.log('🔍 Testing semantic search');
    console.log('='.repeat(60));
    
    const searchResults = await paymind.marketplace.searchProducts({
      query: 'running shoes under 150 dollars',
      filters: {
        priceMax: 150,
        currency: 'USD',
        inStock: true,
      },
      limit: 10,
      sortBy: 'relevance',
    });
    
    console.log(`Found ${searchResults.total} products matching query`);
    console.log('');
    
    searchResults.products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.title}`);
      console.log(`   Price: ${product.price} ${product.currency}`);
      console.log(`   Stock: ${product.stock}`);
      console.log(`   Commission: ${(product.commissionRate || 0) * 100}%`);
      console.log('');
    });

    // ============================================
    // Update product (e.g., price change, inventory update)
    // ============================================
    console.log('🔄 Updating product');
    console.log('='.repeat(60));
    
    if (createdProducts.length > 0) {
      const updatedProduct = await paymind.merchants.updateProduct(createdProducts[0].id, {
        price: 110, // Price reduced
        inventory: 45, // Inventory updated
      });
      
      console.log('✅ Product updated:', updatedProduct.id);
      console.log('   New price:', updatedProduct.price);
      console.log('   New inventory:', updatedProduct.inventory);
      console.log('');
      console.log('📝 Marketplace will automatically:');
      console.log('   - Update product information');
      console.log('   - Regenerate embedding if description changed');
      console.log('   - Sync changes to Marketplace Catalog');
      console.log('');
    }

    // ============================================
    // View orders from Marketplace
    // ============================================
    console.log('📋 Viewing orders from Marketplace');
    console.log('='.repeat(60));
    
    const orders = await paymind.marketplace.listOrders({
      status: 'pending',
      page: 1,
      limit: 10,
    });
    
    console.log(`Total orders: ${orders.pagination?.total || 0}`);
    console.log('');
    
    orders.data.forEach((order, index) => {
      console.log(`${index + 1}. Order ${order.id}`);
      console.log(`   Product: ${order.productId}`);
      console.log(`   Amount: ${order.amount} ${order.currency}`);
      console.log(`   Status: ${order.status}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

marketplaceMerchantExample();

