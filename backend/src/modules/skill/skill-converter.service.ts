import { Injectable } from '@nestjs/common';
import { Skill, SkillInputSchema } from '../../entities/skill.entity';

@Injectable()
export class SkillConverterService {
  /**
   * Convert AX Skill to OpenAI Function / Tool format
   */
  convertToOpenAI(skill: Skill) {
    const { name, description, inputSchema } = skill;
    
    return {
      type: 'function',
      function: {
        name: name.replace(/[^a-zA-Z0-9_]/g, '_'),
        description,
        parameters: {
          type: 'object',
          properties: inputSchema.properties,
          required: inputSchema.required || [],
        },
      },
    };
  }

  /**
   * Convert AX Skill to Claude MCP (Model Context Protocol) format
   */
  convertToClaude(skill: Skill) {
    const { name, description, inputSchema } = skill;
    
    return {
      name: name.replace(/[^a-zA-Z0-9_]/g, '_'),
      description,
      inputSchema: {
        type: 'object',
        properties: inputSchema.properties,
        required: inputSchema.required || [],
      },
    };
  }

  /**
   * Convert AX Skill to Gemini Function Declaration
   */
  convertToGemini(skill: Skill) {
    const { name, description, inputSchema } = skill;
    
    return {
      name: name.replace(/[^a-zA-Z0-9_]/g, '_'),
      description,
      parameters: {
        type: 'OBJECT',
        properties: inputSchema.properties,
        required: inputSchema.required || [],
      },
    };
  }

  /**
   * Convert AX Skill to OpenAPI 3.0 (for custom GPT Actions)
   */
  convertToOpenAPI(skill: Skill) {
    const { name, description, inputSchema, executor } = skill;
    const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_');
    
    return {
      openapi: '3.0.0',
      info: {
        title: `${name} API`,
        version: skill.version || '1.0.0',
        description,
      },
      paths: {
        [executor.endpoint || '/execute']: {
          [executor.method?.toLowerCase() || 'post']: {
            operationId: safeName,
            summary: description,
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                    },
                  },
                },
              },
            },
            ...(executor.method === 'GET' ? {
              parameters: Object.entries(inputSchema.properties).map(([key, val]) => ({
                name: key,
                in: 'query',
                description: val.description,
                required: inputSchema.required?.includes(key),
                schema: { type: val.type }
              }))
            } : {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: inputSchema.properties,
                      required: inputSchema.required
                    }
                  }
                }
              }
            })
          }
        }
      }
    };
  }
}
