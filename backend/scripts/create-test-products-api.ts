/**
 * 通过 API 为测试账户创建测试商品
 * 
 * 使用方式：
 * 1. 确保后端服务正在运行
 * 2. 确保测试账户已登录并获取 token
 * 3. cd backend
 * 4. TOKEN=your_jwt_token npx ts-node scripts/create-test-products-api.ts
 * 
 * 或者直接使用 curl 命令（见脚本底部）
 */

import * as dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const TEST_AGENTRIX_ID = 'pm-1763463490911-91zf91wu2';

// 测试商品数据
const testProducts = [
  {
    name: '📚 高级阅读服务 - QuickPay 体验',
    description: '适合 QuickPay 小额支付的阅读服务产品。使用 X402 协议快速支付，适合小额高频场景。',
    price: 0.1,
    stock: 1000,
    category: '服务',
    commissionRate: 5,
    productType: 'service',
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
    price: 10,
    stock: 100,
    category: 'NFT',
    commissionRate: 8,
    productType: 'nft',
    metadata: {
      productType: 'nft',
      currency: 'USDT',
      paymentMethod: 'wallet',
      assetType: 'nft_rwa',
      chain: 'BSC',
      contractAddress: '0x0000000000000000000000000000000000000000',
      tokenId: '1',
      image: 'https://images.unsplash.com/photo-1639322537504-6427a16b0a38?w=400',
    },
  },
  {
    name: '💳 高级会员服务 - Stripe 支付',
    description: '高级会员服务，支持 Stripe 支付方式。主要用于测试佣金分配机制和结算流程。',
    price: 500,
    stock: 50,
    category: '服务',
    commissionRate: 10,
    productType: 'service',
    metadata: {
      productType: 'service',
      currency: 'CNY',
      paymentMethod: 'stripe',
      assetType: 'aggregated_web2',
      image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400',
    },
  },
  {
    name: '🛍️ 实物商品 - 智能手表',
    description: '智能手表实物商品，支持多种支付方式。测试实物商品的完整支付和物流流程。',
    price: 2999,
    stock: 20,
    category: '电子产品',
    commissionRate: 6,
    productType: 'physical',
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
    price: 50,
    stock: 200,
    category: '虚拟商品',
    commissionRate: 7,
    productType: 'nft',
    metadata: {
      productType: 'nft',
      currency: 'USDT',
      paymentMethod: 'wallet',
      assetType: 'virtual',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
    },
  },
];

async function createProductsViaAPI(token: string) {
  console.log('🚀 开始通过 API 创建测试商品...\n');

  for (const productData of testProducts) {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        const product = await response.json();
        console.log(`✅ 已创建商品: ${productData.name}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   价格: ${productData.price} ${productData.metadata.currency}`);
        console.log(`   库存: ${productData.stock}\n`);
      } else {
        const error = await response.text();
        console.log(`❌ 创建商品失败: ${productData.name}`);
        console.log(`   错误: ${error}\n`);
      }
    } catch (error: any) {
      console.log(`❌ 创建商品失败: ${productData.name}`);
      console.log(`   错误: ${error.message}\n`);
    }
  }

  console.log('✅ 所有商品创建完成！');
}

// 如果直接运行此脚本
if (require.main === module) {
  const token = process.env.TOKEN || process.argv[2];
  
  if (!token) {
    console.log('❌ 错误: 需要提供 JWT token');
    console.log('\n使用方法:');
    console.log('1. 通过环境变量:');
    console.log('   TOKEN=your_jwt_token npx ts-node scripts/create-test-products-api.ts');
    console.log('\n2. 通过命令行参数:');
    console.log('   npx ts-node scripts/create-test-products-api.ts your_jwt_token');
    console.log('\n3. 或者使用 curl 命令（见下方）');
    console.log('\n获取 token 的方法:');
    console.log('1. 在前端登录测试账户');
    console.log('2. 打开浏览器开发者工具 -> Application -> Local Storage');
    console.log('3. 查找 token 或 authToken');
    process.exit(1);
  }

  createProductsViaAPI(token);
}

// 导出供其他脚本使用
export { createProductsViaAPI, testProducts };

