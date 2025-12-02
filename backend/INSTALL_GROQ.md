# Groq依赖安装说明

## 安装缺失的依赖

运行以下命令安装Groq和HTTP客户端依赖：

```bash
cd backend
npm install groq-sdk @nestjs/axios
```

或者如果使用yarn：

```bash
cd backend
yarn add groq-sdk @nestjs/axios
```

## 验证安装

安装完成后，检查 `package.json` 中是否包含：
- `groq-sdk`
- `@nestjs/axios`

然后重启开发服务器。

