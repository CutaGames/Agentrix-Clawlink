#!/bin/bash
# 添加缺失的 Gemini 电商 Functions

echo "=== 在服务器上执行以下命令 ==="
echo ""

cat << 'EOF'
cd /var/www/agentrix-website/backend

# 备份文件
cp src/modules/ai-integration/gemini/gemini-integration.service.ts \
   src/modules/ai-integration/gemini/gemini-integration.service.ts.bak

# 使用 Python 精确修复
python3 << 'PYEOF'
import re

file_path = 'src/modules/ai-integration/gemini/gemini-integration.service.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 找到 get_agentrix_order 的结束位置（在 required: ['order_id'] 之后）
# 然后在 ], 之前添加新的 Functions

new_functions = '''      {
        name: 'search_agentrix_products',
        description: '搜索 Agentrix Marketplace 中的商品。支持语义搜索、价格筛选、分类筛选等。',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '搜索查询（必需）' },
            category: { type: 'string', description: '商品分类（可选）' },
            priceMin: { type: 'number', description: '最低价格（可选）' },
            priceMax: { type: 'number', description: '最高价格（可选）' },
            currency: { type: 'string', description: '货币类型（可选，如 USD、CNY）' },
            inStock: { type: 'boolean', description: '是否仅显示有库存商品（可选）' },
          },
          required: ['query'],
        },
      },
      {
        name: 'add_to_agentrix_cart',
        description: '将商品加入购物车',
        parameters: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: '商品ID（必需）' },
            quantity: { type: 'number', description: '数量（可选，默认：1）', minimum: 1 },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'view_agentrix_cart',
        description: '查看当前购物车内容',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'checkout_agentrix_cart',
        description: '结算购物车，创建订单',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'pay_agentrix_order',
        description: '支付订单',
        parameters: {
          type: 'object',
          properties: {
            order_id: { type: 'string', description: '订单ID（必需）' },
            payment_method: { type: 'string', description: '支付方式（可选，如 USDC、SOL、Visa、Apple Pay）' },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'compare_agentrix_prices',
        description: '比价服务，比较不同平台或商品的价格',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '要比较的商品查询（可选）' },
          },
          required: [],
        },
      },
'''

# 找到 ], 之前的位置（basicFunctions 数组结束）
new_lines = []
inserted = False
for i, line in enumerate(lines):
    new_lines.append(line)
    # 查找 basicFunctions 数组的结束位置
    # 应该在 get_agentrix_order 的 }, 之后，], 之前
    if 'required: [\'order_id\']' in line and not inserted:
        # 检查下一行是否是 }, 然后是 ],
        if i + 2 < len(lines) and '},' in lines[i+1] and '],' in lines[i+2]:
            # 在 ], 之前插入新 Functions
            new_lines.append(new_functions)
            inserted = True

if not inserted:
    # 如果没找到，尝试另一种方式：查找 ], 在 return 之前
    new_lines = []
    for i, line in enumerate(lines):
        if '],' in line and 'return [...geminiFunctions, ...basicFunctions]' in lines[i+1] if i+1 < len(lines) else False:
            # 在 ], 之前插入
            new_lines.append(new_functions)
            new_lines.append(line)
            inserted = True
        else:
            new_lines.append(line)

if inserted:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print('✅ 已添加所有电商 Functions 到 Schema')
else:
    print('⚠️  未找到插入位置，使用备用方案...')
    # 备用方案：直接替换 ], 为 new_functions + ],
    content = ''.join(lines)
    pattern = r'(required: \[\'order_id\'\],\s*\},\s*\},\s*\],)'
    replacement = r'required: [\'order_id\'],\n        },\n      },' + new_functions + '\n    ],'
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('✅ 已添加所有电商 Functions 到 Schema（使用备用方案）')
    else:
        print('❌ 修复失败，请手动编辑文件')
        print('需要在 get_agentrix_order 的 }, 之后，], 之前添加 Functions')
PYEOF

# 验证修复
echo ""
echo "验证修复结果："
grep -A 3 "search_agentrix_products\|add_to_agentrix_cart" \
    src/modules/ai-integration/gemini/gemini-integration.service.ts | head -10

# 重新构建
npm run build

# 重启服务
pm2 restart agentrix-backend --update-env

# 等待服务启动
sleep 3

# 验证 Functions 列表
echo ""
echo "验证 Functions 列表："
curl -s http://localhost:3001/api/gemini/functions | python3 << 'PYEOF'
import sys, json
try:
    data = json.load(sys.stdin)
    functions = [f['name'] for f in data.get('functions', [])]
    print('已注册的电商 Functions:')
    for name in ['search_agentrix_products', 'add_to_agentrix_cart', 'view_agentrix_cart', 
                 'checkout_agentrix_cart', 'buy_agentrix_product', 'get_agentrix_order', 
                 'pay_agentrix_order', 'compare_agentrix_prices']:
        status = '✅' if name in functions else '❌'
        print(f'  {status} {name}')
except Exception as e:
    print(f'解析失败: {e}')
    print('原始响应:')
    sys.stdin.seek(0)
    print(sys.stdin.read()[:500])
PYEOF
EOF

