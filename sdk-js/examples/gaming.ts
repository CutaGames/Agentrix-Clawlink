/**
 * Gaming in-app purchase example
 */

import { Agentrix } from '../src';

async function gamingExample() {
  const agentrix = new Agentrix({
    apiKey: process.env.AGENTRIX_API_KEY || 'your-api-key',
    baseUrl: process.env.AGENTRIX_API_URL || 'http://localhost:3001/api',
  });

  const userId = 'user_123';

  try {
    // 1. List available game items
    console.log('Listing game items...');
    const items = await agentrix.gaming.listItems({
      page: 1,
      limit: 20,
    });
    console.log('Available items:', items.data.length);
    items.data.forEach((item) => {
      console.log(`  - ${item.name}: ${item.price} ${item.currency} (${item.itemType})`);
    });

    // 2. Purchase a single item
    console.log('\nPurchasing item...');
    const purchase = await agentrix.gaming.purchaseItem({
      userId,
      itemId: 'sword_legendary',
      itemType: 'weapon',
      quantity: 1,
      useAutoPay: true, // Use X402 for micro-payments
    });
    console.log('Purchase created:', purchase.id);
    console.log('Item:', purchase.itemId);
    console.log('Amount:', purchase.amount, purchase.currency);

    // 3. Purchase multiple items in batch
    console.log('\nPurchasing multiple items in batch...');
    const batchPurchases = await agentrix.gaming.purchaseBatch([
      {
        userId,
        itemId: 'skin_rare',
        itemType: 'skin',
        quantity: 1,
      },
      {
        userId,
        itemId: 'coin_pack_100',
        itemType: 'currency',
        quantity: 1,
      },
      {
        userId,
        itemId: 'boost_xp',
        itemType: 'boost',
        quantity: 3,
      },
    ]);
    console.log(`Purchased ${batchPurchases.length} items:`);
    batchPurchases.forEach((p, index) => {
      console.log(`  ${index + 1}. ${p.itemId} - ${p.amount} ${p.currency}`);
    });

    // 4. Get purchase history
    console.log('\nGetting purchase history...');
    const history = await agentrix.gaming.getPurchaseHistory(userId, {
      page: 1,
      limit: 20,
    });
    console.log('Total purchases:', history.pagination.total);
    console.log('Recent purchases:', history.data.length);

  } catch (error) {
    console.error('Error:', error);
  }
}

gamingExample();

