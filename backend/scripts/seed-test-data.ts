import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, KYCLevel } from '../src/entities/user.entity';
import { ProductService } from '../src/modules/product/product.service';
import { ProductType } from '../src/entities/product.entity';
import { OrderService } from '../src/modules/order/order.service';
import {
  AgentTemplate,
  AgentTemplateVisibility,
} from '../src/entities/agent-template.entity';

interface SeedUserConfig {
  key: 'personal' | 'merchant' | 'developer';
  email: string;
  agentrixId: string;
  password: string;
  roles: UserRole[];
  nickname: string;
  bio?: string;
}

interface SeedProductConfig {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  commissionRate: number;
  productType: ProductType;
  currency: string;
  metadata?: Record<string, any>;
}

interface SeedTemplateConfig {
  name: string;
  description: string;
  category: string;
  persona: string;
  tags: string[];
  visibility: AgentTemplateVisibility;
  isFeatured: boolean;
  usageCount: number;
  config: Record<string, any>;
  prompts?: Record<string, any>;
  ownerKey?: SeedUserConfig['key'];
}

const seedUsers: SeedUserConfig[] = [
  {
    key: 'personal',
    email: 'personal.tester@agentrix.com',
    agentrixId: 'pm-user-tester',
    password: 'Test@123',
    roles: [UserRole.USER],
    nickname: '个人Agent体验官',
    bio: '主要用于测试个人Agent全流程：语义搜索、购物车、订单、支付、物流等。',
  },
  {
    key: 'merchant',
    email: 'merchant.tester@agentrix.com',
    agentrixId: 'pm-merchant-tester',
    password: 'Test@123',
    roles: [UserRole.USER, UserRole.MERCHANT],
    nickname: '商家Agent体验官',
    bio: '演示商家端功能：商品管理、订单分析、收款、营销、清结算等。',
  },
  {
    key: 'developer',
    email: 'developer.tester@agentrix.com',
    agentrixId: 'pm-developer-tester',
    password: 'Test@123',
    roles: [UserRole.USER, UserRole.AGENT],
    nickname: '开发者Agent体验官',
    bio: '用于SDK生成、API助手、沙盒调试、DevOps自动化等开发者场景。',
  },
];

const productDefinitions: SeedProductConfig[] = [
  {
    name: '跨境智能POS套件',
    description: '包含云端收款、风控、清结算的全链路POS解决方案，支持40+国家货币。',
    price: 12999,
    stock: 25,
    category: '支付硬件',
    commissionRate: 10,
    productType: ProductType.PHYSICAL,
    currency: 'CNY',
    metadata: {
      delivery: '全球7日达',
      warranty: '24个月',
    },
  },
  {
    name: 'Web3 结算智能合约顾问',
    description: '面向品牌/商家的链上结算设计服务，含审计、部署、监控，适用于NFT/订阅类业务。',
    price: 3200,
    stock: 9999,
    category: '专业服务',
    commissionRate: 12,
    productType: ProductType.SERVICE,
    currency: 'USD',
    metadata: {
      serviceSLA: '按项目交付',
      delivery: '线上交付',
    },
  },
  {
    name: 'Metaverse 店面访问NFT',
    description: '限量100枚的虚拟店面访问凭证，可解锁沉浸式购物体验与专属空投。',
    price: 0.88,
    stock: 100,
    category: 'Web3资产',
    commissionRate: 15,
    productType: ProductType.NFT,
    currency: 'ETH',
    metadata: {
      chain: 'Ethereum',
      contractAddress: '0x0000000000000000000000000000000000000000',
    },
  },
];

