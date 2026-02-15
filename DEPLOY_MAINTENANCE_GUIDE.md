# Agentrix 东京服务器部署与维护指南

> **服务器**: AWS Tokyo (ap-northeast-1)  
> **IP**: `57.182.89.146`  
> **OS**: Ubuntu 24.04 LTS (6.14.0-1018-aws)  
> **内存**: 4GB + 4GB Swap  
> **磁盘**: 29GB (当前使用 ~19GB)  
> **最后更新**: 2026-02-13

---

## 1. SSH 连接

```bash
# Windows PowerShell
ssh -i C:\Users\15279\Desktop\agentrix.pem ubuntu@57.182.89.146

# WSL (需要先修复 PEM 权限)
cp /mnt/c/Users/15279/Desktop/agentrix.pem /tmp/agentrix.pem
chmod 600 /tmp/agentrix.pem
ssh -i /tmp/agentrix.pem ubuntu@57.182.89.146
```

---

## 2. 服务架构

所有服务通过 Docker Compose 管理，配置文件位于 `/home/ubuntu/Agentrix/docker-compose.prod.yml`。

| 容器名 | 服务 | 端口 | 说明 |
|--------|------|------|------|
| `agentrix-backend` | NestJS API | 3001 (内部) | 主后端，含 OAuth、支付、商品等 |
| `agentrix-hq-pilot` | HQ Backend | 3005 (内部) | HQ 独立后端 (Agent 工作台) |
| `agentrix-frontend` | Next.js 13 | 3000 (内部) | Agentrix 主站前端 |
| `agentrix-hq` | Next.js 14 | 3000 (内部) | HQ Console 前端 |
| `agentrix-nginx` | Nginx | 80, 8080, 443 | 反向代理 |
| `agentrix-postgres` | PostgreSQL 15 | 5432 (内部) | 数据库 |
| `agentrix-redis` | Redis 7 | 6379 (内部) | 缓存 |

### 域名路由 (Nginx)

| 域名 | 目标 |
|------|------|
| `api.agentrix.top` → `:80` | → `backend:3001` |
| `hq.agentrix.top` → `:80` | → `hq-console:3000` |
| `agentrix.top` / `www.agentrix.top` → `:80` | → `frontend:3000` |
| `*:8080` | → `hq-console:3000` (IP 直连 HQ) |
| `*:80/api` | → `backend:3001/api` (IP 直连 API fallback) |

---

## 3. 数据库凭据

### Agentrix 主数据库 (Docker Postgres)

| 项目 | 值 |
|------|-----|
| **Host** | `agentrix-postgres` (容器内) / `localhost:5432` (宿主机) |
| **Username** | `agentrix` |
| **Password** | `agentrix_secure_2024` |
| **Database** | `paymind` |
| **DB_SYNC** | `false` (生产环境必须关闭！) |

> ⚠️ **重要**: `docker-compose.prod.yml` 中 `DB_SYNC` 必须为 `"false"`。如果设为 `"true"` 会导致 TypeORM schema sync 冲突（`IDX_dbaa133cae3a785b7249868720 already exists`），backend 无法启动。

### 连接数据库

```bash
# 从宿主机通过 Docker
docker exec -it agentrix-postgres psql -U agentrix -d paymind

# 修改密码
docker exec agentrix-postgres psql -U agentrix -d paymind -c "ALTER USER agentrix WITH PASSWORD 'NEW_PASSWORD';"
```

---

## 4. 环境变量 (.env)

文件位置: `/home/ubuntu/Agentrix/.env`

### 关键配置项

```env
# 数据库
DB_HOST=agentrix-postgres
DB_PORT=5432
DB_USERNAME=agentrix
DB_PASSWORD=agentrix_secure_2024
DB_DATABASE=paymind
DB_SYNC=false

# JWT
JWT_SECRET=765bb571af4daf6997e04a9d6a82a2ebf1f8cecd72e0be560365f2821d555e53
JWT_EXPIRES_IN=7d

# API
API_BASE_URL=https://api.agentrix.top/api
FRONTEND_URL=http://57.182.89.146

# Google OAuth
GOOGLE_CLIENT_ID=927105684228-djcpc9m1dtihh5c71ltm90d2hbmdl0r7.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=https://api.agentrix.top/api/auth/google/callback

# Twitter/X OAuth
TWITTER_API_KEY=7eSUtcIU30pRwElb7EVv1tkDb
TWITTER_APIKEY_SECRET=0SmBl2THdZabYZVuCSoV3r6NvA19T1gRbdpk8fdepc422gPxjl
TWITTER_CLIENT_ID=YW9ueGtGY0RhZ3NxeWR6NXEWR6WTBVNk86MTpjYQ
TWITTER_CALLBACK_URL=https://api.agentrix.top/api/auth/twitter/callback

# Telegram
TELEGRAM_BOT_TOKEN=8292177231:AAHNZcDloe9DjQhSSQdVcoeg5E2H83U8S0I
TELEGRAM_BOT_USERNAME=agentrixnetwork_bot

# Discord
DISCORD_CLIENT_ID=1463455414359298175
DISCORD_CLIENT_SECRET=px-1uYgmHhvJ388TU0dl-SlwTDd4iLwl
DISCORD_TOKEN=MTQ2MzQ1NTQxNDM1OTI5ODE3NQ.GgI77C.iAgFywlhwfV941bQh_S9iedE2PyDbdlv79aqiU
```

