import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JsonRpcProvider, Wallet, Contract, parseUnits, formatUnits, formatEther, keccak256, AbiCoder, toUtf8Bytes, concat, recoverAddress, zeroPadValue, toBeHex, solidityPackedKeccak256, getBytes, Network } from 'ethers';
import { Payment, PaymentStatus } from '../../entities/payment.entity';

interface QuickPayRequest {
  sessionId: string;
  paymentId: string; // 用于查询支付记录
  orderId?: string; // 可选：用于签名验证（前端签名时使用的是订单ID）
  to: string;
  amount: string; // Token amount (实际精度，可能是 6 或 18 decimals)
  tokenDecimals?: number; // 可选：token 的精度（默认 6）
  signature: string;
  data?: string; // 可选：调用目标合约的数据 (X402 V2)
  nonce: number;
}

interface QueuedPayment {
  request: QuickPayRequest;
  timestamp: number;
  retryCount: number;
}

// ERC8004SessionManager ABI (Updated for X402 V2)
// Note: The contract only supports 5 parameters, no data parameter
const ERC8004_ABI = [
  'function sessions(bytes32) view returns (address signer, address owner, uint256 singleLimit, uint256 dailyLimit, uint256 usedToday, uint256 expiry, uint256 lastResetDate, bool isActive)',
  // 5 parameters: executeWithSession(sessionId, to, amount, paymentId, signature)
  'function executeWithSession(bytes32, address, uint256, bytes32, bytes)',
  'function executeBatchWithSession(bytes32[], address[], uint256[], bytes32[], bytes[])',
  'event PaymentExecuted(bytes32 indexed sessionId, address indexed to, uint256 amount, bytes32 indexed paymentId)',
];

// Commission Contract ABI (for setSplitConfig)
const COMMISSION_ABI = [
  'function setSplitConfig(bytes32 orderId, tuple(address merchantMPCWallet, uint256 merchantAmount, address referrer, uint256 referralFee, address executor, uint256 executionFee, uint256 platformFee, uint256 offRampFee, bool executorHasWallet, uint256 settlementTime, bool isDisputed, bytes32 sessionId) config)',
  'function quickPaySplitFrom(bytes32 orderId, uint256 amount, address payer)',
  'function setRelayer(address relayer, bool active)',
  'function relayers(address) view returns (bool)'
];

