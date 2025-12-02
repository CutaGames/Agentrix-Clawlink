/**
 * Crypto Payment Example
 * 
 * Demonstrates on-chain cryptocurrency payments with:
 * - Multiple chains support
 * - Dynamic gas estimation
 * - Transaction building
 * - Acceleration and retry
 */

import { Agentrix } from '../src';

async function cryptoPaymentExample() {
  const agentrix = new Agentrix({
    apiKey: process.env.AGENTRIX_API_KEY || 'your-api-key',
    baseUrl: process.env.AGENTRIX_API_URL || 'http://localhost:3001/api',
  });

  try {
    // ============================================
    // Part 1: Estimate gas for a payment
    // ============================================
    console.log('⛽ Part 1: Estimate gas');
    console.log('='.repeat(60));
    
    const gasEstimate = await agentrix.crypto.estimateGas({
      chain: 'ethereum',
      tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      tokenStandard: 'ERC20',
      amount: '100',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    });
    
    console.log('Gas estimate:');
    console.log(`  Gas limit: ${gasEstimate.gasLimit}`);
    console.log(`  Gas price: ${gasEstimate.gasPrice} Gwei`);
    console.log(`  Total cost: ${gasEstimate.totalCost} ${gasEstimate.currency}`);
    console.log('');

    // ============================================
    // Part 2: Build transaction
    // ============================================
    console.log('🔨 Part 2: Build transaction');
    console.log('='.repeat(60));
    
    const builtTx = await agentrix.crypto.buildTransaction({
      chain: 'solana',
      tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana
      tokenStandard: 'SPL',
      amount: '50',
      recipient: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      payer: 'YourWalletAddressHere',
    });
    
    console.log('Transaction built:');
    console.log(`  Chain: ${builtTx.chain}`);
    console.log(`  Required signatures: ${builtTx.requiredSignatures.length}`);
    console.log(`  Transaction: ${builtTx.transaction.substring(0, 50)}...`);
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Sign transaction with user wallet');
    console.log('   2. Submit signed transaction');
    console.log('');

    // ============================================
    // Part 3: Create and submit payment
    // ============================================
    console.log('💳 Part 3: Create payment');
    console.log('='.repeat(60));
    
    const payment = await agentrix.crypto.create({
      chain: 'ethereum',
      tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      tokenStandard: 'ERC20',
      amount: '100',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      priorityFee: '2',
    });
    
    console.log('Payment created:', payment.id);
    console.log('Status:', payment.status);
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Build transaction');
    console.log('   2. User signs with wallet');
    console.log('   3. Submit signed transaction');
    console.log('');

    // ============================================
    // Part 4: Submit signed transaction
    // ============================================
    console.log('✍️  Part 4: Submit signed transaction');
    console.log('='.repeat(60));
    
    // In real scenario, this would be signed by user's wallet
    const signedTx = '0x...'; // Signed transaction from wallet
    
    const submitted = await agentrix.crypto.submitSignedTransaction(
      payment.id,
      signedTx
    );
    
    console.log('Transaction submitted:', submitted.id);
    console.log('Transaction hash:', submitted.transactionHash);
    console.log('Status:', submitted.status);
    console.log('');

    // ============================================
    // Part 5: Accelerate transaction (if needed)
    // ============================================
    console.log('⚡ Part 5: Accelerate transaction');
    console.log('='.repeat(60));
    
    if (submitted.status === 'pending') {
      const accelerated = await agentrix.crypto.accelerate(
        submitted.id,
        '5' // Increase priority fee to 5 Gwei
      );
      
      console.log('Transaction accelerated');
      console.log('New priority fee: 5 Gwei');
      console.log('');
    }

    // ============================================
    // Part 6: Retry failed transaction
    // ============================================
    console.log('🔄 Part 6: Retry failed transaction');
    console.log('='.repeat(60));
    
    // If transaction failed, retry it
    if (submitted.status === 'failed') {
      const retried = await agentrix.crypto.retry(submitted.id);
      console.log('Transaction retried:', retried.id);
      console.log('Status:', retried.status);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

cryptoPaymentExample();

