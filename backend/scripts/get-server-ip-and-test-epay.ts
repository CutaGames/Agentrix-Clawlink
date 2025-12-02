/**
 * 获取服务器出口IP并测试EPAY API连接
 * 
 * 使用方法：
 * cd backend
 * npx ts-node scripts/get-server-ip-and-test-epay.ts
 */

import axios from 'axios';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { URLSearchParams } from 'url';

// 加载环境变量
dotenv.config({ path: resolve(__dirname, '../.env') });

/**
 * 获取服务器出口IP
 */
async function getServerIP(): Promise<string> {
  const services = [
    'https://api.ipify.org',
    'https://ifconfig.me',
    'https://icanhazip.com',
  ];

  for (const service of services) {
    try {
      const response = await axios.get(service, { timeout: 5000 });
      const ip = response.data.trim();
      if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
        return ip;
      }
    } catch (error) {
      console.warn(`Failed to get IP from ${service}:`, (error as Error).message);
    }
  }

  throw new Error('Failed to get server IP from all services');
}

/**
 * 生成EPAY接口签名
 */
function generateEPAYSignature(params: Record<string, any>, secretKey: string): string {
  // 1. 按参数名ASCII码从小到大排序
  const sortedKeys = Object.keys(params).sort();
  
  // 2. 拼接参数字符串
  const paramString = sortedKeys
    .filter(key => params[key] !== null && params[key] !== undefined && params[key] !== '')
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  // 3. 拼接密钥
  const signString = `${paramString}&key=${secretKey}`;
  
  // 4. MD5加密并转大写
  const sign = crypto.createHash('md5').update(signString).digest('hex').toUpperCase();
  
  return sign;
}

function buildFormBody(params: Record<string, any>): string {
  const form = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    form.append(key, String(value));
  });
  return form.toString();
}

/**
 * 测试EPAY API连接
 */
async function testEPAYConnection(): Promise<void> {
  const merchantId = process.env.EPAY_MERCHANT_ID || 'test2020@epay.com';
  const apiKey = process.env.EPAY_API_KEY || '2d00b386231806ec7e18e2d96dc043aa';
  const secretKey = process.env.EPAY_SECRET_KEY || apiKey;
  const baseUrl = process.env.EPAY_TEST_URL || 'https://29597375fx.epaydev.xyz/epayweb';

  console.log('\n📋 EPAY配置信息:');
  console.log(`  商户ID: ${merchantId}`);
  console.log(`  API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`  测试环境URL: ${baseUrl}`);
  console.log('');

  // 构建测试请求参数（查询订单接口作为测试）
  const testParams = {
    merchant_id: merchantId,
    order_id: `test_${Date.now()}`,
    timestamp: Date.now().toString(),
  };

  // 生成签名
  const sign = generateEPAYSignature(testParams, secretKey);
  testParams['sign'] = sign;

  // 测试API端点（根据EPAY文档调整）
  const apiEndpoint = `${baseUrl}/api/v1/order/query`;

  console.log('🧪 测试EPAY API连接...');
  console.log(`  API端点: ${apiEndpoint}`);
  console.log('');

  try {
    const response = await axios.post(
      apiEndpoint,
      buildFormBody(testParams),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000, // 10秒超时
      },
    );

    console.log('✅ EPAY API连接成功！');
    console.log(`  响应状态: ${response.status}`);
    console.log(`  响应数据:`, JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    if (error.response) {
      console.error('❌ EPAY API连接失败！');
      console.error(`  状态码: ${error.response.status}`);
      console.error(`  响应数据:`, JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 403) {
        console.error('\n⚠️  可能的原因:');
        console.error('  1. 服务器IP未添加到EPAY白名单');
        console.error('  2. 请登录EPAY测试环境后台添加IP白名单');
        console.error(`  3. 当前服务器IP: ${await getServerIP()}`);
      }
    } else if (error.request) {
      console.error('❌ 无法连接到EPAY服务器');
      console.error('  请检查网络连接和URL配置');
    } else {
      console.error('❌ 请求配置错误:', error.message);
    }
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('🔍 获取服务器出口IP并测试EPAY API连接');
  console.log('========================================\n');

  try {
    // 1. 获取服务器出口IP
    console.log('📡 正在获取服务器出口IP...');
    const serverIP = await getServerIP();
    console.log(`✅ 服务器出口IP: ${serverIP}`);
    console.log('');
    console.log('⚠️  重要提示:');
    console.log('  请将此IP添加到EPAY测试环境的白名单中:');
    console.log('  1. 登录: https://29597375fx.epaydev.xyz/epayweb');
    console.log('  2. 账号: test2020@epay.com / Epay@2025123');
    console.log('  3. 进入"开发者配置" → "IP白名单"');
    console.log(`  4. 添加IP: ${serverIP}`);
    console.log('');

    // 2. 测试EPAY API连接
    await testEPAYConnection();

    console.log('\n========================================');
    console.log('✅ 所有测试完成！');
    console.log('========================================');
  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main().catch(console.error);

