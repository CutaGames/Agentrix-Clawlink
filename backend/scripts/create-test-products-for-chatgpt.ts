/**
 * 创建测试商品用于 ChatGPT 测试
 * 
 * 此脚本会：
 * 1. 创建多个测试商品（实物、服务、NFT等）
 * 2. 自动注册 AI 能力
 * 3. 确保商品可以被 ChatGPT 搜索和购买
 */

import * as dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

// 测试商品数据（多样化场景）
const testProducts = [
  // 实物商品
  {
    name: 'iPhone 15 Pro Max',
    description: '苹果最新款旗舰手机，配备 A17 Pro 芯片，6.7 英寸 Super Retina XDR 显示屏，支持 5G 网络。',
    price: 9999,
    stock: 50,
    category: '电子产品',
    commissionRate: 5,
    productType: 'physical',
    metadata: {
      currency: 'CNY',
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
      brand: 'Apple',
      model: 'iPhone 15 Pro Max',
      color: ['深空黑色', '白色', '原色钛金属'],
      storage: ['256GB', '512GB', '1TB'],
    },
  },
  {
    name: 'Nike Air Max 2024 跑步鞋',
    description: '专业跑步鞋，采用 Air Max 气垫技术，提供卓越的缓震和支撑，适合长距离跑步。',
    price: 899,
    stock: 100,
    category: '运动鞋',
    commissionRate: 8,
    productType: 'physical',
    metadata: {
      currency: 'CNY',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
      brand: 'Nike',
      size: ['40', '41', '42', '43', '44', '45'],
      color: ['黑色', '白色', '红色'],
    },
  },
  {
    name: '无线蓝牙耳机',
    description: '高品质无线蓝牙耳机，支持主动降噪，续航 30 小时，适合日常通勤和运动。',
    price: 299,
    stock: 200,
    category: '音频设备',
    commissionRate: 7,
    productType: 'physical',
    metadata: {
      currency: 'CNY',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      brand: 'Sony',
      features: ['主动降噪', '30小时续航', '快速充电'],
    },
  },
  // 服务类商品
  {
    name: '在线英语一对一课程',
    description: '专业外教一对一英语课程，个性化教学方案，适合各个年龄段，支持灵活预约时间。',
    price: 199,
    stock: 9999,
    category: '教育服务',
    commissionRate: 10,
    productType: 'service',
    metadata: {
      currency: 'CNY',
      image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400',
      duration: '60分钟/节',
      language: '英语',
      level: ['初级', '中级', '高级'],
    },
  },
  {
    name: '专业网站设计服务',
    description: '为企业提供专业的网站设计和开发服务，包括响应式设计、SEO优化、后台管理系统。',
    price: 5000,
    stock: 9999,
    category: '设计服务',
    commissionRate: 12,
    productType: 'service',
    metadata: {
      currency: 'CNY',
      image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400',
      delivery: '14-21个工作日',
      includes: ['设计', '开发', '部署', '维护'],
    },
  },
  // NFT 类商品
  {
    name: '数字艺术 NFT - 未来城市',
    description: '限量版数字艺术 NFT，由知名数字艺术家创作，展现未来城市的科幻场景。',
    price: 0.5,
    stock: 100,
    category: '数字艺术',
    commissionRate: 15,
    productType: 'nft',
    metadata: {
      currency: 'ETH',
      image: 'https://images.unsplash.com/photo-1639322537504-6427a16b0a38?w=400',
      chain: 'ethereum',
      contractAddress: '0x0000000000000000000000000000000000000000',
      rarity: 'rare',
      artist: 'Digital Artist',
    },
  },
];

/**
 * 创建测试商品
 */