const templateDefinitions: SeedTemplateConfig[] = [
  {
    name: '购物+比价个人助手',
    description: '聚合商品搜索、自动比价、QuickPay 支付、订单跟踪的一站式个人Agent。',
    category: 'shopping',
    persona: '善于比价的消费达人',
    tags: ['shopping', 'comparison', 'quickpay'],
    visibility: AgentTemplateVisibility.PUBLIC,
    isFeatured: true,
    usageCount: 1280,
    ownerKey: 'personal',
    config: {
      capabilities: ['search', 'auto_pay', 'cart', 'order_tracking'],
      workflow: {
        nodes: [
          { id: 'intent-search', type: 'intent', label: '识别购物意图' },
          { id: 'action-semantic-search', type: 'action', label: '语义检索商品' },
          { id: 'action-price-compare', type: 'action', label: '自动比价' },
          { id: 'decision-checkout', type: 'decision', label: '是否下单？' },
        ],
        edges: [
          { from: 'intent-search', to: 'action-semantic-search' },
          { from: 'action-semantic-search', to: 'action-price-compare' },
          { from: 'action-price-compare', to: 'decision-checkout' },
        ],
      },
    },
  },
  {
    name: '商家收款&营销助手',
    description: '面向中小商家的多渠道收款、订单分析、自动营销、清结算Agent。',
    category: 'merchant',
    persona: '跨境电商运营',
    tags: ['merchant', 'marketing', 'analytics'],
    visibility: AgentTemplateVisibility.PUBLIC,
    isFeatured: true,
    usageCount: 960,
    ownerKey: 'merchant',
    config: {
      capabilities: [
        'payment_collection',
        'order_analysis',
        'risk_center',
        'marketing_assistant',
        'settlement',
      ],
      limits: {
        quickPay: {
          single: 5000,
          daily: 20000,
        },
      },
      workflow: {
        nodes: [
          { id: 'intent-payment', type: 'intent', label: '生成支付链接' },
          { id: 'action-create-link', type: 'action', label: '创建支付链接/二维码' },
          { id: 'intent-marketing', type: 'intent', label: '营销自动化' },
          { id: 'action-marketing', type: 'action', label: '执行营销剧本' },
        ],
        edges: [
          { from: 'intent-payment', to: 'action-create-link' },
          { from: 'intent-marketing', to: 'action-marketing' },
        ],
      },
    },
  },
  {
    name: '开发者SDK/沙盒助手',
    description: '自动生成SDK、API调用代码、接入沙盒调试与DevOps自动化的开发者Agent。',
    category: 'developer',
    persona: '独立开发者',
    tags: ['developer', 'sdk', 'sandbox'],
    visibility: AgentTemplateVisibility.PUBLIC,
    isFeatured: true,
    usageCount: 640,
    ownerKey: 'developer',
    config: {
      capabilities: ['sdk_generator', 'api_assistant', 'sandbox', 'devops', 'code_gen'],
      workflow: {
        nodes: [
          { id: 'intent-code', type: 'intent', label: '生成SDK代码' },
          { id: 'action-code', type: 'action', label: '调用代码生成API' },
          { id: 'intent-sandbox', type: 'intent', label: '沙盒测试' },
          { id: 'action-sandbox', type: 'action', label: '执行沙盒调试' },
        ],
        edges: [
          { from: 'intent-code', to: 'action-code' },
          { from: 'intent-sandbox', to: 'action-sandbox' },
        ],
      },
    },
  },
];

