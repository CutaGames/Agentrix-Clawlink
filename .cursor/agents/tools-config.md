# 🛠️ 工具配置（所有 Agent 共享）

## 工作目录

**项目根目录**: `/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website`

所有路径必须使用 `/mnt/d/...` 格式（不是 `D:\...`）

---

## 可用工具列表

### 1. read_file - 读取文件内容


<tool_call>
<name>read_file</name>
<params>{"filePath": "/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/src/example.ts", "startLine": 1, "endLine": 100}</params>
</tool_call>


**参数**:
- `filePath`: 文件的完整路径
- `startLine`: 起始行号（可选）
- `endLine`: 结束行号（可选）

---

### 2. write_file - 创建或覆写文件


<tool_call>
<name>write_file</name>
<params>{"filePath": "/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/src/new-file.ts", "content": "文件内容"}</params>
</tool_call>


**参数**:
- `filePath`: 文件的完整路径
- `content`: 文件内容

**注意**: 会覆盖已存在的文件！

---

### 3. edit_file - 编辑文件（查找并替换）


<tool_call>
<name>edit_file</name>
<params>{"filePath": "/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/src/example.ts", "oldString": "旧内容", "newString": "新内容"}</params>
</tool_call>


**参数**:
- `filePath`: 文件路径
- `oldString`: 要替换的内容
- `newString`: 新的内容

---

### 4. list_dir - 列出目录内容


<tool_call>
<name>list_dir</name>
<params>{"path": "/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/src"}</params>
</tool_call>


**参数**:
- `path`: 目录路径

---

### 5. run_command - 执行终端命令（需授权）


<tool_call>
<name>run_command</name>
<params>{"command": "pnpm install", "cwd": "/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website"}</params>
<requires_permission>true</requires_permission>
<reason>安装项目依赖</reason>
</tool_call>


**参数**:
- `command`: 要执行的命令
- `cwd`: 工作目录

**注意**: 需要用户授权！

---

### 6. fetch_url - 获取网页内容


<tool_call>
<name>fetch_url</name>
<params>{"url": "https://api.example.com/data", "method": "GET"}</params>
</tool_call>


**参数**:
- `url`: 网址
- `method`: HTTP 方法（GET/POST）

---

### 7. search_knowledge - 搜索知识库


<tool_call>
<name>search_knowledge</name>
<params>{"query": "React hooks", "category": "frontend"}</params>
</tool_call>


---

### 8. list_knowledge - 列出知识库条目


<tool_call>
<name>list_knowledge</name>
<params>{}</params>
</tool_call>


---

## 重要规则

### ✅ 正确做法

1. **直接输出工具调用**
   
   <tool_call>
   <name>read_file</name>
   <params>{...}</params>
   </tool_call>
   

2. **使用正确的路径格式**
   - ✅ `/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website`
   - ❌ `D:\wsl\Ubuntu-24.04\Code\Agentrix\Agentrix-website`

3. **相对路径转绝对路径**
   - 如果用户说 `src/example.ts`
   - 转换为 `/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/src/example.ts`

### ❌ 错误做法

1. **不要假装执行**
   markdown
   ❌ 我会读取文件... (但不实际调用工具)
   ✅ <tool_call>...</tool_call> (真正调用工具)
   

2. **不要放在代码块中**
   markdown
   ❌ xml
      <tool_call>...</tool_call>
      
   ✅ <tool_call>...</tool_call>
   

3. **不要使用错误路径**
   markdown
   ❌ C:/Users/...
   ❌ D:/wsl/...
   ✅ /mnt/d/wsl/...
   

---

## 工作流程示例

### 场景 1: 读取并修改文件

markdown
1. 用户: "修改 src/example.ts 中的函数名"

2. Agent: 
   <tool_call>
   <name>read_file</name>
   <params>{"filePath": "/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/src/example.ts"}</params>
   </tool_call>

3. Agent: (收到文件内容后)
   <tool_call>
   <name>edit_file</name>
   <params>{"filePath": "/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/src/example.ts", "oldString": "function oldName()", "newString": "function newName()"}</params>
   </tool_call>

4. Agent: "✅ 已修改函数名"


### 场景 2: 创建新文件

markdown
1. 用户: "创建一个新组件 Button.tsx"

2. Agent:
   <tool_call>
   <name>write_file</name>
   <params>{"filePath": "/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/src/components/Button.tsx", "content": "export function Button() { return <button>Click</button>; }"}</params>
   </tool_call>

3. Agent: "✅ 已创建 Button.tsx 组件"


---

## 常见问题

### Q: 如何知道文件是否存在？

A: 使用 `list_dir` 列出目录内容，或直接尝试 `read_file`

### Q: 如何创建目录？

A: 使用 `run_command` 执行 `mkdir -p 目录路径`

### Q: 如何删除文件？

A: 使用 `run_command` 执行 `rm 文件路径`（需要用户授权）

### Q: 工具调用失败怎么办？

A: 检查：
1. 路径是否正确
2. 文件是否存在
3. 权限是否足够
4. JSON 格式是否正确

---

## Token 预算

<budget:token_budget>200000</budget:token_budget>

每个 Agent 有 20 万 token 预算，合理使用。
