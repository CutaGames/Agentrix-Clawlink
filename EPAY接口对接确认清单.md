# EPAY接口对接确认清单

## 当前配置信息

**商户信息：**
- 商户ID: `test2020@epay.com`
- API Key: `2d00b386231806ec7e18e2d96dc043aa`
- Secret Key: `2d00b386231806ec7e18e2d96dc043aa`
- 测试环境Base URL: `https://29597375fx.epaydev.xyz/epayweb`

**当前遇到的错误：**
```
400 Bad Request
The plain HTTP request was sent to HTTPS port
```

---

## 需要EPAY确认的问题

### 1. API端点路径格式 ⚠️ **最重要**

**当前尝试的路径格式：**
- `https://29597375fx.epaydev.xyz/epayweb/api/calculate-rate`
- `https://29597375fx.epaydev.xyz/epayweb/api/v1/calculate-rate`
- `https://29597375fx.epaydev.xyz/gateway/calculate-rate`

**需要确认：**
- ✅ 计算汇率接口的完整URL是什么？
- ✅ 收银台代收接口的完整URL是什么？
- ✅ 查询订单接口的完整URL是什么？
- ✅ 银行代付接口的完整URL是什么？

**期望格式示例：**
```
https://29597375fx.epaydev.xyz/epayweb/???/calculate-rate
```

---

### 2. 请求方式

**当前使用：** `POST` 请求，`Content-Type: application/x-www-form-urlencoded`

**需要确认：**
- ✅ 所有接口都是POST请求吗？
- ✅ 参数格式是 `application/x-www-form-urlencoded` 还是 `application/json`？
- ✅ 是否有接口需要使用GET请求？

---

### 3. Base URL格式

**当前配置：** `https://29597375fx.epaydev.xyz/epayweb`

**需要确认：**
- ✅ Base URL应该包含 `/epayweb` 后缀吗？
- ✅ 还是应该使用 `https://29597375fx.epaydev.xyz`，然后在每个接口路径前加上 `/epayweb`？
- ✅ 生产环境的Base URL格式是什么？

---

### 4. 签名算法确认

**当前实现：**
1. 按参数名ASCII码从小到大排序（排除 `sign` 参数）
2. 拼接为 `key1=value1&key2=value2` 格式
3. 在末尾追加 `&key=secretKey`
4. 对整个字符串进行MD5加密（大写）

**需要确认：**
- ✅ 签名算法是否正确？
- ✅ 参数排序规则是否正确？
- ✅ MD5结果是否需要转大写？
- ✅ Secret Key是使用 `EPAY_SECRET_KEY` 还是 `EPAY_API_KEY`？

**当前签名代码示例：**
```typescript
// 1. 排序参数（排除sign）
const sortedKeys = Object.keys(params)
  .filter(key => key !== 'sign')
  .sort();

// 2. 拼接字符串
const signString = sortedKeys
  .map(key => `${key}=${params[key]}`)
  .join('&') + `&key=${this.secretKey}`;

// 3. MD5加密并转大写
const sign = crypto.createHash('md5').update(signString).digest('hex').toUpperCase();
```

---

### 5. 接口参数确认

#### 5.1 计算汇率接口 (`calculate-rate`)

**当前发送的参数：**
```json
{
  "merchant_id": "test2020@epay.com",
  "from_currency": "CNY",
  "to_currency": "USDT",
  "amount": "100",
  "timestamp": "1764307524598",
  "sign": "B454C75701BD906A7690CE3E6C3EAEC5"
}
```

**需要确认：**
- ✅ 参数名称是否正确？（`merchant_id` vs `merchantId` vs `merchant_id`）
- ✅ `timestamp` 格式是什么？（毫秒时间戳？秒时间戳？）
- ✅ 是否还需要其他必填参数？

---

#### 5.2 收银台代收接口 (`payment/checkout`)

