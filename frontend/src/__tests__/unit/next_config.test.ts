// frontend/src/__tests__/unit/next_config.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import nextConfig from '../../../next.config';

describe('Next.js Configuration & Build Optimizations', () => {
  it('should enable standalone output for minimal Docker image size', () => {
    assert.strictEqual(nextConfig.output, 'standalone');
  });

  it('should optimize package imports for barrel libraries', () => {
    const optimized = nextConfig.experimental?.optimizePackageImports;
    assert.ok(Array.isArray(optimized), 'optimizePackageImports should be an array');
    assert.ok(optimized.includes('lucide-react'), 'Should optimize lucide-react');
    assert.ok(optimized.includes('@tsparticles/react'), 'Should optimize @tsparticles/react');
    assert.ok(optimized.includes('@tsparticles/engine'), 'Should optimize @tsparticles/engine');
    assert.ok(optimized.includes('@tsparticles/slim'), 'Should optimize @tsparticles/slim');
    assert.ok(optimized.includes('clsx'), 'Should optimize clsx');
    assert.ok(optimized.includes('tailwind-merge'), 'Should optimize tailwind-merge');
  });

  it('should disable poweredByHeader for security hardening', () => {
    assert.strictEqual(nextConfig.poweredByHeader, false);
  });

  it('should enable reactStrictMode for React 19 concurrent rendering checks', () => {
    assert.strictEqual(nextConfig.reactStrictMode, true);
  });

  it('should configure compiler settings for production builds', () => {
    assert.ok(nextConfig.compiler, 'Compiler settings should be defined');
    assert.ok('removeConsole' in nextConfig.compiler);
  });
});
