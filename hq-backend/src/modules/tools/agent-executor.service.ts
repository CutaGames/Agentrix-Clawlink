/**
 * Agent Executor Service
 * 
 * Phase 2.2: ReAct-style execution loop.
 * Calls AI → if AI requests tool calls → execute tools → feed results back → repeat
 * Supports Bedrock Claude and Gemini function calling.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ToolService } from './tool.service';
import { ToolExecutionContext, ToolExecutionResult } from './tool-registry';
import { HqAIService, ChatMessage, ChatCompletionResult } from '../ai/hq-ai.service';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

export interface AgentExecutorRequest {
  agentCode: string;
  systemPrompt: string;
  messages: ChatMessage[];
  /** Max tool-use iterations (default: 5) */
  maxIterations?: number;
  /** Working directory for tool execution */
  workingDir?: string;
  taskId?: string;
  /** If true, tools won't actually execute */
  dryRun?: boolean;
}

export interface AgentExecutorResult {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls: Array<{
    name: string;
    arguments: Record<string, any>;
    result: ToolExecutionResult;
  }>;
  iterations: number;
}

@Injectable()
export class AgentExecutorService {
  private readonly logger = new Logger(AgentExecutorService.name);
  private proxyAgent: HttpsProxyAgent<string> | null = null;
  private readonly lowCostMode: boolean;
  private readonly defaultMaxIterations: number;
  private readonly defaultMaxTokens: number;

  constructor(
    private readonly toolService: ToolService,
    private readonly aiService: HqAIService,
    private readonly configService: ConfigService,
  ) {
    const proxyUrl = this.configService.get<string>('HTTPS_PROXY') || this.configService.get<string>('HTTP_PROXY');
    if (proxyUrl) {
      this.proxyAgent = new HttpsProxyAgent(proxyUrl);
    }

    this.lowCostMode = String(this.configService.get<string>('HQ_LOW_COST_MODE', process.env.HQ_LOW_COST_MODE || '') || '')
      .toLowerCase() === 'true';
    const envIterations = Number(this.configService.get<string>('HQ_MAX_TOOL_ITERATIONS', this.lowCostMode ? '2' : '5'));
    this.defaultMaxIterations = Math.max(1, Number.isFinite(envIterations) ? envIterations : (this.lowCostMode ? 2 : 5));
    const envTokens = Number(this.configService.get<string>('HQ_MAX_TOKENS', '4096'));
    this.defaultMaxTokens = Math.max(256, Number.isFinite(envTokens) ? envTokens : 4096);
  }

  /**
   * Execute an agent with ReAct tool-use loop
   */
  async execute(request: AgentExecutorRequest): Promise<AgentExecutorResult> {
    const {
      agentCode,
      systemPrompt,
      messages,
      maxIterations,
      workingDir = '/home/ubuntu/Agentrix-independent-HQ',
      taskId,
      dryRun = false,
    } = request;

    const finalMaxIterations = Math.max(1, maxIterations ?? this.defaultMaxIterations);

    const context: ToolExecutionContext = {
      agentCode,
      taskId,
      workingDir,
      dryRun,
    };

    // Determine provider for this agent
    const mapping = this.aiService.getAgentAIConfig(agentCode);
    const provider = mapping?.provider || 'gemini';
    const model = mapping?.model;

    const isBedrock = provider.startsWith('bedrock');
    const isGemini = provider === 'gemini';

    // If provider doesn't support function calling well, fall back to prompt-based tools
    if (!isBedrock && !isGemini) {
      return this.executeWithPromptTools(request, context);
    }

    // Get tools for this agent
    const agentRole = this.getAgentRole(agentCode);
    const toolDefs = this.toolService.getToolsForAgent(agentRole);

    if (toolDefs.length === 0) {
      // No tools available, just do a normal chat
      const result = await this.aiService.chatForAgent(agentCode, messages, { systemPrompt });
      return {
        content: result.content,
        model: result.model,
        usage: result.usage,
        toolCalls: [],
        iterations: 1,
      };
    }

    if (isBedrock) {
      return this.executeBedrockWithTools(agentCode, systemPrompt, messages, toolDefs, context, finalMaxIterations, model);
    } else {
      return this.executeGeminiWithTools(agentCode, systemPrompt, messages, toolDefs, context, finalMaxIterations, model);
    }
  }

