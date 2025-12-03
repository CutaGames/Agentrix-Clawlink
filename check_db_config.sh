#!/bin/bash

echo "=== 检查所有可能的数据库配置位置 ==="
echo ""

echo "1. 检查 .env 文件:"
cat backend/.env | grep -E "DB_|DATABASE"
echo ""

echo "2. 检查是否存在 .env.production:"
if [ -f backend/.env.production ]; then
  echo "发现 .env.production:"
  cat backend/.env.production | grep -E "DB_|DATABASE"
else
  echo ".env.production 不存在"
fi
echo ""

echo "3. 检查是否存在 ormconfig.json:"
if [ -f backend/ormconfig.json ]; then
  echo "发现 ormconfig.json:"
  cat backend/ormconfig.json
else
  echo "ormconfig.json 不存在"
fi
echo ""

echo "4. 检查 TypeORM 配置文件:"
find backend/src -name "*database*" -o -name "*typeorm*" -o -name "*config*" | head -10
echo ""

echo "5. 检查主配置文件中的数据库设置:"
if [ -f backend/src/config/database.config.ts ]; then
  echo "发现 database.config.ts:"
  cat backend/src/config/database.config.ts
fi
echo ""

echo "6. 检查 PM2 当前环境变量:"
pm2 env 0
