# OAuth 社交登录集成指南

## 📋 概述

当前 PayMind 的 Web2 登录（Google、Apple、X）是**模拟实现**，需要集成真实的 OAuth 2.0 流程才能在生产环境使用。

## ⚠️ 当前状态

- ✅ **前端UI**: 已实现完整的登录界面
- ✅ **按钮和交互**: Google、Apple、X 登录按钮已实现
- ⚠️ **后端OAuth**: 未实现，当前为模拟模式
- ⚠️ **用户创建**: 使用临时邮箱和密码创建用户（演示模式）

## 🎯 需要完成的工作

### 1. 注册第三方开发者账号

#### Google OAuth
- **平台**: [Google Cloud Console](https://console.cloud.google.com/)
- **费用**: 免费
- **需要**: Google账号

#### Apple Sign In
- **平台**: [Apple Developer Portal](https://developer.apple.com/)
- **费用**: $99/年（Apple Developer Program）
- **需要**: Apple ID + 付费开发者账号

#### X (Twitter) OAuth
- **平台**: [Twitter Developer Portal](https://developer.twitter.com/)
- **费用**: 免费
- **需要**: Twitter账号 + 开发者申请

### 2. 后端实现OAuth策略

需要安装和配置：
- `passport-google-oauth20` - Google OAuth
- `passport-apple` - Apple Sign In
- `passport-oauth2` - X (Twitter) OAuth

### 3. 配置OAuth回调URL

每个平台都需要配置：
- 开发环境: `http://localhost:3001/api/auth/{provider}/callback`
- 生产环境: `https://your-domain.com/api/auth/{provider}/callback`

## 📝 详细集成步骤

请参考 `THIRD_PARTY_INTEGRATION_CHECKLIST.md` 中的 "### 2. OAuth 社交登录（Google/Apple/X）⚠️" 部分，包含：

1. 每个平台的详细注册步骤
2. 环境变量配置
3. 后端代码实现示例
4. 前端修改建议

## 🚀 快速开始（最小化实现）

如果只需要一个平台进行测试，建议先实现 **Google OAuth**：

1. **注册Google OAuth**（约10分钟）
2. **实现后端策略**（约30分钟）
3. **测试登录流程**（约10分钟）

总计约50分钟即可完成一个平台的集成。

## 💡 建议

- **开发环境**: 可以先使用模拟模式，不影响功能开发
- **生产环境**: 必须集成真实的OAuth流程
- **优先级**: Google OAuth > Apple Sign In > X OAuth（根据用户使用频率）

## 📚 相关文档

- Google OAuth: https://developers.google.com/identity/protocols/oauth2
- Apple Sign In: https://developer.apple.com/sign-in-with-apple/
- Twitter OAuth: https://developer.twitter.com/en/docs/authentication/oauth-2-0


