/**
 * ARN Epoch Service
 * 
 * 负责：
 * 1. 监听 ReceiptRegistry 事件
 * 2. 聚合 Epoch 数据
 * 3. 生成 Merkle 树
 * 4. 提交到 EpochManager 和 MerkleDistributor
 */

import { ethers, Contract, JsonRpcProvider, Wallet } from 'ethers';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import * as dotenv from 'dotenv';

dotenv.config();

// Contract ABIs
const RECEIPT_REGISTRY_ABI = [
  'event ReceiptCreated(bytes32 indexed paymentId, address indexed payer, address indexed merchant, address agent, address token, uint256 amount, uint256 protocolFee, uint256 epochId, bytes32 routeRefHash)',
  'function getEpochStats(uint256 epochId) view returns (uint256 totalReceipts, uint256 totalVolume, uint256 totalFees)',
  'function getEpochReceiptIds(uint256 epochId) view returns (bytes32[])',
  'function getReceipt(bytes32 paymentId) view returns (tuple(bytes32 paymentId, address payer, address merchant, address agent, address token, uint256 amount, uint256 protocolFee, uint256 timestamp, uint256 epochId, bytes32 routeRefHash))',
];

const EPOCH_MANAGER_ABI = [
  'function getCurrentEpochId() view returns (uint256)',
  'function getCurrentEpoch() view returns (tuple(uint256 id, uint256 startTime, uint256 endTime, bytes32 merkleRoot, bool finalized, uint256 totalRewards))',
  'function canAdvanceEpoch() view returns (bool)',
  'function finalizeEpoch(uint256 epochId, bytes32 merkleRoot, uint256 totalRewards)',
  'function advanceEpoch()',
  'function isEpochFinalized(uint256 epochId) view returns (bool)',
];

const MERKLE_DISTRIBUTOR_ABI = [
  'function setMerkleRoot(uint256 epochId, address token, bytes32 merkleRoot)',
];

// Contract addresses from env
const config = {
  rpcUrl: process.env.BSC_TESTNET_RPC_URL || 'https://bsc-testnet.nodereal.io/v1/1eefed273dc64160afd5e328e6c518d6',
  privateKey: process.env.PRIVATE_KEY || '',
  receiptRegistry: process.env.ARN_RECEIPT_REGISTRY_ADDRESS || '',
  epochManager: process.env.ARN_EPOCH_MANAGER_ADDRESS || '',
  merkleDistributor: process.env.ARN_MERKLE_DISTRIBUTOR_ADDRESS || '',
  usdtAddress: process.env.BSC_TESTNET_USDC_ADDRESS || '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
};

interface EpochReward {
  address: string;
  amount: bigint;
  role: 'agent' | 'merchant' | 'watcher' | 'operator';
}

interface EpochData {
  epochId: number;
  totalVolume: bigint;
  totalFees: bigint;
  rewards: EpochReward[];
  merkleRoot: string;
  merkleTree: any;
}

class EpochService {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private receiptRegistry: Contract;
  private epochManager: Contract;
  private merkleDistributor: Contract;

  constructor() {
    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.wallet = new Wallet(config.privateKey, this.provider);
    
    this.receiptRegistry = new Contract(config.receiptRegistry, RECEIPT_REGISTRY_ABI, this.wallet);
    this.epochManager = new Contract(config.epochManager, EPOCH_MANAGER_ABI, this.wallet);
    this.merkleDistributor = new Contract(config.merkleDistributor, MERKLE_DISTRIBUTOR_ABI, this.wallet);
  }

  /**
   * 获取当前 Epoch 信息
   */
  async getCurrentEpoch(): Promise<{
    id: number;
    startTime: number;
    endTime: number;
    finalized: boolean;
    canAdvance: boolean;
  }> {
    const epoch = await this.epochManager.getCurrentEpoch();
    const canAdvance = await this.epochManager.canAdvanceEpoch();
    
    return {
      id: Number(epoch.id),
      startTime: Number(epoch.startTime),
      endTime: Number(epoch.endTime),
      finalized: epoch.finalized,
      canAdvance,
    };
  }

  /**
   * 聚合 Epoch 数据
   */
  async aggregateEpochData(epochId: number): Promise<EpochData> {
    console.log(`Aggregating data for Epoch ${epochId}...`);
    
    // 获取 Epoch 统计
    const [totalReceipts, totalVolume, totalFees] = await this.receiptRegistry.getEpochStats(epochId);
    console.log(`  Total receipts: ${totalReceipts}`);
    console.log(`  Total volume: ${ethers.formatUnits(totalVolume, 18)} USDT`);
    console.log(`  Total fees: ${ethers.formatUnits(totalFees, 18)} USDT`);

    // 获取所有收据
    const receiptIds = await this.receiptRegistry.getEpochReceiptIds(epochId);
    
    // 聚合每个地址的奖励
    const rewardMap = new Map<string, bigint>();
    
    for (const receiptId of receiptIds) {
      const receipt = await this.receiptRegistry.getReceipt(receiptId);
      
      // Agent 获得其关联交易的 protocolFee 的 10%（作为额外激励）
      if (receipt.agent !== ethers.ZeroAddress) {
        const agentReward = receipt.protocolFee / 10n; // 10% of protocol fee
        const current = rewardMap.get(receipt.agent.toLowerCase()) || 0n;
        rewardMap.set(receipt.agent.toLowerCase(), current + agentReward);
      }
    }

    // 转换为奖励数组
    const rewards: EpochReward[] = [];
    for (const [address, amount] of rewardMap) {
      if (amount > 0n) {
        rewards.push({
          address,
          amount,
          role: 'agent',
        });
      }
    }

    console.log(`  Total reward recipients: ${rewards.length}`);

    // 生成 Merkle 树
    const { merkleRoot, merkleTree } = this.generateMerkleTree(rewards);

    return {
      epochId,
      totalVolume,
      totalFees,
      rewards,
      merkleRoot,
      merkleTree,
    };
  }