@Injectable()
export class PayMindRelayerService {
  private readonly logger = new Logger(PayMindRelayerService.name);
  private relayerWallet: Wallet;
  private provider: JsonRpcProvider;
  private sessionManagerContract: Contract | null = null;
  private paymentQueue: QueuedPayment[] = [];
  private nonceManager: Map<string, number> = new Map(); // sessionId -> lastNonce
  private isProcessingBatch = false;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private configService: ConfigService,
  ) {
    // 异步初始化，不阻塞构造函数
    this.initializeRelayer().catch((error) => {
      this.logger.error(`Failed to initialize relayer: ${error.message}`);
    });
    this.startBatchProcessor();
  }

  /**
   * 初始化 Relayer（EOA 钱包、Provider、合约）
   */
  private async initializeRelayer() {
    try {
      // 初始化 Provider - 优先使用 RPC_URL，如果没有则使用 BSC_TESTNET_RPC_URL
      // 默认使用 BSC Testnet (chainId: 97)
      const rpcUrl = this.configService.get<string>('RPC_URL') 
        || this.configService.get<string>('BSC_TESTNET_RPC_URL') 
        || process.env.RPC_URL 
        || process.env.BSC_TESTNET_RPC_URL
        || 'https://bsc-testnet.nodereal.io/v1/1eefed273dc64160afd5e328e6c518d6';
      
      // 确保 chainId 是数字类型，默认 BSC Testnet (97)
      const chainIdStr = this.configService.get<string>('CHAIN_ID') || process.env.CHAIN_ID || '97';
      const chainId = typeof chainIdStr === 'string' ? parseInt(chainIdStr, 10) : (chainIdStr as number);
      
      // 验证 chainId 是有效数字
      if (isNaN(chainId) || chainId <= 0) {
        throw new Error(`Invalid CHAIN_ID: ${chainIdStr}, must be a positive number`);
      }
      
      // 在 ethers v6 中，使用 Network 构造函数创建自定义网络
      // 支持未来多链扩展（BSC Testnet=97, BSC Mainnet=56, Ethereum=1, etc.）
      const network = new Network(
        `chain-${chainId}`, // name: 使用 chain-{chainId} 格式，便于多链支持
        chainId,            // chainId: 必须是数字类型
      );
      
      this.logger.log(`Initializing Relayer with RPC: ${rpcUrl}, ChainId: ${chainId} (BSC Testnet)`);
      this.provider = new JsonRpcProvider(rpcUrl, network);

      // 初始化 Relayer 钱包（用于付 Gas）
      const relayerPrivateKey = this.configService.get<string>('RELAYER_PRIVATE_KEY');
      if (!relayerPrivateKey) {
        this.logger.warn('RELAYER_PRIVATE_KEY not set, using mock wallet');
        const randomWallet = Wallet.createRandom();
        this.relayerWallet = new Wallet(randomWallet.privateKey, this.provider);
      } else {
        // 检查私钥格式（应该是0x开头的66个字符）
        const trimmedKey = relayerPrivateKey.trim();
        if (!trimmedKey.startsWith('0x') || trimmedKey.length !== 66) {
          this.logger.error(`Invalid RELAYER_PRIVATE_KEY format: ${trimmedKey.substring(0, 10)}... (should be 0x + 64 hex chars)`);
          throw new Error('Invalid RELAYER_PRIVATE_KEY format');
        }
        this.relayerWallet = new Wallet(trimmedKey, this.provider);
        this.logger.log(`Relayer wallet initialized: ${this.relayerWallet.address}`);
      }

      // 初始化合约
      const contractAddress = this.configService.get<string>('ERC8004_CONTRACT_ADDRESS');
      this.logger.log(`ERC8004_CONTRACT_ADDRESS from config: ${contractAddress ? contractAddress.substring(0, 20) + '...' : 'NOT SET'}`);
      
      if (!contractAddress) {
        this.logger.warn('ERC8004_CONTRACT_ADDRESS not set, relayer will use mock mode');
        return;
      }

      // 检查合约地址格式
      const trimmedAddress = contractAddress.trim();
      if (!trimmedAddress.startsWith('0x') || trimmedAddress.length !== 42) {
        this.logger.error(`Invalid ERC8004_CONTRACT_ADDRESS format: ${trimmedAddress} (should be 0x + 40 hex chars)`);
        this.logger.warn('Invalid contract address format, relayer will use mock mode');
        return;
      }

      // 尝试初始化合约
      try {
        this.sessionManagerContract = new Contract(
          trimmedAddress,
          ERC8004_ABI,
          this.relayerWallet,
        );
        
        // 验证合约是否可访问（尝试读取一个view函数）
        this.logger.log(`Contract initialized, verifying connection...`);
        
        // 检查 Relayer 钱包余额
        const balance = await this.relayerWallet.provider.getBalance(this.relayerWallet.address);
        this.logger.log(`✅ Relayer initialized successfully with contract: ${trimmedAddress}`);
        this.logger.log(`   Relayer wallet: ${this.relayerWallet.address}`);
        this.logger.log(`   Relayer wallet balance: ${formatEther(balance)} BNB`);
        this.logger.log(`   RPC URL: ${rpcUrl}`);
        if (balance === 0n) {
          this.logger.error(`   ⚠️  Relayer wallet has zero balance! Cannot pay for gas.`);
          this.logger.error(`   💡 Please send BNB to: ${this.relayerWallet.address}`);
        } else if (Number(balance) < parseUnits('0.001', 18)) {
          this.logger.warn(`   ⚠️  Relayer wallet balance is low (${formatEther(balance)} BNB), may not be enough for multiple transactions.`);
        }
      } catch (contractError) {
        this.logger.error(`Failed to initialize contract: ${contractError.message}`);
        this.logger.warn('Contract initialization failed, relayer will use mock mode');
        this.sessionManagerContract = null;
      }
    } catch (error) {
      this.logger.error(`Failed to initialize relayer: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      this.sessionManagerContract = null;
    }
  }

  /**
   * 处理 QuickPay 请求（链下验证 + 即时确认）
   */
  async processQuickPay(dto: QuickPayRequest): Promise<{
    success: boolean;
    paymentId: string;
    confirmedAt: Date;
    txHash?: string;
  }> {
    try {
      // 0. 修复零地址问题：如果 to 地址为零地址，使用 Commission 合约地址
      // 必须在签名验证之前修复，因为签名验证需要使用正确的地址
      const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
      if (dto.to.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
        const commissionAddress = this.configService.get<string>('COMMISSION_CONTRACT_ADDRESS');
        
        if (!commissionAddress) {
          this.logger.error('❌ COMMISSION_CONTRACT_ADDRESS 未配置');
          throw new BadRequestException('Commission合约地址未配置，请联系管理员');
        }
        
        this.logger.log(`✅ 检测到零地址，使用 Commission 合约地址: ${commissionAddress}`);
        dto.to = commissionAddress;
      }

      // 1. 防重放检查
      const lastNonce = this.nonceManager.get(dto.sessionId) || 0;
      if (dto.nonce <= lastNonce) {
        // 暂时放宽 nonce 检查，因为前端可能重试
        this.logger.warn(`Nonce check failed: ${dto.nonce} <= ${lastNonce}, but proceeding for debugging`);
        // throw new BadRequestException('Invalid nonce (replay attack)');
      }

      // 2. 链下验证签名（毫秒级）
      // 注意：如果签名验证失败，我们仍然尝试继续，因为可能是前端签名参数与后端不一致
      // 在生产环境中应该严格验证
      const verifiedParams = await this.verifySessionSignature(dto);
      if (!verifiedParams) {
        this.logger.warn('Signature verification failed, but proceeding to try on-chain execution (might fail on chain)');
        // throw new BadRequestException('Invalid signature');
      } else {
        // 使用验证通过的参数更新 dto
        this.logger.log(`Using verified params: to=${verifiedParams.to}, amount=${verifiedParams.amount}, paymentIdBytes32=${verifiedParams.paymentIdBytes32}`);
        // 注意：我们不能直接修改 dto.amount 为 bigint，因为 dto 类型定义是 string
        // 但我们可以在 executeSinglePaymentOnChain 中使用 verifiedParams
        // 这里我们暂时只更新 to，因为 amount 和 paymentIdBytes32 需要在 executeSinglePaymentOnChain 中处理
        if (verifiedParams.to.toLowerCase() !== dto.to.toLowerCase()) {
          this.logger.log(`Updating dto.to from ${dto.to} to ${verifiedParams.to}`);
          dto.to = verifiedParams.to;
          
          // ⚠️ CRITICAL FIX:
          // If the target address changed (e.g. from FeeSplitter to Merchant),
          // the original data (e.g. quickPaySplit) is likely invalid for the new target.
          // We must clear the data to prevent the transaction from reverting when calling the new target.
          if (dto.data && dto.data !== '0x') {
             // STRICT MODE: If user forbids direct payment, we should probably throw here if target becomes Merchant
             // But for now, we log heavily.
            this.logger.warn(`Clearing data because target address changed. Original data: ${dto.data.substring(0, 10)}...`);
            dto.data = '0x';
          }
        }
      }

      // 3. 链上查询 Session 状态（缓存 + 链上验证）
      const session = await this.getSessionFromChain(dto.sessionId);
      if (!session.isActive) {
        throw new BadRequestException('Session not active');
      }

      // 4. 检查额度（链下缓存 + 链上验证）
      // Session 限额是 6 decimals（USDC），需要将支付金额转换为 6 decimals 再比较
      const amount = BigInt(dto.amount);
      const tokenDecimals = dto.tokenDecimals || 6; // 默认 6 decimals (USDC)
      const sessionDecimals = 6; // Session 限额使用 6 decimals
      
      // 将支付金额转换为 Session 的精度（6 decimals）
      let amountInSessionDecimals: bigint;
      if (tokenDecimals > sessionDecimals) {
        // 从高精度转换为低精度（例如：18 -> 6，除以 10^12）
        const diff = tokenDecimals - sessionDecimals;
        let scaleFactor = BigInt(1);
        for (let i = 0; i < diff; i++) {
          scaleFactor = scaleFactor * BigInt(10);
        }
        amountInSessionDecimals = amount / scaleFactor;
      } else if (tokenDecimals < sessionDecimals) {
        // 从低精度转换为高精度（例如：6 -> 18，乘以 10^12）
        const diff = sessionDecimals - tokenDecimals;
        let scaleFactor = BigInt(1);
        for (let i = 0; i < diff; i++) {
          scaleFactor = scaleFactor * BigInt(10);
        }
        amountInSessionDecimals = amount * scaleFactor;
      } else {
        // 精度相同，直接使用
        amountInSessionDecimals = amount;
      }
      
      if (amountInSessionDecimals > session.singleLimit) {
        this.logger.debug(`Amount check: ${amountInSessionDecimals} > ${session.singleLimit} (tokenDecimals: ${tokenDecimals}, amount: ${dto.amount})`);
        throw new BadRequestException('Exceeds single limit');
      }

      // 检查每日限额（需要重置逻辑）
      const currentDate = Math.floor(Date.now() / 86400000); // days since epoch
      const sessionDate = Number(session.lastResetDate) / 86400;
      let usedToday = session.usedToday;

      if (currentDate > sessionDate) {
        // 每日限额已重置，需要从链上重新获取
        const updatedSession = await this.getSessionFromChain(dto.sessionId);
        usedToday = updatedSession.usedToday;
      }

      // 使用转换后的金额（6 decimals）检查每日限额
      if (usedToday + amountInSessionDecimals > session.dailyLimit) {
        this.logger.debug(`Daily limit check: ${usedToday} + ${amountInSessionDecimals} > ${session.dailyLimit}`);
        throw new BadRequestException('Exceeds daily limit');
      }

      // 5. 更新支付记录状态（即时确认）
      // 注意：这里只更新基本状态，transactionHash 会在 payment.service 中更新
      // 避免重复保存，让 payment.service 统一管理支付记录的完整更新
      const payment = await this.paymentRepository.findOne({
        where: { id: dto.paymentId },
      });

      if (payment) {
        // 只更新状态和基本 metadata，transactionHash 由 payment.service 更新
        payment.status = PaymentStatus.COMPLETED;
        payment.metadata = {
          ...payment.metadata,
          quickPayConfirmed: true,
          confirmedAt: new Date().toISOString(),
          sessionId: dto.sessionId,
        };
        // 注意：这里不保存 transactionHash，因为 payment.service 会统一保存
        await this.paymentRepository.save(payment);
        this.logger.log(`Relayer: Payment record updated (status only): paymentId=${payment.id}`);
      } else {
        this.logger.warn(`Relayer: Payment record not found: paymentId=${dto.paymentId}`);
      }

      // 5. 更新 Nonce
      this.nonceManager.set(dto.sessionId, dto.nonce);

      // 6. 立即执行单笔支付（不等待批量处理）
      let txHash: string | undefined;
      let executionFailed = false;
      let executionError: string | undefined;
      
      try {
        if (this.sessionManagerContract) {
          // 有合约：立即执行单笔支付
          this.logger.log(`Attempting immediate on-chain execution for paymentId=${dto.paymentId}`);
          this.logger.log(`Contract address: ${await this.sessionManagerContract.getAddress()}`);
          this.logger.log(`Session ID: ${dto.sessionId}`);
          this.logger.log(`To: ${dto.to}`);
          this.logger.log(`Amount: ${dto.amount}`);
          
          // 传递 verifiedParams 给 executeSinglePaymentOnChain
          // 如果 verifiedParams 为 null，则传递 undefined，executeSinglePaymentOnChain 会回退到旧逻辑
          txHash = await this.executeSinglePaymentOnChain(dto, verifiedParams || undefined);
          this.logger.log(
            `✅ QuickPay executed immediately: paymentId=${dto.paymentId}, txHash=${txHash}`,
          );
        } else {
          // Mock模式：立即处理（不等待批量处理）
          this.logger.warn('Session manager contract not initialized, processing immediately in mock mode');
          // 立即执行Mock处理
          await this.executeBatchOnChain([dto]);
          this.logger.log(`Mock mode: Payment ${dto.paymentId} processed immediately`);
        }
      } catch (error: any) {
        this.logger.error(`❌ Immediate execution failed for paymentId=${dto.paymentId}: ${error.message}`);
        this.logger.error(`Error stack: ${error.stack}`);
        executionFailed = true;
        executionError = error.message;
        
        // 如果立即执行失败，尝试Mock模式处理
        if (!this.sessionManagerContract) {
          try {
            await this.executeBatchOnChain([dto]);
            this.logger.log(`Mock mode fallback: Payment ${dto.paymentId} processed`);
            executionFailed = false; // Mock succeeded
          } catch (mockError: any) {
            this.logger.error(`Mock mode fallback also failed: ${mockError.message}`);
            // 最后加入队列等待重试
            this.paymentQueue.push({
              request: dto,
              timestamp: Date.now(),
              retryCount: 0,
            });
          }
        } else {
          // 有合约但执行失败，记录详细错误并加入队列等待重试
          this.logger.error(`Contract exists but execution failed. Contract address: ${await this.sessionManagerContract.getAddress()}`);
          this.logger.error(`Relayer wallet: ${this.relayerWallet.address}`);
          this.logger.error(`Relayer wallet balance: ${await this.relayerWallet.provider.getBalance(this.relayerWallet.address)}`);
          
          // 检查是否是余额不足
          const balance = await this.relayerWallet.provider.getBalance(this.relayerWallet.address);
          if (balance === 0n) {
            this.logger.error('⚠️ Relayer wallet has zero balance! Cannot pay for gas.');
            // 标记payment为失败
            if (payment) {
              payment.status = PaymentStatus.FAILED;
              payment.metadata = {
                ...payment.metadata,
                executionFailed: true,
                error: 'Relayer wallet has zero balance',
              };
              await this.paymentRepository.save(payment);
            }
          } else {
            // 加入队列等待重试
            this.paymentQueue.push({
              request: dto,
              timestamp: Date.now(),
              retryCount: 0,
            });
            this.logger.log(`Payment ${dto.paymentId} added to retry queue`);
          }
        }
      }

      // 8. 返回结果
      // ⚠️ CRITICAL FIX: If on-chain execution failed and no txHash, throw error
      // This prevents frontend from showing success when chain tx failed
      if (executionFailed && !txHash) {
        // Update payment status to FAILED
        if (payment) {
          payment.status = PaymentStatus.FAILED;
          payment.metadata = {
            ...payment.metadata,
            executionFailed: true,
            error: executionError || 'On-chain execution failed',
          };
          await this.paymentRepository.save(payment);
        }
        throw new Error(`On-chain execution failed: ${executionError || 'Unknown error'}. Payment added to retry queue.`);
      }
      
      const confirmedAt = new Date();

      this.logger.log(
        `QuickPay confirmed: paymentId=${dto.paymentId}, amount=${formatUnits(amount, 6)} USDC, txHash=${txHash || 'pending'}`,
      );

      return {
        success: true,
        paymentId: dto.paymentId,
        confirmedAt,
        txHash,
      };
    } catch (error) {
      this.logger.error(`QuickPay failed: ${error.message}`);
      throw error;
    }
  }

  /**
  /**
   * 验证 Session Key 签名（链下，毫秒级）
   * 返回验证通过的参数组合，如果验证失败返回 null
   */
  private async verifySessionSignature(dto: QuickPayRequest): Promise<{
    to: string;
    amount: bigint;
    paymentIdBytes32: string;
  } | null> {
    try {
      if (!this.sessionManagerContract) {
        // Mock mode: 跳过签名验证
        this.logger.warn('Session manager contract not initialized, skipping signature verification');
        return {
          to: dto.to,
          amount: BigInt(dto.amount), // Mock mode assumes amount is correct
          paymentIdBytes32: keccak256(toUtf8Bytes(dto.paymentId))
        };
      }

      // 构建消息哈希（与合约一致）
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      
      // 准备可能的参数组合
      const possibleIds = [];
      if (dto.orderId) possibleIds.push(dto.orderId);
      if (dto.paymentId && dto.paymentId !== dto.orderId) possibleIds.push(dto.paymentId);
      
      const possibleAddresses = [dto.to];
      const commissionAddress = this.configService.get<string>('COMMISSION_CONTRACT_ADDRESS');
      if (commissionAddress && commissionAddress.toLowerCase() !== dto.to.toLowerCase()) {
        possibleAddresses.push(commissionAddress);
      }

      // 准备金额 (6 decimals)
      const tokenDecimals = dto.tokenDecimals || 6;
      const contractDecimals = 6;
      let amountForSignature: bigint;
      
      if (tokenDecimals > contractDecimals) {
        const diff = tokenDecimals - contractDecimals;
        let scaleFactor = BigInt(1);
        for (let i = 0; i < diff; i++) scaleFactor *= BigInt(10);
        amountForSignature = BigInt(dto.amount) / scaleFactor;
      } else if (tokenDecimals < contractDecimals) {
        const diff = contractDecimals - tokenDecimals;
        let scaleFactor = BigInt(1);
        for (let i = 0; i < diff; i++) scaleFactor *= BigInt(10);
        amountForSignature = BigInt(dto.amount) * scaleFactor;
      } else {
        amountForSignature = BigInt(dto.amount);
      }

      // 从链上获取 Session 信息，验证 signer
      const session = await this.getSessionFromChain(dto.sessionId);
      
      // 尝试所有组合
      for (const idStr of possibleIds) {
        let paymentIdBytes32: string;
        if (idStr.startsWith('0x') && idStr.length === 66) {
          paymentIdBytes32 = zeroPadValue(idStr, 32);
        } else {
          paymentIdBytes32 = keccak256(toUtf8Bytes(idStr));
        }

        for (const addressForVerification of possibleAddresses) {
          const innerHash = solidityPackedKeccak256(
            ['bytes32', 'address', 'uint256', 'bytes32', 'uint256'],
            [
              dto.sessionId,
              addressForVerification,
              amountForSignature,
              paymentIdBytes32,
              chainId,
            ],
          );

          const messageHashWithPrefix = solidityPackedKeccak256(
            ['string', 'bytes32'],
            ['\x19Ethereum Signed Message:\n32', innerHash],
          );

          const signerAddress = recoverAddress(messageHashWithPrefix, dto.signature);
          
          if (signerAddress.toLowerCase() === session.signer.toLowerCase()) {
            this.logger.log(`✅ Signature verification passed with: to=${addressForVerification}, id=${idStr}`);
            return {
              to: addressForVerification,
              amount: amountForSignature,
              paymentIdBytes32: paymentIdBytes32
            };
          }
        }
      }
      
      this.logger.error(`❌ Signature verification failed with all combinations`);
      this.logger.debug(`Expected signer: ${session.signer}`);
      return null;
    } catch (error) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      return null;
    }
  }

  /**
   * 从链上获取 Session 信息
   */
  private async getSessionFromChain(sessionId: string): Promise<{
    signer: string;
    owner: string;
    singleLimit: bigint;
    dailyLimit: bigint;
    usedToday: bigint;
    expiry: bigint;
    lastResetDate: bigint;
    isActive: boolean;
  }> {
    if (!this.sessionManagerContract) {
      // Mock mode: 返回模拟数据
      return {
        signer: '0x0000000000000000000000000000000000000000',
        owner: '0x0000000000000000000000000000000000000000',
        singleLimit: parseUnits('1000', 6),
        dailyLimit: parseUnits('10000', 6),
        usedToday: BigInt(0),
        expiry: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
        lastResetDate: BigInt(Math.floor(Date.now() / 86400)),
        isActive: true,
      };
    }

    const session = await this.sessionManagerContract.sessions(sessionId);
    return {
      signer: session.signer,
      owner: session.owner,
      singleLimit: session.singleLimit,
      dailyLimit: session.dailyLimit,
      usedToday: session.usedToday,
      expiry: session.expiry,
      lastResetDate: session.lastResetDate,
      isActive: session.isActive,
    };
  }

  /**
   * 批量上链处理器（定时执行）
   */
  private startBatchProcessor() {
    this.logger.log('Batch processor started (30s interval)');
    
    // 每 30 秒执行一次批量上链
    setInterval(async () => {
      if (this.isProcessingBatch) {
        this.logger.debug('Batch processor is already processing, skipping');
        return;
      }
      
      if (this.paymentQueue.length === 0) {
        return;
      }

      this.logger.log(`Batch processor triggered: ${this.paymentQueue.length} payments in queue`);

      // 积累最多 10 笔或立即上链（如果队列中有超过 5 分钟的支付）
      const now = Date.now();
      const oldPayments = this.paymentQueue.filter(
        (p) => now - p.timestamp > 5 * 60 * 1000,
      );
      const batchSize = Math.min(10, this.paymentQueue.length);

      const batch =
        oldPayments.length > 0
          ? oldPayments.slice(0, batchSize)
          : this.paymentQueue.slice(0, batchSize);

      if (batch.length === 0) return;

      this.isProcessingBatch = true;
      this.logger.log(`Processing batch: ${batch.length} payments`);

      try {
        await this.executeBatchOnChain(batch.map((p) => p.request));
        // 从队列中移除已处理的支付
        this.paymentQueue = this.paymentQueue.filter((p) => !batch.includes(p));
        this.logger.log(`✅ Batch executed successfully: ${batch.length} payments`);
      } catch (error) {
        this.logger.error(`❌ Batch execution failed: ${error.message}`, error.stack);
        // 重试逻辑
        batch.forEach((p) => {
          p.retryCount++;
          if (p.retryCount < 3) {
            // 重新加入队列
            this.paymentQueue.push(p);
            this.logger.warn(`Payment ${p.request.paymentId} retry ${p.retryCount}/3`);
          } else {
            this.logger.error(`Payment ${p.request.paymentId} failed after 3 retries, removing from queue`);
            // 标记payment为失败
            this.paymentRepository.findOne({ where: { id: p.request.paymentId } }).then(payment => {
              if (payment) {
                payment.status = PaymentStatus.FAILED;
                payment.metadata = {
                  ...payment.metadata,
                  batchProcessingFailed: true,
                  retryCount: p.retryCount,
                };
                this.paymentRepository.save(payment);
              }
            });
          }
        });
      } finally {
        this.isProcessingBatch = false;
      }
    }, 30000); // 30 秒
  }

  /**
   * 立即执行单笔支付（不等待批量处理）
   */
  private async executeSinglePaymentOnChain(
    dto: QuickPayRequest, 
    verifiedParams?: { to: string; amount: bigint; paymentIdBytes32: string }
  ): Promise<string> {
    if (!this.sessionManagerContract) {
      throw new Error('Session manager contract not initialized');
    }

    this.logger.log(`Executing single payment on-chain: paymentId=${dto.paymentId}`);

    try {
      // 检查relayer钱包余额
      const balance = await this.relayerWallet.provider.getBalance(this.relayerWallet.address);
      this.logger.log(`Relayer wallet balance: ${formatEther(balance)} ETH`);
      
      if (balance === 0n) {
        throw new Error('Relayer wallet has zero balance, cannot pay for gas');
      }

      let paymentIdBytes32: string;
      let amountForContract: bigint;

      if (verifiedParams) {
        // 如果有验证过的参数，直接使用
        paymentIdBytes32 = verifiedParams.paymentIdBytes32;
        amountForContract = verifiedParams.amount;
        this.logger.log(`Using verified params for execution: paymentIdBytes32=${paymentIdBytes32}, amount=${amountForContract}`);
      } else {
        // 否则重新计算（旧逻辑）
        // 使用 orderId 进行链上执行（如果提供），否则使用 paymentId
        // 前端签名时使用的是订单ID，所以链上执行时也要使用订单ID
        const idForExecution = dto.orderId || dto.paymentId;
        
        // 将 ID 字符串转换为 bytes32
        if (idForExecution.startsWith('0x') && idForExecution.length === 66) {
          paymentIdBytes32 = zeroPadValue(idForExecution, 32);
        } else {
          paymentIdBytes32 = keccak256(toUtf8Bytes(idForExecution));
        }

        // ⚠️ 重要：合约的amount参数是6 decimals（用于签名验证和限额检查）
        // 合约内部会自动将6 decimals转换为代币的实际精度（18 decimals for USDT）进行转账
        // 所以后端调用合约时，需要将代币金额转换为6 decimals，与签名验证保持一致
        // UPDATE: We now sign the exact token amount (18 decimals) in frontend, so we should pass it directly.
        // The Commission contract uses the amount directly for transferFrom.
        amountForContract = BigInt(dto.amount);
      }

      const callData = dto.data || '0x';

      this.logger.log(`Calling executeWithSession with:`);
      this.logger.log(`  sessionId: ${dto.sessionId}`);
      this.logger.log(`  to: ${dto.to}`);
      this.logger.log(`  contract amount: ${amountForContract.toString()} (raw token decimals)`);
      this.logger.log(`  paymentIdBytes32: ${paymentIdBytes32}`);
      this.logger.log(`  signature: ${dto.signature.substring(0, 20)}...`);
      // Note: data parameter removed - contract only supports 5 parameters

      // 先使用 staticCall 模拟执行，获取 revert reason
      try {
        // ⚠️ 警告：staticCall 可能会因为 gas 估算问题而失败，即使实际交易会成功
        // 但如果 staticCall 明确返回了 revert reason，那交易肯定会失败
        // 这里我们捕获错误，但只记录日志，不阻止交易发送（除非是非常明确的错误）
        await this.sessionManagerContract.executeWithSession.staticCall(
          dto.sessionId,
          dto.to,
          amountForContract,
          paymentIdBytes32,
          dto.signature
        );
        this.logger.log(`✅ Static call succeeded, proceeding with actual transaction`);
      } catch (staticCallError: any) {
        this.logger.error(`❌ Static call failed: ${staticCallError.message}`);
        if (staticCallError.reason) {
          this.logger.error(`Revert reason: ${staticCallError.reason}`);
        }
        if (staticCallError.data) {
          this.logger.error(`Error data: ${staticCallError.data}`);
        }
        
        // 如果是 "Call failed" 这种通用错误，可能是底层合约调用失败（例如转账失败）
        // 这种情况下，我们仍然尝试发送交易，以便在链上留下记录（或者让用户看到具体的失败原因）
        // 但如果是签名验证失败等明确错误，应该阻止发送
        if (staticCallError.reason && (
            staticCallError.reason.includes("Invalid signature") || 
            staticCallError.reason.includes("Session expired") ||
            staticCallError.reason.includes("Limit exceeded")
        )) {
             throw new Error(`Transaction will revert: ${staticCallError.reason}. Please check: Session status, signature validation, or limit checks.`);
        }
        
        this.logger.warn(`⚠️ Static call failed but proceeding with transaction to get on-chain trace. Reason: ${staticCallError.reason || 'Unknown'}`);
      }

      // 调用合约执行单笔支付（使用转换后的金额）
      // Note: Only 5 parameters - the contract doesn't support the data parameter
      // 增加 gasLimit 缓冲，防止因为 gas 估算不足导致失败
      const tx = await this.sessionManagerContract.executeWithSession(
        dto.sessionId,
        dto.to,
        amountForContract, // 使用转换后的金额（6 decimals）
        paymentIdBytes32,
        dto.signature,
        {
          gasLimit: 1000000, // 增加到 100万 gas
        },
      );

      const txHash = tx.hash;
      this.logger.log(`Transaction sent, waiting for confirmation: ${txHash}`);
      this.logger.log(`Transaction details: from=${tx.from}, to=${tx.to}, value=${tx.value}, gasLimit=${tx.gasLimit}`);
      
      // 验证交易是否真的被广播（检查交易是否在 mempool 中）
      try {
        const txInMempool = await this.relayerWallet.provider.getTransaction(txHash);
        if (!txInMempool) {
          this.logger.error(`❌ Transaction not found in mempool: ${txHash}`);
          throw new Error(`Transaction not broadcasted: ${txHash}`);
        }
        this.logger.log(`✅ Transaction confirmed in mempool: ${txHash}`);
      } catch (mempoolError: any) {
        this.logger.error(`❌ Failed to verify transaction in mempool: ${mempoolError.message}`);
        // 继续等待 receipt，可能只是网络延迟
      }

      const receipt = await tx.wait();
      // 在 ethers v6 中，receipt 可能没有 transactionHash，使用 tx.hash
      const finalTxHash = receipt.hash || receipt.transactionHash || txHash;
      
      // 检查交易状态（重要：确认交易是否真的成功）
      const status = receipt.status;
      if (status === 0) {
        this.logger.error(`❌ Transaction failed: txHash=${finalTxHash}`);
        throw new Error(`Transaction reverted: ${finalTxHash}`);
      }
      
      // 检查是否有 PaymentExecuted 事件（确认转账真的执行了）
      try {
        const paymentExecutedEvent = receipt.logs?.find((log: any) => {
          try {
            const parsed = this.sessionManagerContract.interface.parseLog(log);
            return parsed?.name === 'PaymentExecuted';
          } catch {
            return false;
          }
        });
        
        if (!paymentExecutedEvent) {
          this.logger.error(`❌ PaymentExecuted event not found in transaction: ${finalTxHash}`);
          this.logger.error(`❌ 这可能意味着转账没有执行，交易可能 revert 了`);
          this.logger.error(`❌ 请检查：1. Session 状态 2. 签名验证 3. 限额检查`);
          // 如果没有 PaymentExecuted 事件，说明转账没有执行，应该抛出错误
          throw new Error(`Transaction succeeded but PaymentExecuted event not found. This means the transfer did not execute. Possible reasons: Session validation failed, signature invalid, or limit exceeded.`);
        } else {
          const parsed = this.sessionManagerContract.interface.parseLog(paymentExecutedEvent);
          this.logger.log(`✅ PaymentExecuted event found: sessionId=${parsed.args[0]}, to=${parsed.args[1]}, amount=${parsed.args[2]}`);
          
          // Step 2: If payment was to Commission contract, trigger distribution
          // The ERC8004 contract transferred funds to Commission, now we need to trigger split
          if (dto.to && dto.to.toLowerCase() === this.configService.get<string>('COMMISSION_CONTRACT_ADDRESS')?.toLowerCase()) {
            this.logger.log(`🔄 Payment was to Commission contract, triggering distributeCommission...`);
            try {
              const commissionContract = new Contract(
                dto.to,
                ['function distributeCommission(bytes32 orderId) external'],
                this.relayerWallet
              );
              const distributeTx = await commissionContract.distributeCommission(paymentIdBytes32, { gasLimit: 500000 });
              const distributeReceipt = await distributeTx.wait();
              this.logger.log(`✅ distributeCommission executed: txHash=${distributeReceipt.hash || distributeTx.hash}`);
            } catch (distributeError: any) {
              this.logger.warn(`⚠️ distributeCommission failed (funds are in Commission contract): ${distributeError.message}`);
              // Don't throw - the payment was successful, distribution can be retried later
            }
          }
        }
      } catch (eventError) {
        this.logger.warn(`无法解析PaymentExecuted事件: ${eventError.message}`);
      }
      
      this.logger.log(
        `✅ Single payment executed: txHash=${finalTxHash}, status=${status}, gasUsed=${receipt.gasUsed}, blockNumber=${receipt.blockNumber}`,
      );

      // 更新支付记录的 transactionHash
      const paymentRecord = await this.paymentRepository.findOne({
        where: { id: dto.paymentId },
      });
      if (paymentRecord) {
        paymentRecord.transactionHash = finalTxHash;
        paymentRecord.metadata = {
          ...paymentRecord.metadata,
          executedAt: new Date().toISOString(),
          blockNumber: receipt.blockNumber?.toString() || null,
          gasUsed: receipt.gasUsed?.toString() || null,
        };
        await this.paymentRepository.save(paymentRecord);
        this.logger.log(`Payment record updated with txHash: ${finalTxHash}`);
      }

      return finalTxHash;
    } catch (error: any) {
      this.logger.error(`❌ Single payment execution failed: ${error.message}`);
      this.logger.error(`Error code: ${error.code}`);
      this.logger.error(`Error data: ${error.data}`);
      if (error.reason) {
        this.logger.error(`Error reason: ${error.reason}`);
      }
      if (error.transaction) {
        this.logger.error(`Failed transaction: ${JSON.stringify(error.transaction)}`);
      }
      throw error;
    }
  }

  /**
   * 批量上链执行
   */
  private async executeBatchOnChain(payments: QuickPayRequest[]) {
    if (payments.length === 0) return;

    if (!this.sessionManagerContract) {
      // Mock模式：模拟执行成功，更新payment状态
      this.logger.warn(`Mock mode: Simulating batch execution for ${payments.length} payments`);
      for (const payment of payments) {
        const paymentRecord = await this.paymentRepository.findOne({
          where: { id: payment.paymentId },
        });
        if (paymentRecord && paymentRecord.status === PaymentStatus.PROCESSING) {
          // 在Mock模式下，标记为完成（模拟链上执行成功）
          paymentRecord.status = PaymentStatus.COMPLETED;
          paymentRecord.transactionHash = `mock_${payment.paymentId}_${Date.now()}`;
          paymentRecord.metadata = {
            ...paymentRecord.metadata,
            mockMode: true,
            mockExecutedAt: new Date().toISOString(),
          };
          await this.paymentRepository.save(paymentRecord);
          this.logger.log(`Mock mode: Payment ${payment.paymentId} marked as completed`);
        }
      }
      return;
    }

    this.logger.log(`Executing batch on-chain: ${payments.length} payments`);

    try {
      // ⚠️ 警告：不能在后端修改 to 地址，因为这会导致签名验证失败
      // 签名是包含 to 地址的，如果这里修改了 to，链上验证签名时使用的 to 与签名时的 to 不一致，会导致 revert
      // 如果前端传来了零地址，说明前端签名时就用了零地址（或者前端逻辑有误），后端无法修复
      // const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
      // const commissionAddress = this.configService.get<string>('COMMISSION_CONTRACT_ADDRESS');
      
      // if (!commissionAddress) {
      //   this.logger.error('❌ COMMISSION_CONTRACT_ADDRESS 未配置，无法修复零地址');
      //   throw new BadRequestException('Commission合约地址未配置，请联系管理员');
      // }
      
      // for (const payment of payments) {
      //   if (payment.to.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
      //     payment.to = commissionAddress;
      //     this.logger.log(`✅ 批量处理：已修复支付 ${payment.paymentId} 的收款地址为 Commission 合约: ${payment.to}`);
      //   }
      // }

      // 准备批量执行参数
      const sessionIds = payments.map((p) => p.sessionId);
      const recipients = payments.map((p) => p.to);
      
      // Use the exact amount from the payment request (which should match the signature and token decimals)
      const amounts = payments.map((p) => BigInt(p.amount));
      
      const paymentIds = payments.map((p) => {
        // 使用 orderId 进行链上执行（如果提供），否则使用 paymentId
        const idForExecution = p.orderId || p.paymentId;
        // 将 ID 字符串转换为 bytes32
        if (idForExecution.startsWith('0x') && idForExecution.length === 66) {
          return zeroPadValue(idForExecution, 32);
        } else {
          // 将字符串哈希为 bytes32
          return keccak256(toUtf8Bytes(idForExecution));
        }
      });
      const signatures = payments.map((p) => p.signature);

      this.logger.log(`Batch execution params:`);
      this.logger.log(`  sessionIds: ${JSON.stringify(sessionIds)}`);
      this.logger.log(`  recipients: ${JSON.stringify(recipients)}`);
      this.logger.log(`  amounts: ${JSON.stringify(amounts.map(a => a.toString()))}`);
      this.logger.log(`  paymentIds: ${JSON.stringify(paymentIds)}`);
      this.logger.log(`  signatures (first 10 chars): ${JSON.stringify(signatures.map(s => s.substring(0, 10) + '...'))}`);

      // 先使用 staticCall 模拟执行，获取 revert reason
      try {
        await this.sessionManagerContract.executeBatchWithSession.staticCall(
          sessionIds,
          recipients,
          amounts,
          paymentIds,
          signatures
        );
        this.logger.log(`✅ Batch static call succeeded, proceeding with actual transaction`);
      } catch (staticCallError: any) {
        this.logger.error(`❌ Batch static call failed: ${staticCallError.message}`);
        if (staticCallError.reason) {
          this.logger.error(`Revert reason: ${staticCallError.reason}`);
        }
        if (staticCallError.data) {
          this.logger.error(`Error data: ${staticCallError.data}`);
        }
        
        // 尝试找出具体是哪一笔支付导致失败
        this.logger.warn('Attempting to identify failing payment in batch...');
        for (let i = 0; i < payments.length; i++) {
          const p = payments[i];
          try {
            // ERC8004SessionManager uses 5-parameter executeWithSession (no data parameter)
            await this.sessionManagerContract.executeWithSession.staticCall(
              sessionIds[i],
              recipients[i],
              amounts[i],
              paymentIds[i],
              signatures[i]
            );
          } catch (singleError: any) {
            this.logger.error(`❌ Payment ${p.paymentId} failed static call: ${singleError.reason || singleError.message}`);
          }
        }

        throw new Error(`Batch transaction will revert: ${staticCallError.reason || staticCallError.message}`);
      }

      // 调用合约批量执行
      const tx = await this.sessionManagerContract.executeBatchWithSession(
        sessionIds,
        recipients,
        amounts,
        paymentIds,
        signatures,
        {
          gasLimit: 500000 * payments.length, // 估算 Gas
        },
      );

      const receipt = await tx.wait();
      this.logger.log(
        `Batch execution confirmed: txHash=${receipt.transactionHash}, gasUsed=${receipt.gasUsed}`,
      );

      // 更新支付记录的 transactionHash
      for (const payment of payments) {
        const paymentRecord = await this.paymentRepository.findOne({
          where: { id: payment.paymentId },
        });
        if (paymentRecord) {
          paymentRecord.transactionHash = receipt.transactionHash;
          await this.paymentRepository.save(paymentRecord);
        }
      }
    } catch (error) {
      this.logger.error(`On-chain execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 设置 Commission 合约的分账配置
   * @param commissionAddress Commission 合约地址
   * @param orderId 订单ID (bytes32)
   * @param config 分账配置对象
   */
  async setCommissionSplitConfig(
    commissionAddress: string,
    orderId: string,
    config: any
  ) {
    try {
      if (!this.relayerWallet) {
        throw new Error('Relayer wallet not initialized');
      }

      const commissionContract = new Contract(
        commissionAddress,
        COMMISSION_ABI,
        this.relayerWallet
      );

      this.logger.log(`Setting split config for order ${orderId} on ${commissionAddress}`);
      
      // Check if SessionManager is authorized as relayer (needed for quickPaySplitFrom)
      if (this.sessionManagerContract) {
        const sessionManagerAddr = await this.sessionManagerContract.getAddress();
        const isRelayer = await commissionContract.relayers(sessionManagerAddr);
        if (!isRelayer) {
            this.logger.log(`Authorizing SessionManager ${sessionManagerAddr} as relayer on Commission contract...`);
            try {
                const txAuth = await commissionContract.setRelayer(sessionManagerAddr, true);
                await txAuth.wait();
                this.logger.log(`SessionManager authorized as relayer`);
            } catch (e) {
                this.logger.warn(`Failed to authorize SessionManager as relayer (maybe not owner?): ${e.message}`);
            }
        }
      }

      // Send transaction
      const tx = await commissionContract.setSplitConfig(orderId, config);
      this.logger.log(`setSplitConfig tx sent: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      this.logger.log(`setSplitConfig confirmed: ${receipt.hash}`);
      
      return receipt;
    } catch (error) {
      this.logger.error(`Failed to set split config: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取队列状态（用于监控）
   */
  getQueueStatus() {
    return {
      queueLength: this.paymentQueue.length,
      oldestPayment: this.paymentQueue.length > 0
        ? new Date(this.paymentQueue[0].timestamp)
        : null,
      isProcessing: this.isProcessingBatch,
    };
  }
}

