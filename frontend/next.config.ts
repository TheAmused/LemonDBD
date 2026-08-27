// frontend/next.config.ts
import type { NextConfig } from 'next';

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
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;