---

## 5. 常用运维命令

### 查看服务状态

```bash
cd /home/ubuntu/Agentrix
docker compose -f docker-compose.prod.yml ps
```

### 重启所有服务

```bash
cd /home/ubuntu/Agentrix
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### 仅重启 Backend

```bash
cd /home/ubuntu/Agentrix
docker compose -f docker-compose.prod.yml restart backend
```

### 查看日志

```bash
# Backend 日志
docker logs agentrix-backend --tail 50 -f

# Nginx 日志
docker logs agentrix-nginx --tail 50 -f

# 所有服务日志
docker compose -f docker-compose.prod.yml logs -f --tail 20
```

### 健康检查

```bash
# Backend API
docker exec agentrix-backend wget -qO- http://127.0.0.1:3001/api/health

# 通过 Nginx
curl http://127.0.0.1/api/health

# HQ Console
curl -o /dev/null -w '%{http_code}' http://127.0.0.1:8080
```

---

## 6. 部署更新流程

### 6.1 更新 Backend 代码

```bash
# 1. 在本地 (WSL) 同步代码到服务器
cp /mnt/c/Users/15279/Desktop/agentrix.pem /tmp/agentrix.pem
chmod 600 /tmp/agentrix.pem

rsync -avz --delete \
  --exclude 'node_modules' --exclude 'dist' --exclude '.env' --exclude '.git' \
  -e 'ssh -i /tmp/agentrix.pem -o StrictHostKeyChecking=no' \
  /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend/ \
  ubuntu@57.182.89.146:/home/ubuntu/Agentrix/backend/

# 2. SSH 到服务器重建并重启
ssh -i /tmp/agentrix.pem ubuntu@57.182.89.146
cd /home/ubuntu/Agentrix
docker compose -f docker-compose.prod.yml up -d --build backend
```

### 6.2 更新 Frontend 代码

```bash
# 同步 frontend 代码
rsync -avz --delete \
  --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  -e 'ssh -i /tmp/agentrix.pem -o StrictHostKeyChecking=no' \
  /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend/ \
  ubuntu@57.182.89.146:/home/ubuntu/Agentrix/frontend/

# SSH 到服务器重建
cd /home/ubuntu/Agentrix
docker compose -f docker-compose.prod.yml up -d --build frontend
```

### 6.3 更新 HQ Console

```bash
# 同步 hq-console 代码
rsync -avz --delete \
  --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  -e 'ssh -i /tmp/agentrix.pem -o StrictHostKeyChecking=no' \
  /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/hq-console/ \
  ubuntu@57.182.89.146:/home/ubuntu/Agentrix/hq-console/

# SSH 到服务器重建
cd /home/ubuntu/Agentrix
docker compose -f docker-compose.prod.yml up -d --build hq-console
```

### 6.4 更新 Docker Compose 或 Nginx 配置

```bash
# 从本地 scp 配置文件
scp -i C:\Users\15279\Desktop\agentrix.pem \
  docker-compose.prod.yml \
  ubuntu@57.182.89.146:/home/ubuntu/Agentrix/

scp -i C:\Users\15279\Desktop\agentrix.pem \
  nginx/production.conf \
  ubuntu@57.182.89.146:/home/ubuntu/Agentrix/nginx/production.conf

# SSH 到服务器，重建受影响的服务
cd /home/ubuntu/Agentrix
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

---

## 7. 常见问题排查

### 7.1 Backend 启动失败: "password authentication failed"

数据库密码不匹配。Postgres 数据卷中的密码是初次创建时设定的，修改 `.env` 不会自动更新。

**修复方法:**
```bash
# 进入 postgres 容器修改密码
docker exec agentrix-postgres psql -U agentrix -d paymind \
  -c "ALTER USER agentrix WITH PASSWORD 'agentrix_secure_2024';"
# 然后重启 backend
docker compose -f docker-compose.prod.yml restart backend
```

