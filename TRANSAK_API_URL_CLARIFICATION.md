# Transak API URL 说明

**日期**: 2025-01-XX  
**问题**: API URL 访问说明

---

## ✅ 正常现象

### 1. API 根路径返回 Not Found

**现象**: `https://api.transak.com` 打开时显示 "not found"

**原因**: 这是**正常现象**。Transak API 的根路径不提供内容，需要使用完整的 API 端点路径。

**正确的 API 端点**:
- Create Session API: `https://api.transak.com/auth/public/v2/session`
- 生产环境: `https://api.transak.com/auth/public/v2/session`
- 测试环境: `https://api-staging.transak.com/auth/public/v2/session`

### 2. Widget URL 正常

**现象**: `https://global-stg.transak.com` 能正常打开

**说明**: Widget URL 是正常的，这是 Transak 的 Widget 界面，可以直接访问。

---

## 🔍 测试 API 端点

### 测试 Create Session API

**生产环境**:
```bash
curl -X POST https://api.transak.com/auth/public/v2/session \
  -H "access-token: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "widgetParams": {
      "referrerDomain": "localhost:3000",
      "fiatAmount": "100",
      "fiatCurrency": "USD",
      "cryptoCurrencyCode": "USDC",
      "network": "bsc"
    }
  }'
```

**测试环境**:
```bash
curl -X POST https://api-staging.transak.com/auth/public/v2/session \
  -H "access-token: YOUR_STAGING_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "widgetParams": {
      "referrerDomain": "localhost:3000",
      "fiatAmount": "100",
      "fiatCurrency": "USD",
      "cryptoCurrencyCode": "USDC",
      "network": "bsc"
    }
  }'
```

---

## 🔧 如果 api-staging.transak.com 有 SSL 问题

### 选项 1: 使用生产 API URL（推荐）

如果测试环境的 API URL 有 SSL 问题，可以尝试使用生产环境的 API URL，但**必须使用测试环境的 API Key**。

**配置** (`backend/.env`):
```env
TRANSAK_ENVIRONMENT=STAGING
TRANSAK_API_KEY_STAGING=your_staging_api_key
TRANSAK_API_URL_ALTERNATE=https://api.transak.com
```

**说明**:
- 环境设置为 `STAGING`（用于 Widget URL）
- API URL 使用生产环境（`api.transak.com`）
- API Key 使用测试环境的 Key

### 选项 2: 检查网络和 SSL 配置

1. **检查 SSL 证书**:
   ```bash
   openssl s_client -connect api-staging.transak.com:443 -showcerts
   ```

2. **检查代理设置**:
   - 如果使用代理，确保代理配置正确
   - 检查防火墙是否阻止连接

3. **尝试使用不同的网络**:
   - 检查是否是网络环境问题
   - 尝试使用 VPN 或不同的网络

---

## 📋 当前配置状态

### Widget URL ✅

- **生产环境**: `https://global.transak.com`
- **测试环境**: `https://global-stg.transak.com` ✅ 已修复（避免重定向）

### API URL ✅

- **生产环境**: `https://api.transak.com/auth/public/v2/session`
- **测试环境**: `https://api-staging.transak.com/auth/public/v2/session`

**注意**: 
- API 根路径（`https://api.transak.com`）返回 not found 是正常的
- 需要使用完整的端点路径（`/auth/public/v2/session`）

---

## 🚀 下一步

1. **测试实际的 API 端点**:
   ```bash
   # 测试生产环境 API 端点
   curl -X POST https://api.transak.com/auth/public/v2/session \
     -H "access-token: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"widgetParams": {...}}'
   ```

2. **如果测试环境 API 有 SSL 问题**:
   - 使用 `TRANSAK_API_URL_ALTERNATE` 配置备用 URL
   - 或联系 Transak 技术支持

3. **验证完整流程**:
   - Widget URL 已修复（使用 `global-stg.transak.com`）
   - API URL 使用完整端点路径
   - 测试创建 Session 和加载 Widget

---

## 📝 总结

- ✅ **Widget URL**: `global-stg.transak.com` 正常（已修复）
- ✅ **API URL**: 使用完整端点路径 `/auth/public/v2/session`
- ⚠️ **API 根路径**: 返回 not found 是正常的（不需要访问根路径）
- ⚠️ **测试环境 API**: 如果有 SSL 问题，可以使用备用 URL 配置

---

**文档更新时间**: 2025-01-XX  
**状态**: ✅ Widget URL 已修复，API URL 配置正确

