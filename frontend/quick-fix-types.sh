#!/bin/bash
# 快速修复常见TypeScript类型错误

echo "🔧 开始修复类型错误..."

# 1. 修复所有 template.metadata 访问
find components -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/(template as any)\.metadata/template.metadata/g'
find components -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/template\.metadata/(template as any).metadata/g' 2>/dev/null || true

# 2. 修复 ethers v6 API
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/ethers\.utils\.keccak256/ethers.keccak256/g'
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/ethers\.utils\.defaultAbiCoder/ethers.AbiCoder.defaultAbiCoder()/g'
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/ethers\.utils\.parseUnits/ethers.parseUnits/g'
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/ethers\.utils\.formatBytes32String/ethers.formatBytes32String/g'
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/ethers\.utils\.arrayify/ethers.getBytes/g'

echo "✅ 修复完成，请运行 npm run build 验证"

