/** @type {import('vitest').UserConfig} */
module.exports = {
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    include: ['**/*.test.js'],
    exclude: ['node_modules', 'uploads'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', '**/*.test.js', 'uploads', 'vitest.config.js'],
    },
    testTimeout: 10000,
    hookTimeout: 5000,
  },
};
