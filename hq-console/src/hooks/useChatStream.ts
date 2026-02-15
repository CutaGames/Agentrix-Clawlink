/**
 * useChatStream Hook
 * 
 * 管理流式对话 - 从 AgentChat.tsx 拆分
 * 处理消息流、工具调用、权限请求
 */

import { useState, useCallback, useRef } from 'react';
import { chatWithAgent, chatWithAgentStream } from '@/lib/api';
import { parseToolCalls, stripToolCallsFromContent, ToolCall } from '@/lib/tools';
import { isToolAllowed } from '@/lib/agent-permissions';
import type { ToolExecution } from '@/hooks/useTools';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  agentCode?: string;
  timestamp: Date;
  attachments?: any[];
  generatedFiles?: any[];
  toolExecutions?: ToolExecution[];
  permissionRequest?: any;
  tokenUsage?: TokenUsage;
}

export interface ChatStreamCallbacks {
  onThinkingStart?: () => void;
  onThinkingEnd?: () => void;
  onActivityChange?: (activity: {
    type: string;
    description: string;
    status: 'running' | 'completed' | 'error';
  }) => void;
  onFileChange?: (change: any) => void;
  onTerminalOutput?: (output: any) => void;
}

export interface UseChatStreamOptions {
  onToolExecute?: (calls: ToolCall[]) => Promise<{ results: ToolExecution[] }>;
  buildSystemPrompt?: (workspaceRoot?: string) => string;
  callbacks?: ChatStreamCallbacks;
  onStreamingUpdate?: (msgId: string, content: string) => void;
  onIterationLimitReached?: (iterationCount: number) => Promise<'continue' | 'summarize'>;
}

/**
 * Compress conversation history to reduce context length.
 * Keeps recent messages in full, summarizes older ones.
 * Threshold: if total chars > 30000 (~10k tokens), compress older messages.
 */
function compressConversationHistory(
  messages: { role: 'user' | 'assistant'; content: string }[]
): { role: 'user' | 'assistant'; content: string }[] {
  const MAX_CHARS = 30000; // ~10k tokens
  const KEEP_RECENT = 6; // Always keep last N messages in full

  // Calculate total character count
  const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  if (totalChars <= MAX_CHARS || messages.length <= KEEP_RECENT) {
    return messages;
  }

  // Split into old (to compress) and recent (to keep)
  const recentMessages = messages.slice(-KEEP_RECENT);
  const oldMessages = messages.slice(0, -KEEP_RECENT);

  // Summarize old messages: keep first 200 chars of each, mark as compressed
  const summaryParts: string[] = [];
  for (const msg of oldMessages) {
    const preview = msg.content.length > 200
      ? msg.content.slice(0, 200) + '...'
      : msg.content;
    summaryParts.push(`[${msg.role}]: ${preview}`);
  }

  const summaryMessage: { role: 'user' | 'assistant'; content: string } = {
    role: 'user',
    content: `[CONVERSATION HISTORY SUMMARY - ${oldMessages.length} earlier messages compressed]\n${summaryParts.join('\n')}`,
  };

  console.log(`[useChatStream] Compressed ${oldMessages.length} old messages (${oldMessages.reduce((s, m) => s + m.content.length, 0)} chars) into summary (${summaryMessage.content.length} chars)`);

  return [summaryMessage, ...recentMessages];
}

/**
 * Detect if a response appears truncated (hit maxTokens limit mid-output).
 * Checks: response is long enough AND ends without natural conclusion markers.
 */
