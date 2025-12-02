# PayMind 后台管理系统端口配置说明

**更新日期**: 2025年1月  
**状态**: ✅ **端口配置已调整**

---

## 📊 端口分配

| 服务 | 端口 | 访问地址 | 说明 |
|------|------|---------|------|
| **官网前端** | 3000 | http://localhost:3000 | Next.js前端应用 |
| **API文档** | 3001 | http://localhost:3001/api/docs | Swagger API文档 |
| **后台接口** | 3002 | http://localhost:3002/api/admin | 后台管理API |
| **SDK文档** | 3004 | http://localhost:3004 | SDK文档服务器 |

---

## 🚀 启动方式

### 1. 启动主API服务（3001端口 - API文档）

```bash
cd backend
npm run start:dev
```

访问: http://localhost:3001/api/docs

### 2. 启动后台管理服务（3002端口）

```bash
cd backend
npm run start:admin:dev
```

访问: http://localhost:3002/api/docs

### 3. 启动前端服务（3000端口）

```bash
cd paymindfrontend
npm run dev
```

访问: http://localhost:3000

### 4. 启动SDK文档服务（3004端口）

```bash
cd backend
npm run docs:server
# 或修改端口为3004
```

---

## 📝 配置文件说明

### 后端配置

#### `backend/src/main.ts`
- 主API服务入口
- 运行在 **3001** 端口
- 提供API文档（Swagger）

#### `backend/src/main-admin.ts`
- 后台管理服务入口
- 运行在 **3002** 端口
- 提供后台管理API和文档

### 前端配置

#### `paymindfrontend/pages/admin/*.tsx`
- 所有管理后台页面已更新API地址为 `http://localhost:3002/api/admin`

---

## 🔧 环境变量

可以在 `.env` 文件中配置端口：

```env
# 主API端口
PORT=3001

# 后台管理端口
ADMIN_PORT=3002

# SDK文档端口
SDK_DOCS_PORT=3004
```

---

## 📚 API端点

### 后台管理API（3002端口）

所有后台管理API都以 `/api/admin` 为前缀：

- `POST /api/admin/auth/login` - 管理员登录
- `GET /api/admin/users` - 获取用户列表
- `GET /api/admin/merchants` - 获取商户列表
- `GET /api/admin/developers` - 获取开发者列表
- `GET /api/admin/promoters` - 获取推广者列表
- `GET /api/admin/tickets` - 获取工单列表
- `GET /api/admin/marketing/campaigns` - 获取营销活动列表
- `GET /api/admin/marketing/coupons` - 获取优惠券列表
- `GET /api/admin/risk/assessments` - 获取风险评估列表
- `GET /api/admin/system/admins` - 获取管理员列表
- `GET /api/admin/system/roles` - 获取角色列表
- `GET /api/admin/system/configs` - 获取系统配置列表

完整API文档: http://localhost:3002/api/docs

---

## ✅ 已完成调整

1. ✅ 创建 `backend/src/main-admin.ts` - 后台管理服务入口
2. ✅ 更新 `backend/package.json` - 添加启动脚本
3. ✅ 更新前端API地址 - 所有管理页面使用3002端口
4. ✅ 更新Swagger配置 - 后台API文档使用3002端口

---

## 🎯 使用说明

### 开发环境

1. **启动主API服务**（3001端口）
   ```bash
   cd backend
   npm run start:dev
   ```

2. **启动后台管理服务**（3002端口）
   ```bash
   cd backend
   npm run start:admin:dev
   ```

3. **启动前端服务**（3000端口）
   ```bash
   cd paymindfrontend
   npm run dev
   ```

4. **访问管理后台**
   - 前端: http://localhost:3000/admin
   - API文档: http://localhost:3002/api/docs

### 生产环境

需要配置反向代理（Nginx）将不同路径路由到不同端口：

```nginx
# 官网前端
location / {
    proxy_pass http://localhost:3000;
}

# API文档
location /api/docs {
    proxy_pass http://localhost:3001;
}

# 后台管理API
location /api/admin {
    proxy_pass http://localhost:3002;
}

# SDK文档
location /sdk {
    proxy_pass http://localhost:3004;
}
```

---

**文档版本**: 1.0  
**最后更新**: 2025年1月

