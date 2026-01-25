#!/bin/bash

echo "=== 检查后端服务状态 ==="

# 检查端口 3001 是否在监听
if lsof -i:3001 > /dev/null 2>&1; then
    echo "✅ 后端服务正在运行 (端口 3001)"
    
    # 测试健康检查接口
    echo -e "\n测试健康检查接口:"
    curl -s http://localhost:3001/api/health || echo "❌ 健康检查失败"
else
    echo "❌ 后端服务未运行 (端口 3001 未监听)"
    echo ""
    echo "启动后端服务:"
    echo "cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend"
    echo "npm run start:dev"
fi

echo -e "\n=== 检查前端服务状态 ==="

# 检查端口 3000 是否在监听
if lsof -i:3000 > /dev/null 2>&1; then
    echo "✅ 前端服务正在运行 (端口 3000)"
else
    echo "❌ 前端服务未运行 (端口 3000 未监听)"
    echo ""
    echo "启动前端服务:"
    echo "cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend"
    echo "npm run dev"
fi

echo -e "\n=== 数据库验证 ==="
PGPASSWORD=postgres psql -h localhost -U postgres -d paymind -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_roles_enum') ORDER BY enumlabel;" -t -A | paste -sd ','
