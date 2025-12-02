/**
 * ChatGPT 集成测试脚本
 * 
 * 模拟 ChatGPT 调用 PayMind Function 的完整流程
 */

import * as dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

/**
 * 模拟 ChatGPT Function Calling
 */
async function simulateChatGPTConversation() {
  console.log('🤖 模拟 ChatGPT 对话测试\n');
  console.log('='.repeat(60));

  // 场景1：用户搜索商品
  console.log('\n📝 场景1：用户搜索商品');
  console.log('用户: "我要买 iPhone 15"');
  console.log('\nChatGPT 调用 Function: search_paymind_products');
  
  const searchResult = await callFunction('search_paymind_products', {
    query: 'iPhone 15',
    inStock: true,
  });

  if (searchResult.success && searchResult.products && searchResult.products.length > 0) {
    const product = searchResult.products[0];
    console.log(`\n✅ 找到商品: ${product.name}`);
    console.log(`   价格: ${product.price} ${product.currency}`);
    console.log(`   库存: ${product.stock}`);
    console.log(`   相关性: ${(product.relevanceScore * 100).toFixed(1)}%`);

    // 场景2：用户购买商品
    console.log('\n📝 场景2：用户购买商品');
    console.log('用户: "我要买第一个"');
    console.log('\nChatGPT 调用 Function: buy_paymind_product');

    const buyResult = await callFunction(
      'buy_paymind_product',
      {
        product_id: product.id,
        quantity: 1,
        shipping_address: '张三,北京市朝阳区xxx街道xxx号,北京,中国,100000',
      },
      {
        userId: 'test-user-123', // 测试用户ID
      },
    );

    if (buyResult.success) {
      console.log(`\n✅ 订单创建成功！`);
      console.log(`   订单号: ${buyResult.orderId}`);
      console.log(`   商品: ${product.name}`);
      console.log(`   总金额: ${buyResult.data?.totalAmount} ${buyResult.data?.currency}`);
      console.log(`   状态: ${buyResult.data?.status}`);
    } else {
      console.log(`\n❌ 购买失败: ${buyResult.message || buyResult.error}`);
    }
  } else {
    console.log('\n❌ 未找到商品');
  }

  // 场景3：搜索服务类商品
  console.log('\n\n📝 场景3：搜索服务类商品');
  console.log('用户: "我想学英语"');
  console.log('\nChatGPT 调用 Function: search_paymind_products');

  const serviceResult = await callFunction('search_paymind_products', {
    query: '英语课程',
    category: 'service',
  });

  if (serviceResult.success && serviceResult.products && serviceResult.products.length > 0) {
    const service = serviceResult.products[0];
    console.log(`\n✅ 找到服务: ${service.name}`);
    console.log(`   价格: ${service.price} ${service.currency}`);
    console.log(`   类型: ${service.productType}`);

    // 场景4：预约服务
    console.log('\n📝 场景4：预约服务');
    console.log('用户: "我想预约明天的课程"');
    console.log('\nChatGPT 调用 Function: buy_paymind_product');

    const bookResult = await callFunction(
      'buy_paymind_product',
      {
        product_id: service.id,
        quantity: 1,
        appointment_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        contact_info: '13800138000',
      },
      {
        userId: 'test-user-123',
      },
    );

    if (bookResult.success) {
      console.log(`\n✅ 服务预约成功！`);
      console.log(`   订单号: ${bookResult.orderId}`);
      console.log(`   服务: ${service.name}`);
    } else {
      console.log(`\n❌ 预约失败: ${bookResult.message || bookResult.error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n🎉 ChatGPT 集成测试完成！');
}

/**
 * 调用 Function
 */
async function callFunction(
  functionName: string,
  parameters: Record<string, any>,
  context?: { userId?: string; sessionId?: string },
): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/openai/function-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        function: {
          name: functionName,
          arguments: JSON.stringify(parameters),
        },
        context: context || {},
      }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const error = await response.text();
      return {
        success: false,
        error: error,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 获取 Function Schemas（模拟 ChatGPT 获取）
 */
async function getFunctionSchemas() {
  console.log('📋 获取 OpenAI Function Schemas...\n');

  try {
    const response = await fetch(`${API_BASE_URL}/openai/functions`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ 获取到 ${data.count} 个 Function:\n`);
      data.functions.forEach((func: any, index: number) => {
        console.log(`${index + 1}. ${func.function.name}`);
        console.log(`   描述: ${func.function.description}`);
        console.log(`   参数: ${Object.keys(func.function.parameters.properties || {}).join(', ')}\n`);
      });
      return data.functions;
    } else {
      console.log('❌ 无法获取 Function Schemas');
      return [];
    }
  } catch (error: any) {
    console.log(`❌ 获取失败: ${error.message}`);
    return [];
  }
}

// 主函数
async function main() {
  // 1. 获取 Function Schemas
  await getFunctionSchemas();

  // 2. 模拟对话
  await simulateChatGPTConversation();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

export { simulateChatGPTConversation, callFunction, getFunctionSchemas };

