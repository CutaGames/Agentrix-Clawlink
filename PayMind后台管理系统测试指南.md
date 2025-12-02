# PayMind 后台管理系统测试指南

**版本**: 1.0  
**日期**: 2025年1月  
**状态**: ✅ **测试指南已创建**

---

## 📋 测试前准备

### 1. 启动服务

#### 启动主API服务（3001端口）
```bash
cd backend
npm run start:dev
```

#### 启动后台管理服务（3002端口）
```bash
cd backend
npm run start:admin:dev
```

#### 启动前端服务（3000端口）
```bash
cd paymindfrontend
npm run dev
```

### 2. 创建测试管理员

首先需要创建一个管理员账号。可以通过以下方式：

#### 方式1: 使用数据库直接创建
```sql
-- 连接到PostgreSQL
psql -U postgres -d paymind

-- 插入测试管理员（密码: admin123）
INSERT INTO admin_users (id, username, email, "passwordHash", status, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin',
  'admin@paymind.io',
  '$2b$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', -- bcrypt hash of 'admin123'
  'active',
  NOW(),
  NOW()
);
```

#### 方式2: 使用API创建（需要先有超级管理员）
```bash
curl -X POST http://localhost:3002/api/admin/system/admins \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@paymind.io",
    "password": "admin123",
    "fullName": "系统管理员"
  }'
```

---

## 🧪 测试步骤

### 1. 前端界面测试

#### 1.1 访问管理后台
1. 打开浏览器访问: http://localhost:3000/admin
2. 应该看到管理后台登录页面或仪表盘

#### 1.2 测试各功能页面
依次测试以下页面：

- ✅ **仪表盘** (`/admin`)
  - 检查数据统计卡片是否显示
  - 检查快速操作按钮是否可用

- ✅ **用户管理** (`/admin/users`)
  - 检查用户列表是否加载
  - 测试搜索功能
  - 测试KYC审批功能
  - 测试分页功能

- ✅ **商户管理** (`/admin/merchants`)
  - 检查商户列表是否加载
  - 检查统计信息是否显示
  - 测试查看详情功能

- ✅ **开发者管理** (`/admin/developers`)
  - 检查开发者列表是否加载
  - 检查Agent统计是否显示
  - 检查收益统计是否显示

- ✅ **推广者管理** (`/admin/promoters`)
  - 检查推广者列表是否加载
  - 检查推广统计是否显示

- ✅ **工单管理** (`/admin/tickets`)
  - 检查工单列表是否加载
  - 测试状态筛选功能
  - 测试优先级显示

- ✅ **营销管理** (`/admin/marketing`)
  - 测试营销活动标签页
  - 测试优惠券标签页
  - 检查数据是否加载

- ✅ **风控管理** (`/admin/risk`)
  - 测试风险评估标签页
  - 测试风险订单标签页
  - 测试冻结/解冻功能

- ✅ **系统管理** (`/admin/system`)
  - 测试管理员标签页
  - 测试角色权限标签页
  - 测试系统配置标签页
  - 测试创建功能

### 2. API接口测试

#### 2.1 使用测试脚本
```bash
cd backend
chmod +x test-admin-api.sh
./test-admin-api.sh
```

#### 2.2 手动测试关键API

##### 管理员登录
```bash
curl -X POST http://localhost:3002/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

##### 获取用户列表
```bash
curl -X GET "http://localhost:3002/api/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

