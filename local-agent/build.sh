#!/usr/bin/env bash
# build.sh — build pre-packaged binaries for Windows and macOS
# This is run by CI/CD, NOT by end users.
set -euo pipefail

echo "Installing dependencies..."
npm install

echo "Building Windows binary..."
npx pkg . --target node18-win-x64 --output dist/clawlink-agent-win.exe --compress GZip

echo "Building macOS binary..."
npx pkg . --target node18-macos-x64 --output dist/clawlink-agent-mac --compress GZip

echo ""
echo "✓ Binaries written to dist/"
ls -lh dist/
