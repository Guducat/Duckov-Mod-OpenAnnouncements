import { defineConfig } from 'vitest/config';
import path from 'path';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    reporters: isCI ? ['default', 'junit'] : ['default'],
    outputFile: isCI ? 'junit.xml' : undefined,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.*',
        '**/*.d.ts',
        '**/*.config.*',
        '.wrangler/**',
        'dist/**',
        'node_modules/**',
        'public/**',
        'scripts/**',
        'coverage/**',
      ],
    },
  },
});
