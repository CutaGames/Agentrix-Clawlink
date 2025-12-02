/**
 * 为测试账户创建测试商品
 * 
 * 使用方式：
 * cd backend
 * npx ts-node scripts/create-test-products.ts
 */

import { DataSource } from 'typeorm';
import { User } from '../src/entities/user.entity';
import { Product } from '../src/entities/product.entity';
import { ProductType } from '../src/entities/product.entity';
import { SocialAccount } from '../src/entities/social-account.entity';
import { ProductPrice } from '../src/entities/product-price.entity';
import { ProductCountryPrice } from '../src/entities/product-country-price.entity';
import { ProductRegionPrice } from '../src/entities/product-region-price.entity';
import * as dotenv from 'dotenv';

dotenv.config();

async function createTestProducts() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'agentrix',
    password: process.env.DB_PASSWORD || 'agentrix_password',
    database: process.env.DB_DATABASE || 'agentrix_db',
    entities: [
      User,
      Product,
      SocialAccount,
      ProductPrice,
      ProductCountryPrice,
      ProductRegionPrice,
    ],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功');

    const userRepository = dataSource.getRepository(User);
    const productRepository = dataSource.getRepository(Product);

    // 查找测试账户
    const testPaymindId = 'pm-1763463490911-91zf91wu2';
    let testUser = await userRepository.findOne({
      where: { agentrixId: testPaymindId },
    });

    if (!testUser) {
      console.log(`❌ 未找到测试账户: ${testPaymindId}`);
      console.log('💡 请先确保该账户已注册并登录过系统');
      process.exit(1);
    }

    console.log(`✅ 找到测试账户: ${testUser.agentrixId} (${testUser.email || 'N/A'})`);

    // 确保用户有 merchant 角色
    if (!testUser.roles || !testUser.roles.includes('merchant' as any)) {
      testUser.roles = [...(testUser.roles || []), 'merchant' as any];
      await userRepository.save(testUser);
      console.log('✅ 已为用户添加 merchant 角色');
    }

    // 定义测试商品
    const testProducts = [
      {
        name: '📚 高级阅读服务 - QuickPay 体验',
        description: '适合 QuickPay 小额支付的阅读服务产品。使用 X402 协议快速支付，适合小额高频场景。',
        price: 0.01,
        stock: 1000,
        category: '服务',
        commissionRate: 5,
        productType: ProductType.SERVICE,
        metadata: {
          productType: 'service',
          currency: 'USDT',
          paymentMethod: 'quickpay',
          x402Enabled: true,
          assetType: 'service',
          image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400',
        },
      },
      {
        name: '🎮 NFT 游戏道具 - 传奇之剑',
        description: '限量版 NFT 游戏道具，可在游戏中使用的传奇之剑。支持数字货币钱包支付，适合 Web3 用户。',
        price: 0.01,
        stock: 100,
        category: 'NFT',
        commissionRate: 8,
        productType: ProductType.NFT,
        metadata: {
          productType: 'nft',
          currency: 'USDT',
          paymentMethod: 'wallet',
          assetType: 'nft_rwa',
          chain: 'BSC',
          contractAddress: '0x0000000000000000000000000000000000000000', // 测试地址
          tokenId: '1',
          image: 'https://images.unsplash.com/photo-1639322537504-6427a16b0a38?w=400',
        },
      },
      {
        name: '💳 高级会员服务 - Stripe 支付',
        description: '高级会员服务，支持 Stripe 支付方式。主要用于测试佣金分配机制和结算流程。',
        price: 0.1,
        stock: 50,
        category: '服务',
        commissionRate: 10,
        productType: ProductType.SERVICE,
        metadata: {
          productType: 'service',
          currency: 'USD',
          paymentMethod: 'stripe',
          assetType: 'aggregated_web2',
          image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400',
        },
      },
      {
        name: '🛍️ 实物商品 - 智能手表',
        description: '智能手表实物商品，支持多种支付方式。测试实物商品的完整支付和物流流程。',
        price: 1,
        stock: 20,
        category: '电子产品',
        commissionRate: 6,
        productType: ProductType.PHYSICAL,
        metadata: {
          productType: 'physical',
          currency: 'CNY',
          paymentMethod: 'wallet',
          assetType: 'physical',
          image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
        },
      },
      {
        name: '🎨 虚拟商品 - 数字艺术收藏',
        description: '限量数字艺术收藏品，支持 NFT 形式交付。测试虚拟商品的支付和交付流程。',
        price: 0.01,
        stock: 200,
        category: '虚拟商品',
        commissionRate: 7,
        productType: ProductType.NFT,
        metadata: {
          productType: 'nft',
          currency: 'USDT',
          paymentMethod: 'wallet',
          assetType: 'virtual',
          image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
        },
      },
    ];

    console.log('\n📦 开始创建测试商品...\n');

    for (const productData of testProducts) {
      // 检查商品是否已存在
      const existingProduct = await productRepository.findOne({
        where: {
          merchantId: testUser.id,
          name: productData.name,
        },
      });

      if (existingProduct) {
        console.log(`⏭️  商品已存在: ${productData.name}`);
        // 更新现有商品
        Object.assign(existingProduct, {
          ...productData,
          merchantId: testUser.id,
        });
        await productRepository.save(existingProduct);
        console.log(`   ✅ 已更新商品`);
      } else {
        const product = productRepository.create({
          ...productData,
          merchantId: testUser.id,
        });
        await productRepository.save(product);
        console.log(`✅ 已创建商品: ${productData.name}`);
        console.log(`   💰 价格: ${productData.price} ${productData.metadata.currency}`);
        console.log(`   📦 库存: ${productData.stock}`);
        console.log(`   🏷️  类型: ${productData.productType}`);
      }
    }

    console.log('\n✅ 所有测试商品创建完成！');
    console.log('\n📋 商品列表：');
    const allProducts = await productRepository.find({
      where: { merchantId: testUser.id },
      order: { createdAt: 'DESC' },
    });

    allProducts.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   价格: ${product.price} ${(product.metadata as any)?.currency || 'CNY'}`);
      console.log(`   库存: ${product.stock}`);
      console.log(`   类型: ${product.productType}`);
      console.log(`   支付方式: ${(product.metadata as any)?.paymentMethod || 'N/A'}`);
    });

    console.log('\n💡 提示：');
    console.log('1. 这些商品已自动索引到向量数据库，支持语义检索');
    console.log('2. 可以在 Marketplace 页面查看这些商品');
    console.log('3. 可以通过 Agent 搜索和购买这些商品');
    console.log('4. 测试账户 Agentrix ID: ' + testPaymindId);
  } catch (error) {
    console.error('❌ 创建测试商品失败:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

createTestProducts();

