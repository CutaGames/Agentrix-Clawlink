# 🚀 部署检查清单

## 问题诊断（2026-01-25）

用户报告了两个问题：
1. ❌ **Marketplace价格未显示** - skill卡片没有价格信息
2. ❌ **"我的技能"为空** - 发布技能后在"我的技能"面板看不到

## 根本原因

### 问题1：代码已修改但服务未重启

✅ **代码层面**：
- `frontend/pages/marketplace.tsx` Line 392-398：已添加价格显示逻辑
- `backend/src/modules/skill/skill.controller.ts` Line 32：已添加 `@UseGuards(JwtAuthGuard)`
- `backend/src/modules/skill/skill.service.ts` Line 61：已支持 `authorId` 参数

❌ **服务层面**：
- Backend未重新构建 → `dist/main.js` 使用的是旧代码
- Frontend未重新启动 → 浏览器加载的是旧bundle
- 数据库已修复 → 199个orphan skills已分配给system user

### 问题2：前端未传递正确的价格数据

查看 `UnifiedPublishingPanel.tsx` Line 149：
```tsx
pricing: {
  type: formData.pricingType === 'subscription' ? 'subscription' : 'per_call',
  pricePerCall: finalPrice,
  currency: 'USD',
  commissionRate: 10,
}
```

Marketplace显示逻辑 Line 392：
```tsx
{skill.pricing?.pricePerCall && (
  <span className="font-semibold text-green-400">
    ${skill.pricing.pricePerCall}/{t({ zh: '次', en: 'call' })}
  </span>
)}
```

**结论**：代码逻辑正确，但需要：
1. 重新构建backend使新认证代码生效
2. 重启frontend加载新的价格显示UI
3. 确保发布时正确传递pricing数据

---

## 📋 完整部署步骤

### Step 1: 停止所有服务

```bash
# 在WSL中执行
pkill -f "npm run dev"
pkill -f "npm run start:dev"
pkill -f "node dist/main"
```

### Step 2: 重新构建Backend

```bash
cd backend
npm run build

# 验证构建成功
ls -lh dist/main.js
# 应该显示最新时间戳的文件
```

**关键检查点**：
- ✅ `dist/main.js` 文件存在且是最新时间
- ✅ 无TypeScript编译错误
- ✅ `JwtAuthGuard` 导入正确

### Step 3: 启动Backend服务

```bash
# 开发模式（推荐）
cd backend
npm run start:dev

# 或生产模式
npm run start:prod
```

**验证Backend正常**：
```bash
curl http://localhost:3001/api/health
# 应返回 {"status":"ok"} 或类似响应
```

### Step 4: 重新构建Frontend

```bash
cd frontend
npm run build

# 验证构建成功
ls -lh .next/
```

**关键检查点**：
- ✅ `.next/` 目录存在
- ✅ 无Next.js编译错误
- ✅ Marketplace页面成功打包

### Step 5: 启动Frontend服务

```bash
# 开发模式
cd frontend
npm run dev

# 或生产模式
npm run start
```

**验证Frontend正常**：
访问 http://localhost:3000/marketplace 并检查：
- ✅ 页面正常加载
- ✅ 控制台无JS错误

### Step 6: 验证Authentication

```bash
# 测试skill创建需要token
curl -X POST http://localhost:3001/api/skills \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Skill","description":"Test"}' \
  -w "\nHTTP Status: %{http_code}\n"

# 应该返回 401 Unauthorized（正确行为）
```

**如果返回401**：✅ Authentication已生效

**如果返回200且创建成功**：❌ 需要检查controller是否真正加载了新代码

### Step 7: 端到端测试

#### 测试1：发布新Skill
1. 登录 http://localhost:3000
2. 进入 Workbench → 发布技能
3. 填写表单：
   - Name: "Test Price Display Skill"
   - Description: "Testing price display feature"
   - Pricing Type: "按次付费" (per_call)
   - Price: $0.50
4. 点击"发布"
5. ✅ 应显示成功提示

#### 测试2：检查"我的技能"
1. 刷新页面或点击"我的技能"
2. ✅ 应看到刚发布的skill
3. ✅ skill卡片应显示价格 "$0.50/次"

#### 测试3：检查Marketplace价格显示
1. 访问 http://localhost:3000/marketplace
2. ✅ 所有skill卡片应显示：
   - 付费skill: "$X.XX/次" (绿色字体)
   - 免费skill: "免费" (蓝色字体)
3. ✅ 排序dropdown应正常工作（最热门/最新上架/最高评分）

---

## 🔧 常见问题排查

### Q1: Backend启动失败 "Cannot find module JwtAuthGuard"

**原因**：import路径错误或模块未安装

**解决**：
```bash
cd backend
npm install @nestjs/passport @nestjs/jwt passport passport-jwt
npm run build
```

### Q2: "我的技能"仍然为空

**可能原因**：
1. ✅ Backend认证已加，但frontend未传token
2. ✅ 之前发布的skill没有authorId（数据已通过fix-orphan-skills.ts修复）
3. ❌ 浏览器缓存了旧的API响应

**解决**：
```bash
# 清除浏览器缓存
Ctrl+Shift+R (硬刷新)

# 或在DevTools中
Application → Clear site data
```

