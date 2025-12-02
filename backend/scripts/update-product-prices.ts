/**
 * 更新所有测试商品价格为测试友好价格
 * 
 * 使用方式：
 * cd backend
 * npx ts-node scripts/update-product-prices.ts
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function updateProductPrices() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'paymind',
    password: process.env.DB_PASSWORD || 'paymind_password',
    database: process.env.DB_DATABASE || 'paymind_db',
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功');

    // 使用原生SQL查询，避免实体关系问题

    // 使用原生SQL直接更新价格
    console.log('\n📦 开始更新商品价格...\n');

    // 更新USDT商品价格为0.01
    const usdtResult = await dataSource.query(`
      UPDATE products 
      SET price = 0.01, "updatedAt" = NOW()
      WHERE (metadata->>'currency' = 'USDT' OR (metadata->>'currency' IS NULL AND price > 1))
        AND price > 0.01
      RETURNING id, name, price, metadata->>'currency' as currency;
    `);
    console.log(`✅ 更新USDT商品: ${usdtResult.length} 个`);

    // 更新USD商品价格为0.1
    const usdResult = await dataSource.query(`
      UPDATE products 
      SET price = 0.1, "updatedAt" = NOW()
      WHERE metadata->>'currency' = 'USD' 
        AND price > 0.1
      RETURNING id, name, price, metadata->>'currency' as currency;
    `);
    console.log(`✅ 更新USD商品: ${usdResult.length} 个`);

    // 更新CNY商品价格为1
    const cnyResult = await dataSource.query(`
      UPDATE products 
      SET price = 1, "updatedAt" = NOW()
      WHERE metadata->>'currency' = 'CNY' 
        AND price > 1
      RETURNING id, name, price, metadata->>'currency' as currency;
    `);
    console.log(`✅ 更新CNY商品: ${cnyResult.length} 个`);

    const totalUpdated = usdtResult.length + usdResult.length + cnyResult.length;
    console.log(`\n✅ 更新完成！共更新 ${totalUpdated} 个商品\n`);

    // 显示更新后的商品列表
    console.log('📋 更新后的商品列表：\n');
    const allProducts = await dataSource.query(`
      SELECT 
        id,
        name,
        price,
        COALESCE(metadata->>'currency', 'CNY') as currency,
        stock,
        "productType"
      FROM products
      ORDER BY "createdAt" DESC;
    `);

    allProducts.forEach((product: any, index: number) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   价格: ${product.price} ${product.currency}`);
      console.log(`   库存: ${product.stock}`);
      console.log(`   类型: ${product.productType}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ 更新商品价格失败:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

updateProductPrices();

