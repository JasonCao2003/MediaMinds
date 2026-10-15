/** @type {import('next').NextConfig} */

// 后端网关地址，可通过环境变量覆盖
const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:8080';
const MINIO = process.env.MINIO_URL || 'http://localhost:9000';
const WS = process.env.WS_URL || 'http://localhost:9001';

const nextConfig = {
  reactStrictMode: true,
  // 允许在局域网 / 任意源下加载 MinIO 图片
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  // 与 Vue 版本保持一致的开发代理：/api -> 网关，/oss -> MinIO，/ws -> 通知服务
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${GATEWAY}/:path*`,
      },
      {
        source: '/oss/:path*',
        destination: `${MINIO}/mediaminds/:path*`,
      },
      {
        source: '/ws/:path*',
        destination: `${WS}/ws/:path*`,
      },
    ];
  },
};

export default nextConfig;