**验证API响应**：
打开浏览器DevTools → Network → 查找 `/api/skills/my` 请求：
```json
{
  "success": true,
  "items": [
    {
      "id": "xxx",
      "name": "Test Skill",
      "authorId": "your-user-id",  ← 必须存在
      "pricing": {
        "pricePerCall": 0.50        ← 必须存在
      }
    }
  ],
  "total": 1
}
```

### Q3: Marketplace显示skill但无价格

**可能原因**：
1. ✅ skill.pricing字段为null或undefined
2. ✅ skill.pricing.pricePerCall为0或undefined
3. ❌ Frontend条件渲染逻辑错误

**检查数据**：
打开浏览器DevTools → Network → `/api/unified-marketplace/search`：
```json
{
  "items": [
    {
      "id": "xxx",
      "pricing": {
        "type": "per_call",    ← 必须是 "per_call" 或 "subscription"
        "pricePerCall": 0.50   ← 必须 > 0
      }
    }
  ]
}
```

**如果pricing为null**：
需要更新数据库或重新发布skill：
```sql
UPDATE skills 
SET pricing = '{"type":"per_call","pricePerCall":0.50,"currency":"USD"}'::jsonb
WHERE id = 'skill-id-here';
```

### Q4: 排序功能不工作

**检查**：
1. 打开DevTools → Network → 查看请求URL
2. 应包含 `?sortBy=callCount` 或 `createdAt` 或 `rating`
3. Backend是否正确处理sortBy参数

**如果URL中没有sortBy**：
检查 `marketplace.tsx` Line 122：
```tsx
params.set('sortBy', sortBy);
```
确保state更新触发了重新fetch。

---

## ✅ 最终验证清单

执行以下所有检查，确保系统完全正常：

### Backend检查
- [ ] `npm run build` 成功无错误
- [ ] `dist/main.js` 文件时间戳是最新的
- [ ] 服务启动在 `http://localhost:3001`
- [ ] `/api/health` 返回200 OK
- [ ] POST `/api/skills` 未带token时返回401
- [ ] POST `/api/skills` 带token时返回200并创建skill
- [ ] GET `/api/skills/my` 返回当前用户的skills

### Frontend检查
- [ ] `npm run build` 成功无错误（如用生产模式）
- [ ] 服务启动在 `http://localhost:3000`
- [ ] Marketplace页面正常加载
- [ ] 控制台无JavaScript错误
- [ ] 价格显示在skill卡片上（付费skill显示金额，免费skill显示"免费"）
- [ ] 排序dropdown可切换（最热门/最新上架/最高评分）

### 数据库检查
- [ ] 执行 `SELECT COUNT(*) FROM skills WHERE "authorId" IS NULL;` 返回 `0`
- [ ] 新发布的skill在数据库中有正确的authorId
- [ ] pricing字段是有效的JSONB（不为null）

### 端到端检查
- [ ] 登录后可发布新skill
- [ ] 发布成功后在"我的技能"中可见
- [ ] Marketplace中可搜索到新skill
- [ ] 价格显示正确
- [ ] 点击"安装"或"$X.XX 购买"按钮有反应

---

## 🎯 快速一键部署命令

如果您想快速执行所有步骤，可以使用：

```bash
#!/bin/bash
# quick-deploy.sh

echo "🛑 停止所有服务..."
pkill -f "npm run dev" || true
pkill -f "npm run start:dev" || true
sleep 2

echo "🔨 重新构建Backend..."
cd backend
npm run build || { echo "❌ Backend构建失败"; exit 1; }

echo "🚀 启动Backend服务..."
npm run start:dev &
BACKEND_PID=$!
sleep 5

echo "✅ 验证Backend健康..."
curl -f http://localhost:3001/api/health || { echo "❌ Backend启动失败"; kill $BACKEND_PID; exit 1; }

echo "🔨 重新构建Frontend..."
cd ../frontend
npm run build || { echo "❌ Frontend构建失败"; exit 1; }

echo "🚀 启动Frontend服务..."
npm run dev &
FRONTEND_PID=$!
sleep 5

echo "✅ 验证Frontend健康..."
curl -f http://localhost:3000 || { echo "❌ Frontend启动失败"; kill $FRONTEND_PID; exit 1; }

echo "🎉 部署完成！"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "访问:"
echo "  Marketplace: http://localhost:3000/marketplace"
echo "  Workbench:   http://localhost:3000/workbench"
```

保存后执行：
```bash
wsl bash quick-deploy.sh
```

---

## 📊 验证结果记录

**执行时间**: ____________________
**执行人**: ____________________

| 检查项 | 状态 | 备注 |
|--------|------|------|
| Backend构建 | ☐ 通过 ☐ 失败 | |
| Frontend构建 | ☐ 通过 ☐ 失败 | |
| Backend启动 | ☐ 通过 ☐ 失败 | |
| Frontend启动 | ☐ 通过 ☐ 失败 | |
| Authentication生效 | ☐ 通过 ☐ 失败 | |
| 发布skill成功 | ☐ 通过 ☐ 失败 | |
| "我的技能"显示 | ☐ 通过 ☐ 失败 | |
| Marketplace价格显示 | ☐ 通过 ☐ 失败 | |
| 排序功能正常 | ☐ 通过 ☐ 失败 | |

**问题记录**：
____________________________________________________________________
____________________________________________________________________

**解决方案**：
____________________________________________________________________
____________________________________________________________________
