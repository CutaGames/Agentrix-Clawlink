/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 后端文件已在 tsconfig.json 中排除，Next.js 不会检查它们
  // 允许构建时显示警告但不阻止构建
  eslint: {
    // 在构建时忽略 ESLint 警告，只显示错误
    ignoreDuringBuilds: false,
  },
  typescript: {
    // 在构建时忽略 TypeScript 错误（不推荐，但可以临时使用）
    ignoreBuildErrors: false,
  },
  // 允许加载 Transak SDK 的外部脚本
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://global.transak.com https://staging-global.transak.com https://global-stg.transak.com",
              "style-src 'self' 'unsafe-inline' https://global.transak.com https://staging-global.transak.com https://global-stg.transak.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https:",
              // 允许连接到本地开发服务器和 Transak API
              "connect-src 'self' http://localhost:3001 http://127.0.0.1:3001 https://global.transak.com https://staging-global.transak.com https://global-stg.transak.com https://api.transak.com https://api-staging.transak.com",
              "frame-src 'self' https://global.transak.com https://staging-global.transak.com https://global-stg.transak.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
