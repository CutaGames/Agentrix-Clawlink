/**
 * API Verification Script
 * 
 * This script verifies that the SDK can successfully connect to the backend API
 * and perform basic operations.
 */

import { PayMind } from '../src';

async function verifyAPI() {
  const apiKey = process.env.PAYMIND_API_KEY || 'test-api-key';
  const apiUrl = process.env.PAYMIND_API_URL || 'http://localhost:3001/api';

  console.log('🔍 PayMind SDK API 验证');
  console.log('========================');
  console.log(`API URL: ${apiUrl}`);
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  console.log('');

  const paymind = new PayMind({
    apiKey,
    baseUrl: apiUrl,
  });

  const results = {
    passed: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Test 1: Get Payment Routing
  console.log('📋 Test 1: 获取支付路由建议...');
  try {
    const routing = await paymind.payments.getRouting({
      amount: 100,
      currency: 'USD',
      userCountry: 'US',
      merchantCountry: 'CN',
    });
    console.log('✅ 成功');
    console.log(`   推荐方式: ${routing.recommendedMethod}`);
    console.log(`   原因: ${routing.reason}`);
    results.passed++;
  } catch (error: any) {
    console.log('❌ 失败');
    console.log(`   错误: ${error.message}`);
    results.failed++;
    results.errors.push(`路由测试: ${error.message}`);
  }
  console.log('');

  // Test 2: Create Payment Intent
  console.log('📋 Test 2: 创建支付意图...');
  try {
    const intent = await paymind.payments.createIntent({
      amount: 100,
      currency: 'USD',
      paymentMethod: 'stripe',
      description: 'Test payment intent',
    });
    console.log('✅ 成功');
    console.log(`   Payment Intent ID: ${intent.paymentIntentId}`);
    results.passed++;
  } catch (error: any) {
    console.log('❌ 失败');
    console.log(`   错误: ${error.message}`);
    results.failed++;
    results.errors.push(`支付意图测试: ${error.message}`);
  }
  console.log('');

  // Test 3: Get X402 Authorization
  console.log('📋 Test 3: 查询X402授权状态...');
  try {
    const auth = await paymind.agents.getAutoPayGrant();
    console.log('✅ 成功');
    if (auth) {
      console.log(`   授权ID: ${auth.id}`);
      console.log(`   状态: ${auth.isActive ? '激活' : '未激活'}`);
    } else {
      console.log('   无授权记录');
    }
    results.passed++;
  } catch (error: any) {
    console.log('❌ 失败');
    console.log(`   错误: ${error.message}`);
    results.failed++;
    results.errors.push(`X402授权测试: ${error.message}`);
  }
  console.log('');

  // Test 4: List Products
  console.log('📋 Test 4: 查询商品列表...');
  try {
    const products = await paymind.merchants.listProducts({
      page: 1,
      limit: 10,
    });
    console.log('✅ 成功');
    console.log(`   商品数量: ${products.data?.length || 0}`);
    results.passed++;
  } catch (error: any) {
    console.log('❌ 失败');
    console.log(`   错误: ${error.message}`);
    results.failed++;
    results.errors.push(`商品列表测试: ${error.message}`);
  }
  console.log('');

  // Summary
  console.log('📊 测试结果汇总');
  console.log('================');
  console.log(`✅ 通过: ${results.passed}`);
  console.log(`❌ 失败: ${results.failed}`);
  console.log(`📈 成功率: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  console.log('');

  if (results.errors.length > 0) {
    console.log('⚠️  错误详情:');
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  if (results.failed === 0) {
    console.log('🎉 所有测试通过！SDK可以正常使用。');
    process.exit(0);
  } else {
    console.log('⚠️  部分测试失败，请检查后端API是否正常运行。');
    process.exit(1);
  }
}

verifyAPI().catch((error) => {
  console.error('❌ 验证过程出错:', error);
  process.exit(1);
});

