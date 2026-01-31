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

    // 处理模型 ID 映射和兼容性
    let finalModelId = modelId;
    if (finalModelId.includes('opus')) {
      finalModelId = 'anthropic.claude-3-opus-20240229-v1:0';
    } else if (finalModelId.includes('sonnet')) {
      finalModelId = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    } else if (finalModelId.includes('haiku')) {
      finalModelId = 'anthropic.claude-3-5-haiku-20241022-v1:0';
    }

    const httpsAgent = this.proxy ? new HttpsProxyAgent(this.proxy) : undefined;
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    
    this.logger.log(`Calling Bedrock: ${finalModelId} (Region: ${region}, Proxy: ${this.proxy ? 'YES' : 'NO'})`);
    
    try {
      const response = await axios.post(
        `https://bedrock-runtime.${region}.amazonaws.com/model/${finalModelId}/invoke`,
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
          proxy: false,
          timeout: 30000
        }
      );
      return response.data.content[0].text;
    } catch (e: any) {
      this.logger.error(`Bedrock invokeModel failed: ${e.message}`);
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

    // 默认使用 3.5 Sonnet
    let modelId = options.model || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    
    // 映射模型 ID
    if (modelId.includes('opus')) {
      modelId = 'anthropic.claude-3-opus-20240229-v1:0';
    } else if (modelId.includes('sonnet')) {
      modelId = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    } else if (modelId.includes('haiku')) {
      modelId = 'anthropic.claude-3-5-haiku-20241022-v1:0';
    }

    const httpsAgent = this.proxy ? new HttpsProxyAgent(this.proxy) : undefined;
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    
    this.logger.log(`Bedrock chatWithFunctions: ${modelId} (Region: ${region})`);

    try {
      // 构造 Claude 格式的消息
      const claudeMessages = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role,
        content: m.content
      }));

      const systemMessage = messages.find(m => m.role === 'system');

      // 准备 Body
      const body: any = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4000,
        messages: claudeMessages,
      };

      if (systemMessage) {
        body.system = systemMessage.content;
      }

      // 如果有工具定义，添加工具 (Bedrock Anthropic Tool Use 格式)
      if (options.tools && options.tools.length > 0) {
        body.tools = options.tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.parameters
        }));
      }

      const response = await axios.post(
        `https://bedrock-runtime.${region}.amazonaws.com/model/${modelId}/invoke`,
        body,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          httpsAgent,
          proxy: false,
          timeout: 60000
        }
      );

      const content = response.data.content;
      let text = '';
      const toolCalls: any[] = [];

      for (const item of content) {
        if (item.type === 'text') {
          text += item.text;
        } else if (item.type === 'tool_use') {
          toolCalls.push({
            id: item.id,
            type: 'function',
            function: {
              name: item.name,
              arguments: JSON.stringify(item.input)
            }
          });
        }
      }

      return {
        text,
        functionCalls: toolCalls.length > 0 ? toolCalls : null,
        model: modelId
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
