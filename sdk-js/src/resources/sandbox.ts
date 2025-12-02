/**
 * Sandbox resource for PayMind SDK
 * 
 * Provides code execution and testing functionality in a sandbox environment
 */

import { PayMindClient } from '../client';

export interface SandboxExecutionRequest {
  code: string;
  language: 'typescript' | 'javascript' | 'python';
  apiKey?: string;
}

export interface SandboxExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime?: number;
  logs?: string[];
}

export class SandboxResource {
  constructor(private client: PayMindClient) {}

  /**
   * Execute code in sandbox environment
   * 
   * @param request - Code execution request
   * @returns Execution result
   * 
   * @example
   * ```typescript
   * const result = await paymind.sandbox.execute({
   *   code: 'const client = new PayMind({ apiKey: "test" }); await client.payments.create({ amount: 100 });',
   *   language: 'typescript'
   * });
   * ```
   */
  async execute(request: SandboxExecutionRequest): Promise<SandboxExecutionResult> {
    if (!request.code || request.code.trim().length === 0) {
      throw new Error('Code is required');
    }

    if (!request.language) {
      throw new Error('Language is required');
    }

    const validLanguages = ['typescript', 'javascript', 'python'];
    if (!validLanguages.includes(request.language)) {
      throw new Error(`Language must be one of: ${validLanguages.join(', ')}`);
    }

    return this.client.post<SandboxExecutionResult>('/sandbox/execute', {
      code: request.code,
      language: request.language,
      apiKey: request.apiKey,
    });
  }

  /**
   * Execute code with shorthand syntax
   * 
   * @param code - Code to execute
   * @param language - Programming language
   * @returns Execution result
   */
  async executeCode(
    code: string,
    language: 'typescript' | 'javascript' | 'python' = 'typescript'
  ): Promise<SandboxExecutionResult> {
    return this.execute({ code, language });
  }
}

