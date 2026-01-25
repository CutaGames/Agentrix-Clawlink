import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

@Injectable()
export class BedrockIntegrationService {
  private readonly logger = new Logger(BedrockIntegrationService.name);
  private readonly token: string | undefined;
  private readonly proxy: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.token = this.configService.get<string>('AWS_BEARER_TOKEN_BEDROCK');
    this.proxy = this.configService.get<string>('HTTPS_PROXY') || this.configService.get<string>('https_proxy');
    
    if (!this.token) {
      this.logger.warn('AWS_BEARER_TOKEN_BEDROCK is not set. Bedrock fallback is limited.');
    }
  }

  /**
   * 简单的 Bedrock 调用实现 (作为紧急备选)
   */
  async invokeModel(prompt: string, modelId: string = 'anthropic.claude-3-5-sonnet-20241022-v2:0'): Promise<string> {
    if (!this.token) {
      this.logger.error('No Bedrock token available.');
      return 'Bedrock token missing';
    }

    const httpsAgent = this.proxy ? new HttpsProxyAgent(this.proxy) : undefined;
    
    this.logger.log(`Calling Bedrock: ${modelId} (Proxy: ${this.proxy ? 'YES' : 'NO'})`);
    
    try {
      const response = await axios.post(
        `https://bedrock-runtime.us-east-1.amazonaws.com/model/${modelId}/invoke`,
        {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          httpsAgent,
          proxy: false
        }
      );
      return response.data.content[0].text;
    } catch (e: any) {
      this.logger.error(`Bedrock call failed: ${e.message}`);
      if (e.response) {
        this.logger.error(`Response status: ${e.response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(e.response.data)}`);
      }
      throw e;
    }
  }

  /**
   * 用于 HQ 的通用对话接口
   */
  async chat(messages: any[], options: { model?: string } = {}): Promise<any> {
    const prompt = messages[messages.length - 1].content;
    const text = await this.invokeModel(prompt, options.model);
    return {
      text,
      model: options.model || 'bedrock-default'
    };
  }

  /**
   * 支持 Function Calling 的对话接口
   */
  async chatWithFunctions(messages: any[], options: any = {}): Promise<any> {
    if (!this.token) {
      throw new Error('AWS_BEARER_TOKEN_BEDROCK is not configured');
    }

    const modelId = options.model || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    const httpsAgent = this.proxy ? new HttpsProxyAgent(this.proxy) : undefined;
    
    this.logger.log(`Bedrock chatWithFunctions: ${modelId}`);

    try {
      // 构造 Claude 格式的消息
      const claudeMessages = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role,
        content: m.content
      }));

      const systemMessage = messages.find(m => m.role === 'system');

      const response = await axios.post(
        `https://bedrock-runtime.us-east-1.amazonaws.com/model/${modelId}/invoke`,
        {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 4000,
          messages: claudeMessages,
          system: systemMessage?.content || undefined,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          httpsAgent,
          proxy: false
        }
      );

      const content = response.data.content[0];
      return {
        text: content.text || '',
        functionCalls: null
      };
    } catch (e: any) {
      this.logger.error(`Bedrock chatWithFunctions failed: ${e.message}`);
      if (e.response) {
        this.logger.error(`Status: ${e.response.status}, Data: ${JSON.stringify(e.response.data)}`);
      }
      throw e;
    }
  }
}
