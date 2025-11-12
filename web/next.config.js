/** @type {import('next').NextConfig} */
const API_PROXY_TARGET =
  process.env.NEXT_PUBLIC_API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:8000';

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_PROXY_TARGET.replace(/\/$/, '')}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig
