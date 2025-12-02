/**
 * EPAY API 接口测试脚本
 * 用于测试EPAY各个接口是否正常工作
 * 
 * 使用方法:
 * cd backend
 * npx ts-node scripts/test-epay-api.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';
import * as https from 'https';
import axios from 'axios';
import { URLSearchParams } from 'url';

// 加载环境变量
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });
console.log(`Loading env from: ${envPath}`);

// EPAY配置
const EPAY_CONFIG = {
  merchantId: process.env.EPAY_MERCHANT_ID || 'test2020@epay.com',
  apiKey: process.env.EPAY_API_KEY || '2d00b386231806ec7e18e2d96dc043aa',
  secretKey: process.env.EPAY_SECRET_KEY || '2d00b386231806ec7e18e2d96dc043aa',
  baseUrl: process.env.EPAY_TEST_URL || 'https://29597375fx.epaydev.xyz/epayweb',
  webhookUrl: process.env.EPAY_WEBHOOK_URL || 'http://localhost:3001/api/payments/provider/epay/webhook',
};

/**
 * 将参数对象转换为 application/x-www-form-urlencoded 编码
 */
function buildFormData(params: Record<string, any>): string {
  const formData = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    formData.append(key, String(value));
  });
  return formData.toString();
}

/**
 * 生成EPAY接口签名
 * 根据文档：https://opendocs.epay.com/docu/cn/before/api_sign.html
 * 使用SHA256算法，不是MD5
 */
function generateSignature(params: Record<string, any>): string {
  // 1. 去掉空值和null值
  const filteredParams: Record<string, any> = {};
  Object.keys(params).forEach(key => {
    const value = params[key];
    if (value !== null && value !== undefined && value !== '') {
      filteredParams[key] = value;
    }
  });
  
  // 2. 按参数名ASCII码从小到大排序，转换成queryString格式
  const sortedKeys = Object.keys(filteredParams).sort();
  const queryString = sortedKeys
    .map(key => {
      const value = filteredParams[key];
      if (typeof value === 'object') {
        return `${key}=${JSON.stringify(value)}`;
      }
      return `${key}=${value}`;
    })
    .join('&');
  
  // 3. 拼接key={API_KEY}（文档中使用API_KEY，不是secretKey）
  const signString = `${queryString}&key=${EPAY_CONFIG.apiKey}`;
  
  // 4. SHA256运算并转大写
  const sign = crypto.createHash('sha256').update(signString).digest('hex').toUpperCase();
  
  return sign;
}

/**
 * 测试1: 计算汇率接口
 */
