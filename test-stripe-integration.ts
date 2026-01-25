
import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';
// 注意：测试前需要确保后端已启动并配置了测试 Key

async function testStripeFlow() {
  console.log('🚀 Starting Stripe Integration Acceptance Test...');

  try {
    // 1. 获取环境信息
    console.log('\nStep 1: Checking Stripe Environment...');
    const envResponse = await axios.get(`${BASE_URL}/payments/stripe/environment`);
    console.log('Environment:', envResponse.data);

    if (!envResponse.data.isConfigured) {
      console.error('❌ Stripe is not configured. Please add STRIPE_SECRET_KEY to .env');
      return;
    }

    // 2. 创建支付意图
    console.log('\nStep 2: Creating Payment Intent...');
    const createResponse = await axios.post(`${BASE_URL}/payments/stripe/create-payment`, {
      amount: 100,
      currency: 'USD',
      userId: 'test-user-id',
      orderId: 'ORDER-123456',
      merchantId: 'MERCHANT-789',
      agentId: 'AGENT-007',
      skillLayerType: 'LOGIC',
      description: 'Test payment for Agentrix'
    }, {
      headers: {
        // 模拟 UnifiedAuthGuard 绕过（如果是测试环境且有后门/或者使用真实Token）
        'Authorization': 'Bearer test-token' 
      }
    });
    
    const { payment, paymentIntentId, clientSecret } = createResponse.data;
    console.log(`✅ Payment Record Created: ${payment.id}`);
    console.log(`✅ PaymentIntent ID: ${paymentIntentId}`);

    // 3. 模拟 Webhook (直接调用内部逻辑或尝试触发端点，如果是沙盒环境)
    // 注意：真实 Webhook 需要签名验证，测试脚本难以直接伪造请求头
    // 建议在测试模式下增加一个不检查签名的内部端点或跳过签名检查
    console.log('\nStep 3: Webhook handle check (Manual check required in logs)...');
    console.log('Action: Use Stripe CLI to trigger event: stripe trigger payment_intent.succeeded');

    // 4. 路由建议测试
    console.log('\nStep 4: Testing Smart Router...');
    const routingResponse = await axios.post(`${BASE_URL}/payments/routing/stripe-or-transak`, {
      amount: 50,
      currency: 'USD',
      merchantPaymentConfig: 'both'
    });
    console.log('Routing Decision:', routingResponse.data);

    // 5. 模拟结算任务
    console.log('\nStep 5: Testing Settlement Scheduler...');
    const settlementResponse = await axios.post(`${BASE_URL}/payments/stripe/settlement/execute-now`);
    console.log('Settlement Result:', settlementResponse.data);

    console.log('\n✨ Test Sequence Finished');
  } catch (error) {
    console.error('❌ Test Failed:', error.response?.data || error.message);
  }
}

// testStripeFlow(); // 实际运行时取消注释
