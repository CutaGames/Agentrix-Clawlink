#!/bin/bash

# 清理 node_modules 和 package-lock.json 的脚本
# 解决 WSL 环境中删除 node_modules 时遇到的权限问题

echo "开始清理 node_modules..."

# 方法1: 尝试使用 find 命令删除所有文件和目录
if [ -d "node_modules" ]; then
    echo "使用 find 命令删除 node_modules 中的文件..."
    find node_modules -type f -exec chmod u+w {} \; 2>/dev/null
    find node_modules -type d -exec chmod u+w {} \; 2>/dev/null
    find node_modules -delete 2>/dev/null || true
fi

# 方法2: 如果方法1失败，尝试使用 rm -rf
if [ -d "node_modules" ]; then
    echo "使用 rm -rf 强制删除 node_modules..."
    sudo rm -rf node_modules 2>/dev/null || true
fi

# 方法3: 如果还有残留，逐个删除问题目录
if [ -d "node_modules" ]; then
    echo "逐个删除问题目录..."
    sudo find node_modules -type d -name "ripple-keypairs" -exec rm -rf {} + 2>/dev/null || true
    sudo find node_modules -type d -path "*/rpc-websockets/node_modules/@swc/helpers/cjs" -exec rm -rf {} + 2>/dev/null || true
    sudo find node_modules -type d -name "rxjs" -exec rm -rf {} + 2>/dev/null || true
    sudo find node_modules -type d -path "*/sucrase/node_modules/minimatch/dist/commonjs" -exec rm -rf {} + 2>/dev/null || true
    
    # 最后再次尝试删除整个目录
    sudo rm -rf node_modules 2>/dev/null || true
fi

# 删除 package-lock.json
if [ -f "package-lock.json" ]; then
    echo "删除 package-lock.json..."
    rm -f package-lock.json
fi

# 检查是否还有残留
if [ -d "node_modules" ]; then
    echo "警告: node_modules 目录仍然存在，可能需要手动删除"
    echo "请尝试在 Windows 资源管理器中手动删除该目录"
    exit 1
else
    echo "✓ node_modules 已成功删除"
fi

if [ ! -f "package-lock.json" ]; then
    echo "✓ package-lock.json 已成功删除"
fi

echo "清理完成！现在可以运行 npm install"



