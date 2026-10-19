// frontend/next.config.ts
import type { NextConfig } from 'next';

/** Static art under /images has fixed paths: a replaced file must reach browsers within a day. */
const IMAGE_CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=86400';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@tsparticles/react',
      '@tsparticles/engine',
      '@tsparticles/slim',
      'clsx',
      'tailwind-merge',
    ],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: IMAGE_CACHE_CONTROL }],
      },
    ];
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;