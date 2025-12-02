/**
 * Merchant integration example
 */

import { PayMind } from '../src';

async function merchantExample() {
  const paymind = new PayMind({
    apiKey: process.env.PAYMIND_API_KEY || 'your-api-key',
    baseUrl: process.env.PAYMIND_API_URL || 'http://localhost:3001/api',
  });

  try {
    // 1. Create a product
    console.log('Creating product...');
    const product = await paymind.merchants.createProduct({
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
    const products = await paymind.merchants.listProducts({
      page: 1,
      limit: 20,
    });
    console.log('Total products:', products.pagination.total);
    console.log('Products:', products.data.length);

    // 3. Get product details
    console.log('\nGetting product details...');
    const productDetails = await paymind.merchants.getProduct(product.id);
    console.log('Product details:', productDetails);

    // 4. Update product
    console.log('\nUpdating product...');
    const updatedProduct = await paymind.merchants.updateProduct(product.id, {
      price: 89.99,
    });
    console.log('Updated price:', updatedProduct.price);

    // 5. Create payment for product
    console.log('\nCreating payment for product...');
    const payment = await paymind.payments.create({
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
    const orders = await paymind.merchants.listOrders({
      page: 1,
      limit: 20,
    });
    console.log('Total orders:', orders.pagination.total);

  } catch (error) {
    console.error('Error:', error);
  }
}

merchantExample();

