/**
 * 直接创建测试商品（不通过 API，使用数据库）
 * 用于 ChatGPT 测试，符合统一数据标准
 */

import { Product, ProductStatus, ProductType } from '../entities/product.entity';
import { User, UserRole } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { ProductService } from '../modules/product/product.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

// 测试商品数据（符合统一数据标准）
const testProducts = [
  // 实物商品
  {
    name: 'iPhone 15 Pro Max',
    description: '苹果最新款旗舰手机，配备 A17 Pro 芯片，6.7 英寸 Super Retina XDR 显示屏，支持 5G 网络。',
    price: { amount: 9999, currency: 'CNY' },
    inventory: { type: 'finite' as const, quantity: 50 },
    category: '电子产品',
    productType: ProductType.PHYSICAL,
    commissionRate: 5,
    metadata: {
      core: {
        media: {
          images: [{
            url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
            type: 'thumbnail' as const,
          }],
        },
      },
      extensions: {
        brand: 'Apple',
        model: 'iPhone 15 Pro Max',
        color: ['深空黑色', '白色', '原色钛金属'],
        storage: ['256GB', '512GB', '1TB'],
      },
    },
  },
  {
    name: 'Nike Air Max 2024 跑步鞋',
    description: '专业跑步鞋，采用 Air Max 气垫技术，提供卓越的缓震和支撑，适合长距离跑步。',
    price: { amount: 899, currency: 'CNY' },
    inventory: { type: 'finite' as const, quantity: 100 },
    category: '运动鞋',
    productType: ProductType.PHYSICAL,
    commissionRate: 8,
    metadata: {
      core: {
        media: {
          images: [{
            url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
            type: 'thumbnail' as const,
          }],
        },
      },
      extensions: {
        brand: 'Nike',
        size: ['40', '41', '42', '43', '44', '45'],
        color: ['黑色', '白色', '红色'],
      },
    },
  },
  {
    name: '无线蓝牙耳机',
    description: '高品质无线蓝牙耳机，支持主动降噪，续航 30 小时，适合日常通勤和运动。',
    price: { amount: 299, currency: 'CNY' },
    inventory: { type: 'finite' as const, quantity: 200 },
    category: '音频设备',
    productType: ProductType.PHYSICAL,
    commissionRate: 7,
    metadata: {
      core: {
        media: {
          images: [{
            url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
            type: 'thumbnail' as const,
          }],
        },
      },
      extensions: {
        brand: 'Sony',
        features: ['主动降噪', '30小时续航', '快速充电'],
      },
    },
  },
  // 服务类商品
  {
    name: '在线英语一对一课程',
    description: '专业外教一对一英语课程，个性化教学方案，适合各个年龄段，支持灵活预约时间。',
    price: { amount: 199, currency: 'CNY' },
    inventory: { type: 'unlimited' as const },
    category: '教育服务',
    productType: ProductType.SERVICE,
    commissionRate: 10,
    metadata: {
      core: {
        media: {
          images: [{
            url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400',
            type: 'thumbnail' as const,
          }],
        },
      },
      extensions: {
        duration: '60分钟/节',
        language: '英语',
        level: ['初级', '中级', '高级'],
      },
    },
  },
  {
    name: '专业网站设计服务',
    description: '为企业提供专业的网站设计和开发服务，包括响应式设计、SEO优化、后台管理系统。',
    price: { amount: 5000, currency: 'CNY' },
    inventory: { type: 'unlimited' as const },
    category: '设计服务',
    productType: ProductType.SERVICE,
    commissionRate: 12,
    metadata: {
      core: {
        media: {
          images: [{
            url: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400',
            type: 'thumbnail' as const,
          }],
        },
      },
      extensions: {
        delivery: '14-21个工作日',
        includes: ['设计', '开发', '部署', '维护'],
      },
    },
  },
  // NFT 类商品
  {
    name: '数字艺术 NFT - 未来城市',
    description: '限量版数字艺术 NFT，由知名数字艺术家创作，展现未来城市的科幻场景。',
    price: { amount: 0.5, currency: 'ETH' },
    inventory: { type: 'digital' as const, quantity: 100 },
    category: '数字艺术',
    productType: ProductType.NFT,
    commissionRate: 15,
    metadata: {
      core: {
        media: {
          images: [{
            url: 'https://images.unsplash.com/photo-1639322537504-6427a16b0a38?w=400',
            type: 'thumbnail' as const,
          }],
        },
      },
      extensions: {
        chain: 'ethereum',
        contractAddress: '0x0000000000000000000000000000000000000000',
        rarity: 'rare',
        artist: 'Digital Artist',
      },
    },
  },
];

