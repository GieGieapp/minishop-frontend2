import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // jika request sudah pakai slash, teruskan apa adanya
      { source: '/api/:path*/', destination: 'http://127.0.0.1:8000/api/:path*/' },
      // jika request TANPA slash, tambahkan slash ke backend
      { source: '/api/:path*',  destination: 'http://127.0.0.1:8000/api/:path*/' },
    ];
  },
};
export default nextConfig;
