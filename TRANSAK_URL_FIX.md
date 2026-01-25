# Transak URL 修复说明

**日期**: 2025-01-XX  
**问题**: URL 配置不正确导致连接失败

---

## 🔍 问题发现

### 测试结果

```bash
# 测试 1: api-staging.transak.com
curl -I https://api-staging.transak.com
# 结果: SSL_ERROR_SYSCALL - SSL 连接错误

# 测试 2: staging-global.transak.com
curl -I https://staging-global.transak.com
# 结果: 301 重定向到 https://global-stg.transak.com/
```

### 发现的问题

1. **Widget URL 重定向**
   - `staging-global.transak.com` → 301 重定向到 `global-stg.transak.com`
   - 代码中使用 `staging-global.transak.com`，导致额外的重定向延迟

2. **API URL SSL 错误**
   - `api-staging.transak.com` 出现 SSL 连接错误
   - 可能是网络问题或 SSL 配置问题

---

## ✅ 已实施的修复

### 1. 修复 Widget URL ✅

**问题**: 使用 `staging-global.transak.com` 会导致 301 重定向

**修复**: 直接使用 `global-stg.transak.com` 避免重定向

**修改文件**:
- ✅ `backend/src/modules/payment/transak-provider.service.ts:426`
- ✅ `frontend/components/payment/TransakWidget.tsx:143, 240, 419, 596`

**修改内容**:
```typescript
// 修改前
const widgetBaseUrl = this.environment === 'PRODUCTION'
  ? 'https://global.transak.com'
  : 'https://staging-global.transak.com'; // ❌ 会重定向

// 修改后
const widgetBaseUrl = this.environment === 'PRODUCTION'
  ? 'https://global.transak.com'
  : 'https://global-stg.transak.com'; // ✅ 直接使用，避免重定向
```

### 2. 添加备用 API URL 支持 ✅

**问题**: `api-staging.transak.com` 可能有 SSL 问题

**修复**: 添加备用 API URL 配置选项

**修改文件**: `backend/src/modules/payment/transak-provider.service.ts:62-72`

**修改内容**:
```typescript
// 如果配置了备用 API URL，使用备用 URL
const alternateApiUrl = this.configService.get<string>('TRANSAK_API_URL_ALTERNATE');
if (alternateApiUrl && this.environment === 'STAGING') {
  this.logger.warn(`⚠️ Using alternate API URL for STAGING: ${alternateApiUrl}`);
  this.baseUrl = alternateApiUrl;
}
```

---

## 🔧 配置建议

### 如果 api-staging.transak.com 无法访问

**选项 1: 使用备用 API URL（如果 Transak 提供）**

在 `backend/.env` 中添加：
```env
TRANSAK_API_URL_ALTERNATE=https://api.transak.com
# 注意：使用生产 API URL 时，确保使用 staging API Key
```

**选项 2: 检查网络和 SSL 配置**

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

## 📋 修复验证清单

- [x] Widget URL 已修复（使用 `global-stg.transak.com`）
- [x] 添加备用 API URL 支持
- [ ] 测试 Widget URL 是否可以访问
- [ ] 测试 API URL 是否可以访问
- [ ] 验证完整支付流程

---

## 🚀 下一步

1. **测试修复后的 URL**:
   ```bash
   # 测试 Widget URL
   curl -I https://global-stg.transak.com
   
   # 测试 API URL（如果仍有问题，考虑使用备用 URL）
   curl -I https://api-staging.transak.com
   ```

2. **如果 API URL 仍有问题**:
   - 联系 Transak 技术支持
   - 检查是否需要使用不同的 API 端点
   - 考虑使用代理或 VPN

3. **重启服务并测试**:
   ```bash
   # 重启后端
   cd backend && npm run start:dev
   
   # 重启前端
   cd frontend && npm run dev
   ```

---

## 📝 总结

**已修复**:
- ✅ Widget URL 重定向问题（使用 `global-stg.transak.com`）
- ✅ 添加备用 API URL 支持

**待解决**:
- ⚠️ API URL SSL 错误（`api-staging.transak.com`）
  - 可能是网络问题
  - 可能需要使用备用 URL
  - 或联系 Transak 技术支持

**建议**:
1. 先测试修复后的 Widget URL 是否可以正常加载
2. 如果 API URL 仍有问题，考虑使用备用 URL 或联系 Transak 技术支持

---

**修复完成时间**: 2025-01-XX  
**状态**: ✅ Widget URL 已修复，API URL 需要进一步排查

