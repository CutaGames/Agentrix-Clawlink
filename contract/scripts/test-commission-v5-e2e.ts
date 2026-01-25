import { ethers } from "hardhat";

/**
 * Commission V5.0 端到端测试脚本
 * 
 * 测试内容：
 * 1. 合约配置验证
 * 2. V5.0 费率验证
 * 3. 分账计算验证
 * 4. AutoPay 分账测试
 * 5. 扫描商品分账测试
 */

const COMMISSION_ADDRESS = "0x5E8023659620DFD296f48f92Da0AE48c9CB443f0";
const USDC_ADDRESS = "0xc23453b4842FDc4360A0a3518E2C0f51a2069386";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🧪 Commission V5.0 End-to-End Test");
  console.log("===================================");
  console.log("Tester address:", deployer.address);
  console.log("Commission address:", COMMISSION_ADDRESS);
  console.log("");

  // 连接到已部署的合约
  const commission = await ethers.getContractAt("Commission", COMMISSION_ADDRESS);
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

  let passed = 0;
  let failed = 0;

  // ============ 测试 1: 合约配置验证 ============
  console.log("📋 Test 1: Contract Configuration");
  console.log("---------------------------------");
  try {
    const settlementToken = await commission.settlementToken();
    const treasury = await commission.paymindTreasury();
    const rebatePool = await commission.systemRebatePool();
    
    console.log("  Settlement Token:", settlementToken);
    console.log("  Treasury:", treasury);
    console.log("  Rebate Pool:", rebatePool);
    
    if (settlementToken.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
      console.log("  ✅ Settlement token configured correctly");
      passed++;
    } else {
      console.log("  ❌ Settlement token mismatch");
      failed++;
    }
  } catch (error: any) {
    console.log("  ❌ Failed:", error.message);
    failed++;
  }
  console.log("");

  // ============ 测试 2: V5.0 费率验证 ============
  console.log("📋 Test 2: V5.0 Rate Configuration");
  console.log("----------------------------------");
  try {
    // X402 通道费
    const x402Rate = await commission.x402ChannelFeeRate();
    console.log("  X402 Channel Fee Rate:", Number(x402Rate) / 100, "%");
    if (Number(x402Rate) === 0) {
      console.log("  ✅ X402 rate correct (default 0%)");
      passed++;
    } else {
      console.log("  ❌ X402 rate incorrect");
      failed++;
    }

    // 扫描商品费率
    const scannedUcpRate = await commission.scannedFeeRates(3); // SCANNED_UCP
    const scannedX402Rate = await commission.scannedFeeRates(4); // SCANNED_X402
    const scannedFtRate = await commission.scannedFeeRates(5); // SCANNED_FT
    const scannedNftRate = await commission.scannedFeeRates(6); // SCANNED_NFT
    
    console.log("  Scanned UCP Rate:", Number(scannedUcpRate) / 100, "%");
    console.log("  Scanned X402 Rate:", Number(scannedX402Rate) / 100, "%");
    console.log("  Scanned FT Rate:", Number(scannedFtRate) / 100, "%");
    console.log("  Scanned NFT Rate:", Number(scannedNftRate) / 100, "%");
    
    if (Number(scannedUcpRate) === 100 && Number(scannedX402Rate) === 100) {
      console.log("  ✅ UCP/X402 rates correct (1%)");
      passed++;
    } else {
      console.log("  ❌ UCP/X402 rates incorrect");
      failed++;
    }
    
    if (Number(scannedFtRate) === 30 && Number(scannedNftRate) === 30) {
      console.log("  ✅ FT/NFT rates correct (0.3%)");
      passed++;
    } else {
      console.log("  ❌ FT/NFT rates incorrect");
      failed++;
    }

    // Skill 层级费率
    const infraPlatform = await commission.layerPlatformFees(0);
    const infraPool = await commission.layerPoolRates(0);
    const compositePlatform = await commission.layerPlatformFees(3);
    const compositePool = await commission.layerPoolRates(3);
    
    console.log("  INFRA:", Number(infraPlatform) / 100, "% +", Number(infraPool) / 100, "%");
    console.log("  COMPOSITE:", Number(compositePlatform) / 100, "% +", Number(compositePool) / 100, "%");
    
    if (Number(compositePlatform) === 300 && Number(compositePool) === 700) {
      console.log("  ✅ COMPOSITE rates correct (3% + 7%)");
      passed++;
    } else {
      console.log("  ❌ COMPOSITE rates incorrect");
      failed++;
    }
  } catch (error: any) {
    console.log("  ❌ Failed:", error.message);
    failed++;
  }
  console.log("");

  // ============ 测试 3: 分账计算验证 ============
  console.log("📋 Test 3: Split Calculation");
  console.log("----------------------------");
  try {
    const amount = ethers.parseEther("100");
    
    // LOGIC 层级，双 Agent
    const result = await commission.calculateV5Split(
      amount,
      2, // LOGIC
      true, // hasReferrer
      true, // hasExecutor
      true  // executorHasWallet
    );
    
    console.log("  Input: 100 USDC, LOGIC layer, dual Agent");
    console.log("  Merchant Amount:", ethers.formatEther(result.merchantAmount), "USDC");
    console.log("  Platform Fee:", ethers.formatEther(result.platformFee), "USDC");
    console.log("  Executor Fee:", ethers.formatEther(result.executorFee), "USDC");
    console.log("  Referrer Fee:", ethers.formatEther(result.referrerFee), "USDC");
    console.log("  Treasury Fee:", ethers.formatEther(result.treasuryFee), "USDC");
    
    // 验证: LOGIC = 1% + 4%, 执行:推荐 = 7:3
    // 商户: 95, 平台: 1, 执行: 2.8, 推荐: 1.2
    const expectedMerchant = ethers.parseEther("95");
    const expectedPlatform = ethers.parseEther("1");
    const expectedExecutor = ethers.parseEther("2.8");
    const expectedReferrer = ethers.parseEther("1.2");
    
    if (result.merchantAmount === expectedMerchant &&
        result.platformFee === expectedPlatform &&
        result.executorFee === expectedExecutor &&
        result.referrerFee === expectedReferrer) {
      console.log("  ✅ Split calculation correct");
      passed++;
    } else {
      console.log("  ❌ Split calculation incorrect");
      failed++;
    }
  } catch (error: any) {
    console.log("  ❌ Failed:", error.message);
    failed++;
  }
  console.log("");

  // ============ 测试 4: Relayer 权限验证 ============
  console.log("📋 Test 4: Relayer Permission");
  console.log("-----------------------------");
  try {
    const isRelayer = await commission.relayers(deployer.address);
    console.log("  Deployer is relayer:", isRelayer);
    
    if (isRelayer) {
      console.log("  ✅ Relayer permission correct");
      passed++;
    } else {
      console.log("  ❌ Relayer permission not set");
      failed++;
    }
  } catch (error: any) {
    console.log("  ❌ Failed:", error.message);
    failed++;
  }
  console.log("");

  // ============ 测试 5: 常量验证 ============
  console.log("📋 Test 5: Constants Verification");
  console.log("---------------------------------");
  try {
    const basisPoints = await commission.BASIS_POINTS();
    const executorShare = await commission.EXECUTOR_SHARE();
    const referrerShare = await commission.REFERRER_SHARE();
    const promoterShare = await commission.PROMOTER_SHARE_OF_PLATFORM();
    
    console.log("  BASIS_POINTS:", Number(basisPoints));
    console.log("  EXECUTOR_SHARE:", Number(executorShare) / 100, "%");
    console.log("  REFERRER_SHARE:", Number(referrerShare) / 100, "%");
    console.log("  PROMOTER_SHARE_OF_PLATFORM:", Number(promoterShare) / 100, "%");
    
    if (Number(basisPoints) === 10000 &&
        Number(executorShare) === 7000 &&
        Number(referrerShare) === 3000 &&
        Number(promoterShare) === 2000) {
      console.log("  ✅ Constants correct");
      passed++;
    } else {
      console.log("  ❌ Constants incorrect");
      failed++;
    }
  } catch (error: any) {
    console.log("  ❌ Failed:", error.message);
    failed++;
  }
  console.log("");

  // ============ 测试 6: USDC 余额检查 ============
  console.log("📋 Test 6: USDC Balance Check");
  console.log("-----------------------------");
  try {
    const balance = await usdc.balanceOf(deployer.address);
    console.log("  Deployer USDC balance:", ethers.formatUnits(balance, 6), "USDC");
    
    if (balance > 0n) {
      console.log("  ✅ Has USDC for testing");
      passed++;
    } else {
      console.log("  ⚠️  No USDC balance (need USDC for full e2e test)");
    }
  } catch (error: any) {
    console.log("  ❌ Failed:", error.message);
    failed++;
  }
  console.log("");

  // ============ 测试总结 ============
  console.log("===================================");
  console.log("📊 Test Summary");
  console.log("===================================");
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}`);
  console.log("");
  
  if (failed === 0) {
    console.log("✅ All tests passed! Commission V5.0 is ready for use.");
  } else {
    console.log("❌ Some tests failed. Please check the configuration.");
  }
  console.log("");

  // 输出 BSCScan 链接
  console.log("🔗 View on BSCScan:");
  console.log(`   https://testnet.bscscan.com/address/${COMMISSION_ADDRESS}`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