##### 获取仪表盘数据
```bash
curl -X GET http://localhost:3002/api/admin/dashboard/overview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. 功能测试清单

#### 3.1 用户管理功能
- [ ] 用户列表加载
- [ ] 用户搜索功能
- [ ] 用户筛选功能
- [ ] 用户详情查看
- [ ] KYC审批功能
- [ ] 用户状态更新
- [ ] 用户统计显示

#### 3.2 商户管理功能
- [ ] 商户列表加载
- [ ] 商户详情查看
- [ ] 商户商品列表
- [ ] 商户订单列表
- [ ] 商户结算列表
- [ ] 商户统计显示

#### 3.3 开发者管理功能
- [ ] 开发者列表加载
- [ ] 开发者详情查看
- [ ] Agent列表查看
- [ ] 收益统计显示

#### 3.4 推广者管理功能
- [ ] 推广者列表加载
- [ ] 推广关系查看
- [ ] 推广分成查看
- [ ] 推广统计显示

#### 3.5 工单管理功能
- [ ] 工单列表加载
- [ ] 工单状态筛选
- [ ] 工单详情查看
- [ ] 工单回复功能
- [ ] 工单统计显示

#### 3.6 营销管理功能
- [ ] 营销活动列表
- [ ] 营销活动创建
- [ ] 优惠券列表
- [ ] 优惠券创建
- [ ] 营销统计显示

#### 3.7 风控管理功能
- [ ] 风险评估列表
- [ ] 风险订单列表
- [ ] 订单冻结功能
- [ ] 订单解冻功能
- [ ] 风险统计显示

#### 3.8 系统管理功能
- [ ] 管理员列表
- [ ] 管理员创建
- [ ] 角色列表
- [ ] 角色创建
- [ ] 系统配置列表
- [ ] 配置更新功能

---

## 🐛 常见问题排查

### 问题1: 无法登录
**症状**: 登录时提示用户名或密码错误

**排查步骤**:
1. 检查管理员账号是否已创建
2. 检查密码是否正确（默认: admin123）
3. 检查数据库连接是否正常
4. 查看后端日志是否有错误

### 问题2: API返回401未授权
**症状**: 访问API时返回401错误

**排查步骤**:
1. 检查Token是否有效
2. 检查Token是否过期
3. 检查请求头是否正确设置Authorization
4. 重新登录获取新Token

### 问题3: 前端页面无法加载数据
**症状**: 页面显示"加载中..."或空白

**排查步骤**:
1. 检查后端服务是否运行（3002端口）
2. 检查浏览器控制台是否有错误
3. 检查API地址是否正确（http://localhost:3002/api/admin）
4. 检查CORS配置是否正确

### 问题4: 数据库表不存在
**症状**: 启动时提示表不存在

**排查步骤**:
1. 运行数据库迁移:
   ```bash
   cd backend
   npm run migration:run
   ```
2. 检查实体文件是否正确
3. 检查数据库连接配置

---

## 📊 测试报告模板

### 测试环境
- **操作系统**: 
- **Node版本**: 
- **数据库**: PostgreSQL
- **测试时间**: 

### 测试结果

| 功能模块 | 测试项 | 状态 | 备注 |
|---------|--------|------|------|
| 用户管理 | 用户列表 | ✅/❌ | |
| 用户管理 | KYC审批 | ✅/❌ | |
| 商户管理 | 商户列表 | ✅/❌ | |
| 开发者管理 | 开发者列表 | ✅/❌ | |
| 推广者管理 | 推广者列表 | ✅/❌ | |
| 工单管理 | 工单列表 | ✅/❌ | |
| 营销管理 | 营销活动 | ✅/❌ | |
| 风控管理 | 风险评估 | ✅/❌ | |
| 系统管理 | 管理员管理 | ✅/❌ | |

### 发现的问题
1. 
2. 
3. 

### 建议改进
1. 
2. 
3. 

---

## 🚀 快速测试命令

### 一键测试所有API
```bash
cd backend
./test-admin-api.sh
```

### 测试特定功能
```bash
# 测试用户管理
curl -X GET "http://localhost:3002/api/admin/users?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.'

# 测试商户管理
curl -X GET "http://localhost:3002/api/admin/merchants?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.'

# 测试仪表盘
curl -X GET "http://localhost:3002/api/admin/dashboard/overview" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.'
```

---

**文档版本**: 1.0  
**最后更新**: 2025年1月  
**维护者**: PayMind开发团队

