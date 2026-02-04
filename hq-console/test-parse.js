// 快速测试解析器
const text = `
我来列出目录内容：

<tool_call>
<name>list_dir</name>
<params>{"path": "/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website"}</params>
</tool_call>

以上是目录列表命令。
`;

// 模拟 parseToolCalls 函数
function parseToolCalls(text) {
  const toolCalls = [];
  
  // 首先去掉代码块标记
  let cleanedText = text;
  cleanedText = cleanedText.replace(/```(?:tool|xml|json)?\s*([\s\S]*?)```/g, '$1');
  
  console.log('[Test] Cleaned text:', cleanedText.substring(0, 200));
  
  // 格式1 - XML 格式
  const newFormatRegex = /<tool_call>\s*<name>\s*(\w+)\s*<\/name>\s*<params>\s*([\s\S]*?)\s*<\/params>(?:\s*<requires_permission>\s*(true|false)\s*<\/requires_permission>)?(?:\s*<reason>\s*([\s\S]*?)\s*<\/reason>)?\s*<\/tool_call>/g;
  
  let match;
  while ((match = newFormatRegex.exec(cleanedText)) !== null) {
    try {
      const tool = match[1].trim();
      const paramsStr = match[2].trim();
      console.log('[Test] Found tool:', tool, 'params:', paramsStr);
      const params = JSON.parse(paramsStr);
      toolCalls.push({ tool, params });
    } catch (e) {
      console.error('[Test] Parse error:', e.message);
    }
  }
  
  return toolCalls;
}

const result = parseToolCalls(text);
console.log('\n=== 解析结果 ===');
console.log('找到工具调用数量:', result.length);
console.log('工具调用详情:', JSON.stringify(result, null, 2));
