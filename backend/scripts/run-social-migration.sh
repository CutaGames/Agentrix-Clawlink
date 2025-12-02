#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🧩 正在执行数据库迁移（包含社交账号表）..."
npm run migration:run
echo "✅ 迁移执行完成"


