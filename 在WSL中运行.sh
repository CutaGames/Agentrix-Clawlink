#!/bin/bash

# 这个脚本用于在 WSL 中运行安装和启动命令
# 从 Windows PowerShell 中，可以运行: wsl bash 在WSL中运行.sh

echo "=========================================="
echo "🚀 PayMind WSL 环境工具"
echo "=========================================="
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "当前目录: $SCRIPT_DIR"
echo ""

echo "请选择操作:"
echo "[1] 安装所有依赖"
echo "[2] 启动所有服务"
echo "[3] 安装依赖并启动服务"
echo "[0] 退出"
echo ""

read -p "请输入选项 (0-3): " choice

case $choice in
    1)
        echo ""
        echo "开始安装依赖..."
        chmod +x 安装依赖-WSL.sh
        ./安装依赖-WSL.sh
        ;;
    2)
        echo ""
        echo "启动所有服务..."
        chmod +x WSL启动服务.sh
        ./WSL启动服务.sh
        ;;
    3)
        echo ""
        echo "安装依赖..."
        chmod +x 安装依赖-WSL.sh
        ./安装依赖-WSL.sh
        
        echo ""
        read -p "依赖安装完成，是否立即启动服务? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo "启动所有服务..."
            chmod +x WSL启动服务.sh
            ./WSL启动服务.sh
        fi
        ;;
    0)
        echo "退出"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

