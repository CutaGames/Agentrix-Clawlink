/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // We can add rewrites here later to talk to the backend on 3001 if needed
};

module.exports = nextConfig;