async function upsertUser(
  userRepo: Repository<User>,
  config: SeedUserConfig,
): Promise<User> {
  const existing = await userRepo.findOne({ where: { email: config.email } });
  const passwordHash = await bcrypt.hash(config.password, 10);

  if (existing) {
    const mergedRoles = Array.from(new Set([...(existing.roles || []), ...config.roles]));
    existing.roles = mergedRoles as UserRole[];
    existing.passwordHash = passwordHash;
    existing.agentrixId = existing.agentrixId || config.agentrixId;
    existing.nickname = config.nickname;
    existing.bio = config.bio;
    existing.kycLevel = KYCLevel.VERIFIED;
    existing.kycStatus = 'approved';
    return userRepo.save(existing);
  }

  const user = userRepo.create({
    email: config.email,
    agentrixId: config.agentrixId,
    passwordHash,
    roles: config.roles,
    nickname: config.nickname,
    bio: config.bio,
    kycLevel: KYCLevel.VERIFIED,
    kycStatus: 'approved',
    metadata: {
      preferences: {
        locale: 'zh-CN',
        currency: 'CNY',
      },
    },
  });

  return userRepo.save(user);
}

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    const productService = app.get(ProductService);
    const orderService = app.get(OrderService);
    const templateRepo = app.get<Repository<AgentTemplate>>(getRepositoryToken(AgentTemplate));

    const userMap = new Map<string, User>();

    for (const config of seedUsers) {
      const user = await upsertUser(userRepo, config);
      userMap.set(config.key, user);
      console.log(`✅ 用户已准备: ${config.email} (roles: ${user.roles.join(', ')})`);
    }

    // Seed Agent templates
    for (const templateCfg of templateDefinitions) {
      const existing = await templateRepo.findOne({
        where: { name: templateCfg.name },
      });

      const owner = templateCfg.ownerKey ? userMap.get(templateCfg.ownerKey) : undefined;

      const templateData = templateRepo.create({
        ...existing,
        name: templateCfg.name,
        description: templateCfg.description,
        category: templateCfg.category,
        persona: templateCfg.persona,
        tags: templateCfg.tags,
        visibility: templateCfg.visibility,
        isFeatured: templateCfg.isFeatured,
        usageCount: templateCfg.usageCount,
        config: templateCfg.config,
        prompts: templateCfg.prompts,
        createdBy: owner?.id ?? existing?.createdBy ?? null,
      });

      await templateRepo.save(templateData);
      console.log(`🧩 模板已准备: ${templateCfg.name} (${templateCfg.category})`);
    }

    const merchant = userMap.get('merchant');
    if (!merchant) {
      throw new Error('商家账户创建失败，无法继续播种商品。');
    }

    const products = [];
    for (const definition of productDefinitions) {
      const product = await productService.createProduct(merchant.id, {
        name: definition.name,
        description: definition.description,
        // 使用统一数据标准格式
        price: {
          amount: definition.price,
          currency: definition.currency || 'CNY',
        },
        inventory: {
          type: definition.productType === 'service' ? 'unlimited' : 'finite',
          quantity: definition.stock,
        },
        category: definition.category,
        commissionRate: definition.commissionRate,
        productType: definition.productType,
        metadata: {
          core: {
            media: {
              images: definition.metadata?.image ? [{
                url: definition.metadata.image,
                type: 'thumbnail' as const,
              }] : [],
            },
          },
          extensions: {
            currency: definition.currency,
            ...definition.metadata,
          },
        },
      });
      products.push(product);
      console.log(`📦 商品已准备: ${product.name} (${definition.productType})`);
    }

    const personalUser = userMap.get('personal');
    if (personalUser) {
      for (const product of products) {
        await orderService.createOrder(personalUser.id, {
          merchantId: merchant.id,
          productId: product.id,
          amount: Number(product.price),
          currency: (product.metadata as any)?.currency || 'CNY',
          metadata: {
            testFlow: 'full-stack',
            productType: product.productType,
          },
        });
        console.log(`🧾 订单已创建: 用户 ${personalUser.email} -> 商品 ${product.name}`);
      }
    }

    console.log('\n🎉 测试环境数据准备完毕：');
    console.log('- 测试用户（个人 / 商家 / 开发者）账号已就绪，统一密码: Test@123');
    console.log('- 实物 / 服务 / NFT 商品各 1 个，均已上架');
    console.log('- 个人用户已针对每个商品生成测试订单，可直接进行语义搜索、下单、物流等验收');
  } catch (error) {
    console.error('❌ 播种测试数据失败:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

seed();

