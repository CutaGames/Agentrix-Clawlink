#!/bin/bash

# ========================================
# GitHub Token 配置助手
# ========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================"
echo "  GitHub Token 配置助手"
echo -e "========================================${NC}"
echo ""

echo -e "${YELLOW}步骤说明：${NC}"
echo "1. 访问: https://github.com/settings/tokens/new"
echo "2. 配置:"
echo "   - Note: Agentrix Project"
echo "   - Expiration: 90 days"
echo "   - Scopes: 勾选 repo"
echo "3. 点击 Generate token"
echo "4. 复制生成的 Token (以 ghp_ 开头)"
echo ""

read -p "已经创建好 Token 了吗? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo -e "${RED}请先创建 Token 再继续${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}请输入你的 GitHub 信息：${NC}"
read -p "GitHub 用户名 (例如: CutaGames): " github_user
read -sp "Personal Access Token (粘贴后回车): " github_token
echo ""

if [ -z "$github_user" ] || [ -z "$github_token" ]; then
    echo -e "${RED}用户名和 Token 不能为空${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}正在配置...${NC}"

# 配置凭证存储
git config --global credential.helper store

# 更新远程仓库 URL（包含认证信息）
REPO_URL="https://${github_user}:${github_token}@github.com/CutaGames/Agentrix.git"
git remote set-url origin "$REPO_URL"

echo -e "${GREEN}✓ 配置完成！${NC}"
echo ""
echo -e "${YELLOW}现在可以直接推送：${NC}"
echo "  git push -u origin main"
echo ""
echo -e "${BLUE}提示: 凭证已保存，以后推送不需要再输入密码${NC}"