async function testCalculateRate() {
  console.log('\n📊 测试1: 计算汇率接口');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const params = {
      merchant_id: EPAY_CONFIG.merchantId,
      from_currency: 'CNY',
      to_currency: 'USDT',
      amount: '100',
      timestamp: Date.now().toString(),
    };

    const sign = generateSignature(params);
    params['sign'] = sign;

    // EPAY API路径：根据最新文档 https://opendocs.epay.com/docu/cn/
    // 尝试去掉/epayweb后缀
    const baseUrlWithoutEpayweb = EPAY_CONFIG.baseUrl.replace(/\/epayweb$/, '');
    const apiEndpoint = `${baseUrlWithoutEpayweb}/api/calculate-rate`;
    
    console.log(`API端点: ${apiEndpoint}`);
    console.log(`请求参数:`, params);

    const response = await axios.post(
      apiEndpoint,
      buildFormData(params),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false, // 测试环境可能需要
        }),
      },
    );

    console.log(`响应状态: ${response.status}`);
    console.log(`响应数据:`, JSON.stringify(response.data, null, 2));

    if (response.data.code === '0000' || response.data.code === '200' || !response.data.code) {
      console.log('✅ 计算汇率接口测试成功');
      return true;
    } else {
      console.log(`❌ 计算汇率接口测试失败: ${response.data.message || response.data.msg}`);
      return false;
    }
  } catch (error: any) {
    console.error('❌ 计算汇率接口测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

/**
 * 测试2: 收银台代收接口（创建支付订单）
 */
async function testPaymentCheckout() {
  console.log('\n💳 测试2: 收银台代收接口');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const orderId = `test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    const params = {
      merchant_id: EPAY_CONFIG.merchantId,
      order_id: orderId,
      amount: '1.00',
      currency: 'CNY',
      to_currency: 'USDT',
      notify_url: EPAY_CONFIG.webhookUrl,
      return_url: 'http://localhost:3000/pay/success',
      timestamp: Date.now().toString(),
    };

    // 生成签名（不包括sign字段）
    const sign = generateSignature(params);

    // EPAY API路径：根据最新文档 https://opendocs.epay.com/docu/cn/
    // 根据搜索结果，API路径可能是 /capi/openapi/xxx 格式
    const baseUrlWithoutEpayweb = EPAY_CONFIG.baseUrl.replace(/\/epayweb$/, '');
    const apiEndpoint = `${baseUrlWithoutEpayweb}/capi/openapi/payment`;
    
    console.log(`API端点: ${apiEndpoint}`);
    console.log(`订单ID: ${orderId}`);
    console.log(`请求参数:`, params);

    // JSON格式请求
    const requestBody = {
      sign: sign,
      param: params,
    };

    const response = await axios.post(
      apiEndpoint,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false, // 测试环境可能需要
        }),
      },
    );

    console.log(`响应状态: ${response.status}`);
    console.log(`响应数据:`, JSON.stringify(response.data, null, 2));

    if (response.data.code === '0000' || response.data.code === '200' || !response.data.code) {
      const data = response.data.data || response.data;
      const checkoutUrl = data.checkout_url || data.pay_url || data.url;
      if (checkoutUrl) {
        console.log(`✅ 收银台代收接口测试成功`);
        console.log(`📎 收银台URL: ${checkoutUrl}`);
        return { success: true, orderId, checkoutUrl };
      } else {
        console.log(`⚠️  收银台代收接口返回成功，但未找到收银台URL`);
        return { success: true, orderId, checkoutUrl: null };
      }
    } else {
      console.log(`❌ 收银台代收接口测试失败: ${response.data.message || response.data.msg}`);
      return { success: false, orderId, checkoutUrl: null };
    }
  } catch (error: any) {
    console.error('❌ 收银台代收接口测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, orderId: null, checkoutUrl: null };
  }
}

/**
 * 测试3: 查询订单接口
 */
async function testQueryOrder(orderId: string) {
  console.log('\n🔍 测试3: 查询订单接口');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (!orderId) {
    console.log('⚠️  跳过查询订单测试（需要先创建订单）');
    return false;
  }

  try {
    const params = {
      merchant_id: EPAY_CONFIG.merchantId,
      order_id: orderId,
      timestamp: Date.now().toString(),
    };

    const sign = generateSignature(params);
    params['sign'] = sign;

    // EPAY API路径：根据最新文档 https://opendocs.epay.com/docu/cn/
    // 尝试去掉/epayweb后缀
    const baseUrlWithoutEpayweb = EPAY_CONFIG.baseUrl.replace(/\/epayweb$/, '');
    const apiEndpoint = `${baseUrlWithoutEpayweb}/api/order/query`;
    
    console.log(`API端点: ${apiEndpoint}`);
    console.log(`订单ID: ${orderId}`);
    console.log(`请求参数:`, params);

    const response = await axios.post(
      apiEndpoint,
      buildFormData(params),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false, // 测试环境可能需要
        }),
      },
    );

    console.log(`响应状态: ${response.status}`);
    console.log(`响应数据:`, JSON.stringify(response.data, null, 2));

    if (response.data.code === '0000' || response.data.code === '200' || !response.data.code) {
      console.log('✅ 查询订单接口测试成功');
      return true;
    } else {
      console.log(`❌ 查询订单接口测试失败: ${response.data.message || response.data.msg}`);
      return false;
    }
  } catch (error: any) {
    console.error('❌ 查询订单接口测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('🚀 EPAY API 接口测试开始');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`商户ID: ${EPAY_CONFIG.merchantId}`);
  console.log(`Base URL: ${EPAY_CONFIG.baseUrl}`);
  console.log(`Webhook URL: ${EPAY_CONFIG.webhookUrl}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = {
    calculateRate: false,
    paymentCheckout: { success: false, orderId: null as string | null, checkoutUrl: null as string | null },
    queryOrder: false,
  };

  // 测试1: 计算汇率
  results.calculateRate = await testCalculateRate();
  
  // 等待1秒
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 测试2: 收银台代收
  results.paymentCheckout = await testPaymentCheckout();
  
  // 等待1秒
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 测试3: 查询订单（使用测试2创建的订单ID）
  if (results.paymentCheckout.orderId) {
    results.queryOrder = await testQueryOrder(results.paymentCheckout.orderId);
  }

  // 输出测试结果汇总
  console.log('\n📋 测试结果汇总');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`计算汇率接口: ${results.calculateRate ? '✅ 通过' : '❌ 失败'}`);
  console.log(`收银台代收接口: ${results.paymentCheckout.success ? '✅ 通过' : '❌ 失败'}`);
  if (results.paymentCheckout.checkoutUrl) {
    console.log(`  收银台URL: ${results.paymentCheckout.checkoutUrl}`);
  }
  console.log(`查询订单接口: ${results.queryOrder ? '✅ 通过' : '❌ 失败'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const allPassed = results.calculateRate && results.paymentCheckout.success && results.queryOrder;
  
  if (allPassed) {
    console.log('🎉 所有接口测试通过！');
    process.exit(0);
  } else {
    console.log('⚠️  部分接口测试失败，请检查日志');
    process.exit(1);
  }
}

// 运行测试
main().catch((error) => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});

