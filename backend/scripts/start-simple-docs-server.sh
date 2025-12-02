#!/bin/bash
# 简单的文档服务器启动脚本
# 使用http-server在8080端口提供Swagger文档

PORT=8080
API_URL="http://localhost:3001/api/docs"

echo "📚 Starting PayMind API Documentation Server on port $PORT"
echo "📖 Swagger UI will be available at: http://localhost:$PORT"
echo "🔗 API Documentation: $API_URL"

# 检查http-server是否安装
if ! command -v http-server &> /dev/null; then
    echo "Installing http-server..."
    npm install -g http-server
fi

# 创建临时目录和重定向页面
mkdir -p /tmp/paymind-docs
cat > /tmp/paymind-docs/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>PayMind API Documentation</title>
    <meta http-equiv="refresh" content="0; url=http://localhost:3001/api/docs">
    <script>
        window.location.href = "http://localhost:3001/api/docs";
    </script>
</head>
<body>
    <p>Redirecting to <a href="http://localhost:3001/api/docs">PayMind API Documentation</a>...</p>
</body>
</html>
EOF

# 启动http-server
cd /tmp/paymind-docs
http-server -p $PORT -a 0.0.0.0 --cors

