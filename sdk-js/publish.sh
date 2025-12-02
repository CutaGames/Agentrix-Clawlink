#!/bin/bash

# Agentrix SDK NPM 发布脚本

set -e

echo "🚀 Agentrix SDK 发布准备"
echo "========================"
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
  echo "❌ 错误: 请在 sdk-js 目录下运行此脚本"
  exit 1
fi

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  警告: 有未提交的更改"
  read -p "是否继续? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# 运行测试
echo "📋 运行单元测试..."
npm run test:unit

if [ $? -ne 0 ]; then
  echo "❌ 测试失败，请修复后重试"
  exit 1
fi

# 构建项目
echo "🔨 构建项目..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ 构建失败，请修复后重试"
  exit 1
fi

# 检查版本
VERSION=$(node -p "require('./package.json').version")
echo "📦 当前版本: $VERSION"
echo ""

# 确认发布
read -p "是否发布到 NPM? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "已取消发布"
  exit 0
fi

# 发布到 NPM
echo "📤 发布到 NPM..."
npm publish --access public

if [ $? -eq 0 ]; then
  echo "✅ 发布成功!"
  echo "📦 包名: @agentrix/sdk"
  echo "📌 版本: $VERSION"
  echo ""
  echo "🔗 安装命令:"
  echo "   npm install @agentrix/sdk@$VERSION"
else
  echo "❌ 发布失败"
  exit 1
fi

