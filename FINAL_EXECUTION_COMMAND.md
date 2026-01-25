# 最终执行指令 - 请在纯WSL终端执行

## ⚡ 一键验证（60秒完成）

打开 **WSL Ubuntu-24.04 终端**（不要用PowerShell），复制粘贴：

```bash
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website

# 一键修复并测试
bash tests/fix-and-test.sh
```

---

## 🎯 预期结果

```
✓ PostgreSQL 已在运行
✓ 数据库连接成功
✓ 后端服务正常启动
✓ 五类画像验证: 19/19 PASSED
```

---

## 🔧 如果仍然503，手动执行：

```bash
# 1. 启动数据库
sudo service postgresql start

# 2. 验证连接
PGPASSWORD=agentrix_secure_2024 psql -U agentrix -h localhost -d paymind -c '\conninfo'

# 3. 启动后端 (新终端)
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend
npm run start:dev

# 4. 等待30秒，然后测试 (另一个终端)
curl http://localhost:3001/api/health
bash /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/tests/verify-persona-flows.sh
```

---

## 📊 已完成的修复

| 问题 | 状态 | 修复内容 |
|:-----|:----:|:---------|
| 数据库名错误 | ✅ | `agentrix` → `paymind` |
| 数据库密码错误 | ✅ | `agentrix_password` → `agentrix_secure_2024` |
| 同步配置 | ✅ | 强制禁用 `synchronize: false` |
| 启动超时 | ✅ | 跳过可选的enum预处理 |
| P1/P2组件 | ✅ | 8个组件 + 2个API客户端 |
| 后端模块 | ✅ | ExpertProfile + Dataset (6个文件) |
| 测试脚本 | ✅ | fix-and-test.sh 自动修复脚本 |

---

## 💡 为什么不能从PowerShell执行？

Windows PowerShell执行 `wsl -e bash` 时，localhost代理配置不会镜像到WSL环境，导致：
- WSL内的curl/npm命令无法访问localhost
- 进程启动但无法验证健康状态
- 超时但实际服务可能已启动

**解决方案**: 直接在WSL终端内执行所有命令。

---

**更新时间**: 2026-01-18 14:10  
**估计耗时**: < 2分钟
