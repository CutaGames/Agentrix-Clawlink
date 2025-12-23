import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EAS, SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';
import { ethers } from 'ethers';

@Injectable()
export class EasService implements OnModuleInit {
  private readonly logger = new Logger(EasService.name);
  private eas: EAS;
  private signer: ethers.Signer;
  
  // 预定义的 Schema UID (在 Sepolia 或 BSC 测试网上的示例)
  private readonly AGENT_REGISTRATION_SCHEMA = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const providerUrl = this.configService.get<string>('RPC_URL');
    const privateKey = this.configService.get<string>('EAS_SIGNER_PRIVATE_KEY');
    const easContractAddress = this.configService.get<string>('EAS_CONTRACT_ADDRESS');

    if (!providerUrl || !privateKey || !easContractAddress) {
      this.logger.warn('EAS 配置不完整，将跳过链上存证功能');
      return;
    }

    try {
      const provider = new ethers.JsonRpcProvider(providerUrl);
      this.signer = new ethers.Wallet(privateKey, provider);
      this.eas = new EAS(easContractAddress);
      this.eas.connect(this.signer);
      this.logger.log('EAS 服务初始化成功');
    } catch (error) {
      this.logger.error(`EAS 初始化失败: ${error.message}`);
    }
  }

  /**
   * 为 Agent 注册发布链上存证
   */
  async attestAgentRegistration(data: {
    agentId: string;
    name: string;
    riskTier: string;
    ownerId: string;
  }): Promise<string | null> {
    if (!this.eas) return null;

    try {
      const schemaEncoder = new SchemaEncoder('string agentId, string name, string riskTier, string ownerId');
      const encodedData = schemaEncoder.encodeData([
        { name: 'agentId', value: data.agentId, type: 'string' },
        { name: 'name', value: data.name, type: 'string' },
        { name: 'riskTier', value: data.riskTier, type: 'string' },
        { name: 'ownerId', value: data.ownerId, type: 'string' },
      ]);

      const tx = await this.eas.attest({
        schema: this.AGENT_REGISTRATION_SCHEMA,
        data: {
          recipient: ethers.ZeroAddress,
          expirationTime: 0n,
          revocable: true,
          data: encodedData,
        },
      });

      const newAttestationUID = await tx.wait();
      this.logger.log(`Agent 存证发布成功: UID=${newAttestationUID}`);
      return newAttestationUID;
    } catch (error) {
      this.logger.error(`发布 Agent 存证失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 为每日审计 Root 发布存证
   */
  async attestAuditRoot(merkleRoot: string, date: string): Promise<string | null> {
    if (!this.eas) return null;

    try {
      const schemaEncoder = new SchemaEncoder('string merkleRoot, string date');
      const encodedData = schemaEncoder.encodeData([
        { name: 'merkleRoot', value: merkleRoot, type: 'string' },
        { name: 'date', value: date, type: 'string' },
      ]);

      const tx = await this.eas.attest({
        schema: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', // 示例审计 Schema
        data: {
          recipient: ethers.ZeroAddress,
          expirationTime: 0n,
          revocable: false,
          data: encodedData,
        },
      });

      return await tx.wait();
    } catch (error) {
      this.logger.error(`发布审计 Root 存证失败: ${error.message}`);
      return null;
    }
  }
}
