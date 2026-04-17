# Agentrix 官网

Agentrix - AI经济时代的支付协议层

## 项目介绍

Agentrix 是一个为AI Agent和商户生态提供的智能支付中间件与双向市场平台。

## 技术栈

- **框架**: Next.js 13.5.6
- **UI库**: React 18.2.0
- **样式**: Tailwind CSS 3.3.0
- **语言**: TypeScript 5.0

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

开发服务器将在 [http://localhost:3000](http://localhost:3000) 启动

### 构建生产版本

```bash
npm run build
npm start
```

## 项目结构

```
agentrix-website/
├── components/          # React组件
│   ├── marketing/      # 营销页面组件
│   ├── auth/          # 认证相关组件
│   └── ui/            # 通用UI组件
├── pages/             # Next.js页面
│   ├── app/           # 应用内页面
│   └── auth/          # 认证页面
├── styles/            # 全局样式
└── lib/               # 工具函数
```

## 在 Cursor 中预览

1. 运行 `npm run dev` 启动开发服务器
2. 按 `Ctrl+Shift+P` 打开命令面板
3. 输入 `Simple Browser: Show`
4. 输入 `http://localhost:3000` 即可预览

或者使用快捷键 `Ctrl+Alt+P` 快速打开内置浏览器。

## 功能特性

- 🏠 官网首页
- 🔐 多种登录方式（Web3钱包、Web2账户、Passkey）
- 👤 用户中心
- 🤖 Agent控制台
- 🏪 商户后台
- 📱 响应式设计

## License

MIT
