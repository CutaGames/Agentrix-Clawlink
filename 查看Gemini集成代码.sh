#!/bin/bash
# 查看 Gemini 集成代码

echo "=== 在服务器上执行以下命令 ==="
echo ""

cat << 'EOF'
cd /var/www/agentrix-website/backend

# 1. 查看 Gemini Integration Service
echo "=== 1. Gemini Integration Service ==="
cat src/modules/ai-integration/gemini/gemini-integration.service.ts | head -100

# 2. 查看 Gemini Integration Controller
echo ""
echo "=== 2. Gemini Integration Controller ==="
cat src/modules/ai-integration/gemini/gemini-integration.controller.ts

# 3. 查看如何获取 Functions
echo ""
echo "=== 3. 查找 Functions 注册逻辑 ==="
grep -A 30 "getFunctions\|registerFunction" src/modules/ai-integration/gemini/gemini-integration.service.ts | head -50

# 4. 查看电商 Skills 如何转换为 Functions
echo ""
echo "=== 4. 查找电商 Skills 转换 ==="
grep -r "product_search\|add_to_cart\|checkout" src/modules/ai-integration --include="*.ts" | head -20
EOF

