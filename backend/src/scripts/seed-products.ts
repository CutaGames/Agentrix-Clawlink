import { AppDataSource } from '../config/data-source';
import { Product, ProductStatus } from '../entities/product.entity';
import { User, UserRole } from '../entities/user.entity';
import { Repository } from 'typeorm';

/**
 * 商品数据种子脚本
 * 为Agentrix Agent V3.0添加模拟商品数据，覆盖不同场景和品类
 */

const products = [
  // ========== 游戏装备类 ==========
  {
    name: '传奇游戏剑 - 火焰之刃',
    description: '一把传说中的游戏武器，拥有强大的火焰属性，适合近战职业使用。稀有度：史诗级',
    price: 19.99,
    currency: 'USD',
    category: '游戏装备',
    stock: 15,
    commissionRate: 0.15,
    metadata: {
      currency: 'USD',
      game: '传奇世界',
      type: 'weapon',
      rarity: 'epic',
      attributes: { attack: 120, fireDamage: 30 },
      image: 'https://via.placeholder.com/300x300?text=游戏剑',
    },
  },
  {
    name: '强化石 - 力量增强',
    description: '用于强化装备的珍贵道具，可以提升装备的基础属性。',
    price: 4.99,
    currency: 'USD',
    category: '游戏道具',
    stock: 100,
    commissionRate: 0.10,
    metadata: {
      currency: 'USD',
      game: '传奇世界',
      type: 'enhancement',
      rarity: 'common',
      image: 'https://via.placeholder.com/300x300?text=强化石',
    },
  },
  {
    name: '魔法法杖 - 冰霜之触',
    description: '法师专用武器，拥有强大的冰霜魔法加成，适合远程输出。',
    price: 24.99,
    currency: 'USD',
    category: '游戏装备',
    stock: 8,
    commissionRate: 0.15,
    metadata: {
      currency: 'USD',
      game: '传奇世界',
      type: 'weapon',
      rarity: 'rare',
      attributes: { magic: 150, iceDamage: 40 },
      image: 'https://via.placeholder.com/300x300?text=魔法法杖',
    },
  },
  {
    name: '防御盾牌 - 守护者',
    description: '高防御力的盾牌，适合坦克职业，提供强大的防护能力。',
    price: 15.99,
    currency: 'USD',
    category: '游戏装备',
    stock: 20,
    commissionRate: 0.12,
    metadata: {
      currency: 'USD',
      game: '传奇世界',
      type: 'armor',
      rarity: 'uncommon',
      attributes: { defense: 200, block: 15 },
      image: 'https://via.placeholder.com/300x300?text=防御盾牌',
    },
  },
  {
    name: '游戏金币包 - 1000金币',
    description: '游戏内货币包，可用于购买游戏内物品和服务。',
    price: 9.99,
    currency: 'USD',
    category: '游戏货币',
    stock: 999,
    commissionRate: 0.08,
    metadata: {
      currency: 'USD',
      game: '传奇世界',
      type: 'currency',
      amount: 1000,
      image: 'https://via.placeholder.com/300x300?text=金币包',
    },
  },

  // ========== 电子产品类 ==========
  {
    name: '联想 Yoga 笔记本电脑',
    description: '14英寸轻薄本，Intel i7处理器，16GB内存，512GB SSD，适合办公和创作。',
    price: 899.99,
    currency: 'CNY',
    category: '电子产品',
    stock: 25,
    commissionRate: 0.05,
    metadata: {
      currency: 'CNY',
      brand: '联想',
      model: 'Yoga 14',
      specs: { cpu: 'Intel i7', ram: '16GB', storage: '512GB SSD' },
      image: 'https://via.placeholder.com/300x300?text=笔记本电脑',
    },
  },
  {
    name: '无线蓝牙耳机 - 降噪版',
    description: '主动降噪技术，30小时续航，支持快速充电，音质清晰。',
    price: 299.99,
    currency: 'CNY',
    category: '电子产品',
    stock: 50,
    commissionRate: 0.08,
    metadata: {
      currency: 'CNY',
      brand: 'AudioTech',
      features: ['降噪', '长续航', '快充'],
      image: 'https://via.placeholder.com/300x300?text=蓝牙耳机',
    },
  },
  {
    name: '智能手表 - 运动版',
    description: '健康监测，运动追踪，GPS定位，7天续航，防水设计。',
    price: 599.99,
    currency: 'CNY',
    category: '电子产品',
    stock: 30,
    commissionRate: 0.06,
    metadata: {
      currency: 'CNY',
      brand: 'SmartWatch',
      features: ['健康监测', 'GPS', '防水'],
      image: 'https://via.placeholder.com/300x300?text=智能手表',
    },
  },
  {
    name: '机械键盘 - 87键',
    description: '青轴机械键盘，RGB背光，适合游戏和打字，响应速度快。',
    price: 199.99,
    currency: 'CNY',
    category: '电子产品',
    stock: 40,
    commissionRate: 0.07,
    metadata: {
      currency: 'CNY',
      brand: 'KeyBoard Pro',
      switch: '青轴',
      features: ['RGB背光', '87键'],
      image: 'https://via.placeholder.com/300x300?text=机械键盘',
    },
  },

  // ========== 服务类商品 ==========
  {
    name: '网站设计服务',
    description: '专业的网站设计和开发服务，包括UI/UX设计、前端开发、响应式布局。交付周期：7-14天',
    price: 5000.00,
    currency: 'CNY',
    category: '设计服务',
    stock: 999, // 服务类商品库存设为999
    commissionRate: 0.20,
    metadata: {
      currency: 'CNY',
      type: 'virtual_service',
      deliveryDays: 14,
      serviceType: 'web_design',
      image: 'https://via.placeholder.com/300x300?text=设计服务',
    },
  },
  {
    name: '品牌Logo设计',
    description: '专业品牌Logo设计，包含3个设计方案，源文件交付。交付周期：3-5天',
    price: 800.00,
    currency: 'CNY',
    category: '设计服务',
    stock: 999,
    commissionRate: 0.15,
    metadata: {
      currency: 'CNY',
      type: 'virtual_service',
      deliveryDays: 5,
      serviceType: 'logo_design',
      image: 'https://via.placeholder.com/300x300?text=Logo设计',
    },
  },
  {
    name: '技术咨询服务',
    description: '资深技术专家一对一咨询服务，涵盖架构设计、技术选型、问题诊断。时长：2小时',
    price: 1200.00,
    currency: 'CNY',
    category: '咨询服务',
    stock: 999,
    commissionRate: 0.18,
    metadata: {
      currency: 'CNY',
      type: 'consultation',
      duration: '2小时',
      serviceType: 'tech_consulting',
      image: 'https://via.placeholder.com/300x300?text=咨询服务',
    },
  },
  {
    name: 'AI模型训练服务',
    description: '专业的AI模型训练和优化服务，包括数据预处理、模型训练、性能优化。交付周期：10-20天',
    price: 15000.00,
    currency: 'CNY',
    category: '技术服务',
    stock: 999,
    commissionRate: 0.25,
    metadata: {
      currency: 'CNY',
      type: 'technical_service',
      deliveryDays: 20,
      serviceType: 'ai_training',
      image: 'https://via.placeholder.com/300x300?text=AI服务',
    },
  },

  // ========== 链上资产相关 ==========
  {
    name: 'NFT收藏品 - 数字艺术品',
    description: '限量版数字艺术品NFT，基于以太坊链，拥有唯一tokenId和元数据。',
    price: 0.5,
    currency: 'ETH',
    category: '链上资产',
    stock: 1,
    commissionRate: 0.10,
    metadata: {
      currency: 'ETH',
      type: 'nft',
      chain: 'ethereum',
      contract: '0x1234567890abcdef',
      tokenId: '1',
      rarity: 'legendary',
      image: 'https://via.placeholder.com/300x300?text=NFT艺术品',
    },
  },
  {
    name: '游戏道具NFT - 稀有装备',
    description: '链游中的稀有装备NFT，可在游戏中使用，支持跨游戏交易。',
    price: 0.3,
    currency: 'ETH',
    category: '链上资产',
    stock: 5,
    commissionRate: 0.12,
    metadata: {
      currency: 'ETH',
      type: 'game_item',
      chain: 'polygon',
      contract: '0xabcdef1234567890',
      game: '链游世界',
      rarity: 'epic',
      image: 'https://via.placeholder.com/300x300?text=游戏NFT',
    },
  },
  {
    name: '代币包 - 1000 USDT',
    description: '稳定币USDT，可用于交易和支付，基于ERC-20标准。',
    price: 1000.00,
    currency: 'USDT',
    category: '链上资产',
    stock: 100,
    commissionRate: 0.05,
    metadata: {
      currency: 'USDT',
      type: 'token',
      chain: 'ethereum',
      amount: 1000,
      standard: 'ERC-20',
      image: 'https://via.placeholder.com/300x300?text=USDT',
    },
  },

  // ========== 其他品类 ==========
  {
    name: '在线课程 - 前端开发',
    description: '完整的前端开发课程，包含HTML、CSS、JavaScript、React等，视频+实战项目。',
    price: 299.00,
    currency: 'CNY',
    category: '在线教育',
    stock: 999,
    commissionRate: 0.15,
    metadata: {
      currency: 'CNY',
      type: 'subscription',
      duration: '3个月',
      courseType: 'frontend',
      image: 'https://via.placeholder.com/300x300?text=在线课程',
    },
  },
  {
    name: '会员订阅 - 高级版',
    description: '平台高级会员，享受专属功能、优先客服、无限制使用。订阅周期：1年',
    price: 199.00,
    currency: 'CNY',
    category: '订阅服务',
    stock: 999,
    commissionRate: 0.10,
    metadata: {
      currency: 'CNY',
      type: 'subscription',
      duration: '1年',
      features: ['专属功能', '优先客服', '无限制'],
      image: 'https://via.placeholder.com/300x300?text=会员订阅',
    },
  },
  {
    name: '定制T恤 - 个性化设计',
    description: '支持自定义图案和文字的T恤，多种颜色可选，7-10天发货。',
    price: 89.00,
    currency: 'CNY',
    category: '定制商品',
    stock: 200,
    commissionRate: 0.12,
    metadata: {
      currency: 'CNY',
      type: 'custom',
      deliveryDays: 10,
      customizable: true,
      image: 'https://via.placeholder.com/300x300?text=定制T恤',
    },
  },
];