function detectTruncation(rawResponse: string, cleanContent: string): boolean {
  // Short responses are not truncated
  if (cleanContent.length < 2000) return false;
  
  const trimmed = cleanContent.trimEnd();
  if (!trimmed) return false;

  // Natural ending patterns (Chinese and English)
  const naturalEndings = [
    /[。！？.!?]\s*$/,           // Ends with sentence-ending punctuation
    /```\s*$/,                    // Ends with code block
    /\*{2,}\s*$/,                 // Ends with bold marker
    /---+\s*$/,                   // Ends with horizontal rule
    /\|\s*$/,                     // Ends with table row
    />\s*$/,                      // Ends with blockquote (but could be truncated)
  ];

  // If it ends naturally, not truncated
  for (const pattern of naturalEndings) {
    if (pattern.test(trimmed)) return false;
  }

  // Check if it ends mid-word, mid-sentence, or with incomplete markdown
  const lastChar = trimmed[trimmed.length - 1];
  const midSentenceChars = /[,，、:：;；\-\(（\[{<]/;
  
  // Ends with a comma, colon, or opening bracket — likely truncated
  if (midSentenceChars.test(lastChar)) return true;

  // Raw response near maxTokens output limit (~16384 tokens ≈ ~49000 chars for mixed CJK)
  // If raw response is very long, likely hit the limit
  if (rawResponse.length > 40000) return true;

  // Check for incomplete markdown structures
  const openCodeBlocks = (trimmed.match(/```/g) || []).length;
  if (openCodeBlocks % 2 !== 0) return true; // Unclosed code block

  // If the last line is very short and doesn't look like a conclusion
  const lines = trimmed.split('\n');
  const lastLine = lines[lines.length - 1].trim();
  if (lastLine.length > 0 && lastLine.length < 20 && !/[。！？.!?]$/.test(lastLine)) {
    // Short last line without punctuation — possibly truncated
    if (rawResponse.length > 10000) return true;
  }

  return false;
}

