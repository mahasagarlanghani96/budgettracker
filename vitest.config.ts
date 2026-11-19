import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts', 'src/**/__tests__/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.d.ts', 'src/lib/**/__tests__/**'],
      thresholds: {
        'src/lib/calculations/waiyk.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'src/lib/calculations/balance.ts': { statements: 75, branches: 100, functions: 55, lines: 75 },
        'src/lib/ledger.ts': { statements: 95, branches: 90, functions: 100, lines: 95 },
        'src/lib/validations/schemas.ts': { statements: 95, branches: 80, functions: 100, lines: 95 },
        'src/lib/utils.ts': { statements: 95, branches: 85, functions: 100, lines: 95 },
      },
    },
  },
});
