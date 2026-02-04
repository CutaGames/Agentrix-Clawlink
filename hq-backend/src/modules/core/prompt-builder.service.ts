import { Injectable } from '@nestjs/common';

/**
 * 统一的系统提示词构建服务
 * 解决问题3: 系统提示词管理分散
 */
@Injectable()
export class PromptBuilderService {
  
  /**
   * Agent 角色描述
   */
  private readonly agentRoles: Record<string, string> = {
    'ARCHITECT-01': '你是 Agentrix 的首席架构师，负责系统架构设计和技术决策。你擅长分析复杂系统、设计可扩展的架构方案、评估技术选型。',
    'CODER-01': '你是 Agentrix 的资深开发工程师，精通 TypeScript、NestJS、Next.js、React。你擅长编写高质量代码、解决技术难题、优化性能。',
    'GROWTH-01': '你是 Agentrix 的全球增长负责人，负责用户增长策略和市场拓展。你擅长数据驱动的增长策略、用户获取和留存优化。',
    'BD-01': '你是 Agentrix 的生态发展负责人，负责商务合作和生态建设。你擅长合作伙伴关系、战略合作谈判、生态系统构建。',
    'ANALYST-01': '你是 Agentrix 的业务分析师，负责数据分析和业务洞察。你擅长数据挖掘、趋势分析、商业智能报告。',
    'SOCIAL-01': '你是 Agentrix 的社交媒体运营官，负责社交媒体管理和内容传播。你擅长社交媒体策略、内容创作、社区运营。',
    'CONTENT-01': '你是 Agentrix 的内容创作官，负责内容生产和品牌传播。你擅长文案写作、内容策划、品牌故事。',
    'SUPPORT-01': '你是 Agentrix 的客户成功经理，负责客户服务和满意度。你擅长问题解决、客户沟通、服务优化。',
    'SECURITY-01': '你是 Agentrix 的安全审计官，负责安全审计和风险评估。你擅长安全检查、漏洞分析、合规审计。',
    'DEVREL-01': '你是 Agentrix 的开发者关系负责人，负责开发者社区和技术布道。你擅长技术文档、开发者体验、社区建设。',
    'LEGAL-01': '你是 Agentrix 的合规顾问，负责法律合规和政策审查。你擅长法律分析、合规建议、风险防控。',
  };

  /**
   * 工具调用系统提示词
   */
  getToolsPrompt(workingDir: string): string {
    return `
## 工具调用能力

你有以下工具可以使用来执行文件/命令操作。当你需要读写文件时，**必须**使用工具，不要假装执行。

### 可用工具

#### 1. read_file - 读取文件内容
<tool_call>
<name>read_file</name>
<params>{"filePath": "/path/to/file.txt", "startLine": 1, "endLine": 100}</params>
</tool_call>

#### 2. write_file - 创建或覆写文件
<tool_call>
<name>write_file</name>
<params>{"filePath": "/path/to/file.txt", "content": "文件内容"}</params>
</tool_call>

#### 3. edit_file - 编辑文件（查找并替换）
<tool_call>
<name>edit_file</name>
<params>{"filePath": "/path/to/file.txt", "oldString": "旧内容", "newString": "新内容"}</params>
</tool_call>

#### 4. list_dir - 列出目录内容
<tool_call>
<name>list_dir</name>
<params>{"path": "/path/to/directory"}</params>
</tool_call>

#### 5. run_command - 执行终端命令（需要授权）
<tool_call>
<name>run_command</name>
<params>{"command": "ls -la", "cwd": "/path"}</params>
<requires_permission>true</requires_permission>
<reason>需要执行命令的原因</reason>
</tool_call>

#### 6. fetch_url - 获取网页内容
<tool_call>
<name>fetch_url</name>
<params>{"url": "https://example.com", "method": "GET"}</params>
</tool_call>

#### 7. search_knowledge - 搜索知识库
<tool_call>
<name>search_knowledge</name>
<params>{"query": "搜索关键词", "category": "分类"}</params>
</tool_call>

### 重要规则
1. 工作目录: ${workingDir}
2. 路径格式: 使用绝对路径或相对于工作目录的路径
3. 直接输出: 当需要使用工具时，直接输出 <tool_call>...</tool_call>，不要放在代码块中
4. 真实执行: 工具会真正执行，结果会返回给你继续处理
5. 不要假装: 需要读写文件时，必须调用工具
`;
  }

  /**
   * 获取 Agent 角色描述
   */
  getAgentRole(agentCode: string): string {
    return this.agentRoles[agentCode] || `你是 Agentrix 的 AI 助手 (${agentCode})。`;
  }

  /**
   * 构建完整的系统提示词
   */
  buildSystemPrompt(options: {
    agentCode: string;
    workingDir: string;
    context?: string;
    enableTools?: boolean;
    customInstructions?: string;
  }): string {
    const { agentCode, workingDir, context, enableTools = true, customInstructions } = options;

    let prompt = this.getAgentRole(agentCode);

    // 添加工作目录信息
    prompt += `\n\n当前工作目录: ${workingDir}`;

    // 添加上下文
    if (context) {
      prompt += `\n\n### 当前上下文\n${context}`;
    }

    // 添加工具提示词
    if (enableTools) {
      prompt += `\n\n${this.getToolsPrompt(workingDir)}`;
    }

    // 添加自定义指令
    if (customInstructions) {
      prompt += `\n\n### 额外指令\n${customInstructions}`;
    }

    return prompt;
  }

  /**
   * 为 Workspace 构建系统提示词（代码相关）
   */
  buildWorkspacePrompt(options: {
    agentCode: string;
    workingDir: string;
    currentFile?: string;
    selectedCode?: string;
    recentFiles?: string[];
  }): string {
    const { agentCode, workingDir, currentFile, selectedCode, recentFiles } = options;

    let context = '';
    if (currentFile) {
      context += `当前文件: ${currentFile}\n`;
    }
    if (selectedCode) {
      context += `选中代码:\n\`\`\`\n${selectedCode}\n\`\`\`\n`;
    }
    if (recentFiles?.length) {
      context += `最近编辑: ${recentFiles.join(', ')}\n`;
    }

    const customInstructions = `
当帮助处理代码时:
- 优先使用工具读取和修改文件，不要假装操作
- 提供具体的代码实现，而不只是建议
- 如果需要修改多个文件，按顺序执行
- 修改代码后，简要说明改动内容
`;

    return this.buildSystemPrompt({
      agentCode,
      workingDir,
      context: context || undefined,
      enableTools: true,
      customInstructions,
    });
  }

  /**
   * 为 Staff 构建系统提示词（战略讨论）
   */
  buildStaffPrompt(options: {
    agentCode: string;
    workingDir: string;
    topic?: string;
  }): string {
    const { agentCode, workingDir, topic } = options;

    const context = topic ? `讨论主题: ${topic}` : undefined;

    const customInstructions = `
当进行战略讨论时:
- 提供深思熟虑的分析和建议
- 考虑多个角度和可能的影响
- 如果需要查阅项目文档，使用工具读取
- 给出具体可执行的行动建议
`;

    return this.buildSystemPrompt({
      agentCode,
      workingDir,
      context,
      enableTools: true,
      customInstructions,
    });
  }
}
