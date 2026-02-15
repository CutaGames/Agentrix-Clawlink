/**
 * Tool Service
 * 
 * Phase 2.1: Central service that manages tool registration and execution.
 * Provides tools to the AI service for function calling.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  RegisteredTool,
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
  toOpenAIFunction,
  toClaudeTool,
  toGeminiFunctionDeclaration,
} from './tool-registry';

// Import built-in tools
import {
  shellToolDefinition, shellToolExecutor,
} from './builtin/shell-tool';
import {
  readFileToolDefinition, readFileToolExecutor,
  writeFileToolDefinition, writeFileToolExecutor,
  editFileToolDefinition, editFileToolExecutor,
  searchFilesToolDefinition, searchFilesToolExecutor,
  listDirToolDefinition, listDirToolExecutor,
} from './builtin/file-tool';
import {
  httpRequestToolDefinition, httpRequestToolExecutor,
} from './builtin/web-tool';
import {
  tweetToolDefinition, tweetToolExecutor,
  twitterSearchToolDefinition, twitterSearchToolExecutor,
  twitterEngageToolDefinition, twitterEngageToolExecutor,
  telegramSendToolDefinition, telegramSendToolExecutor,
  discordSendToolDefinition, discordSendToolExecutor,
  sendEmailToolDefinition, sendEmailToolExecutor,
  githubToolDefinition, githubToolExecutor,
  webSearchToolDefinition, webSearchToolExecutor,
  socialPublishToolDefinition, socialPublishToolExecutor,
} from './builtin/social-tool';

@Injectable()
export class ToolService {
  private readonly logger = new Logger(ToolService.name);
  private tools: Map<string, RegisteredTool> = new Map();

  constructor() {
    this.registerBuiltinTools();
  }

  private registerBuiltinTools() {
    // File tools
    this.register(readFileToolDefinition, readFileToolExecutor);
    this.register(writeFileToolDefinition, writeFileToolExecutor);
    this.register(editFileToolDefinition, editFileToolExecutor);
    this.register(searchFilesToolDefinition, searchFilesToolExecutor);
    this.register(listDirToolDefinition, listDirToolExecutor);

    // Shell tool
    this.register(shellToolDefinition, shellToolExecutor);

    // Web tool
    this.register(httpRequestToolDefinition, httpRequestToolExecutor);

    // Social media tools
    this.register(tweetToolDefinition, tweetToolExecutor);
    this.register(twitterSearchToolDefinition, twitterSearchToolExecutor);
    this.register(twitterEngageToolDefinition, twitterEngageToolExecutor);
    this.register(telegramSendToolDefinition, telegramSendToolExecutor);
    this.register(discordSendToolDefinition, discordSendToolExecutor);
    this.register(sendEmailToolDefinition, sendEmailToolExecutor);
    this.register(githubToolDefinition, githubToolExecutor);
    this.register(webSearchToolDefinition, webSearchToolExecutor);
    this.register(socialPublishToolDefinition, socialPublishToolExecutor);

    this.logger.log(`🔧 Tool Registry initialized with ${this.tools.size} tools`);
  }

  /**
   * Register a new tool
   */
  register(definition: ToolDefinition, executor: (params: Record<string, any>, context: ToolExecutionContext) => Promise<ToolExecutionResult>) {
    this.tools.set(definition.name, { definition, executor });
    this.logger.debug(`Registered tool: ${definition.name}`);
  }

  /**
   * Get all registered tool definitions
   */
  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  /**
   * Get tool definitions filtered by agent role
   */
  getToolsForAgent(agentRole: string): ToolDefinition[] {
    return this.getToolDefinitions().filter(tool => {
      if (!tool.allowedRoles || tool.allowedRoles.length === 0) return true;
      return tool.allowedRoles.includes(agentRole.toLowerCase());
    });
  }

  /**
   * Get tools in OpenAI function calling format
   */
  getOpenAITools(agentRole?: string): any[] {
    const defs = agentRole ? this.getToolsForAgent(agentRole) : this.getToolDefinitions();
    return defs.map(toOpenAIFunction);
  }

  /**
   * Get tools in Claude/Anthropic format
   */
  getClaudeTools(agentRole?: string): any[] {
    const defs = agentRole ? this.getToolsForAgent(agentRole) : this.getToolDefinitions();
    return defs.map(toClaudeTool);
  }

  /**
   * Get tools in Gemini format
   */
  getGeminiTools(agentRole?: string): any[] {
    const defs = agentRole ? this.getToolsForAgent(agentRole) : this.getToolDefinitions();
    return defs.map(toGeminiFunctionDeclaration);
  }

  /**
   * Execute a tool by name
   */
  async executeTool(
    toolName: string,
    params: Record<string, any>,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        success: false,
        output: '',
        error: `Tool "${toolName}" not found. Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
      };
    }

    // Check role permission
    if (tool.definition.allowedRoles && tool.definition.allowedRoles.length > 0) {
      // We don't have the role in context directly, so skip role check here
      // (it's enforced at the getToolsForAgent level)
    }

    this.logger.log(`🔧 Executing tool: ${toolName} (agent: ${context.agentCode})`);

    const timeout = (tool.definition.timeout || 30) * 1000;

    try {
      const result = await Promise.race([
        tool.executor(params, context),
        new Promise<ToolExecutionResult>((_, reject) =>
          setTimeout(() => reject(new Error(`Tool execution timed out after ${timeout / 1000}s`)), timeout)
        ),
      ]);

      this.logger.log(`✅ Tool ${toolName} completed (success: ${result.success}, ${result.executionTimeMs || 0}ms)`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Tool ${toolName} failed: ${error.message}`);
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  /**
   * Execute multiple tool calls (from a single AI response)
   */
  async executeToolCalls(
    calls: Array<{ name: string; arguments: Record<string, any> }>,
    context: ToolExecutionContext,
  ): Promise<Array<{ toolName: string; result: ToolExecutionResult }>> {
    const results: Array<{ toolName: string; result: ToolExecutionResult }> = [];

    for (const call of calls) {
      const result = await this.executeTool(call.name, call.arguments, context);
      results.push({ toolName: call.name, result });
    }

    return results;
  }

  /**
   * Get a summary of all available tools (for system prompts)
   */
  getToolsSummary(): string {
    const lines = ['## Available Tools\n'];
    for (const tool of this.tools.values()) {
      const d = tool.definition;
      const params = Object.entries(d.parameters.properties)
        .map(([name, p]) => `  - ${name} (${p.type}${d.parameters.required.includes(name) ? ', required' : ''}): ${p.description}`)
        .join('\n');
      lines.push(`### ${d.name}\n${d.description}\nParameters:\n${params}\n`);
    }
    return lines.join('\n');
  }
}
