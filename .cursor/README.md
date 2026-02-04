# 🎖️ Agentrix HQ - Agent 配置说明

本项目配置了 6 个专业 AI Agent，每个都有独立的能力和工具权限。

---

## 📁 配置文件结构


.cursor/
├── README.md              # 本文件
├── agents/
│   ├── tools-config.md    # 工具配置文档（所有Agent共享）
│   ├── architect.cursorrules   # ARCHITECT-01 配置
│   ├── codesmith.cursorrules   # CODESMITH-01 配置
│   ├── reviewer.cursorrules    # REVIEWER-01 配置
│   ├── devops.cursorrules      # DEVOPS-01 配置
│   ├── docs.cursorrules        # DOCS-01 配置
│   └── mentor.cursorrules      # MENTOR-01 配置
└── ...


---

## 🤖 Agent 能力对比

| Agent | 文件读取 | 文件写入 | 命令执行 | 网络请求 | 知识检索 |
|-------|----------|----------|----------|----------|----------|
| ARCHITECT-01 | ✅ | ✅ | ✅ | ✅ | ✅ |
| CODESMITH-01 | ✅ | ✅ | ✅ | ❌ | ❌ |
| REVIEWER-01 | ✅ | ❌ | ✅ | ❌ | ❌ |
| DEVOPS-01 | ✅ | ✅ | ✅ | ❌ | ❌ |
| DOCS-01 | ✅ | ✅ | ❌ | ❌ | ❌ |
| MENTOR-01 | ✅ | ❌ | ❌ | ❌ | ✅ |

---

## 🔧 使用方法

### 方式 1: Cursor 中使用（推荐）

1. 打开 Cursor IDE
2. 在项目根目录，Cursor 会自动读取 `.cursorrules` 文件
3. 默认使用 ARCHITECT-01
4. 如需切换 Agent，在对话中明确说明

### 方式 2: 手动切换配置

bash
# 复制对应 Agent 的配置到根目录
cp .cursor/agents/codesmith.cursorrules .cursorrules


---

## 📝 配置已完成项

- ✅ 所有 6 个 Agent 配置文件已创建
- ✅ 所有 Agent 都有文件读写权限
- ✅ 工具配置文档已创建
- ✅ 主配置文件已创建

---

## 🎯 下一步

现在可以开始任务 2: 解决 P0 和 P1 问题

### P0 紧急问题
1. 替换 CodeEditor 为 Monaco Editor
2. 实现 Terminal 组件
3. 修复 CommandConsole 滚动问题

### P1 重要问题
1. FileExplorer 右键菜单
2. AgentChat 输入框优化
3. 图片预览功能

---

**配置完成时间**: 2026-02-03  
**配置者**: ARCHITECT-01