  /**
   * Bedrock Claude function calling loop
   */
  private async executeBedrockWithTools(
    agentCode: string,
    systemPrompt: string,
    messages: ChatMessage[],
    toolDefs: any[],
    context: ToolExecutionContext,
    maxIterations: number,
    modelId?: string,
  ): Promise<AgentExecutorResult> {
    const bedrockToken = this.configService.get<string>('AWS_BEARER_TOKEN_BEDROCK');
    const bedrockRegion = this.configService.get<string>('BEDROCK_REGION') ||
                          this.configService.get<string>('AWS_REGION') || 'ap-northeast-1';

    if (!bedrockToken) {
      throw new Error('AWS Bedrock not configured');
    }

    const mapping = this.aiService.getAgentAIConfig(agentCode);
    const finalModelId = modelId || mapping?.model || 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';

    // Convert tools to Claude format
    const claudeTools = toolDefs.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));

    // Build Claude messages
    const claudeMessages: any[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    const allToolCalls: AgentExecutorResult['toolCalls'] = [];
    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let finalContent = '';
    let iterations = 0;

    for (let i = 0; i < maxIterations; i++) {
      iterations++;

      const body: any = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: this.defaultMaxTokens,
        system: systemPrompt,
        messages: claudeMessages,
        tools: claudeTools,
      };

      const encodedModelId = encodeURIComponent(finalModelId);
      const url = `https://bedrock-runtime.${bedrockRegion}.amazonaws.com/model/${encodedModelId}/invoke`;

      this.logger.log(`[ReAct] Iteration ${iterations}: calling Bedrock ${finalModelId}`);

      try {
        const response = await axios.post(url, body, {
          headers: {
            'Authorization': `Bearer ${bedrockToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          httpsAgent: this.proxyAgent || undefined,
          proxy: false,
          timeout: 600000,
        });

        const data = response.data;
        totalUsage.promptTokens += data.usage?.input_tokens || 0;
        totalUsage.completionTokens += data.usage?.output_tokens || 0;
        totalUsage.totalTokens = totalUsage.promptTokens + totalUsage.completionTokens;

        // Check if response contains tool_use blocks
        const contentBlocks = data.content || [];
        const toolUseBlocks = contentBlocks.filter((b: any) => b.type === 'tool_use');
        const textBlocks = contentBlocks.filter((b: any) => b.type === 'text');

        finalContent = textBlocks.map((b: any) => b.text).join('\n');

        if (toolUseBlocks.length === 0 || data.stop_reason === 'end_turn') {
          // No tool calls, we're done
          break;
        }

        // Execute tool calls
        claudeMessages.push({ role: 'assistant', content: contentBlocks });

        const toolResults: any[] = [];
        for (const toolUse of toolUseBlocks) {
          this.logger.log(`[ReAct] Tool call: ${toolUse.name}(${JSON.stringify(toolUse.input).substring(0, 200)})`);

          const result = await this.toolService.executeTool(toolUse.name, toolUse.input, context);
          allToolCalls.push({ name: toolUse.name, arguments: toolUse.input, result });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result.success
              ? result.output
              : `Error: ${result.error}`,
          });
        }

        claudeMessages.push({ role: 'user', content: toolResults });
      } catch (error: any) {
        this.logger.error(`[ReAct] Bedrock error: ${error.message}`);
        if (error.response?.data) {
          this.logger.error(`[ReAct] Response: ${JSON.stringify(error.response.data).substring(0, 500)}`);
        }
        finalContent = `Error during tool execution: ${error.message}`;
        break;
      }
    }

    return {
      content: finalContent,
      model: finalModelId,
      usage: totalUsage,
      toolCalls: allToolCalls,
      iterations,
    };
  }

  /**
   * Gemini function calling loop
   */
  private async executeGeminiWithTools(
    agentCode: string,
    systemPrompt: string,
    messages: ChatMessage[],
    toolDefs: any[],
    context: ToolExecutionContext,
    maxIterations: number,
    modelName?: string,
  ): Promise<AgentExecutorResult> {
    // Gemini function calling via @google/generative-ai
    // For simplicity, fall back to prompt-based tools for Gemini
    // (Gemini function calling API is more complex to integrate)
    return this.executeWithPromptTools(
      { agentCode, systemPrompt, messages, maxIterations, workingDir: context.workingDir, taskId: context.taskId, dryRun: context.dryRun },
      context,
    );
  }

  /**
   * Prompt-based tool execution (for providers without native function calling)
   * Injects tool descriptions into the system prompt and parses tool calls from text
   */
  private async executeWithPromptTools(
    request: AgentExecutorRequest,
    context: ToolExecutionContext,
  ): Promise<AgentExecutorResult> {
    const { agentCode, systemPrompt, messages, maxIterations = 5 } = request;

    const agentRole = this.getAgentRole(agentCode);
    const toolsSummary = this.toolService.getToolsSummary();

    const enhancedSystemPrompt = `${systemPrompt}

${toolsSummary}

## Tool Usage Instructions
When you need to use a tool, output a JSON block in this exact format:
\`\`\`tool_call
{"name": "tool_name", "arguments": {"param1": "value1"}}
\`\`\`

After the tool executes, you will receive the result and can continue your work.
You can make multiple tool calls in sequence. When you're done, provide your final answer without any tool_call blocks.`;

    const allToolCalls: AgentExecutorResult['toolCalls'] = [];
    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let conversationMessages = [...messages];
    let iterations = 0;

    for (let i = 0; i < maxIterations; i++) {
      iterations++;

      const result = await this.aiService.chatForAgent(agentCode, conversationMessages, {
        systemPrompt: enhancedSystemPrompt,
        maxTokens: 16384,
      });

      totalUsage.promptTokens += result.usage.promptTokens;
      totalUsage.completionTokens += result.usage.completionTokens;
      totalUsage.totalTokens = totalUsage.promptTokens + totalUsage.completionTokens;

      // Parse tool calls from response
      const toolCallMatch = result.content.match(/```tool_call\s*\n([\s\S]*?)\n```/);

      if (!toolCallMatch) {
        // No tool call, return final answer
        return {
          content: result.content,
          model: result.model,
          usage: totalUsage,
          toolCalls: allToolCalls,
          iterations,
        };
      }

      // Execute the tool call
      try {
        const toolCall = JSON.parse(toolCallMatch[1]);
        this.logger.log(`[ReAct-Prompt] Tool call: ${toolCall.name}`);

        const toolResult = await this.toolService.executeTool(toolCall.name, toolCall.arguments, context);
        allToolCalls.push({ name: toolCall.name, arguments: toolCall.arguments, result: toolResult });

        // Add assistant response and tool result to conversation
        conversationMessages.push({ role: 'assistant', content: result.content });
        conversationMessages.push({
          role: 'user',
          content: `Tool "${toolCall.name}" result:\n${toolResult.success ? toolResult.output : `Error: ${toolResult.error}`}`,
        });
      } catch (parseError: any) {
        // Failed to parse tool call, treat as final answer
        return {
          content: result.content,
          model: result.model,
          usage: totalUsage,
          toolCalls: allToolCalls,
          iterations,
        };
      }
    }

    // Max iterations reached
    const lastResult = await this.aiService.chatForAgent(agentCode, [
      ...conversationMessages,
      { role: 'user', content: 'Maximum tool iterations reached. Please provide your final summary and answer now.' },
    ], { systemPrompt, maxTokens: 8192 });

    totalUsage.promptTokens += lastResult.usage.promptTokens;
    totalUsage.completionTokens += lastResult.usage.completionTokens;
    totalUsage.totalTokens = totalUsage.promptTokens + totalUsage.completionTokens;

    return {
      content: lastResult.content,
      model: lastResult.model,
      usage: totalUsage,
      toolCalls: allToolCalls,
      iterations: iterations + 1,
    };
  }

  /**
   * Map agent code to role for tool permission filtering
   */
  private getAgentRole(agentCode: string): string {
    // Maps agent code to role for tool permission filtering.
    // 'growth' role grants access to social media tools (twitter_post, telegram_send, etc.)
    // 'bd' role grants access to send_email, github_action, web_search
    const roleMap: Record<string, string> = {
      'ARCHITECT-01': 'architect',
      'CODER-01': 'coder',
      'GROWTH-01': 'growth',
      'BD-01': 'bd',
      'ANALYST-01': 'analyst',
      'SOCIAL-01': 'growth',    // needs social media tools
      'CONTENT-01': 'growth',   // needs web_search, read/write
      'SUPPORT-01': 'support',  // needs github, telegram, discord
      'SECURITY-01': 'analyst', // needs web_search, http_request, read_file
      'DEVREL-01': 'bd',        // needs github_action, web_search
      'LEGAL-01': 'analyst',    // needs web_search, read_file
    };
    return roleMap[agentCode] || 'custom';
  }
}
