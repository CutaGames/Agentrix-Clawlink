#!/bin/bash

# ========================================
# PayMind 项目上传到 GitHub (WSL 专用)
# 仓库: https://github.com/CutaGames/Agentrix
# ========================================

set -e  # 遇到错误立即停止

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================"
echo "  上传 PayMind 到 GitHub"
echo "  仓库: https://github.com/CutaGames/Agentrix"
echo -e "========================================${NC}"
echo ""

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 步骤 1: 检查 Git 配置
echo -e "${YELLOW}[1/7] 检查 Git 配置...${NC}"
GIT_NAME=$(git config user.name 2>/dev/null || echo "")
GIT_EMAIL=$(git config user.email 2>/dev/null || echo "")

if [ -z "$GIT_NAME" ] || [ -z "$GIT_EMAIL" ]; then
    echo -e "${RED}Git 用户信息未配置！${NC}"
    echo "请先运行以下命令:"
    echo "  git config --global user.name \"你的名字\""
    echo "  git config --global user.email \"你的邮箱@example.com\""
    exit 1
fi

echo -e "${GREEN}✓ Git 用户: $GIT_NAME <$GIT_EMAIL>${NC}"
echo ""

# 步骤 2: 清理 Git 缓存（确保 .gitignore 生效）
echo -e "${YELLOW}[2/7] 清理 Git 缓存...${NC}"
git rm -r --cached . 2>/dev/null || true
echo -e "${GREEN}✓ 缓存已清理${NC}"
echo ""

# 步骤 3: 添加文件（应用 .gitignore）
echo -e "${YELLOW}[3/7] 添加文件（应用 .gitignore 规则）...${NC}"
git add .
echo -e "${GREEN}✓ 文件已添加${NC}"
echo ""

# 步骤 4: 显示将要上传的文件
echo -e "${YELLOW}[4/7] 查看将要上传的文件...${NC}"
echo -e "${BLUE}========================================${NC}"
git status --short
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查敏感文件
echo -e "${YELLOW}正在检查敏感文件...${NC}"
SENSITIVE_FILES=$(git status --short | grep -E '\.(env|log|md)$' || true)
if [ -n "$SENSITIVE_FILES" ]; then
    echo -e "${RED}⚠️  警告: 发现敏感文件将被上传:${NC}"
    echo "$SENSITIVE_FILES"
    echo ""
    read -p "是否继续? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo -e "${RED}已取消上传${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ 未发现敏感文件 (.env, .log, .md)${NC}"
fi
echo ""

# 步骤 5: 配置远程仓库
echo -e "${YELLOW}[5/7] 配置远程仓库...${NC}"
REMOTE_URL="https://github.com/CutaGames/Agentrix.git"

# 检查是否已有 origin
if git remote | grep -q "origin"; then
    echo "更新远程仓库地址..."
    git remote set-url origin "$REMOTE_URL"
else
    echo "添加远程仓库..."
    git remote add origin "$REMOTE_URL"
fi
echo -e "${GREEN}✓ 远程仓库: $REMOTE_URL${NC}"
echo ""

# 步骤 6: 拉取远程代码（如果需要）
echo -e "${YELLOW}[6/7] 拉取远程代码...${NC}"
if git ls-remote --exit-code origin main >/dev/null 2>&1; then
    echo "远程仓库有内容，正在拉取..."
    git pull origin main --allow-unrelated-histories || {
        echo -e "${RED}拉取失败，可能有冲突，请手动解决${NC}"
        exit 1
    }
else
    echo "远程仓库为空，跳过拉取"
fi
echo ""

# 步骤 7: 提交并推送
echo -e "${YELLOW}[7/7] 提交并推送到 GitHub...${NC}"
read -p "请输入提交信息 (直接回车使用默认): " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="Update: PayMind project $(date '+%Y-%m-%d %H:%M:%S')"
fi

git commit -m "$commit_msg" || {
    echo -e "${YELLOW}没有新的更改需要提交${NC}"
}

echo "正在推送到 GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ 上传成功！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "仓库地址: https://github.com/CutaGames/Agentrix"
    echo ""
else
    echo ""
    echo -e "${RED}❌ 上传失败${NC}"
    echo "可能的原因:"
    echo "  1. 网络问题"
    echo "  2. 需要 GitHub 认证（Token）"
    echo "  3. 权限不足"
    echo ""
    echo "解决方案:"
    echo "  1. 生成 GitHub Token: https://github.com/settings/tokens"
    echo "  2. 使用 Token 推送: git push https://你的用户名:token@github.com/CutaGames/Agentrix.git main"
    exit 1
fi