**当前发送的参数：**
```json
{
  "merchant_id": "test2020@epay.com",
  "order_id": "test_1764307526395_95655e5d",
  "amount": "1.00",
  "currency": "CNY",
  "to_currency": "USDT",
  "notify_url": "http://localhost:3001/api/payments/provider/epay/webhook",
  "return_url": "http://localhost:3000/pay/success",
  "timestamp": "1764307526396",
  "sign": "6AA3D0CEDD54BE19E466072C84BE6B27"
}
```

**需要确认：**
- ✅ 参数名称是否正确？
- ✅ `amount` 格式是什么？（字符串？数字？保留几位小数？）
- ✅ `notify_url` 和 `return_url` 是否必填？
- ✅ `order_id` 格式要求是什么？（长度限制？字符限制？）

---

#### 5.3 查询订单接口 (`order/query`)

**当前发送的参数：**
```json
{
  "merchant_id": "test2020@epay.com",
  "order_id": "test_xxx",
  "timestamp": "1764307526396",
  "sign": "xxx"
}
```

**需要确认：**
- ✅ 参数是否完整？
- ✅ 是否支持通过其他字段查询（如 `payment_id`）？

---

#### 5.4 银行代付接口 (`payout/bank`)

**当前发送的参数：**
```json
{
  "merchant_id": "test2020@epay.com",
  "order_id": "xxx",
  "amount": "100.00",
  "currency": "USDT",
  "bank_name": "xxx",
  "bank_account": "xxx",
  "account_name": "xxx",
  "notify_url": "http://localhost:3001/api/payments/provider/epay/webhook",
  "timestamp": "xxx",
  "metadata": "{}",
  "sign": "xxx"
}
```

**需要确认：**
- ✅ 参数名称是否正确？
- ✅ `bank_name`、`bank_account`、`account_name` 是否必填？
- ✅ `metadata` 格式是什么？（JSON字符串？）

---

### 6. 响应格式确认

**需要确认：**
- ✅ 成功响应的格式是什么？
  - 示例：`{ "code": "0000", "message": "success", "data": {...} }`
  - 还是：`{ "status": "success", "result": {...} }`
- ✅ 错误响应的格式是什么？
- ✅ HTTP状态码规则是什么？（200表示成功？还是需要检查响应体中的code字段？）

---

### 7. 错误处理

**当前错误：** `400 The plain HTTP request was sent to HTTPS port`

**需要确认：**
- ✅ 这个错误通常是什么原因导致的？
- ✅ 是否需要特殊的请求头？
- ✅ 是否需要IP白名单配置？（已配置，但需要确认是否生效）

---

### 8. Webhook回调确认

**当前配置：**
- Webhook URL: `http://localhost:3001/api/payments/provider/epay/webhook`

**需要确认：**
- ✅ Webhook URL格式要求是什么？（必须是HTTPS？）
- ✅ Webhook回调的签名验证方式是什么？
- ✅ Webhook回调的参数格式是什么？
- ✅ 回调重试机制是什么？（失败后多久重试？重试几次？）

---

## 测试环境信息

**当前测试配置：**
- 商户ID: `test2020@epay.com`
- 测试环境URL: `https://29597375fx.epaydev.xyz/epayweb`
- IP白名单: ✅ 已配置

**测试请求示例：**
```bash
# 计算汇率
POST https://29597375fx.epaydev.xyz/epayweb/api/calculate-rate
Content-Type: application/x-www-form-urlencoded

merchant_id=test2020@epay.com&from_currency=CNY&to_currency=USDT&amount=100&timestamp=1764307524598&sign=B454C75701BD906A7690CE3E6C3EAEC5
```

---

## 期望的回复格式

请EPAY技术支持提供：

1. **完整的API文档链接**（如果有最新版本）
2. **每个接口的完整URL示例**（包含baseUrl和路径）
3. **签名算法的官方示例**（包含参数和预期结果）
4. **成功和失败的响应示例**
5. **常见错误码说明**

---

## 联系方式

如有问题，请联系EPAY技术支持，并提供：
- 商户ID: `test2020@epay.com`
- 当前错误: `400 The plain HTTP request was sent to HTTPS port`
- 测试环境URL: `https://29597375fx.epaydev.xyz/epayweb`

