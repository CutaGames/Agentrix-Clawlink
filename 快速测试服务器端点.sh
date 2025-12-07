#!/bin/bash
# 快速测试服务器上的 Gemini 端点

SERVER_HOST="129.226.152.88"
SERVER_USER="root"

echo "=== 测试服务器上的 Gemini 端点 ==="
echo ""

# 方法 1: 通过 SSH 在服务器上测试
echo "方法 1: 通过 SSH 在服务器上测试"
echo "执行以下命令："
echo ""
echo "ssh $SERVER_USER@$SERVER_HOST"
echo "cd /var/www/agentrix-website/backend"
echo "curl http://localhost:3001/api/gemini/functions"
echo ""

# 方法 2: 通过公网测试
echo "方法 2: 通过公网测试（在本地执行）"
echo ""
echo "测试获取 Functions:"
echo "curl https://api.agentrix.top/api/gemini/functions"
echo ""

echo "测试对话接口:"
echo "curl -X POST https://api.agentrix.top/api/gemini/chat \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{"
echo "    \"messages\": ["
echo "      {\"role\": \"user\", \"content\": \"我要买 iPhone 15\"}"
echo "    ],"
echo "    \"geminiApiKey\": \"你的-Gemini-API-Key\","
echo "    \"context\": {"
echo "      \"sessionId\": \"test-123\""
echo "    }"
echo "  }'"
echo ""

# 方法 3: 直接执行测试（如果配置了 SSH 密钥）
if [ -f ~/.ssh/id_rsa ] || [ -f ~/.ssh/id_ed25519 ]; then
    echo "方法 3: 直接执行测试（通过 SSH）"
    echo ""
    echo "正在测试..."
    
    # 测试获取 Functions
    ssh $SERVER_USER@$SERVER_HOST "cd /var/www/agentrix-website/backend && curl -s http://localhost:3001/api/gemini/functions" | head -20
    
    echo ""
    echo "✅ 测试完成"
else
    echo "⚠️  未配置 SSH 密钥，请使用方法 1 或方法 2"
fi

