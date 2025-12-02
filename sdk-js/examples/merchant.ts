/**
 * Merchant integration example
 */

import { Agentrix } from '../src';

async function merchantExample() {
  const agentrix = new Agentrix({
    apiKey: process.env.AGENTRIX_API_KEY || 'your-api-key',
    baseUrl: process.env.AGENTRIX_API_URL || 'http://localhost:3001/api',
  });

  try {
    // 1. Create a product
    console.log('Creating product...');
    const product = await agentrix.merchants.createProduct({
      name: 'Premium Digital Service',
      description: 'Access to premium features',
      price: 99.99,
      currency: 'USD',
      category: 'digital-service',
      metadata: {
        features: ['feature1', 'feature2'],
      },
    });
    console.log('Product created:', product.id);
    console.log('Product name:', product.name);
    console.log('Price:', product.price, product.currency);

    // 2. List products
    console.log('\nListing products...');
    const products = await agentrix.merchants.listProducts({
      page: 1,
      limit: 20,
    });
    console.log('Total products:', products.pagination.total);
    console.log('Products:', products.data.length);

    // 3. Get product details
    console.log('\nGetting product details...');
    const productDetails = await agentrix.merchants.getProduct(product.id);
    console.log('Product details:', productDetails);

    // 4. Update product
    console.log('\nUpdating product...');
    const updatedProduct = await agentrix.merchants.updateProduct(product.id, {
      price: 89.99,
    });
    console.log('Updated price:', updatedProduct.price);

    // 5. Create payment for product
    console.log('\nCreating payment for product...');
    const payment = await agentrix.payments.create({
      amount: updatedProduct.price,
      currency: updatedProduct.currency,
      description: `Purchase: ${updatedProduct.name}`,
      merchantId: updatedProduct.merchantId,
      metadata: {
        productId: product.id,
      },
    });
    console.log('Payment created:', payment.id);

    // 6. List orders
    console.log('\nListing orders...');
    const orders = await agentrix.merchants.listOrders({
      page: 1,
      limit: 20,
    });
    console.log('Total orders:', orders.pagination.total);

  } catch (error) {
    console.error('Error:', error);
  }
}

merchantExample();

