/**
 * Tool Registry
 * 
 * Phase 2.1: Central registry for all tools that agents can use.
 * Each tool has a name, description, JSON schema for parameters,
 * and an execute function.
 * 
 * Tools are exposed to AI models via Function Calling.
 */

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  enum?: string[];
  items?: { type: string };
  required?: boolean;
  default?: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'code' | 'search' | 'deploy' | 'notify' | 'analytics' | 'system' | 'web';
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required: string[];
  };
  /** Which agent roles are allowed to use this tool */
  allowedRoles?: string[];
  /** Whether this tool requires human approval before execution */
  requiresApproval?: boolean;
  /** Max execution time in seconds */
  timeout?: number;
}

export interface ToolExecutionContext {
  agentCode: string;
  taskId?: string;
  workingDir?: string;
  dryRun?: boolean;
}

export interface ToolExecutionResult {
  success: boolean;
  output: string;
  data?: any;
  error?: string;
  executionTimeMs?: number;
}

export type ToolExecutor = (
  params: Record<string, any>,
  context: ToolExecutionContext,
) => Promise<ToolExecutionResult>;

export interface RegisteredTool {
  definition: ToolDefinition;
  executor: ToolExecutor;
}

/**
 * Convert ToolDefinition to OpenAI/Claude function calling format
 */
export function toOpenAIFunction(tool: ToolDefinition) {
  return {
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

/**
 * Convert ToolDefinition to Anthropic/Claude tool format
 */
export function toClaudeTool(tool: ToolDefinition) {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  };
}

/**
 * Convert ToolDefinition to Gemini function declaration format
 */
export function toGeminiFunctionDeclaration(tool: ToolDefinition) {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  };
}
