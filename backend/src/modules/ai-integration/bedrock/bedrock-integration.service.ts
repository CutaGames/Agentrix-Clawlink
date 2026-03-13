import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export interface BedrockUserCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

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
   * Check if a model ID is already a full Bedrock model ARN/ID (e.g. 'us.anthropic.claude-sonnet-4-6-v1:0')
   * vs a short friendly name like 'claude-haiku-4-5'.
   */
  private isFullBedrockModelId(modelId: string): boolean {
    return modelId.includes('.anthropic.') || modelId.includes('.meta.') ||
           modelId.includes('.deepseek.') || modelId.includes('.amazon.') ||
           modelId.includes('.mistral.') || modelId.startsWith('anthropic.') ||
           modelId.startsWith('meta.') || modelId.startsWith('mistral.');
  }

  /**
   * Remap legacy/incorrect model IDs to verified Bedrock model IDs.
   * Handles backward compat for IDs stored in user DB from old catalog.
   */
  private static readonly MODEL_ID_REMAP: Record<string, string> = {
    'us.anthropic.claude-opus-4-6-v1:0':   'us.anthropic.claude-opus-4-20250514-v1:0',
    'us.anthropic.claude-sonnet-4-6-v1:0':  'us.anthropic.claude-sonnet-4-20250514-v1:0',
    'us.anthropic.claude-haiku-4-5-v1:0':   'us.anthropic.claude-haiku-4-5-20251001-v1:0',
    'us.meta.llama4-maverick-v1:0':         'us.meta.llama4-maverick-17b-instruct-v1:0',
    'us.deepseek.deepseek-v3.2-v1:0':       'us.deepseek.r1-v1:0',
    'mistral.mistral-large-v1:0':           'mistral.mistral-large-2402-v1:0',
    'anthropic.claude-sonnet-4-v1:0':       'anthropic.claude-sonnet-4-20250514-v1:0',
    'anthropic.claude-haiku-4-v1:0':        'anthropic.claude-3-5-haiku-20241022-v1:0',
  };

  /**
   * Map short model names to full Bedrock IDs. Also remaps legacy IDs.
   */
  private resolveModelId(modelId: string): string {
    // First check the remap table for legacy/incorrect IDs
    const remapped = BedrockIntegrationService.MODEL_ID_REMAP[modelId];
    if (remapped) return remapped;

    if (this.isFullBedrockModelId(modelId)) return modelId;
    if (modelId.includes('opus')) return 'us.anthropic.claude-opus-4-20250514-v1:0';
    if (modelId.includes('sonnet')) return 'us.anthropic.claude-sonnet-4-20250514-v1:0';
    if (modelId.includes('haiku')) return 'us.anthropic.claude-haiku-4-5-20251001-v1:0';
    return modelId;
  }

  /**
   * Invoke Bedrock model using user's own AWS credentials (SigV4 signing).
   */
  private async invokeWithUserCredentials(modelId: string, body: any, credentials: BedrockUserCredentials): Promise<any> {
    const client = new BedrockRuntimeClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body),
    });
    const response = await client.send(command);
    return JSON.parse(new TextDecoder().decode(response.body));
  }

  /**
   * Invoke Bedrock model using platform Bearer token.
   */
  private async invokeWithPlatformToken(modelId: string, body: any, region: string): Promise<any> {
    const httpsAgent = this.proxy ? new HttpsProxyAgent(this.proxy) : undefined;
    const response = await axios.post(
      `https://bedrock-runtime.${region}.amazonaws.com/model/${modelId}/invoke`,
      body,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        httpsAgent,
        proxy: false,
        timeout: 60000,
      },
    );
    return response.data;
  }

  /**
   * 简单的 Bedrock 调用实现 (作为紧急备选)
   */
  async invokeModel(prompt: string, modelId: string = 'us.anthropic.claude-haiku-4-5-20251001-v1:0', userCredentials?: BedrockUserCredentials): Promise<string> {
    const finalModelId = this.resolveModelId(modelId);
    const region = userCredentials?.region || this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.logger.log(`Calling Bedrock: ${finalModelId} (Region: ${region}, UserCreds: ${!!userCredentials})`);

    const body = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    };

    try {
      const data = userCredentials
        ? await this.invokeWithUserCredentials(finalModelId, body, userCredentials)
        : await this.invokeWithPlatformToken(finalModelId, body, region);
      return data.content[0].text;
    } catch (e: any) {
      this.logger.error(`Bedrock invokeModel failed: ${e.message}`);
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
    const userCreds: BedrockUserCredentials | undefined = options.userCredentials;

    if (!this.token && !userCreds) {
      throw new Error('No Bedrock credentials available (neither platform token nor user credentials)');
    }

    const modelId = this.resolveModelId(options.model || 'us.anthropic.claude-haiku-4-5-20251001-v1:0');
    const region = userCreds?.region || this.configService.get<string>('AWS_REGION') || 'us-east-1';
    
    this.logger.log(`Bedrock chatWithFunctions: ${modelId} (Region: ${region}, UserCreds: ${!!userCreds})`);

    try {
      // 构造 Claude 格式的消息 — preserve multimodal content arrays
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

      const data = userCreds
        ? await this.invokeWithUserCredentials(modelId, body, userCreds)
        : await this.invokeWithPlatformToken(modelId, body, region);

      const content = data.content;
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
