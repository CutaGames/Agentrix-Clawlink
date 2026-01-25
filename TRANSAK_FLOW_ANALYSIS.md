# Transak 集成流程分析

## 预期流程（点击 Google Pay 后）

1. **用户点击 Google Pay 按钮**
   - 触发 `handleProviderPay('google')`

2. **KYC 检查**
   - 检查 `preflightResult?.requiresKYC` 或 `userProfile.kycLevel === 'none'`
   - 如果需要 KYC，设置 `setShowTransakWidget(true)`

3. **打开 Transak Widget 弹窗**
   - `showTransakWidget === true` 时显示弹窗
   - 渲染 `<TransakWidget />` 组件

4. **Transak Widget 初始化**
   - 检查 API Key
   - 尝试加载 Transak SDK (`https://staging-global.transak.com/sdk/v1.1.js`)
   - SDK 加载成功后，初始化 Widget 实例
   - Widget 渲染到容器中

5. **用户完成 KYC**
   - 在 Widget 中完成 KYC 验证
   - 完成支付流程

## 当前问题流程

1. ✅ 用户点击 Google Pay
2. ✅ KYC 检查通过，需要 KYC
3. ✅ 打开 Transak Widget 弹窗
4. ❌ **SDK 加载失败**（CORS 错误）
   - `Access to script at 'https://staging-global.transak.com/sdk/v1.1.js' from origin 'http://localhost:3000' has been blocked by CORS policy`
5. ✅ **使用 iframe 备用方案**
   - iframe 成功嵌入到容器中
6. ❌ **但仍然触发错误回调**
   - `script.onerror` 在 iframe 嵌入后仍然触发
   - 导致 `onError` 回调被调用
   - `SmartCheckout` 收到错误，但应该忽略（因为 iframe 已成功）

## 问题根源

**问题 1：CORS 限制**
- Transak SDK 的服务器不允许从 `localhost:3000` 加载脚本
- 这是 Transak 服务器端的 CORS 配置问题，我们无法直接解决

**问题 2：错误回调触发时机**
- `script.onerror` 是异步触发的
- 即使 iframe 已经成功嵌入，`script.onerror` 仍然会触发
- 导致 `onError` 回调被调用，即使 iframe 已经正常工作

**问题 3：React 严格模式导致重复执行**
- React 18 的严格模式会重复执行 `useEffect`
- 导致 SDK 加载尝试被执行两次
- 每次都会触发 `script.onerror`

## 解决方案

1. ✅ 使用 `iframeFallbackActivated` ref 标记是否已使用 iframe
2. ✅ 在 `script.onerror` 中检查标记，如果已激活则忽略错误
3. ✅ 在 iframe 嵌入成功后立即设置标记
4. ✅ 在 `SmartCheckout` 中，当 `fallbackToRedirect` 为 true 时，不显示错误

## 当前状态

- ✅ iframe 已成功嵌入
- ✅ 错误回调应该被忽略（通过标记检查）
- ⚠️ 但可能仍有问题，因为 React 严格模式导致重复执行