### 7.2 Backend 启动失败: "IDX_xxx already exists"

`DB_SYNC=true` 导致 TypeORM 尝试同步 schema 时索引冲突。

**修复方法:**
1. 确保 `docker-compose.prod.yml` 中 `DB_SYNC: "false"`
2. 重新创建容器: `docker compose -f docker-compose.prod.yml up -d backend`

### 7.3 Health Check 失败 (IPv6)

Alpine 容器中 `localhost` 可能解析为 IPv6 `[::1]`，而 NestJS 默认只监听 IPv4。

**修复方法:** health check URL 使用 `127.0.0.1` 而非 `localhost`（已在 docker-compose.prod.yml 中修复）。

### 7.4 Nginx 启动失败: "host not found in upstream"

Nginx 启动时 backend 容器还未就绪，Docker DNS 解析失败。

**修复方法:**
```bash
# 等 backend 启动后再重启 nginx
docker compose -f docker-compose.prod.yml restart nginx
```

### 7.5 Nginx 端口冲突: "address already in use :8080"

系统级 nginx 占用了端口。

**修复方法:**
```bash
sudo systemctl stop nginx
sudo systemctl disable nginx
docker start agentrix-nginx
```

### 7.6 Docker 容器名冲突

`docker compose down` 后残留容器。

**修复方法:**
```bash
docker rm -f agentrix-postgres agentrix-redis  # 或其他冲突容器
docker compose -f docker-compose.prod.yml up -d
```

---

## 8. 数据备份

### 数据库备份

```bash
# 导出完整数据库
docker exec agentrix-postgres pg_dump -U agentrix paymind > ~/backups/paymind_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
cat backup.sql | docker exec -i agentrix-postgres psql -U agentrix -d paymind
```

### Docker 数据卷

```bash
# 查看数据卷
docker volume ls | grep agentrix

# 数据卷位置:
# agentrix_postgres_data  — 数据库文件
# agentrix_redis_data     — Redis 持久化
# agentrix_backend_uploads — 上传文件
# agentrix_nginx_logs     — Nginx 日志
```

---

## 9. Mobile OAuth 端点 (新增)

后端新增了移动端 OAuth 端点，支持 backend-mediated OAuth 流程：

| 端点 | 说明 |
|------|------|
| `GET /api/auth/mobile/google` | 发起 Google OAuth |
| `GET /api/auth/mobile/google/callback` | Google OAuth 回调 |
| `GET /api/auth/mobile/twitter` | 发起 Twitter OAuth 2.0 PKCE |
| `GET /api/auth/mobile/twitter/callback` | Twitter OAuth 回调 |
| `GET /api/auth/mobile/discord` | 发起 Discord OAuth |
| `GET /api/auth/mobile/discord/callback` | Discord OAuth 回调 |
| `GET /api/auth/mobile/telegram` | 发起 Telegram OAuth |
| `GET /api/auth/mobile/telegram/callback` | Telegram OAuth 回调 |

**流程**: 移动端打开浏览器 → `https://api.agentrix.top/api/auth/mobile/{provider}` → OAuth 提供商 → 后端回调 → 重定向到 `agentrix://auth/callback?token=xxx` → App 拦截深度链接

### OAuth 回调 URI 配置 (需要在各平台 Dashboard 中添加)

| 平台 | 回调 URI |
|------|----------|
| **Google Cloud Console** | `https://api.agentrix.top/api/auth/mobile/google/callback` |
| **Twitter Developer Portal** | `https://api.agentrix.top/api/auth/mobile/twitter/callback` |
| **Discord Developer Portal** | `https://api.agentrix.top/api/auth/mobile/discord/callback` |

---

## 10. 磁盘清理

```bash
# 清理未使用的 Docker 资源
docker system prune -a --volumes  # ⚠️ 会删除未使用的镜像和卷

# 安全清理（只清理悬空资源）
docker system prune
docker builder prune

# 查看磁盘使用
docker system df
df -h /
```

---

## 11. 重要文件路径

| 文件 | 路径 |
|------|------|
| Docker Compose | `/home/ubuntu/Agentrix/docker-compose.prod.yml` |
| 环境变量 | `/home/ubuntu/Agentrix/.env` |
| Nginx 配置 | `/home/ubuntu/Agentrix/nginx/production.conf` |
| Backend 源码 | `/home/ubuntu/Agentrix/backend/` |
| Frontend 源码 | `/home/ubuntu/Agentrix/frontend/` |
| HQ Console 源码 | `/home/ubuntu/Agentrix/hq-console/` |
| PEM 密钥 (本地) | `C:\Users\15279\Desktop\agentrix.pem` |
| 备份目录 | `/home/ubuntu/backups/` |