async function createTestProductsDirect() {
  try {
    // 初始化 NestJS 应用上下文
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });

    const productService = app.get(ProductService);
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));

    // 查找或创建测试商户
    let merchant = await userRepository.findOne({
      where: { email: 'merchant@agentrix.test' },
    });

    if (!merchant) {
      console.log('📝 创建测试商户...');
      merchant = userRepository.create({
        agentrixId: `AX-merchant-${Date.now()}`,
        email: 'merchant@agentrix.test',
        passwordHash: await bcrypt.hash('Test@123', 10),
        roles: [UserRole.MERCHANT],
        nickname: '测试商户',
      });
      merchant = await userRepository.save(merchant);
      console.log(`✅ 商户已创建: ${merchant.id}`);
    } else {
      console.log(`✅ 使用现有商户: ${merchant.id}`);
    }

    console.log('\n📦 开始创建测试商品（符合统一数据标准）...\n');

    const createdProducts = [];

    for (const productData of testProducts) {
      try {
        const product = await productService.createProduct(merchant.id, {
          name: productData.name,
          description: productData.description,
          price: productData.price,
          inventory: productData.inventory,
          category: productData.category,
          productType: productData.productType,
          commissionRate: productData.commissionRate,
          metadata: productData.metadata,
        });

        console.log(`✅ 已创建商品: ${product.name}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   价格: ${productData.price.amount} ${productData.price.currency}`);
        console.log(`   库存: ${productData.inventory.type === 'finite' ? productData.inventory.quantity : '无限'}`);
        console.log(`   类型: ${productData.productType}\n`);

        createdProducts.push(product);

        // 等待一下，确保能力注册完成
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error: any) {
        console.log(`❌ 创建商品失败: ${productData.name}`);
        console.log(`   错误: ${error.message}\n`);
      }
    }

    console.log(`\n✅ 共创建 ${createdProducts.length} 个测试商品`);
    console.log('\n📋 商品列表：');
    createdProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (${product.id})`);
    });

    // 验证 OpenAI Functions
    console.log('\n🔍 验证 OpenAI Function Schemas...\n');
    try {
      const response = await fetch('http://localhost:3001/api/openai/functions');
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ OpenAI Functions 可用`);
        console.log(`   共有 ${data.count} 个 Function:`);
        if (data.functions && data.functions.length > 0) {
          data.functions.slice(0, 5).forEach((func: any) => {
            console.log(`   - ${func.function.name}: ${func.function.description.substring(0, 50)}...`);
          });
        }
      } else {
        console.log(`⚠️  无法获取 OpenAI Functions（后端服务可能未运行）`);
      }
    } catch (error: any) {
      console.log(`⚠️  验证失败: ${error.message}`);
      console.log(`   （这可能是正常的，如果后端服务未运行）`);
    }

    await app.close();

    console.log('\n🎉 测试商品创建完成！');
    console.log('\n📝 下一步：');
    console.log('1. 在 ChatGPT 中配置 Function Calling');
    console.log('2. 添加 Function: GET http://localhost:3001/api/openai/functions');
    console.log('3. 设置 Function Call URL: POST http://localhost:3001/api/openai/function-call');
    console.log('4. 开始对话测试！');
  } catch (error) {
    console.error('❌ 创建测试商品失败:', error);
    process.exit(1);
  }
}

// 运行脚本
createTestProductsDirect();

