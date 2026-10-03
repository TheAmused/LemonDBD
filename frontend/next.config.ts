// frontend/next.config.ts
import type { NextConfig } from 'next';

/** Static art under /images changes rarely: let browsers (and the SW) keep it. */
const IMAGE_CACHE_CONTROL = 'public, max-age=604800, stale-while-revalidate=86400';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
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