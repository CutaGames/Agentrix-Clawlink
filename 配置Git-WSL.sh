#!/bin/bash

# ========================================
# 配置 Git 用户信息 (WSL 专用)
# ========================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================"
echo "  配置 Git 用户信息"
echo -e "========================================${NC}"
echo ""

# 获取用户输入
read -p "请输入你的名字 (例如: Zhang San): " git_name
read -p "请输入你的邮箱 (例如: zhangsan@example.com): " git_email

# 配置 Git
echo ""
echo "正在配置..."
git config --global user.name "$git_name"
git config --global user.email "$git_email"

# 验证配置
echo ""
echo -e "${GREEN}✅ Git 用户信息配置完成！${NC}"
echo ""
echo "当前配置:"
echo "  用户名: $(git config --global user.name)"
echo "  邮  箱: $(git config --global user.email)"
echo ""
echo "下一步: 运行 ./上传到GitHub-WSL.sh"
echo ""
