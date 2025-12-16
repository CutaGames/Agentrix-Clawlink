/**
 * ARN Event Indexer
 * 
 * 监听和索引链上事件，用于：
 * 1. 收据统计
 * 2. Epoch 聚合
 * 3. 奖励计算
 */

import { ethers, Contract, JsonRpcProvider, Wallet } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Contract ABIs
const RECEIPT_REGISTRY_ABI = [
  'event ReceiptCreated(bytes32 indexed paymentId, address indexed payer, address indexed merchant, address agent, address token, uint256 amount, uint256 protocolFee, uint256 epochId, bytes32 routeRefHash)',
];

const FEE_SPLITTER_ABI = [
  'event PaymentSplit(address indexed token, address indexed merchant, uint256 totalAmount, uint256 commissionAmount, uint256 x402FeeAmount, bytes32 indexed routeRefHash)',
];

const EPOCH_MANAGER_ABI = [
  'event EpochStarted(uint256 indexed epochId, uint256 startTime, uint256 endTime)',
  'event EpochFinalized(uint256 indexed epochId, bytes32 merkleRoot, uint256 totalRewards)',
];

const ATTESTATION_REGISTRY_ABI = [
  'event AttestationSubmitted(bytes32 indexed attestationId, address indexed attester, bytes32 contentHash, uint256 bondAmount, uint256 challengeDeadline)',
  'event AttestationChallenged(bytes32 indexed attestationId, address indexed challenger, bytes32 challengeReason)',
  'event AttestationValidated(bytes32 indexed attestationId)',
  'event AttestationSlashed(bytes32 indexed attestationId, address indexed challenger, uint256 slashAmount)',
];

interface IndexedEvent {
  eventName: string;
  contractAddress: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  timestamp: number;
  args: any;
}

interface IndexerState {
  lastProcessedBlock: number;
  totalEventsIndexed: number;
  lastUpdated: string;
}

class EventIndexer {
  private provider: JsonRpcProvider;
  private contracts: Map<string, Contract> = new Map();
  private dataDir: string;
  private state: IndexerState;

