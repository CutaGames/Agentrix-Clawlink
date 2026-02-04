/**
 * Agentrix SDK - Commerce Split Plan Example
 * 
 * This example demonstrates how to use the Commerce resource
 * to create and manage split plans for revenue sharing.
 * 
 * Features covered:
 * - Creating split plans with custom rules
 * - Previewing commission allocation
 * - Activating and managing plan lifecycle
 * - Handling different payment types
 */

import { AgentrixSDK } from '@agentrix/sdk';

// Initialize SDK with your API credentials
const sdk = new AgentrixSDK({
  apiKey: process.env.AGENTRIX_API_KEY!,
  environment: 'sandbox', // 'sandbox' | 'production'
});

async function main() {
  console.log('='.repeat(60));
  console.log('Agentrix Commerce - Split Plan Example');
  console.log('='.repeat(60));
  console.log('');

  try {
    // ========================================
    // Step 1: Create a Split Plan
    // ========================================
    console.log('📋 Step 1: Creating Split Plan...');
    
    const splitPlan = await sdk.commerce.createSplitPlan({
      name: 'Skill Developer Revenue Share',
      description: 'Standard revenue sharing for skill developers',
      productType: 'skill',
      rules: [
        {
          role: 'merchant',
          customRoleName: 'Skill Developer',
          shareBps: 7000, // 70%
          source: 'net',
          active: true,
        },
        {
          role: 'platform',
          customRoleName: 'Agentrix Platform',
          shareBps: 2000, // 20%
          source: 'net',
          active: true,
        },
        {
          role: 'referrer',
          customRoleName: 'Referral Partner',
          shareBps: 1000, // 10%
          source: 'net',
          active: true,
        },
      ],
      feeConfig: {
        onrampFeeBps: 10,   // 0.1%
        offrampFeeBps: 10,  // 0.1%
        splitFeeBps: 30,    // 0.3%
        minSplitFee: 100000, // 0.1 USDC minimum
      },
    });

    console.log(`✅ Split Plan Created: ${splitPlan.id}`);
    console.log(`   Name: ${splitPlan.name}`);
    console.log(`   Status: ${splitPlan.status}`);
    console.log(`   Rules: ${splitPlan.rules.length}`);
    console.log('');

    // ========================================
    // Step 2: Preview Allocation
    // ========================================
    console.log('🔍 Step 2: Previewing Allocation for $100 Transaction...');
    
    // Scenario 1: Pure Crypto (0% fee)
    const cryptoPreview = await sdk.commerce.previewAllocation({
      splitPlanId: splitPlan.id,
      amount: 100,
      currency: 'USDC',
      paymentType: 'crypto_direct',
    });

    console.log('   📊 Crypto Direct Payment:');
    console.log(`      Gross: $${cryptoPreview.grossAmount}`);
    console.log(`      Platform Fee: $${cryptoPreview.platformFee} (0%)`);
    console.log(`      Net: $${cryptoPreview.netAmount}`);
    console.log('      Allocations:');
    cryptoPreview.allocations.forEach(a => {
      console.log(`        - ${a.role}: $${a.amount.toFixed(2)} (${a.shareBps / 100}%)`);
    });
    console.log('');

    // Scenario 2: Fiat Onramp (0.4% fee = 0.3% split + 0.1% onramp)
    const onrampPreview = await sdk.commerce.previewAllocation({
      splitPlanId: splitPlan.id,
      amount: 100,
      currency: 'USD',
      paymentType: 'onramp',
    });

    console.log('   📊 Fiat Onramp Payment:');
    console.log(`      Gross: $${onrampPreview.grossAmount}`);
    console.log(`      Platform Fee: $${onrampPreview.platformFee.toFixed(2)} (0.4%)`);
    console.log(`      Net: $${onrampPreview.netAmount.toFixed(2)}`);
    console.log('      Fee Breakdown:');
    if (onrampPreview.feeBreakdown) {
      console.log(`        - Split Fee: $${onrampPreview.feeBreakdown.splitFee?.toFixed(4)}`);
      console.log(`        - Onramp Fee: $${onrampPreview.feeBreakdown.onrampFee?.toFixed(4)}`);
    }
    console.log('');

    // ========================================
    // Step 3: Activate the Plan
    // ========================================
    console.log('🚀 Step 3: Activating Split Plan...');
    
    const activatedPlan = await sdk.commerce.activateSplitPlan(splitPlan.id);
    
    console.log(`✅ Plan Activated: ${activatedPlan.status}`);
    console.log('');

    // ========================================
    // Step 4: List All Plans
    // ========================================
    console.log('📋 Step 4: Listing All Split Plans...');
    
    const allPlans = await sdk.commerce.getSplitPlans({
      status: 'active',
      page: 1,
      limit: 10,
    });

    console.log(`   Found ${allPlans.length} active plan(s)`);
    allPlans.forEach((plan, i) => {
      console.log(`   ${i + 1}. ${plan.name} (${plan.productType})`);
    });
    console.log('');

    // ========================================
    // Step 5: Create an Order with Split
    // ========================================
    console.log('🛒 Step 5: Creating Order with Split Plan...');
    
    const order = await sdk.commerce.execute({
      action: 'createOrder',
      mode: 'PAY_AND_SPLIT',
      params: {
        type: 'service',
        items: [
          {
            id: 'skill-001',
            name: 'AI Writing Assistant Skill',
            quantity: 1,
            unitPrice: 100,
            totalPrice: 100,
          },
        ],
        currency: 'USD',
        splitPlanId: splitPlan.id,
      },
    });

    console.log(`✅ Order Created: ${order.id}`);
    console.log(`   Amount: $${order.amount} ${order.currency}`);
    console.log(`   Split Plan: ${order.splitPlanId}`);
    console.log('');

    // ========================================
    // Step 6: Create Payment Intent
    // ========================================
    console.log('💳 Step 6: Creating Payment Intent...');
    
    const paymentIntent = await sdk.commerce.execute({
      action: 'createPaymentIntent',
      mode: 'PAY_AND_SPLIT',
      params: {
        orderId: order.id,
        paymentMethod: 'stripe',
        returnUrl: 'https://example.com/success',
      },
    });

    console.log(`✅ Payment Intent Created: ${paymentIntent.paymentIntent?.id || paymentIntent.id}`);
    console.log(`   Status: ${paymentIntent.paymentIntent?.status || paymentIntent.status}`);
    console.log('');

    // ========================================
    // Summary
    // ========================================
    console.log('='.repeat(60));
    console.log('✅ Split Plan Example Complete!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Key Takeaways:');
    console.log('1. Split plans define how revenue is shared between parties');
    console.log('2. Fee structure: crypto=0%, onramp=+0.1%, offramp=+0.1%, split=0.3%');
    console.log('3. Minimum split fee ensures profitability on small transactions');
    console.log('4. Plans must be activated before use');
    console.log('5. Each order can reference a split plan for automatic settlement');
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Tiered pricing example
async function tieredPricingExample() {
  const sdk = new AgentrixSDK({
    apiKey: process.env.AGENTRIX_API_KEY!,
  });

  console.log('');
  console.log('📈 Tiered Pricing Example');
  console.log('-'.repeat(40));

  // Create a plan with volume tiers
  const tieredPlan = await sdk.commerce.createSplitPlan({
    name: 'Volume-Based Revenue Share',
    productType: 'service',
    rules: [
      {
        role: 'merchant',
        customRoleName: 'Partner',
        shareBps: 7000,
        source: 'net',
        active: true,
      },
      {
        role: 'platform',
        shareBps: 3000,
        source: 'net',
        active: true,
      },
    ],
    tiers: [
      {
        name: 'Basic',
        minVolume: 0,
        maxVolume: 1000,
        splitFeeBps: 50, // 0.5%
      },
      {
        name: 'Growth',
        minVolume: 1000,
        maxVolume: 10000,
        splitFeeBps: 30, // 0.3%
      },
      {
        name: 'Enterprise',
        minVolume: 10000,
        maxVolume: null, // Unlimited
        splitFeeBps: 10, // 0.1%
      },
    ],
  });

  console.log(`✅ Tiered Plan Created: ${tieredPlan.id}`);
  console.log('   Tiers:');
  tieredPlan.tiers?.forEach(tier => {
    console.log(`   - ${tier.name}: ${tier.splitFeeBps / 100}% fee (${tier.minVolume}-${tier.maxVolume || '∞'})`);
  });
}

// Run examples
main().then(() => {
  // Uncomment to run tiered pricing example
  // return tieredPricingExample();
});