  /**
   * 生成 Merkle 树
   */
  generateMerkleTree(rewards: EpochReward[]): { merkleRoot: string; merkleTree: any } {
    if (rewards.length === 0) {
      console.log('  No rewards to distribute, using empty root');
      return {
        merkleRoot: ethers.keccak256(ethers.toUtf8Bytes('empty-epoch')),
        merkleTree: null,
      };
    }

    // 格式: [address, amount]
    const leaves = rewards.map(r => [r.address, r.amount.toString()]);
    
    const tree = StandardMerkleTree.of(leaves, ['address', 'uint256']);
    
    console.log(`  Merkle root: ${tree.root}`);
    
    return {
      merkleRoot: tree.root,
      merkleTree: tree,
    };
  }

  /**
   * 生成用户的 Merkle 证明
   */
  getProof(merkleTree: any, address: string): string[] | null {
    if (!merkleTree) return null;
    
    for (const [i, v] of merkleTree.entries()) {
      if (v[0].toLowerCase() === address.toLowerCase()) {
        return merkleTree.getProof(i);
      }
    }
    return null;
  }

  /**
   * 完成 Epoch 结算
   */
  async settleEpoch(epochId: number): Promise<{
    success: boolean;
    merkleRoot: string;
    txHash?: string;
  }> {
    console.log(`\n=== Settling Epoch ${epochId} ===`);
    
    // 检查是否已完成
    const isFinalized = await this.epochManager.isEpochFinalized(epochId);
    if (isFinalized) {
      console.log('  Epoch already finalized');
      return { success: false, merkleRoot: '' };
    }

    // 聚合数据
    const epochData = await this.aggregateEpochData(epochId);

    // 提交到 EpochManager
    console.log('\nSubmitting to EpochManager...');
    const tx1 = await this.epochManager.finalizeEpoch(
      epochId,
      epochData.merkleRoot,
      epochData.totalFees
    );
    await tx1.wait();
    console.log(`  ✅ EpochManager finalized: ${tx1.hash}`);

    // 提交到 MerkleDistributor
    console.log('\nSubmitting to MerkleDistributor...');
    const tx2 = await this.merkleDistributor.setMerkleRoot(
      epochId,
      config.usdtAddress,
      epochData.merkleRoot
    );
    await tx2.wait();
    console.log(`  ✅ MerkleDistributor updated: ${tx2.hash}`);

    return {
      success: true,
      merkleRoot: epochData.merkleRoot,
      txHash: tx1.hash,
    };
  }

  /**
   * 推进到下一个 Epoch
   */
  async advanceEpoch(): Promise<boolean> {
    const canAdvance = await this.epochManager.canAdvanceEpoch();
    if (!canAdvance) {
      console.log('Cannot advance epoch yet');
      return false;
    }

    console.log('Advancing to next epoch...');
    const tx = await this.epochManager.advanceEpoch();
    await tx.wait();
    console.log(`  ✅ Advanced to new epoch: ${tx.hash}`);
    
    return true;
  }

  /**
   * 检查并自动结算（定时任务入口）
   */
  async checkAndSettle(): Promise<void> {
    console.log('\n========================================');
    console.log('ARN Epoch Service - Auto Settlement Check');
    console.log('========================================');
    console.log(`Time: ${new Date().toISOString()}`);

    const epoch = await this.getCurrentEpoch();
    console.log(`\nCurrent Epoch: ${epoch.id}`);
    console.log(`  Start: ${new Date(epoch.startTime * 1000).toISOString()}`);
    console.log(`  End: ${new Date(epoch.endTime * 1000).toISOString()}`);
    console.log(`  Finalized: ${epoch.finalized}`);
    console.log(`  Can Advance: ${epoch.canAdvance}`);

    if (epoch.canAdvance && !epoch.finalized) {
      // 先结算当前 Epoch
      await this.settleEpoch(epoch.id);
      
      // 然后推进到下一个
      await this.advanceEpoch();
    } else if (!epoch.finalized) {
      console.log('\nEpoch not yet ended, waiting...');
    } else {
      console.log('\nEpoch already finalized');
    }
  }
}

// CLI 入口
async function main() {
  const service = new EpochService();
  
  const command = process.argv[2] || 'status';
  
  switch (command) {
    case 'status':
      const epoch = await service.getCurrentEpoch();
      console.log('Current Epoch:', JSON.stringify(epoch, null, 2));
      break;
      
    case 'settle':
      const epochId = parseInt(process.argv[3] || '1');
      await service.settleEpoch(epochId);
      break;
      
    case 'advance':
      await service.advanceEpoch();
      break;
      
    case 'auto':
      await service.checkAndSettle();
      break;
      
    default:
      console.log('Usage: ts-node epoch-service.ts [status|settle|advance|auto]');
  }
}

main().catch(console.error);

export { EpochService };
