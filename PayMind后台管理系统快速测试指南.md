# PayMind 后台管理系统快速测试指南

**版本**: 1.0  
**日期**: 2025年1月

---

## 🚀 快速开始

### 1. 启动所有服务

#### Windows PowerShell
```powershell
# 终端1: 启动主API服务（3001端口）
cd backend
npm run start:dev

# 终端2: 启动后台管理服务（3002端口）
cd backend
npm run start:admin:dev

# 终端3: 启动前端服务（3000端口）
cd paymindfrontend
npm run dev
```

#### Linux/WSL
```bash
# 终端1: 启动主API服务（3001端口）
cd backend && npm run start:dev &

# 终端2: 启动后台管理服务（3002端口）
cd backend && npm run start:admin:dev &

# 终端3: 启动前端服务（3000端口）
cd paymindfrontend && npm run dev &
```

### 2. 创建测试管理员

#### 方式1: 使用SQL（推荐）
```sql
-- 连接到PostgreSQL
psql -U postgres -d paymind

-- 插入测试管理员（密码: admin123）
-- 注意：需要先安装bcrypt生成密码hash，或使用以下命令生成
-- node -e "const bcrypt=require('bcrypt');bcrypt.hash('admin123',10).then(h=>console.log(h))"

INSERT INTO admin_users (id, username, email, "passwordHash", status, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin',
  'admin@paymind.io',
  '$2b$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', -- 需要替换为实际的bcrypt hash
  'active',
  NOW(),
  NOW()
);
```

#### 方式2: 使用Node.js脚本
```bash
cd backend
node -e "
const bcrypt = require('bcrypt');
const { createConnection } = require('typeorm');
bcrypt.hash('admin123', 10).then(hash => {
  console.log('Password hash:', hash);
  // 然后使用这个hash插入数据库
});
"
```

---

## 🧪 测试步骤

### 步骤1: 测试API接口

#### Windows PowerShell
```powershell
cd backend
.\test-admin-api.ps1
```

#### Linux/WSL
```bash
cd backend
chmod +x test-admin-api.sh
./test-admin-api.sh
```

### 步骤2: 测试前端界面

1. **访问管理后台**
   - 打开浏览器: http://localhost:3000/admin
   - 如果显示登录页面，使用: `admin` / `admin123`

2. **测试各功能页面**
   - ✅ 仪表盘 - 检查数据统计
   - ✅ 用户管理 - 测试列表、搜索、KYC审批
   - ✅ 商户管理 - 测试列表、统计
   - ✅ 开发者管理 - 测试列表、统计
   - ✅ 推广者管理 - 测试列表、统计
   - ✅ 工单管理 - 测试列表、筛选
   - ✅ 营销管理 - 测试活动、优惠券
   - ✅ 风控管理 - 测试风险评估、订单管理
   - ✅ 系统管理 - 测试管理员、角色、配置

### 步骤3: 手动测试关键功能

#### 测试用户KYC审批
1. 进入用户管理页面
2. 找到一个未认证的用户
3. 点击"批准KYC"按钮
4. 检查用户状态是否更新

#### 测试工单处理
1. 进入工单管理页面
2. 选择一个待处理工单
3. 点击"查看"进入详情
4. 测试回复功能

#### 测试风控订单冻结
1. 进入风控管理页面
2. 切换到"风险订单"标签
3. 选择一个订单
4. 点击"冻结"按钮
5. 检查订单状态是否变为frozen

#### 测试系统配置
1. 进入系统管理页面
2. 切换到"系统配置"标签
3. 选择一个配置项
4. 点击"编辑"修改值
5. 检查是否保存成功

---

## 📊 测试检查清单

### 前端界面测试
- [ ] 所有页面可以正常访问
- [ ] 数据列表可以正常加载
- [ ] 搜索功能正常工作
- [ ] 筛选功能正常工作
- [ ] 分页功能正常工作
- [ ] 详情页面可以正常打开
- [ ] 创建/编辑功能正常工作
- [ ] 状态更新功能正常工作

### API接口测试
- [ ] 管理员登录API正常
- [ ] 所有GET接口返回数据
- [ ] 所有POST接口可以创建数据
- [ ] 所有PUT接口可以更新数据
- [ ] 统计接口返回正确数据
- [ ] 分页参数正常工作
- [ ] 筛选参数正常工作

### 功能测试
- [ ] 用户KYC审批流程
- [ ] 工单创建和处理流程
- [ ] 营销活动创建流程
- [ ] 优惠券创建流程
- [ ] 风险订单冻结/解冻流程
- [ ] 管理员创建流程
- [ ] 角色创建流程
- [ ] 系统配置更新流程

---

## 🐛 常见问题

### Q1: 无法访问管理后台
**A**: 检查前端服务是否运行在3000端口，访问 http://localhost:3000/admin

### Q2: API返回404
**A**: 检查后台管理服务是否运行在3002端口，访问 http://localhost:3002/api/docs

### Q3: 登录失败
**A**: 
1. 检查管理员账号是否已创建
2. 检查密码是否正确
3. 检查数据库连接是否正常

### Q4: 前端无法加载数据
**A**: 
1. 检查浏览器控制台错误
2. 检查API地址是否正确（http://localhost:3002/api/admin）
3. 检查Token是否有效

---

## 📝 测试报告

测试完成后，请填写以下信息：

### 测试环境
- 操作系统: 
- Node版本: 
- 测试时间: 
- 测试人员: 

### 测试结果
- 前端界面: ✅/❌
- API接口: ✅/❌
- 功能测试: ✅/❌

### 发现的问题
1. 
2. 
3. 

---

**文档版本**: 1.0  
**最后更新**: 2025年1月