  constructor(dataDir: string = './data/indexed-events') {
    const rpcUrl = process.env.BSC_TESTNET_RPC_URL || 'https://bsc-testnet.nodereal.io/v1/1eefed273dc64160afd5e328e6c518d6';
    this.provider = new JsonRpcProvider(rpcUrl);
    this.dataDir = dataDir;
    this.ensureDataDir();
    this.state = this.loadState();

    // 初始化合约
    this.initContracts();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private loadState(): IndexerState {
    const statePath = path.join(this.dataDir, 'state.json');
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
    return {
      lastProcessedBlock: 0,
      totalEventsIndexed: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  private saveState(): void {
    const statePath = path.join(this.dataDir, 'state.json');
    this.state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(this.state, null, 2));
  }

  private initContracts(): void {
    const addresses = {
      receiptRegistry: process.env.ARN_RECEIPT_REGISTRY_ADDRESS,
      feeSplitter: process.env.ARN_FEE_SPLITTER_ADDRESS,
      epochManager: process.env.ARN_EPOCH_MANAGER_ADDRESS,
      attestationRegistry: process.env.ARN_ATTESTATION_REGISTRY_ADDRESS,
    };

    if (addresses.receiptRegistry) {
      this.contracts.set('receiptRegistry', new Contract(
        addresses.receiptRegistry,
        RECEIPT_REGISTRY_ABI,
        this.provider
      ));
    }

    if (addresses.feeSplitter) {
      this.contracts.set('feeSplitter', new Contract(
        addresses.feeSplitter,
        FEE_SPLITTER_ABI,
        this.provider
      ));
    }

    if (addresses.epochManager) {
      this.contracts.set('epochManager', new Contract(
        addresses.epochManager,
        EPOCH_MANAGER_ABI,
        this.provider
      ));
    }

    if (addresses.attestationRegistry) {
      this.contracts.set('attestationRegistry', new Contract(
        addresses.attestationRegistry,
        ATTESTATION_REGISTRY_ABI,
        this.provider
      ));
    }
  }

  /**
   * 索引指定区块范围的事件
   */
  async indexBlocks(fromBlock: number, toBlock: number): Promise<IndexedEvent[]> {
    console.log(`Indexing blocks ${fromBlock} to ${toBlock}...`);
    const allEvents: IndexedEvent[] = [];

    for (const [name, contract] of this.contracts) {
      try {
        const events = await contract.queryFilter('*', fromBlock, toBlock);
        
        for (const event of events) {
          const block = await event.getBlock();
          const indexed: IndexedEvent = {
            eventName: event.fragment?.name || 'Unknown',
            contractAddress: await contract.getAddress(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            logIndex: event.index,
            timestamp: block.timestamp,
            args: event.args ? Object.fromEntries(
              event.fragment.inputs.map((input, i) => [input.name, event.args[i]?.toString()])
            ) : {},
          };
          allEvents.push(indexed);
        }
        
        console.log(`  ${name}: ${events.length} events`);
      } catch (error: any) {
        console.error(`  Error indexing ${name}: ${error.message}`);
      }
    }

    // 保存事件
    if (allEvents.length > 0) {
      this.saveEvents(allEvents);
    }

    // 更新状态
    this.state.lastProcessedBlock = toBlock;
    this.state.totalEventsIndexed += allEvents.length;
    this.saveState();

    return allEvents;
  }

  /**
   * 保存事件到文件
   */
  private saveEvents(events: IndexedEvent[]): void {
    const filename = `events-${Date.now()}.json`;
    const filepath = path.join(this.dataDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(events, null, 2));
    console.log(`Saved ${events.length} events to ${filename}`);
  }

  /**
   * 获取所有索引的事件
   */
  getAllEvents(): IndexedEvent[] {
    const files = fs.readdirSync(this.dataDir)
      .filter(f => f.startsWith('events-') && f.endsWith('.json'));
    
    const allEvents: IndexedEvent[] = [];
    for (const file of files) {
      const content = fs.readFileSync(path.join(this.dataDir, file), 'utf-8');
      allEvents.push(...JSON.parse(content));
    }
    
    return allEvents.sort((a, b) => a.blockNumber - b.blockNumber);
  }

  /**
   * 按类型统计事件
   */
  getEventStats(): Record<string, number> {
    const events = this.getAllEvents();
    const stats: Record<string, number> = {};
    
    for (const event of events) {
      stats[event.eventName] = (stats[event.eventName] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * 同步到最新区块
   */
  async syncToLatest(): Promise<void> {
    const currentBlock = await this.provider.getBlockNumber();
    const fromBlock = this.state.lastProcessedBlock + 1;
    
    if (fromBlock > currentBlock) {
      console.log('Already synced to latest block');
      return;
    }

    // 分批处理，每次最多 1000 个区块
    const batchSize = 1000;
    for (let start = fromBlock; start <= currentBlock; start += batchSize) {
      const end = Math.min(start + batchSize - 1, currentBlock);
      await this.indexBlocks(start, end);
    }
  }

  /**
   * 启动实时监听
   */
  startRealTimeListening(): void {
    console.log('Starting real-time event listening...');

    for (const [name, contract] of this.contracts) {
      contract.on('*', (event) => {
        console.log(`[${name}] New event: ${event.fragment?.name}`);
        // 可以在这里添加实时处理逻辑
      });
    }
  }

  /**
   * 获取索引器状态
   */
  getState(): IndexerState {
    return this.state;
  }
}

// CLI 入口
async function main() {
  const indexer = new EventIndexer();
  const command = process.argv[2] || 'status';

  switch (command) {
    case 'status':
      const state = indexer.getState();
      console.log('Indexer State:', JSON.stringify(state, null, 2));
      console.log('\nEvent Stats:', indexer.getEventStats());
      break;

    case 'sync':
      await indexer.syncToLatest();
      break;

    case 'index':
      const from = parseInt(process.argv[3] || '0');
      const to = parseInt(process.argv[4] || await indexer['provider'].getBlockNumber().toString());
      await indexer.indexBlocks(from, to);
      break;

    case 'listen':
      indexer.startRealTimeListening();
      console.log('Press Ctrl+C to stop');
      // 保持运行
      await new Promise(() => {});
      break;

    default:
      console.log('Usage: ts-node event-indexer.ts [status|sync|index|listen]');
  }
}

main().catch(console.error);

export { EventIndexer, IndexedEvent };