async function createTestProducts(token: string) {
  console.log('🚀 开始创建测试商品用于 ChatGPT 测试...\n');

  const createdProducts = [];

  for (const productData of testProducts) {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        const product = await response.json();
        console.log(`✅ 已创建商品: ${product.name}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   价格: ${productData.price} ${productData.metadata.currency}`);
        console.log(`   库存: ${productData.stock}`);
        console.log(`   类型: ${productData.productType}\n`);

        createdProducts.push(product);

        // 等待一下，确保能力注册完成
        await new Promise((resolve) => setTimeout(resolve, 500));
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

  console.log(`\n✅ 共创建 ${createdProducts.length} 个测试商品`);
  console.log('\n📋 商品列表：');
  createdProducts.forEach((product, index) => {
    console.log(`${index + 1}. ${product.name} (${product.id})`);
  });

  return createdProducts;
}

/**
 * 验证 OpenAI Function Schemas
 */
async function verifyOpenAIFunctions() {
  console.log('\n🔍 验证 OpenAI Function Schemas...\n');

  try {
    const response = await fetch(`${API_BASE_URL}/openai/functions`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ OpenAI Functions 可用`);
      console.log(`   共有 ${data.count} 个 Function:`);
      data.functions.forEach((func: any) => {
        console.log(`   - ${func.function.name}: ${func.function.description.substring(0, 50)}...`);
      });
      return true;
    } else {
      console.log(`❌ 无法获取 OpenAI Functions`);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ 验证失败: ${error.message}`);
    return false;
  }
}

/**
 * 测试搜索功能
 */
async function testSearch(query: string) {
  console.log(`\n🔍 测试搜索功能: "${query}"\n`);

  try {
    const response = await fetch(`${API_BASE_URL}/openai/test?query=${encodeURIComponent(query)}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ 搜索成功`);
      console.log(`   找到 ${data.total} 件商品`);
      if (data.products && data.products.length > 0) {
        console.log(`\n   前 3 个结果：`);
        data.products.slice(0, 3).forEach((product: any, index: number) => {
          console.log(`   ${index + 1}. ${product.name} - ${product.price} ${product.currency}`);
        });
      }
      return true;
    } else {
      const error = await response.text();
      console.log(`❌ 搜索失败: ${error}`);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ 搜索失败: ${error.message}`);
    return false;
  }
}

/**
 * 自动登录获取 token
 */
async function loginAndGetToken(): Promise<string> {
  const email = process.env.TEST_EMAIL || 'merchant@paymind.test';
  const password = process.env.TEST_PASSWORD || 'Test@123';

  try {
    console.log(`\n🔐 正在登录: ${email}...`);
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ 登录成功！');
      return data.access_token;
    } else {
      const error = await response.text();
      console.log(`❌ 登录失败: ${error}`);
      throw new Error(`登录失败: ${error}`);
    }
  } catch (error: any) {
    console.log(`❌ 登录过程出错: ${error.message}`);
    throw error;
  }
}

// 主函数
async function main() {
  // 获取 token（优先使用环境变量，否则自动登录）
  let token = process.env.TEST_TOKEN || '';

  if (!token) {
    console.log('⚠️  未设置 TEST_TOKEN，尝试自动登录...');
    try {
      token = await loginAndGetToken();
    } catch (error) {
      console.log('\n❌ 自动登录失败');
      console.log('\n💡 解决方案：');
      console.log('1. 设置环境变量 TEST_TOKEN');
      console.log('2. 或者设置 TEST_EMAIL 和 TEST_PASSWORD 用于自动登录');
      console.log('3. 或者先在前端登录，从浏览器开发者工具获取 token');
      process.exit(1);
    }
  }

  // 1. 创建测试商品
  const products = await createTestProducts(token);

  // 2. 验证 OpenAI Functions
  await verifyOpenAIFunctions();

  // 3. 测试搜索
  await testSearch('iPhone');
  await testSearch('跑步鞋');
  await testSearch('英语课程');

  console.log('\n🎉 测试商品创建完成！');
  console.log('\n📝 下一步：');
  console.log('1. 在 ChatGPT 中配置 Function Calling');
  console.log('2. 添加 Function: GET /api/openai/functions');
  console.log('3. 设置 Function Call URL: POST /api/openai/function-call');
  console.log('4. 开始对话测试！');
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

export { createTestProducts, verifyOpenAIFunctions, testSearch };

