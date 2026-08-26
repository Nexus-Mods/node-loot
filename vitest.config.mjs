import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
    setupFiles: ['./test/setup.js'],
    // the addon keeps a ThreadSafeFunction alive for its log callback and offers no way to release
    // it, so give each test file its own process for the pool to tear down
    pool: 'forks',
  },
});
