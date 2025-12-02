#!/usr/bin/env node
/**
 * 简单的文档服务器
 * 在8080端口提供Swagger文档访问
 */

const http = require('http');
const { exec } = require('child_process');

const PORT = process.env.DOCS_PORT || 8080;
const API_URL = process.env.API_URL || 'http://localhost:3001/api/docs';

// 创建重定向页面
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agentrix API Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }
        p {
            font-size: 1.2rem;
            margin-bottom: 2rem;
        }
        a {
            display: inline-block;
            padding: 1rem 2rem;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            transition: transform 0.2s;
        }
        a:hover {
            transform: scale(1.05);
        }
        .spinner {
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 2rem auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
    <script>
        // 自动跳转
        setTimeout(() => {
            window.location.href = '${API_URL}';
        }, 2000);
    </script>
</head>
<body>
    <div class="container">
        <h1>📚 Agentrix API Documentation</h1>
        <p>正在跳转到 Swagger 文档...</p>
        <div class="spinner"></div>
        <a href="${API_URL}">立即访问文档</a>
        <p style="margin-top: 2rem; font-size: 0.9rem; opacity: 0.8;">
            如果页面没有自动跳转，请点击上方按钮
        </p>
    </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 如果是根路径，返回重定向页面
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // 其他路径代理到API服务器
  const proxyUrl = `${API_URL}${req.url}`;
  
  http.get(proxyUrl, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  }).on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('无法连接到API服务器。请确保后端服务运行在3001端口。');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`📚 Agentrix API Documentation Server is running on: http://0.0.0.0:${PORT}`);
  console.log(`📖 Swagger UI: ${API_URL}`);
  console.log(`🔗 Direct access: http://localhost:${PORT}`);
});