async function seedProducts() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');

    const productRepository = AppDataSource.getRepository(Product);
    const userRepository = AppDataSource.getRepository(User);

    // 查找或创建测试商户
    let merchant = await userRepository.findOne({
      where: { email: 'merchant@agentrix.test' },
    });

    if (!merchant) {
      console.log('📝 创建测试商户...');
      merchant = userRepository.create({
        agentrixId: `AX-merchant-${Date.now()}`,
        email: 'merchant@agentrix.test',
        roles: [UserRole.MERCHANT],
      });
      merchant = await userRepository.save(merchant);
      console.log(`✅ 商户已创建: ${merchant.id}`);
    } else {
      console.log(`✅ 使用现有商户: ${merchant.id}`);
    }

    // 检查是否已有商品
    const existingCount = await productRepository.count({
      where: { merchantId: merchant.id },
    });

    if (existingCount > 0) {
      console.log(`⚠️  已存在 ${existingCount} 个商品`);
      console.log('   是否清空现有商品并重新导入? (y/n)');
      // 在脚本中，我们直接继续添加
    }

    // 导入商品
    console.log(`\n📦 开始导入 ${products.length} 个商品...`);
    let successCount = 0;
    let failCount = 0;

    for (const productData of products) {
      try {
        // 检查商品是否已存在
        const existing = await productRepository.findOne({
          where: {
            merchantId: merchant.id,
            name: productData.name,
          },
        });

        if (existing) {
          console.log(`⏭️  跳过已存在商品: ${productData.name}`);
          continue;
        }

        const product = productRepository.create({
          merchantId: merchant.id,
          name: productData.name,
          description: productData.description,
          price: productData.price,
          category: productData.category,
          stock: productData.stock,
          commissionRate: productData.commissionRate,
          status: ProductStatus.ACTIVE,
          metadata: {
            ...productData.metadata,
            currency: productData.currency,
          },
        });

        await productRepository.save(product);
        successCount++;
        console.log(`✅ 已导入: ${productData.name} (${productData.price} ${productData.currency})`);
      } catch (error) {
        failCount++;
        console.error(`❌ 导入失败: ${productData.name}`, error);
      }
    }

    console.log(`\n📊 导入完成:`);
    console.log(`   ✅ 成功: ${successCount}`);
    console.log(`   ❌ 失败: ${failCount}`);
    console.log(`   📦 总计: ${products.length}`);

    // 统计各品类商品数量
    const categoryStats = await productRepository
      .createQueryBuilder('product')
      .select('product.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('product.merchantId = :merchantId', { merchantId: merchant.id })
      .groupBy('product.category')
      .getRawMany();

    console.log(`\n📈 品类统计:`);
    categoryStats.forEach((stat: any) => {
      console.log(`   ${stat.category}: ${stat.count} 个`);
    });

    await AppDataSource.destroy();
    console.log('\n✅ 种子数据导入完成！');
  } catch (error) {
    console.error('❌ 导入失败:', error);
    process.exit(1);
  }
}

seedProducts();

