/**
 * Web Tool - HTTP requests and web search
 */

import { ToolDefinition, ToolExecutor, ToolExecutionResult } from '../tool-registry';
import axios from 'axios';

export const httpRequestToolDefinition: ToolDefinition = {
  name: 'http_request',
  description: 'Make an HTTP request to a URL. Useful for checking APIs, fetching data, or testing endpoints.',
  category: 'web',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to request',
      },
      method: {
        type: 'string',
        description: 'HTTP method (GET, POST, PUT, DELETE)',
        enum: ['GET', 'POST', 'PUT', 'DELETE'],
      },
      body: {
        type: 'string',
        description: 'Request body (JSON string, for POST/PUT)',
      },
      headers: {
        type: 'object',
        description: 'Additional headers as key-value pairs',
      },
    },
    required: ['url'],
  },
  timeout: 30,
};

export const httpRequestToolExecutor: ToolExecutor = async (params, context): Promise<ToolExecutionResult> => {
  const { url, method = 'GET', body, headers = {} } = params;
  const startTime = Date.now();

  if (context.dryRun) {
    return { success: true, output: `[DRY RUN] Would ${method} ${url}`, executionTimeMs: 0 };
  }

  try {
    const response = await axios({
      url,
      method: method.toLowerCase(),
      data: body ? JSON.parse(body) : undefined,
      headers: { 'Content-Type': 'application/json', ...headers },
      timeout: 25000,
      validateStatus: () => true,
    });

    const responseBody = typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data, null, 2);

    const truncated = responseBody.length > 6000
      ? responseBody.substring(0, 6000) + '\n... (truncated)'
      : responseBody;

    return {
      success: response.status >= 200 && response.status < 400,
      output: `HTTP ${response.status} ${response.statusText}\n\n${truncated}`,
      data: { status: response.status, headers: response.headers },
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message,
      executionTimeMs: Date.now() - startTime,
    };
  }
};