export function useChatStream(options: UseChatStreamOptions = {}) {
  const { onToolExecute, buildSystemPrompt, callbacks, onStreamingUpdate, onIterationLimitReached } = options;
  const [loading, setLoading] = useState(false);
  const [thinkingStartTime, setThinkingStartTime] = useState<Date | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const pendingUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Throttled streaming update to prevent React hydration errors from rapid state changes
  const throttledStreamingUpdate = useCallback((msgId: string, content: string) => {
    if (!onStreamingUpdate) return;
    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;
    if (elapsed >= 50) {
      lastUpdateRef.current = now;
      onStreamingUpdate(msgId, content);
    } else {
      // Schedule a deferred update
      if (pendingUpdateRef.current) clearTimeout(pendingUpdateRef.current);
      pendingUpdateRef.current = setTimeout(() => {
        lastUpdateRef.current = Date.now();
        onStreamingUpdate(msgId, content);
        pendingUpdateRef.current = null;
      }, 50 - elapsed);
    }
  }, [onStreamingUpdate]);

  const thinkingDuration = thinkingStartTime
    ? Math.floor((Date.now() - thinkingStartTime.getTime()) / 1000)
    : 0;

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setThinkingStartTime(null);
    callbacks?.onActivityChange?.({ type: 'stopped', description: '已停止', status: 'completed' });
  }, [callbacks]);

  /**
   * 发送消息并处理流式响应
   */
  const sendMessage = useCallback(
    async (params: {
      agentCode: string;
      conversationHistory: Message[];
      userContent: string;
      workspaceRootPath?: string;
    }): Promise<{ message: Message; model?: string; isTruncated?: boolean } | null> => {
      const { agentCode, conversationHistory, userContent, workspaceRootPath } = params;

      setLoading(true);
      setThinkingStartTime(new Date());
      callbacks?.onThinkingStart?.();
      callbacks?.onActivityChange?.({ type: 'thinking', description: 'Agent 思考中...', status: 'running' });

      // Create AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const signal = abortController.signal;

      try {
        // 构建系统提示词
        const systemPrompt = buildSystemPrompt?.(workspaceRootPath) || '';
        const systemMessage = { role: 'system' as const, content: systemPrompt };

        // 构建消息历史 (with compression for long conversations)
        const historyMessages = conversationHistory.map(m => ({
          role: m.role === 'tool' ? ('assistant' as const) : (m.role as 'user' | 'assistant'),
          content: m.content,
        }));
        const compressedHistory = compressConversationHistory(historyMessages);
        const apiMessages = [
          systemMessage,
          ...compressedHistory,
          { role: 'user' as const, content: userContent },
        ];

        // 创建流式消息占位符
        const streamingMsgId = (Date.now() + 1).toString();
        let responseContent = '';
        let accumulatedContent = ''; // All responses across iterations
        let model: string | undefined;
        // promptTokens: use max (backend re-estimates full context each call)
        // completionTokens: sum across all calls
        let totalUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

        // 尝试流式调用
        callbacks?.onActivityChange?.({ type: 'thinking', description: '等待 AI 响应...', status: 'running' });

        try {
          const response = await chatWithAgentStream(
            agentCode,
            apiMessages,
            { toolPrompt: systemPrompt, signal },
            {
              onChunk: (_chunk, full) => {
                responseContent = full;
                // Real-time streaming update: strip tool XML for clean display
                const cleanContent = stripToolCallsFromContent(full);
                if (cleanContent) {
                  throttledStreamingUpdate(streamingMsgId, cleanContent);
                }
              },
              onMeta: (meta) => {
                if (meta?.model) model = meta.model;
              },
              onStatus: () => {
                callbacks?.onActivityChange?.({ type: 'thinking', description: '流式接收中...', status: 'running' });
              },
            }
          );
          // Flush any pending throttled update
          if (pendingUpdateRef.current) { clearTimeout(pendingUpdateRef.current); pendingUpdateRef.current = null; }
          const initialClean = stripToolCallsFromContent(responseContent);
          if (initialClean) onStreamingUpdate?.(streamingMsgId, initialClean);
          responseContent = responseContent || response?.content || 'OK';
          if (response?.model) model = response.model;
          if (response?.usage) {
            totalUsage.promptTokens = Math.max(totalUsage.promptTokens, response.usage.promptTokens);
            totalUsage.completionTokens += response.usage.completionTokens;
          }
        } catch (streamError: any) {
          console.warn('[useChatStream] Stream failed, falling back to standard chat:', streamError?.message);
          // Fallback to non-streaming
          const response = await chatWithAgent(agentCode, apiMessages);
          responseContent = response?.content || 'OK';
          if (response?.model) model = response.model;
        }

        callbacks?.onActivityChange?.({ type: 'thinking', description: '收到响应', status: 'completed' });
        accumulatedContent = stripToolCallsFromContent(responseContent);

        // Tool execution loop: execute tools, send results back to AI, repeat
        let allToolResults: ToolExecution[] = [];
        let currentApiMessages = [...apiMessages];
        let iterationCount = 0;
        let maxIterations = 20;

        let toolCalls = parseToolCalls(responseContent);

        while (toolCalls.length > 0 && iterationCount < maxIterations && onToolExecute) {
          iterationCount++;
          const agentPermissionKey = agentCode;
          const allowedToolCalls = toolCalls.filter(tc => isToolAllowed(agentPermissionKey, tc.tool));
          const deniedToolCalls = toolCalls.filter(tc => !isToolAllowed(agentPermissionKey, tc.tool));

          if (deniedToolCalls.length > 0) {
            callbacks?.onActivityChange?.({ type: 'permission', description: '部分工具被权限策略拦截', status: 'error' });
          }

          // Execute all allowed tools - if the permission system allows them, override the XML requiresPermission flag
          const autoExecute = allowedToolCalls;
          if (autoExecute.length === 0) break;

          console.log(`[useChatStream] Iteration ${iterationCount}: executing ${autoExecute.length} tools`);
          callbacks?.onActivityChange?.({ type: 'thinking', description: `执行工具 (${iterationCount}/${maxIterations})...`, status: 'running' });

          for (const tool of autoExecute) {
            const toolType = tool.tool === 'read_file' ? 'reading_file'
              : tool.tool === 'write_file' ? 'writing_file'
              : tool.tool === 'edit_file' ? 'editing_file'
              : tool.tool === 'list_dir' ? 'listing_dir'
              : tool.tool === 'run_command' ? 'running_command'
              : 'thinking';
            callbacks?.onActivityChange?.({
              type: toolType,
              description: `执行 ${tool.tool}: ${JSON.stringify(tool.params).slice(0, 50)}...`,
              status: 'running'
            });
          }

          const { results } = await onToolExecute(autoExecute);
          allToolResults = [...allToolResults, ...results];

          // Notify tool execution results
          for (const result of results) {
            if (['read_file', 'write_file', 'edit_file'].includes(result.tool)) {
              callbacks?.onFileChange?.({
                type: result.tool === 'read_file' ? 'read' : result.tool === 'write_file' ? 'write' : 'edit',
                path: result.params.filePath || result.params.path,
                preview: result.result?.content?.slice(0, 200) || result.result?.message,
                success: result.status === 'success',
                error: result.error,
              });
            } else if (result.tool === 'run_command') {
              callbacks?.onTerminalOutput?.({
                command: result.params.command,
                output: result.result?.stdout || result.result?.output || '',
                exitCode: result.result?.exitCode,
                cwd: result.params.cwd,
              });
            }
            callbacks?.onActivityChange?.({
              type: result.tool,
              description: `${result.tool} ${result.status === 'success' ? '成功' : '失败'}`,
              status: result.status === 'success' ? 'completed' : 'error'
            });
          }

          // Build tool results text and send back to AI for follow-up
          const toolResultsText = results.map(r => {
            const statusIcon = r.status === 'success' ? '✅' : '❌';
            const resultData = r.status === 'success'
              ? JSON.stringify(r.result, null, 2)?.slice(0, 3000)
              : r.error;
            return `${statusIcon} ${r.tool}: ${resultData}`;
          }).join('\n\n');

          // Add assistant response + tool results to conversation
          currentApiMessages = [
            ...currentApiMessages,
            { role: 'assistant' as const, content: responseContent },
            { role: 'user' as const, content: `[Tool Execution Results]\n\n${toolResultsText}\n\nIMPORTANT: Continue working on the original task. If you need to read more files, run more commands, or perform more analysis to fully complete the task, use the available tools now. Only provide your final summary when you have gathered ALL the information needed. Do NOT stop early.` },
          ];

          // Get follow-up response from AI
          callbacks?.onActivityChange?.({ type: 'thinking', description: `Agent 处理工具结果 (${iterationCount}/${maxIterations})...`, status: 'running' });
          responseContent = ''; // Reset before follow-up
          try {
            console.log(`[useChatStream] Follow-up call ${iterationCount}, messages: ${currentApiMessages.length}`);
            const followUp = await chatWithAgentStream(
              agentCode,
              currentApiMessages,
              { toolPrompt: systemPrompt, signal },
              {
                onChunk: (_chunk, full) => {
                  responseContent = full;
                  const cleanContent = stripToolCallsFromContent(full);
                  if (cleanContent) {
                    const displayContent = accumulatedContent
                      ? accumulatedContent + '\n\n' + cleanContent
                      : cleanContent;
                    throttledStreamingUpdate(streamingMsgId, displayContent);
                  }
                },
                onMeta: (meta) => {
                  if (meta?.model) model = meta.model;
                },
                onStatus: () => {
                  callbacks?.onActivityChange?.({ type: 'thinking', description: '流式接收中...', status: 'running' });
                },
              }
            );
            responseContent = responseContent || followUp?.content || '';
            console.log(`[useChatStream] Follow-up ${iterationCount} response length: ${responseContent.length}`);
            if (followUp?.model) model = followUp.model;
            if (followUp?.usage) {
              totalUsage.promptTokens = Math.max(totalUsage.promptTokens, followUp.usage.promptTokens);
              totalUsage.completionTokens += followUp.usage.completionTokens;
            }
          } catch (followUpError: any) {
            console.warn('[useChatStream] Follow-up stream failed, using standard chat:', followUpError?.message);
            try {
              const followUp = await chatWithAgent(agentCode, currentApiMessages);
              responseContent = followUp?.content || '';
              if (followUp?.model) model = followUp.model;
            } catch {
              console.error('[useChatStream] Both stream and standard chat failed, breaking loop');
              break;
            }
          }

          // Accumulate clean content from this iteration
          const cleanContent = stripToolCallsFromContent(responseContent);
          if (cleanContent) {
            accumulatedContent = accumulatedContent
              ? accumulatedContent + '\n\n' + cleanContent
              : cleanContent;
            onStreamingUpdate?.(streamingMsgId, accumulatedContent);
          }

          // Check for more tool calls in the new response
          toolCalls = parseToolCalls(responseContent);
          console.log(`[useChatStream] Iteration ${iterationCount} done, found ${toolCalls.length} more tool calls, response preview: ${responseContent.slice(0, 200)}`);
        }

        // If loop exited due to max iterations and there are still pending tool calls,
        // ask user whether to continue or generate summary
        while (iterationCount >= maxIterations && toolCalls.length > 0) {
          console.log(`[useChatStream] Hit max iterations (${maxIterations}), asking user`);
          callbacks?.onActivityChange?.({ type: 'waiting', description: `已执行 ${iterationCount} 轮工具调用，等待确认...`, status: 'running' });

          // Ask user: continue or summarize?
          let userChoice: 'continue' | 'summarize' = 'summarize';
          if (onIterationLimitReached) {
            try {
              userChoice = await onIterationLimitReached(iterationCount);
            } catch {
              userChoice = 'summarize';
            }
          }

          if (userChoice === 'continue') {
            // Extend the limit by 10 and continue the tool loop
            maxIterations += 10;
            console.log(`[useChatStream] User chose to continue, new maxIterations: ${maxIterations}`);
            callbacks?.onActivityChange?.({ type: 'thinking', description: `继续执行工具调用...`, status: 'running' });

            // Re-enter the tool execution loop for the pending tool calls
            while (toolCalls.length > 0 && iterationCount < maxIterations && onToolExecute) {
              iterationCount++;
              const agentPermissionKey = agentCode;
              const allowedToolCalls = toolCalls.filter(tc => isToolAllowed(agentPermissionKey, tc.tool));
              const autoExecute = allowedToolCalls;
              if (autoExecute.length === 0) break;

              console.log(`[useChatStream] Iteration ${iterationCount}: executing ${autoExecute.length} tools`);
              callbacks?.onActivityChange?.({ type: 'thinking', description: `执行工具 (${iterationCount})...`, status: 'running' });

              for (const tool of autoExecute) {
                const toolType = tool.tool === 'read_file' ? 'reading_file'
                  : tool.tool === 'write_file' ? 'writing_file'
                  : tool.tool === 'edit_file' ? 'editing_file'
                  : tool.tool === 'list_dir' ? 'listing_dir'
                  : tool.tool === 'run_command' ? 'running_command'
                  : 'thinking';
                callbacks?.onActivityChange?.({
                  type: toolType,
                  description: `执行 ${tool.tool}: ${JSON.stringify(tool.params).slice(0, 50)}...`,
                  status: 'running'
                });
              }

              const { results } = await onToolExecute(autoExecute);
              allToolResults = [...allToolResults, ...results];

              for (const result of results) {
                if (['read_file', 'write_file', 'edit_file'].includes(result.tool)) {
                  callbacks?.onFileChange?.({
                    type: result.tool === 'read_file' ? 'read' : result.tool === 'write_file' ? 'write' : 'edit',
                    path: result.params.filePath || result.params.path,
                    preview: result.result?.content?.slice(0, 200) || result.result?.message,
                    success: result.status === 'success',
                    error: result.error,
                  });
                } else if (result.tool === 'run_command') {
                  callbacks?.onTerminalOutput?.({
                    command: result.params.command,
                    output: result.result?.stdout || result.result?.output || '',
                    exitCode: result.result?.exitCode,
                    cwd: result.params.cwd,
                  });
                }
                callbacks?.onActivityChange?.({
                  type: result.tool,
                  description: `${result.tool} ${result.status === 'success' ? '成功' : '失败'}`,
                  status: result.status === 'success' ? 'completed' : 'error'
                });
              }

              const toolResultsText = results.map(r => {
                const statusIcon = r.status === 'success' ? '✅' : '❌';
                const resultData = r.status === 'success'
                  ? JSON.stringify(r.result, null, 2)?.slice(0, 3000)
                  : r.error;
                return `${statusIcon} ${r.tool}: ${resultData}`;
              }).join('\n\n');

              currentApiMessages = [
                ...currentApiMessages,
                { role: 'assistant' as const, content: responseContent },
                { role: 'user' as const, content: `[Tool Execution Results]\n\n${toolResultsText}\n\nIMPORTANT: Continue working on the original task. If you need to read more files, run more commands, or perform more analysis to fully complete the task, use the available tools now. Only provide your final summary when you have gathered ALL the information needed. Do NOT stop early.` },
              ];

              callbacks?.onActivityChange?.({ type: 'thinking', description: `Agent 处理工具结果 (${iterationCount})...`, status: 'running' });
              responseContent = '';
              try {
                const followUp = await chatWithAgentStream(
                  agentCode,
                  currentApiMessages,
                  { toolPrompt: systemPrompt, signal },
                  {
                    onChunk: (_chunk, full) => {
                      responseContent = full;
                      const cleanContent = stripToolCallsFromContent(full);
                      if (cleanContent) {
                        const displayContent = accumulatedContent
                          ? accumulatedContent + '\n\n' + cleanContent
                          : cleanContent;
                        throttledStreamingUpdate(streamingMsgId, displayContent);
                      }
                    },
                    onMeta: (meta) => {
                      if (meta?.model) model = meta.model;
                    },
                    onStatus: () => {
                      callbacks?.onActivityChange?.({ type: 'thinking', description: '流式接收中...', status: 'running' });
                    },
                  }
                );
                responseContent = responseContent || followUp?.content || '';
                if (followUp?.model) model = followUp.model;
                if (followUp?.usage) {
                  totalUsage.promptTokens = Math.max(totalUsage.promptTokens, followUp.usage.promptTokens);
                  totalUsage.completionTokens += followUp.usage.completionTokens;
                }
              } catch (followUpError: any) {
                console.warn('[useChatStream] Follow-up stream failed:', followUpError?.message);
                try {
                  const followUp = await chatWithAgent(agentCode, currentApiMessages);
                  responseContent = followUp?.content || '';
                  if (followUp?.model) model = followUp.model;
                } catch {
                  break;
                }
              }

              const cleanContent = stripToolCallsFromContent(responseContent);
              if (cleanContent) {
                accumulatedContent = accumulatedContent
                  ? accumulatedContent + '\n\n' + cleanContent
                  : cleanContent;
                onStreamingUpdate?.(streamingMsgId, accumulatedContent);
              }

              toolCalls = parseToolCalls(responseContent);
              console.log(`[useChatStream] Iteration ${iterationCount} done, found ${toolCalls.length} more tool calls`);
            }
            // Loop back to check if we hit the new limit again
            continue;
          }

          // User chose 'summarize' — send final summary request
          console.log(`[useChatStream] User chose to summarize after ${iterationCount} iterations`);
          callbacks?.onActivityChange?.({ type: 'thinking', description: '生成最终总结...', status: 'running' });

          currentApiMessages = [
            ...currentApiMessages,
            { role: 'assistant' as const, content: responseContent },
            { role: 'user' as const, content: '[SYSTEM] The user has requested you to stop using tools and provide your final output. Based on ALL the information you have gathered so far, provide your complete final analysis and summary NOW. Do NOT use any more tools. Output your full report directly.' },
          ];

          responseContent = '';
          try {
            const finalFollowUp = await chatWithAgentStream(
              agentCode,
              currentApiMessages,
              { toolPrompt: systemPrompt, signal },
              {
                onChunk: (_chunk, full) => {
                  responseContent = full;
                  const cleanContent = stripToolCallsFromContent(full);
                  if (cleanContent) {
                    const displayContent = accumulatedContent
                      ? accumulatedContent + '\n\n' + cleanContent
                      : cleanContent;
                    throttledStreamingUpdate(streamingMsgId, displayContent);
                  }
                },
                onMeta: (meta) => {
                  if (meta?.model) model = meta.model;
                },
                onStatus: () => {
                  callbacks?.onActivityChange?.({ type: 'thinking', description: '生成总结中...', status: 'running' });
                },
              }
            );
            responseContent = responseContent || finalFollowUp?.content || '';
            if (finalFollowUp?.model) model = finalFollowUp.model;
            if (finalFollowUp?.usage) {
              totalUsage.promptTokens = Math.max(totalUsage.promptTokens, finalFollowUp.usage.promptTokens);
              totalUsage.completionTokens += finalFollowUp.usage.completionTokens;
            }
          } catch (e: any) {
            console.warn('[useChatStream] Final summary stream failed:', e?.message);
            try {
              const fallback = await chatWithAgent(agentCode, currentApiMessages);
              responseContent = fallback?.content || '';
            } catch { /* use whatever we have */ }
          }

          if (pendingUpdateRef.current) { clearTimeout(pendingUpdateRef.current); pendingUpdateRef.current = null; }
          const summaryClean = stripToolCallsFromContent(responseContent);
          if (summaryClean) {
            accumulatedContent = accumulatedContent
              ? accumulatedContent + '\n\n' + summaryClean
              : summaryClean;
            onStreamingUpdate?.(streamingMsgId, accumulatedContent);
          }
          break; // Exit the while loop after summarizing
        }

        callbacks?.onActivityChange?.({ type: 'completed', description: '完成', status: 'completed' });

        // Recalculate totalTokens from corrected prompt + completion
        totalUsage.totalTokens = totalUsage.promptTokens + totalUsage.completionTokens;

        // Use accumulated content (all iterations) for the final message
        const finalContent = accumulatedContent || stripToolCallsFromContent(responseContent) || responseContent;

        // Detect truncated response: output is long and ends abruptly
        const isTruncated = detectTruncation(responseContent, finalContent);
        if (isTruncated) {
          console.log('[useChatStream] Response appears truncated, will show Continue button');
        }

        const message: Message = {
          id: streamingMsgId,
          role: 'assistant',
          content: finalContent,
          agentCode,
          timestamp: new Date(),
          toolExecutions: allToolResults.length > 0 ? allToolResults : undefined,
          tokenUsage: totalUsage.totalTokens > 0 ? totalUsage : undefined,
        };

        return { message, model, isTruncated };
      } catch (error) {
        console.error('[useChatStream] Chat failed:', error);
        callbacks?.onActivityChange?.({ type: 'error', description: '请求失败', status: 'error' });
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `[Error] ${error instanceof Error ? error.message : 'Failed to connect to AI engine. Please check the server status.'}`,
          timestamp: new Date(),
        };
        return { message: errorMsg };
      } finally {
        setLoading(false);
        setThinkingStartTime(null);
        callbacks?.onThinkingEnd?.();
      }
    },
    [onToolExecute, buildSystemPrompt, callbacks, onStreamingUpdate, throttledStreamingUpdate, onIterationLimitReached]
  );

  return {
    loading,
    thinkingDuration,
    sendMessage,
    stopGeneration,
  };
}
